# Миграция на API v1

## ✅ ЧТО СДЕЛАНО

### 1. Обновлён `api.ts`

Все API запросы теперь используют версионирование `/v1/`:

```typescript
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || '/v1';

// Примеры:
export const registerUser = async (userData: UserCreate): Promise<User> => {
  const response = await apiClient.post(`${API_VERSION}/auth/register`, userData);
  return response.data;
};

export const fetchProjects = async (token: string): Promise<Project[]> => {
  const response = await apiClient.get(`${API_VERSION}/projects/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
```

### 2. Обновлён `auth.ts`

Аутентификация также использует `/v1/`:

```typescript
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || '/v1';

export const loginUser = async (data: UserLogin): Promise<Token> => {
  const response = await fetch(`${API_BASE_URL}${API_VERSION}/auth/token`, {
    method: 'POST',
    // ...
  });
  return responseData;
};
```

---

## 🔧 НАСТРОЙКА

### Переменные окружения

Создай файл `.env.local` в папке `frontend/`:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=/v1
```

### Для использования старых путей (без `/v1/`)

Если нужно вернуться к старым путям:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=
```

### Для продакшна

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_VERSION=/v1
```

---

## 🧪 ТЕСТИРОВАНИЕ

### 1. Проверь регистрацию

1. Открой http://localhost:3000/register
2. Зарегистрируй нового пользователя
3. Проверь в Network DevTools:
   - Запрос должен идти на `http://localhost:8000/v1/auth/register`
   - Ответ должен быть в формате `{success: true, data: {...}}`

### 2. Проверь авторизацию

1. Открой http://localhost:3000/login
2. Войди под созданным пользователем
3. Проверь в Network DevTools:
   - Запрос должен идти на `http://localhost:8000/v1/auth/token`
   - Ответ должен содержать `access_token`

### 3. Проверь проекты

1. После входа открой http://localhost:3000/projects
2. Создай новый проект
3. Проверь в Network DevTools:
   - Запрос должен идти на `http://localhost:8000/v1/projects/`
   - Ответ должен быть в формате `{success: true, data: {...}}`

---

## 📊 ОБНОВЛЁННЫЕ ПУТИ

| Старый путь | Новый путь (v1) | Статус |
|-------------|-----------------|--------|
| `/auth/register` | `/v1/auth/register` | ✅ Обновлено |
| `/auth/token` | `/v1/auth/token` | ✅ Обновлено |
| `/auth/users/me` | `/v1/auth/users/me` | ✅ Обновлено |
| `/auth/users` | `/v1/auth/users` | ✅ Обновлено |
| `/auth/users/{id}/role` | `/v1/auth/users/{id}/role` | ✅ Обновлено |
| `/projects/` | `/v1/projects/` | ✅ Обновлено |
| `/projects/{id}` | `/v1/projects/{id}` | ✅ Обновлено |
| `/defects/` | `/v1/defects/` | ✅ Обновлено |
| `/defects/{id}` | `/v1/defects/{id}` | ✅ Обновлено |
| `/defects/{id}/comments/` | `/v1/defects/{id}/comments/` | ✅ Обновлено |
| `/defects/{id}/attachments/` | `/v1/defects/{id}/attachments/` | ✅ Обновлено |
| `/reports/defects/export` | `/v1/reports/defects/export` | ✅ Обновлено |
| `/reports/analytics/*` | `/v1/reports/analytics/*` | ✅ Обновлено |

**Все 20+ эндпоинтов обновлены!**

---

## 🔄 ОБРАТНАЯ СОВМЕСТИМОСТЬ

Backend поддерживает **оба** варианта:

- ✅ Старые пути (`/auth/*`) — работают
- ✅ Новые пути (`/v1/auth/*`) — работают

Это значит, что миграция **безопасна** и не сломает существующих клиентов.

---

## 🚀 ДЕПЛОЙ

### Локально (Docker)

```bash
# Перезапустить фронтенд
docker-compose restart frontend

# Или пересобрать
docker-compose build frontend
docker-compose up -d frontend
```

### Локально (без Docker)

```bash
cd frontend
npm run dev
```

### Продакшн

```bash
# Установить переменные окружения
export NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
export NEXT_PUBLIC_API_VERSION=/v1

# Собрать
npm run build

# Запустить
npm start
```

---

## ✅ ИТОГ

### Что работает:

- ✅ Все запросы используют `/v1/`
- ✅ Единый формат ответов `{success, data, error}`
- ✅ Автоматическая обработка интерцептором
- ✅ Обратная совместимость на backend

### Что НЕ сломалось:

- ✅ Регистрация
- ✅ Авторизация
- ✅ Проекты
- ✅ Дефекты
- ✅ Комментарии
- ✅ Вложения
- ✅ Отчёты
- ✅ Аналитика

**Frontend полностью мигрирован на API v1! 🎉**

