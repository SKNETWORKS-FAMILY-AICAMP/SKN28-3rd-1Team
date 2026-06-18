SHELL := /bin/sh

HOST ?= 127.0.0.1
PORT ?= 3000
IMAGE ?= skn28-frontend:dev
CONTAINER ?= skn28-frontend-dev

.DEFAULT_GOAL := help

.PHONY: help install start dev build preview lint docker-build docker-run docker-stop docker-logs

help:
	@printf "%s\n" "frontend targets:"
	@printf "%s\n" "  make start        Run Next.js locally with Bun"
	@printf "%s\n" "  make install      Install dependencies"
	@printf "%s\n" "  make build        Build production bundle"
	@printf "%s\n" "  make preview      Run built Next.js app"
	@printf "%s\n" "  make lint         Run lint"
	@printf "%s\n" "  make docker-build Build frontend image"
	@printf "%s\n" "  make docker-run   Run frontend image on PORT"

install:
	bun install

start: install
	bun run dev -- -H $(HOST) -p $(PORT)

dev: start

build: install
	bun run build

preview:
	HOSTNAME=$(HOST) PORT=$(PORT) bun run start

lint: install
	bun run lint

docker-build:
	docker build -t $(IMAGE) .

docker-run: docker-build
	docker rm -f $(CONTAINER) >/dev/null 2>&1 || true
	docker run --name $(CONTAINER) -p $(HOST):$(PORT):3000 $(IMAGE)

docker-stop:
	docker rm -f $(CONTAINER)

docker-logs:
	docker logs -f $(CONTAINER)
