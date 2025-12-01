# Что такое Docker Image в микросервисах?

## 🐳 Что такое Docker Image?

**Docker Image (образ)** — это **шаблон** для создания контейнера.

### Аналогия:
- **Image** = чертёж дома 📋
- **Container** = построенный дом 🏠

Из одного чертежа (image) можно построить много домов (контейнеров).

---

## 📦 Что внутри Docker Image?

Docker Image содержит **всё необходимое** для запуска приложения:

1. **Операционная система** (обычно Linux)
2. **Python** (или другой язык программирования)
3. **Библиотеки** (FastAPI, SQLAlchemy, и т.д.)
4. **Твой код** (main.py, models.py, и т.д.)
5. **Команда запуска** (uvicorn main:app)

---

## 🏗️ Как создаётся Docker Image?

### Файл: `Dockerfile`

Это **инструкция** для создания образа.

**Пример:** `backend/service_auth/Dockerfile`

```dockerfile
# 1. Берём готовый образ с Python 3.11
FROM python:3.11-slim

# 2. Создаём рабочую папку
WORKDIR /app

# 3. Обновляем pip
RUN pip install --upgrade pip

# 4. Копируем requirements.txt
COPY requirements.txt .

# 5. Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# 6. Копируем весь код приложения
COPY . .

# 7. Открываем порт 8001
EXPOSE 8001

# 8. Команда запуска
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Что происходит при сборке?

```bash
docker-compose build auth-service
```

Docker выполняет каждую строку Dockerfile:
1. Скачивает базовый образ `python:3.11-slim` (если его нет)
2. Создаёт папку `/app`
3. Устанавливает библиотеки из `requirements.txt`
4. Копирует твой код в образ
5. Сохраняет готовый образ с именем `2-auth-service`

**Результат:** Готовый образ, который можно запустить.

---

## 🎯 Зачем нужны образы в микросервисах?

### Проблема без Docker:

У тебя 5 микросервисов:
- `auth-service` (Python 3.11, FastAPI 0.104)
- `projects-service` (Python 3.11, FastAPI 0.104)
- `defects-service` (Python 3.11, FastAPI 0.104)
- `reports-service` (Python 3.11, FastAPI 0.104)
- `api-gateway` (Python 3.11, FastAPI 0.104)

Без Docker тебе нужно:
1. Установить Python на компьютер
2. Создать 5 виртуальных окружений
3. Установить зависимости в каждое
4. Запустить 5 процессов вручную
5. Следить, чтобы они не конфликтовали

### Решение с Docker:

Каждый микросервис = отдельный образ = отдельный контейнер.

```
Image: 2-auth-service       →  Container: 2-auth-service-1
Image: 2-projects-service   →  Container: 2-projects-service-1
Image: 2-defects-service    →  Container: 2-defects-service-1
Image: 2-reports-service    →  Container: 2-reports-service-1
Image: 2-api-gateway        →  Container: 2-api-gateway-1
```

Каждый контейнер:
- Изолирован (не мешает другим)
- Имеет свой Python и библиотеки
- Запускается одной командой

---

## 📋 Где хранятся образы?

### 1. Локально на твоём компьютере

Посмотреть список образов:
```bash
docker images
```

Вывод:
```
REPOSITORY            TAG       IMAGE ID       CREATED         SIZE
2-auth-service        latest    3d0b41346a45   5 minutes ago   180MB
2-projects-service    latest    65dc31449ee9   5 minutes ago   178MB
2-defects-service     latest    1862293e453b   5 minutes ago   179MB
2-reports-service     latest    843e4fac835e   5 minutes ago   177MB
2-api-gateway         latest    674fb5d7e93b   5 minutes ago   176MB
2-frontend            latest    e2374d231913   5 minutes ago   450MB
python                3.11-slim 193fdd0bbcb3   2 weeks ago     130MB
node                  20-slim   fbb357f69d05   3 weeks ago     240MB
```

**Где физически:**
- Windows: `C:\ProgramData\Docker\windowsfilter\`
- Linux: `/var/lib/docker/overlay2/`

---

### 2. В Docker Hub (публичный реестр)

**Docker Hub** = GitHub для образов.

Примеры готовых образов:
- `python:3.11-slim` — базовый образ с Python
- `node:20-slim` — базовый образ с Node.js
- `postgres:15` — PostgreSQL база данных
- `nginx:latest` — веб-сервер

Когда ты пишешь `FROM python:3.11-slim`, Docker:
1. Проверяет, есть ли образ локально
2. Если нет, скачивает с Docker Hub
3. Использует как основу для твоего образа

---

## 🔄 Как работает docker-compose.yml?

**Файл:** `docker-compose.yml`

```yaml
services:
  auth-service:
    build: ./backend/service_auth  # Где искать Dockerfile
    environment:                   # Переменные окружения
      - SECRET_KEY=${SECRET_KEY}
    volumes:                       # Монтирование папок
      - ./backend/service_auth/data:/app/data
    networks:                      # Сеть для связи между сервисами
      - backend-network
```

### Что происходит при `docker-compose up --build`?

1. **Сборка образов:**
   ```
   docker-compose build
   ```
   - Читает `docker-compose.yml`
   - Для каждого сервиса находит `Dockerfile`
   - Собирает образ (выполняет инструкции из Dockerfile)
   - Сохраняет образ локально

2. **Создание контейнеров:**
   ```
   docker-compose up
   ```
   - Из каждого образа создаёт контейнер
   - Применяет настройки (порты, volumes, сети)
   - Запускает контейнеры

3. **Результат:**
   ```
   Container 2-auth-service-1       (из образа 2-auth-service)
   Container 2-projects-service-1   (из образа 2-projects-service)
   Container 2-defects-service-1    (из образа 2-defects-service)
   ...
   ```

---

## 🎨 Схема: Image → Container

```
┌─────────────────────────────────────────────────────────┐
│                    DOCKER IMAGE                         │
│  (Шаблон/Чертёж)                                        │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ FROM python:3.11-slim                   │           │
│  │ WORKDIR /app                            │           │
│  │ COPY requirements.txt .                 │           │
│  │ RUN pip install -r requirements.txt     │           │
│  │ COPY . .                                │           │
│  │ CMD ["uvicorn", "main:app", ...]        │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  Содержит:                                              │
│  - Linux (Debian slim)                                  │
│  - Python 3.11                                          │
│  - FastAPI, SQLAlchemy, и т.д.                         │
│  - Твой код (main.py, models.py, ...)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                        │
                        │ docker run
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  DOCKER CONTAINER                       │
│  (Запущенное приложение)                                │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │ Процесс: uvicorn main:app               │           │
│  │ Порт: 8001                              │           │
│  │ Сеть: backend-network                   │           │
│  │ Volume: ./data → /app/data              │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  Работает как отдельный мини-компьютер:                 │
│  - Своя файловая система                                │
│  - Свои процессы                                        │
│  - Свой IP адрес                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Разница: Image vs Container

| Характеристика | Image (Образ) | Container (Контейнер) |
|----------------|---------------|----------------------|
| **Что это?** | Шаблон/чертёж | Запущенное приложение |
| **Состояние** | Статичный (не меняется) | Динамичный (работает) |
| **Можно запустить?** | Нет | Да |
| **Можно изменить?** | Нет (только пересобрать) | Да (но изменения временные) |
| **Сколько может быть?** | Один образ | Много контейнеров из одного образа |
| **Команда создания** | `docker build` | `docker run` |
| **Команда просмотра** | `docker images` | `docker ps` |

---

## 💡 Зачем это нужно в микросервисах?

### 1. **Изоляция**

Каждый микросервис в своём контейнере:
- Не мешает другим
- Имеет свои библиотеки
- Может использовать разные версии Python

### 2. **Портативность**

Образ можно запустить где угодно:
- На твоём компьютере (Windows)
- На сервере (Linux)
- В облаке (AWS, Google Cloud)

### 3. **Масштабируемость**

Из одного образа можно запустить 10 контейнеров:
```bash
docker-compose up --scale auth-service=10
```

### 4. **Простота развёртывания**

Вместо:
```bash
# Установить Python
# Создать venv
# pip install -r requirements.txt
# Настроить переменные окружения
# Запустить uvicorn
```

Достаточно:
```bash
docker-compose up
```

---

## 📊 Твоя архитектура с образами

```
┌──────────────────────────────────────────────────────────┐
│                    DOCKER HOST                           │
│                  (Твой компьютер)                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              DOCKER NETWORK                        │ │
│  │           (backend-network)                        │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐              │ │
│  │  │ Container    │  │ Container    │              │ │
│  │  │ auth-service │  │ projects     │              │ │
│  │  │ (Image:      │  │ (Image:      │              │ │
│  │  │ 2-auth-      │  │ 2-projects-  │              │ │
│  │  │ service)     │  │ service)     │              │ │
│  │  └──────────────┘  └──────────────┘              │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐              │ │
│  │  │ Container    │  │ Container    │              │ │
│  │  │ defects      │  │ api-gateway  │              │ │
│  │  │ (Image:      │  │ (Image:      │              │ │
│  │  │ 2-defects-   │  │ 2-api-       │              │ │
│  │  │ service)     │  │ gateway)     │              │ │
│  │  └──────────────┘  └──────────────┘              │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Volumes (монтированные папки):                          │
│  - ./backend/service_auth/data → /app/data              │
│  - ./backend/service_projects/data → /app/data          │
│  - ./backend/service_defects/data → /app/data           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 Итог

### Что такое Docker Image:
- **Шаблон** для создания контейнера
- Содержит **всё необходимое** для запуска приложения
- Создаётся из **Dockerfile**

### Зачем нужны образы:
- **Изоляция** микросервисов
- **Портативность** (работает везде одинаково)
- **Простота** развёртывания

### Как это работает:
1. `Dockerfile` → инструкция
2. `docker build` → создаёт Image
3. `docker run` → создаёт Container из Image
4. Container → запущенное приложение

### В твоём проекте:
- 6 образов (auth, projects, defects, reports, gateway, frontend)
- 6 контейнеров (по одному из каждого образа)
- Все связаны через сеть `backend-network`
- Данные сохраняются в локальные папки через volumes

