SHELL := /bin/sh

HOST ?= 127.0.0.1
PORT ?= 5173
IMAGE ?= skn28-rag-fe:dev

.DEFAULT_GOAL := help

.PHONY: help env install start dev build lint preview docker-build

help:
	@printf "%s\n" "rag/fe targets:"
	@printf "%s\n" "  make start        Run RAG frontend locally with Bun"
	@printf "%s\n" "  make install      Install dependencies"
	@printf "%s\n" "  make build        Build production bundle"
	@printf "%s\n" "  make lint         Run lint"
	@printf "%s\n" "  make docker-build Build RAG frontend image"

env:
	@test -f .env || cp .env.example .env

install: env
	bun install

start: install
	bun run dev -- --host $(HOST) --port $(PORT)

dev: start

build: install
	bun run build

lint: install
	bun run lint

preview: build
	bun run preview -- --host $(HOST) --port $(PORT)

docker-build:
	docker build -t $(IMAGE) .
