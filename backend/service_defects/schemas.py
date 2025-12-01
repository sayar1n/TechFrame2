from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DefectBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Средний"
    status: Optional[str] = "Новая"
    project_id: int
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None

class DefectCreate(DefectBase):
    pass

class Defect(DefectBase):
    id: int
    reporter_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    defect_id: int
    author_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class AttachmentBase(BaseModel):
    filename: str
    file_path: str

class Attachment(AttachmentBase):
    id: int
    defect_id: int
    uploader_id: int
    uploaded_at: datetime
    
    class Config:
        from_attributes = True




