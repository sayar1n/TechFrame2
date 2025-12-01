import os
import httpx
import shutil
import uuid
import logging
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

import crud, models, schemas
from database import engine, SessionLocal
from events import publish_defect_created, publish_defect_status_changed, publish_defect_updated, publish_defect_deleted

logger = logging.getLogger(__name__)

# Middleware для X-Request-ID
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        logger.info(f"[{request_id}] {request.method} {request.url.path}")
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info(f"[{request_id}] Response: {response.status_code}")
        return response

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Defects Service", version="1.0.0")

# Добавляем middleware для трассировки
app.add_middleware(RequestIDMiddleware)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("JWT_ALG", "HS256")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{AUTH_SERVICE_URL}/auth/users/me", headers={"Authorization": f"Bearer {token}"})
        if response.status_code != 200:
            raise credentials_exception
        return response.json()

@app.get("/defects/", response_model=list[schemas.Defect])
async def read_defects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return crud.get_defects(db, skip=skip, limit=limit)

@app.get("/defects/{defect_id}", response_model=schemas.Defect)
async def read_defect(defect_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_defect = crud.get_defect(db, defect_id=defect_id)
    if db_defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    return db_defect

@app.post("/defects/", response_model=schemas.Defect)
async def create_defect(defect: schemas.DefectCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Создаём дефект
    new_defect = crud.create_defect(db=db, defect=defect, reporter_id=current_user["id"])
    
    # Публикуем событие "создан заказ"
    publish_defect_created(
        defect_id=new_defect.id,
        title=new_defect.title,
        status=new_defect.status,
        priority=new_defect.priority,
        project_id=new_defect.project_id,
        reporter_id=current_user["id"]
    )
    
    return new_defect

@app.put("/defects/{defect_id}", response_model=schemas.Defect)
async def update_defect(defect_id: int, defect: schemas.DefectCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_defect = crud.get_defect(db, defect_id=defect_id)
    if db_defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    if db_defect.reporter_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Сохраняем старый статус для события
    old_status = db_defect.status
    
    # Обновляем дефект
    updated_defect = crud.update_defect(db=db, defect_id=defect_id, defect=defect)
    
    # Если статус изменился, публикуем событие "обновлён статус"
    if old_status != updated_defect.status:
        publish_defect_status_changed(
            defect_id=defect_id,
            old_status=old_status,
            new_status=updated_defect.status,
            changed_by=current_user["id"]
        )
    
    # Публикуем событие "обновлён заказ"
    publish_defect_updated(
        defect_id=defect_id,
        title=updated_defect.title,
        updated_by=current_user["id"]
    )
    
    return updated_defect

@app.delete("/defects/{defect_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_defect(defect_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_defect = crud.get_defect(db, defect_id=defect_id)
    if db_defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    if db_defect.reporter_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    crud.delete_defect(db=db, defect_id=defect_id)
    return

@app.get("/defects/{defect_id}/comments/", response_model=list[schemas.Comment])
async def read_comments(defect_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return crud.get_comments_by_defect(db, defect_id=defect_id, skip=skip, limit=limit)

@app.post("/defects/{defect_id}/comments/", response_model=schemas.Comment)
async def create_comment(defect_id: int, comment: schemas.CommentCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return crud.create_comment(db=db, comment=comment, defect_id=defect_id, author_id=current_user["id"])

@app.get("/defects/{defect_id}/attachments/", response_model=list[schemas.Attachment])
async def read_attachments(defect_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return crud.get_attachments_by_defect(db, defect_id=defect_id, skip=skip, limit=limit)

@app.post("/defects/{defect_id}/attachments/", response_model=schemas.Attachment)
async def create_attachment(defect_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    upload_dir = f"./attachments/{defect_id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = f"{upload_dir}/{file.filename}"
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    from datetime import datetime
    db_attachment = models.Attachment(
        filename=file.filename,
        file_path=file_location,
        defect_id=defect_id,
        uploader_id=current_user["id"]
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

@app.delete("/defects/{defect_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(defect_id: int, attachment_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_attachment = crud.get_attachment(db, attachment_id=attachment_id)
    if db_attachment is None or db_attachment.defect_id != defect_id:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if db_attachment.uploader_id != current_user["id"] and current_user["role"] not in ["manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if os.path.exists(db_attachment.file_path):
        os.remove(db_attachment.file_path)
    crud.delete_attachment(db=db, attachment_id=attachment_id)
    return

@app.get("/health")
async def health():
    return {"status": "healthy"}

