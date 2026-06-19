from __future__ import annotations

from collections.abc import Awaitable, Callable

from asgiref.sync import iscoroutinefunction, markcoroutinefunction
from django.conf import settings as django_settings
from django.http import HttpRequest, HttpResponse


class CorsMiddleware:
    sync_capable = True
    async_capable = True

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response
        self._is_async = iscoroutinefunction(get_response)
        if self._is_async:
            markcoroutinefunction(self)

    def __call__(self, request: HttpRequest) -> HttpResponse | Awaitable[HttpResponse]:
        if self._is_async:
            return self.__acall__(request)

        response = _preflight_response(request)
        if response is None:
            response = self.get_response(request)
        return _add_cors_headers(request, response)

    async def __acall__(self, request: HttpRequest) -> HttpResponse:
        response = _preflight_response(request)
        if response is None:
            response = await self.get_response(request)
        return _add_cors_headers(request, response)


def _preflight_response(request: HttpRequest) -> HttpResponse | None:
    if request.method == "OPTIONS":
        return HttpResponse(status=204)
    return None


def _add_cors_headers(request: HttpRequest, response: HttpResponse) -> HttpResponse:
    origin = request.headers.get("Origin")
    allowed_origins = set(getattr(django_settings, "RUNTIME_CORS_ORIGINS", []))
    if origin and origin in allowed_origins:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response["Vary"] = "Origin"
    return response
