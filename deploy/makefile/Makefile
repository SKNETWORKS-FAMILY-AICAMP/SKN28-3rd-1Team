SHELL := /bin/sh

ROOT_DIR := ../..
DOCKER_DIR := ../docker
COMPOSE_ENV := $(DOCKER_DIR)/.env
COMPOSE_FILE := $(DOCKER_DIR)/docker-compose.yml
COMPOSE := docker compose --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
LEGACY_COMPOSE := docker compose --profile legacy --env-file $(COMPOSE_ENV) -f $(COMPOSE_FILE)
STREAMLIT_COMPOSE_SERVICES := memgraph lab redis rag-be backend streamlit
VARLOCK ?= varlock
INFISICAL ?= infisical
INFISICAL_ENV ?= dev
INFISICAL_PATH ?= /
APP_ENV ?= $(INFISICAL_ENV)
BACKEND_INFISICAL_PROJECT_ID ?= f6a512e6-1960-4186-8ece-a3061824c185
RAG_BE_INFISICAL_PROJECT_ID ?= f31e75a0-5493-42b8-b5ee-151d2555d50d

.DEFAULT_GOAL := help

.PHONY: help tool-check env env-check env-legacy up up-legacy up-streamlit down restart ps logs pull build check clean backend-shell

help:
	@printf "%s\n" "deploy targets:"
	@printf "%s\n" "  make up          Start frontend, backend, RAG, Memgraph, Redis"
	@printf "%s\n" "  make env-check   Validate deploy/service env with Varlock"
	@printf "%s\n" "  make up-legacy   Start all services plus legacy streamlit_3rd"
	@printf "%s\n" "  make up-streamlit Start streamlit_3rd, backend, RAG without Next frontend"
	@printf "%s\n" "  make down        Stop deploy stack"
	@printf "%s\n" "  make ps          Show deploy containers"
	@printf "%s\n" "  make logs        Follow deploy logs"
	@printf "%s\n" "  make build       Build deploy images"
	@printf "%s\n" "  make check       Validate compose config"
	@printf "%s\n" "  make clean       Stop and remove deploy volumes"

tool-check:
	@command -v $(VARLOCK) >/dev/null || { printf "%s\n" "missing required CLI: $(VARLOCK)"; exit 1; }
	@command -v $(INFISICAL) >/dev/null || { printf "%s\n" "missing required CLI: $(INFISICAL)"; exit 1; }

env: tool-check
	$(VARLOCK) load --path $(DOCKER_DIR) --format env --compact > $(COMPOSE_ENV)
	$(INFISICAL) export --projectId $(BACKEND_INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) --format dotenv --output-file $(DOCKER_DIR)/.env_backend --silent
	$(INFISICAL) export --projectId $(RAG_BE_INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) --format dotenv --output-file $(DOCKER_DIR)/.env_rag_be --silent

env-check: tool-check
	@printf "%s\n" "validating $(DOCKER_DIR)/.env.schema"
	$(VARLOCK) load --agent --path $(DOCKER_DIR)/.env.schema >/dev/null
	@printf "%s\n" "validating backend env"
	$(INFISICAL) run --projectId $(BACKEND_INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) -- sh -c 'APP_ENV=$(APP_ENV) $(VARLOCK) load --agent --path $(ROOT_DIR)/backend/.env.schema >/dev/null'
	@printf "%s\n" "validating rag/be env"
	$(INFISICAL) run --projectId $(RAG_BE_INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) -- sh -c 'APP_ENV=$(APP_ENV) $(VARLOCK) load --agent --path $(ROOT_DIR)/rag/be/.env.schema >/dev/null'
	@printf "%s\n" "validating rag/fe env"
	$(VARLOCK) load --agent --path $(ROOT_DIR)/rag/fe/.env.schema >/dev/null

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

up-streamlit: env-legacy
	$(LEGACY_COMPOSE) up -d --build $(STREAMLIT_COMPOSE_SERVICES)
	-$(COMPOSE) stop frontend >/dev/null 2>&1

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
