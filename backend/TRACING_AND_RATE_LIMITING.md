# Трассировка запросов (X-Request-ID) и Rate Limiting

## 🔍 X-Request-ID (Трассировка запросов)

### Что это?

**X-Request-ID** — уникальный идентификатор для каждого HTTP-запроса, который позволяет отследить путь запроса через все микросервисы.

### Зачем нужно?

Когда клиент делает запрос:
```
Frontend → API Gateway → service_auth → БД
```

Без X-Request-ID в логах будет:
```
[Gateway] POST /auth/register
[Auth] POST /auth/register
```

С X-Request-ID в логах будет:
```
[Gateway] [abc-123] POST /auth/register
[Auth] [abc-123] POST /auth/register
```

Теперь ты **точно знаешь**, что это один и тот же запрос!

---

### Как это работает?

#### 1. API Gateway генерирует или принимает X-Request-ID

**Файл:** `backend/api_gateway/main.py`

```python
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Если клиент прислал X-Request-ID, используем его
        # Иначе генерируем новый UUID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Сохраняем в request.state
        request.state.request_id = request_id
        
        # Выполняем запрос
        response = await call_next(request)
        
        # Добавляем X-Request-ID в ответ
        response.headers["X-Request-ID"] = request_id
        
        return response
```

#### 2. API Gateway прокидывает X-Request-ID в микросервисы

```python
async def proxy_request(request: Request, service_url: str, path: str, ...):
    headers = {}
    
    # Прокидываем X-Request-ID
    if hasattr(request.state, "request_id"):
        headers["X-Request-ID"] = request.state.request_id
    
    # Отправляем запрос в микросервис
    response = await client.request(..., headers=headers)
```

#### 3. Микросервисы получают и логируют X-Request-ID

**Файл:** `backend/service_auth/main.py` (и другие сервисы)

```python
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        
        # Логируем с X-Request-ID
        logger.info(f"[{request_id}] {request.method} {request.url.path}")
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        logger.info(f"[{request_id}] Response: {response.status_code}")
        
        return response
```

---

### Пример полной трассировки

**Запрос:** `POST /auth/register`

**Логи:**

```
[API Gateway] [f47ac10b] POST /auth/register
[API Gateway] [f47ac10b] Proxying to http://auth-service:8001/auth/register
[Auth Service] [f47ac10b] POST /auth/register
[Auth Service] [f47ac10b] Creating user: john@example.com
[Auth Service] [f47ac10b] Response: 200
[API Gateway] [f47ac10b] Response: 200
```

Теперь по ID `f47ac10b` можно **отследить весь путь запроса**!

---

### Как использовать на клиенте?

**Frontend может генерировать свой X-Request-ID:**

```typescript
const response = await fetch('http://localhost:8000/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Request-ID': 'frontend-' + Date.now()  // Свой ID
  },
  body: JSON.stringify(userData)
});

// В ответе будет тот же X-Request-ID
const requestId = response.headers.get('X-Request-ID');
console.log('Request ID:', requestId);
```

---

## ⏱️ Rate Limiting (Ограничение частоты запросов)

### Что это?

**Rate Limiting** — ограничение количества запросов от одного клиента за определённый период времени.

### Зачем нужно?

1. **Защита от DDoS** — злоумышленник не может завалить сервер запросами
2. **Защита от брутфорса** — нельзя перебирать пароли быстро
3. **Справедливое использование** — один пользователь не может занять все ресурсы

---

### Как это работает?

**Библиотека:** `slowapi` (для FastAPI)

**Файл:** `backend/api_gateway/main.py`

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Создаём limiter (по IP-адресу клиента)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="API Gateway", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

---

### Настройка лимитов для разных эндпоинтов

```python
@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@limiter.limit("20/minute")  # Максимум 20 запросов в минуту
async def auth_proxy(request: Request, path: str = ""):
    # ...
```

**Текущие лимиты:**

| Эндпоинт | Лимит | Причина |
|----------|-------|---------|
| `/` (root) | 100/minute | Информационный эндпоинт |
| `/auth/*` | 20/minute | Защита от брутфорса паролей |
| `/projects/*` | 60/minute | Обычные операции |
| `/defects/*` | 60/minute | Обычные операции |
| `/reports/*` | 30/minute | Тяжёлые операции (генерация отчётов) |

---

### Что происходит при превышении лимита?

**Ответ сервера:**

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded: 20 per 1 minute"
}
```

**Заголовки:**

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1701436800
```

- `Limit` — максимум запросов
- `Remaining` — сколько осталось
- `Reset` — когда счётчик обнулится (Unix timestamp)

---

### Как настроить лимиты?

**Изменить лимит:**

```python
@limiter.limit("100/minute")  # 100 запросов в минуту
@limiter.limit("10/second")   # 10 запросов в секунду
@limiter.limit("1000/hour")   # 1000 запросов в час
@limiter.limit("5/minute")    # Очень строгий лимит
```

**Отключить лимит для конкретного эндпоинта:**

```python
@app.get("/health")
async def health(request: Request):
    return {"status": "healthy"}
    # Нет декоратора @limiter.limit() = нет ограничений
```

---

## 🔄 Полная схема работы

```
1. Клиент отправляет запрос
   POST /auth/register
   
2. API Gateway
   ├─ Генерирует X-Request-ID: "abc-123"
   ├─ Проверяет Rate Limit (20/minute)
   │  └─ Если превышен → 429 Too Many Requests
   ├─ Логирует: [abc-123] POST /auth/register
   └─ Прокидывает в service_auth с заголовком X-Request-ID: abc-123

3. Service Auth
   ├─ Получает X-Request-ID: "abc-123"
   ├─ Логирует: [abc-123] POST /auth/register
   ├─ Создаёт пользователя
   ├─ Логирует: [abc-123] Response: 200
   └─ Возвращает ответ с заголовком X-Request-ID: abc-123

4. API Gateway
   ├─ Получает ответ от service_auth
   ├─ Логирует: [abc-123] Response: 200
   └─ Возвращает клиенту с заголовком X-Request-ID: abc-123

5. Клиент получает ответ
   X-Request-ID: abc-123
```

---

## 📊 Просмотр логов с трассировкой

### Найти все логи для конкретного запроса:

```bash
# В Docker
docker-compose logs | grep "abc-123"

# Локально
grep "abc-123" backend/service_auth/logs/auth-service.log
```

**Вывод:**
```
[Gateway] [abc-123] POST /auth/register
[Gateway] [abc-123] Proxying to auth-service
[Auth] [abc-123] POST /auth/register
[Auth] [abc-123] Creating user: john@example.com
[Auth] [abc-123] Response: 200
[Gateway] [abc-123] Response: 200
```

Видишь **весь путь запроса** через все сервисы!

---

## 🧪 Как протестировать?

### 1. Тест X-Request-ID

```bash
# Отправить запрос с кастомным X-Request-ID
curl -H "X-Request-ID: test-123" http://localhost:8000/health

# В ответе должен быть тот же ID
# X-Request-ID: test-123
```

### 2. Тест Rate Limiting

```bash
# Отправить 25 запросов подряд (лимит 20/minute)
for i in {1..25}; do
  curl http://localhost:8000/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"test","email":"test@test.com","password":"123"}' \
    -w "\nStatus: %{http_code}\n"
done

# Первые 20 запросов: 200 или 400
# Последние 5 запросов: 429 Too Many Requests
```

---

## 📝 Итог

### Что добавлено:

✅ **X-Request-ID** во всех сервисах:
- API Gateway
- service_auth
- service_projects
- service_defects

✅ **Rate Limiting** в API Gateway:
- `/auth/*` — 20 запросов/минуту
- `/projects/*` — 60 запросов/минуту
- `/defects/*` — 60 запросов/минуту
- `/reports/*` — 30 запросов/минуту

✅ **Логирование с трассировкой**:
- Каждый запрос логируется с X-Request-ID
- Можно отследить путь запроса через все сервисы

### Преимущества:

- 🔍 **Отладка** — легко найти проблемный запрос
- 🛡️ **Безопасность** — защита от DDoS и брутфорса
- 📊 **Мониторинг** — видно, какие запросы медленные
- 🎯 **Поддержка** — пользователь может прислать Request-ID при проблеме

