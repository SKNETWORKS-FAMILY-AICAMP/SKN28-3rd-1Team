SHELL := /bin/sh

ROOT_DIR := ../..
DOCKER_DIR := ../docker
COMPOSE_ENV := $(DOCKER_DIR)/.env
COMPOSE_FILE := $(DOCKER_DIR)/docker-compose.yml
COMPOSE := docker compose --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
LEGACY_COMPOSE := docker compose --profile legacy --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
VARLOCK ?= varlock
VARLOCK_SCHEMA_PATHS := $(DOCKER_DIR) $(ROOT_DIR)/backend $(ROOT_DIR)/rag/be $(ROOT_DIR)/rag/fe

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
			printf "%s\n" "missing deploy/docker/.env_backend; create it from Infisical/provider export or an ignored local env file before make up"; \
			exit 1; \
		fi; \
	fi
	@if [ ! -f $(DOCKER_DIR)/.env_rag_be ]; then \
		if [ -f $(ROOT_DIR)/rag/be/.env ]; then \
			cp $(ROOT_DIR)/rag/be/.env $(DOCKER_DIR)/.env_rag_be; \
		else \
			printf "%s\n" "missing deploy/docker/.env_rag_be; create it from Infisical/provider export or an ignored local env file before make up"; \
			exit 1; \
		fi; \
	fi

env-check:
	@for path in $(VARLOCK_SCHEMA_PATHS); do \
		printf "%s\n" "validating $$path"; \
		$(VARLOCK) load --agent --path "$$path" >/dev/null; \
	done

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
