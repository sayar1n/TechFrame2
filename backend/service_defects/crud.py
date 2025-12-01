from sqlalchemy.orm import Session
import models
import schemas

def get_defect(db: Session, defect_id: int):
    return db.query(models.Defect).filter(models.Defect.id == defect_id).first()

def get_defects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Defect).offset(skip).limit(limit).all()

def create_defect(db: Session, defect: schemas.DefectCreate, reporter_id: int):
    db_defect = models.Defect(**defect.model_dump(), reporter_id=reporter_id)
    db.add(db_defect)
    db.commit()
    db.refresh(db_defect)
    return db_defect

def update_defect(db: Session, defect_id: int, defect: schemas.DefectCreate):
    db_defect = db.query(models.Defect).filter(models.Defect.id == defect_id).first()
    if db_defect:
        for key, value in defect.model_dump().items():
            setattr(db_defect, key, value)
        from datetime import datetime
        db_defect.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_defect)
    return db_defect

def delete_defect(db: Session, defect_id: int):
    db_defect = db.query(models.Defect).filter(models.Defect.id == defect_id).first()
    if db_defect:
        db.delete(db_defect)
        db.commit()
    return db_defect

def get_comments_by_defect(db: Session, defect_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Comment).filter(models.Comment.defect_id == defect_id).offset(skip).limit(limit).all()

def create_comment(db: Session, comment: schemas.CommentCreate, defect_id: int, author_id: int):
    db_comment = models.Comment(content=comment.content, defect_id=defect_id, author_id=author_id)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def get_attachments_by_defect(db: Session, defect_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Attachment).filter(models.Attachment.defect_id == defect_id).offset(skip).limit(limit).all()


def get_attachment(db: Session, attachment_id: int):
    return db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()

def delete_attachment(db: Session, attachment_id: int):
    db_attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
    if db_attachment:
        db.delete(db_attachment)
        db.commit()
    return db_attachment

