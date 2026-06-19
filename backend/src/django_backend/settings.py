from __future__ import annotations

import os

from settings import settings as app_settings


SECRET_KEY = "django-insecure-skn28-transport-only"
DEBUG = os.environ.get("APP_ENV", "dev").strip().lower() not in {"staging", "prod"}

ROOT_URLCONF = "django_backend.urls"
ASGI_APPLICATION = "django_backend.asgi.application"

INSTALLED_APPS: list[str] = []

MIDDLEWARE = [
    "django_backend.middleware.CorsMiddleware",
]

_BASE_ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "testserver",
    app_settings.runtime.host,
]
ALLOWED_HOSTS = _BASE_ALLOWED_HOSTS if not DEBUG else ["*"]

RUNTIME_CORS_ORIGINS = app_settings.runtime.cors_origins

DEFAULT_CHARSET = "utf-8"
USE_TZ = True
TIME_ZONE = "Asia/Seoul"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
