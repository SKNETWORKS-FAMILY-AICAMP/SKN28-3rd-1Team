SHELL := /bin/sh

ROOT_DIR := ../..
DOCKER_DIR := ../docker
COMPOSE_ENV := $(DOCKER_DIR)/.env
COMPOSE_FILE := $(DOCKER_DIR)/docker-compose.yml
COMPOSE := docker compose --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
LEGACY_COMPOSE := docker compose --profile legacy --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
VARLOCK ?= varlock
VARLOCK_SCHEMA_PATHS := $(DOCKER_DIR) $(ROOT_DIR)/backend $(ROOT_DIR)/rag/be $(ROOT_DIR)/rag/fe
FRONTEND_HOST ?= 127.0.0.1
FRONTEND_PORT ?= 3000
BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 8000

.DEFAULT_GOAL := help

.PHONY: help fe be be-env-check dev env env-check env-legacy compose-up compose-up-legacy compose-down compose-restart compose-ps compose-logs compose-pull compose-build compose-check compose-clean compose-backend-shell up up-legacy down restart ps logs pull build check clean backend-shell

help:
	@printf "%s\n" "local dev targets:"
	@printf "%s\n" "  make dev              Start frontend + backend locally"
	@printf "%s\n" "  make fe               Start frontend local dev server"
	@printf "%s\n" "  make be               Start backend local dev server"
	@printf "%s\n" ""
	@printf "%s\n" "compose targets:"
	@printf "%s\n" "  make compose-up       Start frontend, backend, RAG, Memgraph, Redis"
	@printf "%s\n" "  make compose-up-legacy  Start all compose services plus legacy streamlit_3rd"
	@printf "%s\n" "  make compose-down     Stop deploy stack"
	@printf "%s\n" "  make compose-ps       Show deploy containers"
	@printf "%s\n" "  make compose-logs     Follow deploy logs"
	@printf "%s\n" "  make compose-build    Build deploy images"
	@printf "%s\n" "  make compose-check    Validate compose config"
	@printf "%s\n" "  make compose-clean    Stop and remove deploy volumes"
	@printf "%s\n" "  make env-check        Validate deploy/service env with Varlock"

fe:
	$(MAKE) -C $(ROOT_DIR)/frontend dev HOST=$(FRONTEND_HOST) PORT=$(FRONTEND_PORT)

be:
	$(MAKE) -C $(ROOT_DIR)/backend dev HOST=$(BACKEND_HOST) PORT=$(BACKEND_PORT)

be-env-check:
	$(MAKE) -C $(ROOT_DIR)/backend env-check

dev: be-env-check
	@printf "%s\n" "starting frontend on http://$(FRONTEND_HOST):$(FRONTEND_PORT)"
	@printf "%s\n" "starting backend on http://$(BACKEND_HOST):$(BACKEND_PORT)"
	@set -e; \
	$(MAKE) fe & fe_pid=$$!; \
	$(MAKE) be & be_pid=$$!; \
	trap 'kill $$fe_pid $$be_pid >/dev/null 2>&1 || true' INT TERM EXIT; \
	wait $$fe_pid $$be_pid

env:
	$(VARLOCK) load --path $(DOCKER_DIR) --format env --compact > $(COMPOSE_ENV)
	@if [ ! -f $(DOCKER_DIR)/.env_backend ]; then \
		if [ -f $(ROOT_DIR)/backend/.env ]; then \
			cp $(ROOT_DIR)/backend/.env $(DOCKER_DIR)/.env_backend; \
		else \
			printf "%s\n" "missing deploy/docker/.env_backend; create it from Infisical/provider export or an ignored local env file before make compose-up"; \
			exit 1; \
		fi; \
	fi
	@if [ ! -f $(DOCKER_DIR)/.env_rag_be ]; then \
		if [ -f $(ROOT_DIR)/rag/be/.env ]; then \
			cp $(ROOT_DIR)/rag/be/.env $(DOCKER_DIR)/.env_rag_be; \
		else \
			printf "%s\n" "missing deploy/docker/.env_rag_be; create it from Infisical/provider export or an ignored local env file before make compose-up"; \
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

compose-up: env env-check
	$(COMPOSE) up -d --build

compose-up-legacy: env-legacy
	$(LEGACY_COMPOSE) up -d --build

compose-down:
	$(COMPOSE) down

compose-restart: compose-down compose-up

compose-ps:
	$(COMPOSE) ps

compose-logs:
	$(COMPOSE) logs -f

compose-pull: env
	$(COMPOSE) pull

compose-build: env
	$(COMPOSE) build

compose-check: env env-check
	$(COMPOSE) config --services

compose-clean:
	$(COMPOSE) down -v

compose-backend-shell:
	$(COMPOSE) exec backend sh

up: compose-up

up-legacy: compose-up-legacy

down: compose-down

restart: compose-restart

ps: compose-ps

logs: compose-logs

pull: compose-pull

build: compose-build

check: compose-check

clean: compose-clean

backend-shell: compose-backend-shell
