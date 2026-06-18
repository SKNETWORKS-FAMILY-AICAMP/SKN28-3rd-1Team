SHELL := /bin/sh

PYTHONPATH := src
HOST ?= 127.0.0.1
PORT ?= 8000
VARLOCK ?= varlock
VARLOCK_PATH ?= .

.DEFAULT_GOAL := help

.PHONY: help env env-check sync start dev test check docker-up docker-down docker-logs docker-ps

help:
	@printf "%s\n" "backend targets:"
	@printf "%s\n" "  make start       Run FastAPI locally with uv"
	@printf "%s\n" "  make env-check   Validate backend env with Varlock"
	@printf "%s\n" "  make sync        Sync uv environment into .venv"
	@printf "%s\n" "  make test        Run unittest suite"
	@printf "%s\n" "  make check       Compile source/tests"
	@printf "%s\n" "  make docker-up   Start backend-only Docker Compose"
	@printf "%s\n" "  make docker-down Stop backend-only Docker Compose"
	@printf "%s\n" "  make docker-logs Follow backend container logs"

env:
	@printf "%s\n" "backend env is managed by Varlock; use .env.local or a secret provider for local values."

env-check:
	$(VARLOCK) load --agent --path $(VARLOCK_PATH) >/dev/null

sync:
	uv sync

start: sync env-check
	$(VARLOCK) run --path $(VARLOCK_PATH) -- sh -c 'PYTHONPATH=$(PYTHONPATH) uv run uvicorn app:app --host $(HOST) --port $(PORT)'

dev: start

test: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m unittest discover -s tests

check: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m compileall src scripts tests

docker-up: env-check
	$(VARLOCK) run --path $(VARLOCK_PATH) -- docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f backend

docker-ps:
	docker compose ps
