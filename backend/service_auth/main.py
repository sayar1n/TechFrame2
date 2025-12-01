import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

import crud, models, schemas
from database import engine, SessionLocal
from logging_config import setup_logging

# Логирование в файл backend/logs/auth-service.log
setup_logging("auth-service")
logger = logging.getLogger(__name__)

# Создаём таблицы, если их ещё нет
models.Base.metadata.create_all(bind=engine)

# Грубая "миграция" для dev:
# если в существующей таблице users нет нужных колонок, добавляем их через ALTER TABLE,
# чтобы убрать ошибки вида "no such column: users.<...>"
try:
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("users")]
    with engine.connect() as conn:
        if "hashed_password" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN hashed_password VARCHAR NOT NULL DEFAULT ''"
                )
            )
        if "role" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN role VARCHAR NOT NULL DEFAULT 'observer'"
                )
            )
        if "is_active" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
                )
            )
        if "created_at" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN created_at DATETIME"
                )
            )
        conn.commit()
except Exception:
    # Если что-то пойдёт не так, просто не ломаем запуск сервиса;
    # ошибка всё равно проявится в логах, и можно будет починить вручную.
    pass

app = FastAPI(title="Auth Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("JWT_ALG", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

@app.post("/auth/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not crud.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/register", response_model=schemas.User)
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, email=user.email) or crud.get_user_by_username(db, username=user.username):
        raise HTTPException(status_code=400, detail="Username or email already taken")
    return crud.create_user(db=db, user=user)

@app.get("/auth/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/auth/users", response_model=list[schemas.User])
async def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_users(db, skip=skip, limit=limit)

from fastapi import Query

@app.put("/auth/users/{user_id}/role", response_model=schemas.User)
async def update_user_role(user_id: int, new_role: str = Query(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.update_user_role(db, user_id, new_role)

@app.get("/health")
async def health():
    return {"status": "healthy"}

