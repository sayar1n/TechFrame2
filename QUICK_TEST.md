# ⚡ Быстрый запуск тестов

## 📋 Что реализовано

✅ **План тестирования** — `docs/TEST_PLAN.md`  
✅ **5 юнит-тестов** — проверка отдельных функций  
✅ **2 интеграционных сценария** — проверка взаимодействия сервисов  
✅ **3 User Stories теста** — проверка критериев приёмки  
✅ **4 нагрузочных теста** — проверка производительности (≤ 1 сек)

**Всего:** **14 тестов** с **70 автоматическими проверками**

---

## 🚀 Запуск тестов

### Вариант 1: Postman Desktop (рекомендуется)

```bash
# 1. Запусти сервисы
docker-compose up -d

# 2. Открой Postman
# File → Import → docs/postman_collection_with_tests.json

# 3. Запусти все тесты
# Run → Select All → Run Collection
```

### Вариант 2: Newman (CLI)

```bash
# 1. Установи Newman
npm install -g newman

# 2. Запусти сервисы
docker-compose up -d

# 3. Запусти тесты
newman run docs/postman_collection_with_tests.json
```

---

## 📊 Ожидаемый результат

```
┌─────────────────────────┬────────────────────┬───────────────────┐
│                         │           executed │            failed │
├─────────────────────────┼────────────────────┼───────────────────┤
│              iterations │                  1 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│                requests │                 14 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│            test-scripts │                 14 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│              assertions │                 70 │                 0 │
└─────────────────────────┴────────────────────┴───────────────────┘

✅ Все тесты прошли!
```

---

## 📋 Структура тестов

### 1. UNIT TESTS (5 тестов)
- ✅ Register User
- ✅ Login User
- ✅ Create Project
- ✅ Create Defect
- ✅ Update Defect Status

### 2. INTEGRATION TESTS (2 теста)
- ✅ Full Project Lifecycle
- ✅ Security & Access Control

### 3. USER STORIES TESTS (3 теста)
- ✅ Registration & Login
- ✅ Project Management
- ✅ Defect Tracking

### 4. PERFORMANCE TESTS (4 теста)
- ✅ Health Check (≤ 500ms)
- ✅ Get Projects (≤ 1000ms)
- ✅ Create Defect (≤ 1000ms)
- ✅ Get Defects List (≤ 1000ms)

---

## 📁 Документация

- **План тестирования:** `docs/TEST_PLAN.md`
- **Postman коллекция:** `docs/postman_collection_with_tests.json`
- **Отчёт о тестировании:** `docs/TEST_REPORT.md`

---

## ✅ Критерии выполнения

| Требование | Статус |
|------------|--------|
| План тестирования | ✅ Готов |
| ≥ 5 юнит-тестов | ✅ 5 тестов |
| ≥ 2 интеграционных | ✅ 2 сценария |
| User Stories | ✅ 3 истории |
| Нагрузочное (≤ 1 сек) | ✅ 4 теста |

**Все требования выполнены! 🎉**

---

**Запускай тесты и проверяй систему! 🚀**
