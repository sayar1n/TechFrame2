from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime
import models, schemas

# Используем pbkdf2_sha256 вместо bcrypt, чтобы избежать проблем с бинарными зависимостями на Windows
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="observer"  # Всегда observer при регистрации
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_role(db: Session, user_id: int, new_role: str):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.role = new_role
        db.commit()
        db.refresh(db_user)
        # Инвалидируем все активные токены пользователя при смене роли
        revoke_all_user_tokens(db, user_id)
    return db_user

# ===== Функции для работы с токенами =====

def save_token(db: Session, user_id: int, token: str, expires_at: datetime):
    """Сохраняет токен в БД"""
    # Сначала инвалидируем все старые токены пользователя
    revoke_all_user_tokens(db, user_id)
    
    # Создаём новый токен
    db_token = models.AuthToken(
        user_id=user_id,
        token=token,
        is_active=True,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def get_token(db: Session, token: str):
    """Получает токен из БД"""
    return db.query(models.AuthToken).filter(
        models.AuthToken.token == token,
        models.AuthToken.is_active == True
    ).first()

def revoke_token(db: Session, token: str):
    """Инвалидирует конкретный токен (для logout)"""
    db_token = db.query(models.AuthToken).filter(models.AuthToken.token == token).first()
    if db_token:
        db_token.is_active = False
        db_token.revoked_at = datetime.utcnow()
        db.commit()
    return db_token

def revoke_all_user_tokens(db: Session, user_id: int):
    """Инвалидирует все токены пользователя (при смене роли или смене пароля)"""
    db.query(models.AuthToken).filter(
        models.AuthToken.user_id == user_id,
        models.AuthToken.is_active == True
    ).update({
        "is_active": False,
        "revoked_at": datetime.utcnow()
    })
    db.commit()

def cleanup_expired_tokens(db: Session):
    """Удаляет истёкшие токены из БД (можно запускать периодически)"""
    now = datetime.utcnow()
    db.query(models.AuthToken).filter(
        models.AuthToken.expires_at < now
    ).delete()
    db.commit()

