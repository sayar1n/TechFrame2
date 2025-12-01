from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Получаем абсолютный путь к папке сервиса
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
ATTACHMENTS_DIR = os.path.join(BASE_DIR, "attachments")

# Создаём папки, если их нет
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)

# Путь к БД
DB_PATH = os.path.join(DATA_DIR, "defects.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

print(f"[DEFECTS] Database path: {DB_PATH}")
print(f"[DEFECTS] Attachments path: {ATTACHMENTS_DIR}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()




