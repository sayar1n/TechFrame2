from pydantic import BaseModel
from datetime import datetime

class AnalyticsSummary(BaseModel):
    total_defects: int
    overdue_defects: int
    completion_percentage: float
    active_projects: int

class DefectCountByStatus(BaseModel):
    status: str
    count: int

class DefectCountByPriority(BaseModel):
    priority: str
    count: int

class DefectCreationTrendItem(BaseModel):
    date: datetime
    count: int

class ProjectPerformanceItem(BaseModel):
    project_id: int
    project_title: str
    completed_defects: int
    total_defects: int
    completion_percentage: float




