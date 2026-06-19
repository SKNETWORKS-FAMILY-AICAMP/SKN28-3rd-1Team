SHELL := /bin/sh

HOST ?= 127.0.0.1
PORT ?= 5173
IMAGE ?= skn28-rag-fe:dev
VARLOCK ?= varlock
VARLOCK_PATH ?= .

.DEFAULT_GOAL := help

.PHONY: help env env-check install start dev build lint preview docker-build

help:
	@printf "%s\n" "rag/fe targets:"
	@printf "%s\n" "  make start        Run RAG frontend locally with Bun"
	@printf "%s\n" "  make env-check    Validate RAG frontend env with Varlock"
	@printf "%s\n" "  make install      Install dependencies"
	@printf "%s\n" "  make build        Build production bundle"
	@printf "%s\n" "  make lint         Run lint"
	@printf "%s\n" "  make docker-build Build RAG frontend image"

env:
	@printf "%s\n" "rag/fe env is managed by Varlock; use .env.local or a secret provider for local values."

env-check:
	$(VARLOCK) load --agent --path $(VARLOCK_PATH) >/dev/null

install:
	bun install

start: install env-check
	$(VARLOCK) run --path $(VARLOCK_PATH) -- bun run dev -- --host $(HOST) --port $(PORT)

dev: start

build: install env-check
	$(VARLOCK) run --path $(VARLOCK_PATH) -- bun run build

lint: install
	bun run lint

preview: build
	$(VARLOCK) run --path $(VARLOCK_PATH) -- bun run preview -- --host $(HOST) --port $(PORT)

docker-build:
	docker build -t $(IMAGE) .
