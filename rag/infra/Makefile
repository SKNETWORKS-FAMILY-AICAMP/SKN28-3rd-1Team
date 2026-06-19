SHELL := /bin/sh

COMPOSE := docker compose --env-file .env -f docker-compose.yml
VARLOCK ?= varlock
VARLOCK_PATH ?= .

.DEFAULT_GOAL := help

.PHONY: help env env-check up down restart ps logs pull clean

help:
	@printf "%s\n" "rag/infra targets:"
	@printf "%s\n" "  make up       Start Memgraph, Lab, Redis"
	@printf "%s\n" "  make env-check Validate RAG infra env with Varlock"
	@printf "%s\n" "  make down     Stop RAG infra"
	@printf "%s\n" "  make ps       Show containers"
	@printf "%s\n" "  make logs     Follow logs"
	@printf "%s\n" "  make clean    Stop and remove volumes"

env:
	$(VARLOCK) load --path $(VARLOCK_PATH) --format env --compact > .env

env-check:
	$(VARLOCK) load --agent --path $(VARLOCK_PATH) >/dev/null

up: env
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart: down up

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

pull: env
	$(COMPOSE) pull

clean:
	$(COMPOSE) down -v
