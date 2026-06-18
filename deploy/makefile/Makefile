SHELL := /bin/sh

ROOT_DIR := ../..
DOCKER_DIR := ../docker
COMPOSE_ENV := $(DOCKER_DIR)/.env
COMPOSE_FILE := $(DOCKER_DIR)/docker-compose.yml
COMPOSE := docker compose --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
LEGACY_COMPOSE := docker compose --profile legacy --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
VARLOCK ?= varlock
VARLOCK_PATHS := --path $(DOCKER_DIR) --path $(ROOT_DIR)/backend --path $(ROOT_DIR)/rag/be --path $(ROOT_DIR)/rag/fe

.DEFAULT_GOAL := help

.PHONY: help env env-check env-legacy up up-legacy down restart ps logs pull build check clean backend-shell

help:
	@printf "%s\n" "deploy targets:"
	@printf "%s\n" "  make up          Start frontend, backend, RAG, Memgraph, Redis"
	@printf "%s\n" "  make env-check   Validate deploy/service env with Varlock"
	@printf "%s\n" "  make up-legacy   Start all services plus legacy streamlit_3rd"
	@printf "%s\n" "  make down        Stop deploy stack"
	@printf "%s\n" "  make ps          Show deploy containers"
	@printf "%s\n" "  make logs        Follow deploy logs"
	@printf "%s\n" "  make build       Build deploy images"
	@printf "%s\n" "  make check       Validate compose config"
	@printf "%s\n" "  make clean       Stop and remove deploy volumes"

env:
	$(VARLOCK) load --path $(DOCKER_DIR) --format env --compact > $(COMPOSE_ENV)
	@if [ ! -f $(DOCKER_DIR)/.env_backend ]; then \
		if [ -f $(ROOT_DIR)/backend/.env ]; then \
			cp $(ROOT_DIR)/backend/.env $(DOCKER_DIR)/.env_backend; \
		else \
			cp $(ROOT_DIR)/backend/.env.example $(DOCKER_DIR)/.env_backend; \
			printf "%s\n" "created deploy/docker/.env_backend from backend/.env.example; fill secrets before /chat"; \
		fi; \
	fi
	@if [ ! -f $(DOCKER_DIR)/.env_rag_be ]; then \
		if [ -f $(ROOT_DIR)/rag/be/.env ]; then \
			cp $(ROOT_DIR)/rag/be/.env $(DOCKER_DIR)/.env_rag_be; \
		else \
			cp $(ROOT_DIR)/rag/be/.env.example $(DOCKER_DIR)/.env_rag_be; \
			printf "%s\n" "created deploy/docker/.env_rag_be from rag/be/.env.example; fill secrets before graph ingest"; \
		fi; \
	fi

env-check:
	$(VARLOCK) load --agent $(VARLOCK_PATHS) >/dev/null

env-legacy: env env-check
	@if [ ! -f $(DOCKER_DIR)/.env_streamlit ]; then \
		if [ -f $(ROOT_DIR)/streamlit_3rd/.env ]; then \
			cp $(ROOT_DIR)/streamlit_3rd/.env $(DOCKER_DIR)/.env_streamlit; \
		else \
			cp $(ROOT_DIR)/streamlit_3rd/.env.example $(DOCKER_DIR)/.env_streamlit; \
			printf "%s\n" "created deploy/docker/.env_streamlit from streamlit_3rd/.env.example"; \
		fi; \
	fi

up: env env-check
	$(COMPOSE) up -d --build

up-legacy: env-legacy
	$(LEGACY_COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart: down up

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

pull: env
	$(COMPOSE) pull

build: env
	$(COMPOSE) build

check: env env-check
	$(COMPOSE) config --services

clean:
	$(COMPOSE) down -v

backend-shell:
	$(COMPOSE) exec backend sh
