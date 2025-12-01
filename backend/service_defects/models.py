from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from database import Base

class Defect(Base):
    __tablename__ = "defects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="Средний")
    status = Column(String, default="Новая")
    project_id = Column(Integer, nullable=False)
    reporter_id = Column(Integer, nullable=False)
    assignee_id = Column(Integer, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False)
    author_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False)
    uploader_id = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)




