import json
import logging

from backend.core.logging_config import JsonLogFormatter


def test_json_log_formatter_includes_safe_structured_context() -> None:
    record = logging.LogRecord(
        name="backend.readiness",
        level=logging.WARNING,
        pathname=__file__,
        lineno=12,
        msg="Database readiness check failed",
        args=(),
        exc_info=None,
    )
    record.event_type = "database_readiness_failed"
    record.error_type = "SQLAlchemyError"

    entry = json.loads(JsonLogFormatter().format(record))

    assert entry["level"] == "WARNING"
    assert entry["logger"] == "backend.readiness"
    assert entry["message"] == "Database readiness check failed"
    assert entry["event_type"] == "database_readiness_failed"
    assert entry["error_type"] == "SQLAlchemyError"
    assert "private connection details" not in json.dumps(entry)
