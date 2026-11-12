import json
import logging
import logging.config
import re
from datetime import UTC, datetime
from typing import Any


def _redact_traceback(value: str) -> str:
    """Keep stack frames useful without recording credentials or message content."""
    value = re.sub(
        r"(?i)(postgres(?:ql)?(?:\+\w+)?://[^:\s]+:)[^@\s]+(@)",
        r"\1[redacted]\2",
        value,
    )
    value = re.sub(
        r"(?i)(authorization|password|secret|token)\s*([=:])\s*[^\s,]+",
        r"\1\2[redacted]",
        value,
    )
    return re.sub(
        r"(?i)(['\"]content['\"]\s*:\s*['\"])[^'\"]*",
        r"\1[redacted]",
        value,
    )


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
        for field in ("request_id", "route", "method", "status_code"):
            value = getattr(record, field, None)
            if isinstance(value, (str, int)):
                entry[field] = value
        if record.exc_info:
            entry["traceback"] = _redact_traceback(
                self.formatException(record.exc_info)
            )
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
