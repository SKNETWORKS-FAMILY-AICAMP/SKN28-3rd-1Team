SHELL := /bin/sh

PYTHONPATH := src
HOST ?= 127.0.0.1
PORT ?= 8010
IMAGE ?= skn28-rag-be:dev
VARLOCK ?= varlock
VARLOCK_PATH ?= .

.DEFAULT_GOAL := help

.PHONY: help env env-check sync start dev test check docker-build

help:
	@printf "%s\n" "rag/be targets:"
	@printf "%s\n" "  make start        Run RAG backend locally with uv"
	@printf "%s\n" "  make env-check    Validate RAG backend env with Varlock"
	@printf "%s\n" "  make sync         Sync uv environment into .venv"
	@printf "%s\n" "  make test         Run unittest suite"
	@printf "%s\n" "  make check        Compile source/tests"
	@printf "%s\n" "  make docker-build Build RAG backend image"

env:
	@printf "%s\n" "rag/be env is managed by Varlock; use .env.local or a secret provider for local values."

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
	PYTHONPATH=$(PYTHONPATH) uv run python -m compileall src tests

docker-build:
	docker build -t $(IMAGE) .
