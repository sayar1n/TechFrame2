import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

import crud, models, schemas
from database import engine, SessionLocal
from logging_config import setup_logging

# Логирование в файл backend/logs/auth-service.log
setup_logging("auth-service")
logger = logging.getLogger(__name__)

# Middleware для X-Request-ID
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        
        # Логируем начало запроса
        logger.info(f"[{request_id}] {request.method} {request.url.path}")
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        # Логируем завершение запроса
        logger.info(f"[{request_id}] Response: {response.status_code}")
        
        return response

# Создаём таблицы, если их ещё нет
print("[AUTH] Creating database tables...")
models.Base.metadata.create_all(bind=engine)
print("[AUTH] Tables created: users, auth_tokens")

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

# Добавляем middleware для трассировки
app.add_middleware(RequestIDMiddleware)

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
    
    # Проверяем, что токен активен в БД
    db_token = crud.get_token(db, token)
    if not db_token or not db_token.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked", headers={"WWW-Authenticate": "Bearer"})
    
    # Проверяем, что токен не истёк
    if db_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired", headers={"WWW-Authenticate": "Bearer"})
    
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
    expires_at = datetime.utcnow() + access_token_expires
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    
    # Сохраняем токен в БД (старые токены автоматически инвалидируются)
    crud.save_token(db, user.id, access_token, expires_at)
    
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
    # update_user_role автоматически инвалидирует все токены пользователя
    return crud.update_user_role(db, user_id, new_role)

@app.post("/auth/logout")
async def logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Выход из системы - инвалидирует текущий токен"""
    crud.revoke_token(db, token)
    return {"message": "Successfully logged out"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

