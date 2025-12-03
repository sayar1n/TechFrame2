import os
import httpx
import yaml
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from jose import JWTError, jwt

app = FastAPI(title="API Gateway", version="1.0.0")

# Переопределяем OpenAPI документацию кастомным файлом
def custom_openapi():
    # ВАЖНО: не кешируем, всегда читаем файл заново для отладки
    # if app.openapi_schema:
    #     return app.openapi_schema
    
    # Путь к кастомному openapi.yaml
    # В Docker: /app/docs/openapi.yaml
    # Локально: ../../docs/openapi.yaml
    if os.path.exists("/app/docs/openapi.yaml"):
        openapi_file = "/app/docs/openapi.yaml"
    else:
        openapi_file = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "openapi.yaml")
    
    print(f"[DEBUG] Загрузка OpenAPI из: {openapi_file}")
    print(f"[DEBUG] Файл существует: {os.path.exists(openapi_file)}")
    
    if os.path.exists(openapi_file):
        try:
            with open(openapi_file, "r", encoding="utf-8") as f:
                openapi_schema = yaml.safe_load(f)
                print(f"[DEBUG] OpenAPI загружен! Количество путей: {len(openapi_schema.get('paths', {}))}")
                app.openapi_schema = openapi_schema
                return app.openapi_schema
        except Exception as e:
            print(f"[ERROR] Ошибка загрузки openapi.yaml: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"[ERROR] Файл openapi.yaml не найден по пути: {openapi_file}")
    
    # Если файл не найден, используем стандартную генерацию FastAPI
    print("[WARNING] Используем стандартную генерацию OpenAPI")
    from fastapi.openapi.utils import get_openapi
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# Заменяем метод openapi
app.openapi = custom_openapi

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
PROJECTS_SERVICE_URL = os.getenv("PROJECTS_SERVICE_URL", "http://localhost:8002")
DEFECTS_SERVICE_URL = os.getenv("DEFECTS_SERVICE_URL", "http://localhost:8003")
REPORTS_SERVICE_URL = os.getenv("REPORTS_SERVICE_URL", "http://localhost:8004")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("JWT_ALG", "HS256")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

PUBLIC_ROUTES = ["/", "/auth/register", "/auth/token", "/v1/auth/register", "/v1/auth/token", "/docs", "/openapi.json", "/redoc"]

async def verify_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing", headers={"WWW-Authenticate": "Bearer"})
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return token
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})

async def proxy_request(request: Request, service_url: str, path: str, require_auth: bool = True):
    if request.method == "OPTIONS":
        return JSONResponse(status_code=200, content={})
    
    if require_auth and request.url.path not in PUBLIC_ROUTES:
        await verify_token(request)
    
    headers = {}
    content_type = request.headers.get("Content-Type", "")
    if content_type:
        headers["Content-Type"] = content_type
    if "Authorization" in request.headers:
        headers["Authorization"] = request.headers["Authorization"]
    
    target_url = f"{service_url}{path}"
    query_params = dict(request.query_params)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if "multipart/form-data" in content_type:
                form_data = await request.form()
                files = {}
                data = {}
                for key, value in form_data.items():
                    if hasattr(value, "file"):
                        files[key] = (value.filename, value.file, value.content_type)
                    else:
                        data[key] = value
                response = await client.request(method=request.method, url=target_url, headers=headers, files=files if files else None, data=data if data else None, params=query_params)
            else:
                body = None
                if request.method in ["POST", "PUT", "PATCH"]:
                    try:
                        body = await request.body()
                    except:
                        pass
                response = await client.request(method=request.method, url=target_url, headers=headers, content=body, params=query_params)
            
            response_content_type = response.headers.get("content-type", "").lower()
            if "application/json" in response_content_type:
                try:
                    content = response.json()
                except:
                    content = {"data": response.text}
                return JSONResponse(content=content, status_code=response.status_code, headers=dict(response.headers))
            elif "application/vnd.openxmlformats" in response_content_type or "text/csv" in response_content_type:
                return Response(content=response.content, status_code=response.status_code, headers=dict(response.headers), media_type=response_content_type)
            else:
                return Response(content=response.content, status_code=response.status_code, headers=dict(response.headers))
    except httpx.RequestError as e:
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"success": False, "error": {"code": "SERVICE_UNAVAILABLE", "message": str(e)}})

@app.get("/", include_in_schema=False)
async def root():
    return {"message": "API Gateway", "version": "1.0.0"}

@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def auth_proxy(request: Request, path: str = ""):
    public_auth_paths = ["register", "token"]
    require_auth = path not in public_auth_paths
    target_path = f"/auth/{path}" if path else "/auth/"
    return await proxy_request(request, AUTH_SERVICE_URL, target_path, require_auth=require_auth)

@app.api_route("/projects/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def projects_proxy(request: Request, path: str = ""):
    target_path = f"/projects/{path}" if path else "/projects/"
    return await proxy_request(request, PROJECTS_SERVICE_URL, target_path, require_auth=True)

@app.api_route("/defects/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def defects_proxy(request: Request, path: str = ""):
    target_path = f"/defects/{path}" if path else "/defects/"
    return await proxy_request(request, DEFECTS_SERVICE_URL, target_path, require_auth=True)

@app.api_route("/reports/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def reports_proxy(request: Request, path: str = ""):
    target_path = f"/reports/{path}" if path else "/reports/"
    return await proxy_request(request, REPORTS_SERVICE_URL, target_path, require_auth=True)

@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "healthy"}

@app.get("/debug-openapi", include_in_schema=False)
async def debug_openapi():
    """Отладочный эндпоинт для проверки загрузки openapi.yaml"""
    if os.path.exists("/app/docs/openapi.yaml"):
        openapi_file = "/app/docs/openapi.yaml"
    else:
        openapi_file = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "openapi.yaml")
    
    return {
        "openapi_file_path": openapi_file,
        "file_exists": os.path.exists(openapi_file),
        "schema_loaded": app.openapi_schema is not None,
        "paths_count": len(app.openapi_schema.get("paths", {})) if app.openapi_schema else 0,
        "paths": list(app.openapi_schema.get("paths", {}).keys()) if app.openapi_schema else []
    }

# ==================== API v1 (версионирование) ====================

@app.api_route("/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def auth_proxy_v1(request: Request, path: str = ""):
    """API v1: Auth endpoints"""
    public_auth_paths = ["register", "token"]
    require_auth = path not in public_auth_paths
    target_path = f"/auth/{path}" if path else "/auth/"
    return await proxy_request(request, AUTH_SERVICE_URL, target_path, require_auth=require_auth)

@app.api_route("/v1/projects/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def projects_proxy_v1(request: Request, path: str = ""):
    """API v1: Projects endpoints"""
    target_path = f"/projects/{path}" if path else "/projects/"
    return await proxy_request(request, PROJECTS_SERVICE_URL, target_path, require_auth=True)

@app.api_route("/v1/defects/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def defects_proxy_v1(request: Request, path: str = ""):
    """API v1: Defects endpoints"""
    target_path = f"/defects/{path}" if path else "/defects/"
    return await proxy_request(request, DEFECTS_SERVICE_URL, target_path, require_auth=True)

@app.api_route("/v1/reports/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], include_in_schema=False)
async def reports_proxy_v1(request: Request, path: str = ""):
    """API v1: Reports endpoints"""
    target_path = f"/reports/{path}" if path else "/reports/"
    return await proxy_request(request, REPORTS_SERVICE_URL, target_path, require_auth=True)

