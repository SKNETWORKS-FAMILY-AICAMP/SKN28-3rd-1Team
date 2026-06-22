from __future__ import annotations

import os
import subprocess
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_backend.settings")

from django_backend.asgi import application
from logger import configure_logging, get_logger
from settings import settings

configure_logging()
logger = get_logger(__name__)
logger.info(
    "backend service starting",
    extra={
        "event": "service.starting",
        "service": settings.metadata.name,
        "version": settings.metadata.version,
    },
)

app = application


def main() -> None:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "daphne",
            "-b",
            settings.runtime.host,
            "-p",
            str(settings.runtime.port),
            "-v",
            "0",
            "--access-log",
            os.devnull,
            "app:application",
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
