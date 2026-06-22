SHELL := /bin/sh

PYTHONPATH := src
HOST ?= 127.0.0.1
PORT ?= 8000
VARLOCK ?= varlock
VARLOCK_PATH ?= .
INFISICAL ?= infisical
INFISICAL_PROJECT_ID ?= f6a512e6-1960-4186-8ece-a3061824c185
INFISICAL_ENV ?= dev
INFISICAL_PATH ?= /
APP_ENV ?= $(INFISICAL_ENV)

.DEFAULT_GOAL := help

.PHONY: help env tool-check env-check sync start dev test check docker-up docker-down docker-logs docker-ps

help:
	@printf "%s\n" "backend targets:"
	@printf "%s\n" "  make start       Run Django Channels locally with uv"
	@printf "%s\n" "  make env-check   Validate backend env with Infisical + Varlock"
	@printf "%s\n" "  make sync        Sync uv environment into .venv"
	@printf "%s\n" "  make test        Run unittest suite"
	@printf "%s\n" "  make check       Compile source/tests"
	@printf "%s\n" "  make docker-up   Start backend-only Docker Compose"
	@printf "%s\n" "  make docker-down Stop backend-only Docker Compose"
	@printf "%s\n" "  make docker-logs Follow backend container logs"

env:
	@printf "%s\n" "backend secrets are injected by Infisical CLI; .env.schema remains the Varlock contract."

tool-check:
	@command -v $(INFISICAL) >/dev/null || { printf "%s\n" "missing required CLI: $(INFISICAL)"; exit 1; }
	@command -v $(VARLOCK) >/dev/null || { printf "%s\n" "missing required CLI: $(VARLOCK)"; exit 1; }

env-check: tool-check
	$(INFISICAL) run --projectId $(INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) -- sh -c 'APP_ENV=$(APP_ENV) $(VARLOCK) load --agent --path $(VARLOCK_PATH) >/dev/null'

sync:
	uv sync

start: sync env-check
	$(INFISICAL) run --projectId $(INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) -- sh -c 'APP_ENV=$(APP_ENV) PYTHONPATH=$(PYTHONPATH) $(VARLOCK) run --inject vars --path $(VARLOCK_PATH) -- uv run daphne -b $(HOST) -p $(PORT) -v 0 --access-log /dev/null app:application'

dev: start

test: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m unittest discover -s tests

check: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m compileall src scripts tests

docker-up: env-check
	$(VARLOCK) run --inject vars --path $(VARLOCK_PATH) -- docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f backend

docker-ps:
	docker compose ps
