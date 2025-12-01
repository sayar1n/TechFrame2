"""
Доменные события для сервиса дефектов.

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

def publish_defect_created(defect_id: int, title: str, status: str, priority: str, project_id: int, reporter_id: int) -> bool:
    """Публикует событие 'создан заказ' (дефект)"""
    event = Event(
        event_type="defect.created",
        data={
            "defect_id": defect_id,
            "title": title,
            "status": status,
            "priority": priority,
            "project_id": project_id,
            "reporter_id": reporter_id
        },
        user_id=reporter_id
    )
    return publish_event(event)


def publish_defect_status_changed(defect_id: int, old_status: str, new_status: str, changed_by: int) -> bool:
    """Публикует событие 'обновлён статус'"""
    event = Event(
        event_type="defect.status_changed",
        data={
            "defect_id": defect_id,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": changed_by
        },
        user_id=changed_by
    )
    return publish_event(event)


def publish_defect_updated(defect_id: int, title: str, updated_by: int) -> bool:
    """Публикует событие 'обновлён заказ' (дефект)"""
    event = Event(
        event_type="defect.updated",
        data={
            "defect_id": defect_id,
            "title": title,
            "updated_by": updated_by
        },
        user_id=updated_by
    )
    return publish_event(event)


def publish_defect_deleted(defect_id: int, deleted_by: int) -> bool:
    """Публикует событие 'удалён заказ' (дефект)"""
    event = Event(
        event_type="defect.deleted",
        data={
            "defect_id": defect_id,
            "deleted_by": deleted_by
        },
        user_id=deleted_by
    )
    return publish_event(event)

