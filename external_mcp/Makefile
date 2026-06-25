SHELL := /bin/sh

PYTHONPATH := src
HOST ?= 127.0.0.1
PORT ?= 8020
VARLOCK ?= varlock
VARLOCK_PATH ?= .
INFISICAL ?= infisical
INFISICAL_PROJECT_ID ?= 237f306b-17b2-4b2c-ad37-bdc78da2300b
INFISICAL_ENV ?= dev
INFISICAL_PATH ?= /
APP_ENV ?= $(INFISICAL_ENV)

.DEFAULT_GOAL := help

.PHONY: help env tool-check env-check sync start dev test check

help:
	@printf "%s\n" "external_mcp targets:"
	@printf "%s\n" "  make sync       Sync uv environment into .venv"
	@printf "%s\n" "  make start      Run External MCP locally with Infisical + Varlock"
	@printf "%s\n" "  make dev        Alias for make start"
	@printf "%s\n" "  make test       Run unittest suite"
	@printf "%s\n" "  make check      Compile source/tests"
	@printf "%s\n" "  make env-check  Validate env schema with Infisical + Varlock"

env:
	@printf "%s\n" "external_mcp secrets are injected by Infisical CLI; .env.schema remains the Varlock contract."

tool-check:
	@command -v $(INFISICAL) >/dev/null || { printf "%s\n" "missing required CLI: $(INFISICAL)"; exit 1; }
	@command -v $(VARLOCK) >/dev/null || { printf "%s\n" "missing required CLI: $(VARLOCK)"; exit 1; }

env-check: tool-check
	$(INFISICAL) run --projectId $(INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) -- sh -c 'APP_ENV=$(APP_ENV) EXTERNAL_MCP_HOST=$(HOST) EXTERNAL_MCP_PORT=$(PORT) $(VARLOCK) load --agent --path $(VARLOCK_PATH) >/dev/null'

sync:
	uv sync

start: sync env-check
	$(INFISICAL) run --projectId $(INFISICAL_PROJECT_ID) --env $(INFISICAL_ENV) --path $(INFISICAL_PATH) -- sh -c 'APP_ENV=$(APP_ENV) PYTHONPATH=$(PYTHONPATH) EXTERNAL_MCP_HOST=$(HOST) EXTERNAL_MCP_PORT=$(PORT) $(VARLOCK) run --inject vars --path $(VARLOCK_PATH) -- uv run python -m app'

dev: start

test: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m unittest discover -s tests

check: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m compileall src tests
