# Как работают JWT токены в твоём проекте

## 🔐 Что такое JWT токен?

**JWT (JSON Web Token)** — это зашифрованная строка, которая содержит информацию о пользователе.

Пример JWT токена:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNzAxNDM2ODAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Этот токен состоит из 3 частей (разделены точками):
1. **Заголовок** — алгоритм шифрования (HS256)
2. **Данные** — информация о пользователе (username, время истечения)
3. **Подпись** — проверка подлинности токена

---

## 📍 Где создаются токены?

### 1. При логине (`POST /auth/token`)

**Файл:** `backend/service_auth/main.py`

```python
@app.post("/auth/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Проверяем логин и пароль
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not crud.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    # 2. Создаём JWT токен
    access_token_expires = timedelta(minutes=30)  # Токен живёт 30 минут
    expires_at = datetime.utcnow() + access_token_expires
    access_token = create_access_token(
        data={"sub": user.username},  # "sub" = subject (кто это)
        expires_delta=access_token_expires
    )
    
    # 3. Сохраняем токен в БД
    crud.save_token(db, user.id, access_token, expires_at)
    
    # 4. Отправляем токен клиенту
    return {"access_token": access_token, "token_type": "bearer"}
```

**Функция создания токена:**

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})  # Добавляем время истечения
    
    # Шифруем данные с помощью SECRET_KEY
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

---

## 💾 Где хранятся токены?

### 1. На клиенте (фронтенд)

**Файл:** `frontend/src/app/context/AuthContext.tsx`

```typescript
const login = async (username: string, password: string) => {
    const response: Token = await loginUser({ username, password });
    
    // Сохраняем токен в localStorage браузера
    localStorage.setItem('access_token', response.access_token);
    
    setToken(response.access_token);
    // ...
};
```

**Где физически:** В браузере пользователя в `localStorage`

**Как посмотреть:**
1. Открой DevTools в браузере (F12)
2. Вкладка "Application" → "Local Storage" → `http://localhost:3000`
3. Увидишь: `access_token: "eyJhbGc..."`

---

### 2. На сервере (backend)

**Файл БД:** `backend/service_auth/data/auth.db`

**Таблица:** `auth_tokens`

**Структура:**
```sql
CREATE TABLE auth_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,           -- ID пользователя
    token TEXT NOT NULL UNIQUE,         -- Сам JWT токен (полная строка)
    is_active BOOLEAN DEFAULT TRUE,     -- Активен ли токен
    created_at DATETIME,                -- Когда создан
    expires_at DATETIME NOT NULL,       -- Когда истекает
    revoked_at DATETIME                 -- Когда был инвалидирован (logout)
);
```

**Зачем хранить токены в БД?**
- Чтобы можно было **инвалидировать** токен (logout)
- Чтобы при смене роли **старые токены перестали работать**
- Чтобы видеть, кто сейчас залогинен

---

## 🔄 Как работает авторизация при каждом запросе?

### Шаг 1: Клиент отправляет запрос с токеном

**Файл:** `frontend/src/app/utils/api.ts`

```typescript
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        // Добавляем токен в заголовок Authorization
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

**Пример запроса:**
```http
GET /projects/ HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Шаг 2: API Gateway проверяет токен

**Файл:** `backend/api_gateway/main.py`

```python
async def verify_token(request: Request):
    # 1. Достаём токен из заголовка
    auth_header = request.headers.get("Authorization")
    scheme, token = auth_header.split()  # "Bearer" + токен
    
    # 2. Расшифровываем JWT
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username = payload.get("sub")  # Достаём username
    
    # 3. Если всё ОК, пропускаем запрос дальше
    return token
```

---

### Шаг 3: Сервис проверяет токен в БД

**Файл:** `backend/service_auth/main.py`

```python
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # 1. Расшифровываем JWT
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username = payload.get("sub")
    
    # 2. Проверяем, что токен активен в БД
    db_token = crud.get_token(db, token)
    if not db_token or not db_token.is_active:
        raise HTTPException(401, detail="Token has been revoked")
    
    # 3. Проверяем, что токен не истёк
    if db_token.expires_at < datetime.utcnow():
        raise HTTPException(401, detail="Token has expired")
    
    # 4. Получаем пользователя
    user = crud.get_user_by_username(db, username=username)
    return user
```

---

## 🚪 Как работает Logout?

**Файл:** `backend/service_auth/main.py`

```python
@app.post("/auth/logout")
async def logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # Помечаем токен как неактивный в БД
    crud.revoke_token(db, token)
    return {"message": "Successfully logged out"}
```

**Файл:** `backend/service_auth/crud.py`

```python
def revoke_token(db: Session, token: str):
    db_token = db.query(models.AuthToken).filter(models.AuthToken.token == token).first()
    if db_token:
        db_token.is_active = False  # Деактивируем
        db_token.revoked_at = datetime.utcnow()  # Записываем время
        db.commit()
    return db_token
```

После logout токен остаётся в БД, но с `is_active = False`, поэтому больше не работает.

---

## 🔄 Что происходит при смене роли?

**Файл:** `backend/service_auth/crud.py`

```python
def update_user_role(db: Session, user_id: int, new_role: str):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.role = new_role
        db.commit()
        db.refresh(db_user)
        
        # ВАЖНО: Инвалидируем все токены пользователя!
        revoke_all_user_tokens(db, user_id)
    
    return db_user
```

Это гарантирует, что пользователь **должен заново залогиниться**, чтобы получить токен с новой ролью.

---

## 📊 Схема работы токенов

```
1. ЛОГИН
   Клиент → POST /auth/token (username, password)
   Сервер → Проверяет пароль
   Сервер → Создаёт JWT токен
   Сервер → Сохраняет токен в auth_tokens (is_active=true)
   Сервер → Отправляет токен клиенту
   Клиент → Сохраняет токен в localStorage

2. ЗАПРОС К API
   Клиент → GET /projects/ + Authorization: Bearer <token>
   API Gateway → Проверяет JWT (расшифровка)
   API Gateway → Пропускает запрос дальше
   Service → Проверяет токен в БД (is_active?)
   Service → Если OK, выполняет запрос
   Service → Возвращает данные

3. LOGOUT
   Клиент → POST /auth/logout + Authorization: Bearer <token>
   Сервер → Находит токен в auth_tokens
   Сервер → Устанавливает is_active=false
   Клиент → Удаляет токен из localStorage

4. СМЕНА РОЛИ
   Admin → PUT /auth/users/5/role?new_role=manager
   Сервер → Обновляет role в users
   Сервер → Инвалидирует ВСЕ токены пользователя (is_active=false)
   Пользователь → Должен заново залогиниться
```

---

## 🔒 Безопасность

### Что защищает токены?

1. **SECRET_KEY** — секретный ключ для шифрования (в `.env` файле)
   - Никто не может подделать токен без этого ключа
   
2. **Время истечения** — токен живёт только 30 минут
   - Даже если токен украдут, он скоро станет недействительным
   
3. **Проверка в БД** — токен должен быть активен
   - Можем инвалидировать токен в любой момент (logout, смена роли)

### Что НЕ защищено?

- **localStorage** — если злоумышленник получит доступ к браузеру, он может украсть токен
- **HTTP** — токены передаются в открытом виде (нужен HTTPS в production!)

---

## 📝 Итог

### Где хранятся токены:
1. **На клиенте:** `localStorage` браузера
2. **На сервере:** `backend/service_auth/data/auth.db` → таблица `auth_tokens`

### Как работает:
1. Логин → создаётся токен → сохраняется в БД и localStorage
2. Каждый запрос → токен отправляется в заголовке → проверяется JWT + БД
3. Logout → токен деактивируется в БД
4. Смена роли → все токены деактивируются

### Зачем хранить в БД:
- Чтобы можно было инвалидировать токены
- Чтобы контролировать активные сессии
- Чтобы при смене роли старые токены перестали работать

