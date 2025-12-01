# Доменные события (Domain Events)

## ✅ ЧТО РЕАЛИЗОВАНО

### 1. Публикация события "создан заказ"

**Где:** `service_projects` и `service_defects`

**Когда публикуется:**
- При создании проекта → `project.created`
- При создании дефекта → `defect.created`

**Пример события:**
```json
{
  "event_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "event_type": "project.created",
  "data": {
    "project_id": 1,
    "name": "Строительство моста",
    "owner_id": 5
  },
  "user_id": 5,
  "timestamp": "2025-12-01T12:00:00.000000"
}
```

---

### 2. Публикация события "обновлён статус"

**Где:** `service_defects`

**Когда публикуется:**
- При изменении статуса дефекта → `defect.status_changed`

**Пример события:**
```json
{
  "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_type": "defect.status_changed",
  "data": {
    "defect_id": 42,
    "old_status": "В работе",
    "new_status": "Решена",
    "changed_by": 7
  },
  "user_id": 7,
  "timestamp": "2025-12-01T14:30:00.000000"
}
```

---

### 3. Заготовка для брокера сообщений

**Файлы:** 
- `backend/service_projects/events.py`
- `backend/service_defects/events.py`

**Функция `publish_event()`:**

```python
def publish_event(event: Event) -> bool:
    """
    Публикует событие.
    
    В продакшне здесь будет отправка в RabbitMQ/Kafka/Redis:
    - await rabbitmq_client.publish(
        exchange="events", 
        routing_key=event.event_type, 
        message=event.to_json()
      )
    
    Сейчас просто логируем.
    """
    try:
        logger.info(
            f"[EVENT] {event.event_type} | "
            f"ID: {event.event_id} | "
            f"User: {event.user_id} | "
            f"Data: {json.dumps(event.data, ensure_ascii=False)}"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to publish event: {e}", exc_info=True)
        return False
```

---

## 📋 СПИСОК ВСЕХ СОБЫТИЙ

### Projects (Проекты)

| Событие | Тип | Данные |
|---------|-----|--------|
| Создан проект | `project.created` | `project_id`, `name`, `owner_id` |
| Обновлён проект | `project.updated` | `project_id`, `name`, `updated_by` |
| Удалён проект | `project.deleted` | `project_id`, `deleted_by` |

### Defects (Дефекты)

| Событие | Тип | Данные |
|---------|-----|--------|
| Создан дефект | `defect.created` | `defect_id`, `title`, `status`, `priority`, `project_id`, `reporter_id` |
| Обновлён дефект | `defect.updated` | `defect_id`, `title`, `updated_by` |
| **Изменён статус** | **`defect.status_changed`** | **`defect_id`, `old_status`, `new_status`, `changed_by`** |
| Удалён дефект | `defect.deleted` | `defect_id`, `deleted_by` |

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ

### 1. Запусти сервисы

```bash
docker-compose up -d
```

### 2. Создай проект (событие "создан заказ")

```bash
# Сначала получи токен
TOKEN=$(curl -s -X POST http://localhost:8000/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=123456" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Создай проект
curl -X POST http://localhost:8000/v1/projects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Тестовый проект","description":"Описание"}'
```

### 3. Проверь логи

```bash
docker-compose logs projects-service | grep "EVENT"
```

**Ожидаемый результат:**
```
[EVENT] project.created | ID: f47ac10b... | User: 1 | Data: {"project_id": 1, "name": "Тестовый проект", "owner_id": 1}
```

---

### 4. Создай дефект (событие "создан заказ")

```bash
curl -X POST http://localhost:8000/v1/defects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Критическая ошибка",
    "description":"Описание ошибки",
    "status":"Новая",
    "priority":"Высокий",
    "project_id":1
  }'
```

### 5. Проверь логи

```bash
docker-compose logs defects-service | grep "EVENT"
```

**Ожидаемый результат:**
```
[EVENT] defect.created | ID: a1b2c3d4... | User: 1 | Data: {"defect_id": 1, "title": "Критическая ошибка", ...}
```

---

### 6. Обнови статус дефекта (событие "обновлён статус")

```bash
curl -X PUT http://localhost:8000/v1/defects/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Критическая ошибка",
    "description":"Описание ошибки",
    "status":"В работе",
    "priority":"Высокий"
  }'
```

### 7. Проверь логи

```bash
docker-compose logs defects-service | grep "EVENT"
```

**Ожидаемый результат:**
```
[EVENT] defect.status_changed | ID: ... | User: 1 | Data: {"defect_id": 1, "old_status": "Новая", "new_status": "В работе", "changed_by": 1}
[EVENT] defect.updated | ID: ... | User: 1 | Data: {"defect_id": 1, "title": "Критическая ошибка", "updated_by": 1}
```

---

## 🚀 ИНТЕГРАЦИЯ С БРОКЕРОМ СООБЩЕНИЙ

### Шаг 1: Выбери брокер

**Варианты:**
- **RabbitMQ** — надёжный, с гарантией доставки
- **Kafka** — высокая пропускная способность
- **Redis Pub/Sub** — простой и быстрый

### Шаг 2: Добавь в docker-compose.yml

**Пример для RabbitMQ:**

```yaml
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"    # AMQP
    - "15672:15672"  # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: password
  networks:
    - backend-network
```

### Шаг 3: Установи библиотеку

```bash
# В requirements.txt
aio-pika==9.3.1  # Для RabbitMQ
```

### Шаг 4: Обнови events.py

```python
import aio_pika
import asyncio

class EventBus:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.exchange = None
    
    async def connect(self):
        """Подключение к RabbitMQ"""
        self.connection = await aio_pika.connect_robust(
            "amqp://admin:password@rabbitmq:5672/"
        )
        self.channel = await self.connection.channel()
        self.exchange = await self.channel.declare_exchange(
            "events",
            aio_pika.ExchangeType.TOPIC,
            durable=True
        )
    
    async def publish(self, event: Event) -> bool:
        """Публикация события в RabbitMQ"""
        try:
            message = aio_pika.Message(
                body=json.dumps(event.to_dict()).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            )
            
            await self.exchange.publish(
                message,
                routing_key=event.event_type
            )
            
            logger.info(f"[EVENT PUBLISHED] {event.event_type}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish event: {e}")
            return False

# Глобальный экземпляр
event_bus = EventBus()

# При старте приложения
@app.on_event("startup")
async def startup():
    await event_bus.connect()
```

### Шаг 5: Создай Consumer (подписчик)

**Файл:** `backend/consumers/email_consumer.py`

```python
import aio_pika
import asyncio
import json

async def handle_defect_status_changed(event_data: dict):
    """Обработчик события изменения статуса"""
    defect_id = event_data["defect_id"]
    new_status = event_data["new_status"]
    
    # Отправка email уведомления
    print(f"Отправка email: Дефект #{defect_id} изменил статус на '{new_status}'")

async def consume_events():
    """Подписка на события"""
    connection = await aio_pika.connect_robust(
        "amqp://admin:password@rabbitmq:5672/"
    )
    
    channel = await connection.channel()
    exchange = await channel.declare_exchange("events", aio_pika.ExchangeType.TOPIC)
    
    # Создаём очередь
    queue = await channel.declare_queue("email_notifications", durable=True)
    
    # Подписываемся на события изменения статуса
    await queue.bind(exchange, routing_key="defect.status_changed")
    
    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                event = json.loads(message.body.decode())
                await handle_defect_status_changed(event["data"])

if __name__ == "__main__":
    asyncio.run(consume_events())
```

---

## ✅ ИТОГ

### Что реализовано:

- ✅ **Событие "создан заказ"** — для проектов и дефектов
- ✅ **Событие "обновлён статус"** — для дефектов
- ✅ **Заготовка для брокера** — функция `publish_event()` с комментариями

### Текущая реализация:

- 📝 События логируются в консоль
- 🔍 Можно отслеживать через `docker-compose logs`
- 🏗️ Готова архитектура для интеграции с RabbitMQ/Kafka/Redis

### Для продакшна нужно:

- ❌ Подключить брокер сообщений (RabbitMQ/Kafka/Redis)
- ❌ Создать consumers (подписчики)
- ❌ Добавить retry механизм
- ❌ Добавить мониторинг событий

**Архитектура готова, осталось подключить брокер! 🚀**

