import os
import httpx
import csv
from io import BytesIO, StringIO
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from openpyxl import Workbook

import schemas

app = FastAPI(title="Reports Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("JWT_ALG", "HS256")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
DEFECTS_SERVICE_URL = os.getenv("DEFECTS_SERVICE_URL", "http://localhost:8003")
PROJECTS_SERVICE_URL = os.getenv("PROJECTS_SERVICE_URL", "http://localhost:8002")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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

async def get_defects_from_service(token: str, params: dict = {}):
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{DEFECTS_SERVICE_URL}/defects/", headers={"Authorization": f"Bearer {token}"}, params=params)
        if response.status_code == 200:
            return response.json()
        return []

@app.get("/reports/defects/export")
async def export_defects(format: str = Query("csv", pattern="^(csv|xlsx)$"), current_user: dict = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    defects = await get_defects_from_service(token)
    
    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Title", "Description", "Priority", "Status", "Created At", "Due Date", "Reporter ID", "Assignee ID", "Project ID"])
        for defect in defects:
            writer.writerow([defect.get("id"), defect.get("title"), defect.get("description"), defect.get("priority"), defect.get("status"), defect.get("created_at"), defect.get("due_date"), defect.get("reporter_id"), defect.get("assignee_id"), defect.get("project_id")])
        output.seek(0)
        return StreamingResponse(BytesIO(output.getvalue().encode()), headers={"Content-Disposition": "attachment; filename=defects_report.csv"}, media_type="text/csv")
    
    elif format == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.append(["ID", "Title", "Description", "Priority", "Status", "Created At", "Due Date", "Reporter ID", "Assignee ID", "Project ID"])
        for defect in defects:
            ws.append([defect.get("id"), defect.get("title"), defect.get("description"), defect.get("priority"), defect.get("status"), defect.get("created_at"), defect.get("due_date"), defect.get("reporter_id"), defect.get("assignee_id"), defect.get("project_id")])
        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        return StreamingResponse(excel_file, headers={"Content-Disposition": "attachment; filename=defects_report.xlsx"}, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.get("/reports/analytics/summary", response_model=schemas.AnalyticsSummary)
async def get_analytics_summary(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, current_user: dict = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    defects = await get_defects_from_service(token)
    total_defects = len(defects)
    overdue_defects = sum(1 for d in defects if d.get("due_date") and datetime.fromisoformat(d.get("due_date").replace("Z", "+00:00")) < datetime.now() and d.get("status") not in ["Закрыта", "Отменена"])
    completed_defects = sum(1 for d in defects if d.get("status") in ["Закрыта", "Отменена"])
    completion_percentage = (completed_defects / total_defects * 100) if total_defects > 0 else 0.0
    active_projects = len(set(d.get("project_id") for d in defects if d.get("status") not in ["Закрыта", "Отменена"]))
    return schemas.AnalyticsSummary(total_defects=total_defects, overdue_defects=overdue_defects, completion_percentage=round(completion_percentage, 2), active_projects=active_projects)

@app.get("/reports/analytics/status-distribution", response_model=list[schemas.DefectCountByStatus])
async def get_status_distribution(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, current_user: dict = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    defects = await get_defects_from_service(token)
    status_counts = {}
    for defect in defects:
        status = defect.get("status", "Unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    return [schemas.DefectCountByStatus(status=status, count=count) for status, count in status_counts.items()]

@app.get("/reports/analytics/priority-distribution", response_model=list[schemas.DefectCountByPriority])
async def get_priority_distribution(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, current_user: dict = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    defects = await get_defects_from_service(token)
    priority_counts = {}
    for defect in defects:
        priority = defect.get("priority", "Unknown")
        priority_counts[priority] = priority_counts.get(priority, 0) + 1
    return [schemas.DefectCountByPriority(priority=priority, count=count) for priority, count in priority_counts.items()]

@app.get("/reports/analytics/creation-trend", response_model=list[schemas.DefectCreationTrendItem])
async def get_creation_trend(days: int = Query(30), current_user: dict = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    defects = await get_defects_from_service(token)
    date_counts = {}
    for defect in defects:
        created_at_str = defect.get("created_at")
        if created_at_str:
            try:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                date_key = created_at.date()
                date_counts[date_key] = date_counts.get(date_key, 0) + 1
            except:
                pass
    return [schemas.DefectCreationTrendItem(date=datetime.combine(date, datetime.min.time()), count=count) for date, count in sorted(date_counts.items())]

@app.get("/reports/analytics/project-performance", response_model=list[schemas.ProjectPerformanceItem])
async def get_project_performance(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, current_user: dict = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    defects = await get_defects_from_service(token)
    async with httpx.AsyncClient() as client:
        projects_response = await client.get(f"{PROJECTS_SERVICE_URL}/projects/", headers={"Authorization": f"Bearer {token}"})
        projects = projects_response.json() if projects_response.status_code == 200 else []
    
    project_stats = {}
    for defect in defects:
        project_id = defect.get("project_id")
        if project_id not in project_stats:
            project_stats[project_id] = {"total": 0, "completed": 0}
        project_stats[project_id]["total"] += 1
        if defect.get("status") in ["Закрыта", "Отменена"]:
            project_stats[project_id]["completed"] += 1
    
    performance_data = []
    for project in projects:
        project_id = project.get("id")
        stats = project_stats.get(project_id, {"total": 0, "completed": 0})
        total = stats["total"]
        completed = stats["completed"]
        completion_percentage = (completed / total * 100) if total > 0 else 0.0
        performance_data.append(schemas.ProjectPerformanceItem(project_id=project_id, project_title=project.get("title", ""), completed_defects=completed, total_defects=total, completion_percentage=round(completion_percentage, 2)))
    
    return performance_data

@app.get("/health")
async def health():
    return {"status": "healthy"}

