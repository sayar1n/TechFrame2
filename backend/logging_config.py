import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(service_name: str = "backend-service") -> None:
    """
    Простая настройка логирования:
    - пишет логи в файл logs/<service_name>.log
    - дублирует логи в stdout (для docker logs)
    """
    logs_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(logs_dir, exist_ok=True)

    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    log_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Файловый обработчик (ротация по ~5 МБ, до 3 файлов)
    file_handler = RotatingFileHandler(
        os.path.join(logs_dir, f"{service_name}.log"),
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(log_formatter)

    # Консольный обработчик
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Чтобы не дублировать обработчики при повторной настройке
    if not any(isinstance(h, RotatingFileHandler) for h in root_logger.handlers):
        root_logger.addHandler(file_handler)
    if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
        root_logger.addHandler(console_handler)


