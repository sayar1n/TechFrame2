"""
Доменные события для сервиса проектов.

В продакшне здесь будет интеграция с брокером сообщений (RabbitMQ, Kafka, Redis Pub/Sub).
Сейчас это заглушка, которая логирует события.
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class Event:
    """Доменное событие"""
    
    def __init__(self, event_type: str, data: Dict[str, Any], user_id: Optional[int] = None):
        self.event_id = str(uuid4())
        self.event_type = event_type
        self.data = data
        self.user_id = user_id
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразует событие в словарь"""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "data": self.data,
            "user_id": self.user_id,
            "timestamp": self.timestamp
        }


def publish_event(event: Event) -> bool:
    """
    Публикует событие.
    
    В продакшне здесь будет отправка в RabbitMQ/Kafka/Redis:
    - await rabbitmq_client.publish(exchange="events", routing_key=event.event_type, message=event.to_json())
    
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


# Вспомогательные функции для быстрой публикации событий

def publish_project_created(project_id: int, name: str, owner_id: int) -> bool:
    """Публикует событие 'создан заказ' (проект)"""
    event = Event(
        event_type="project.created",
        data={
            "project_id": project_id,
            "name": name,
            "owner_id": owner_id
        },
        user_id=owner_id
    )
    return publish_event(event)


def publish_project_updated(project_id: int, name: str, updated_by: int) -> bool:
    """Публикует событие 'обновлён заказ' (проект)"""
    event = Event(
        event_type="project.updated",
        data={
            "project_id": project_id,
            "name": name,
            "updated_by": updated_by
        },
        user_id=updated_by
    )
    return publish_event(event)


def publish_project_deleted(project_id: int, deleted_by: int) -> bool:
    """Публикует событие 'удалён заказ' (проект)"""
    event = Event(
        event_type="project.deleted",
        data={
            "project_id": project_id,
            "deleted_by": deleted_by
        },
        user_id=deleted_by
    )
    return publish_event(event)

