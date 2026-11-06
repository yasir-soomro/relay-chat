import json
import logging
import logging.config
from datetime import UTC, datetime
from typing import Any


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        event_type = getattr(record, "event_type", None)
        if isinstance(event_type, str):
            entry["event_type"] = event_type
        error_type = getattr(record, "error_type", None)
        if isinstance(error_type, str):
            entry["error_type"] = error_type
        return json.dumps(entry, ensure_ascii=True)


def configure_logging() -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {"json": {"()": JsonLogFormatter}},
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "json",
                }
            },
            "root": {"handlers": ["console"], "level": "INFO"},
        }
    )
