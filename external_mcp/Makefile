SHELL := /bin/sh

PYTHONPATH := src
HOST ?= 127.0.0.1
PORT ?= 8020
VARLOCK ?= varlock
VARLOCK_PATH ?= .

.DEFAULT_GOAL := help

.PHONY: help env-check sync start test check

help:
	@printf "%s\n" "external_mcp targets:"
	@printf "%s\n" "  make sync       Sync uv environment into .venv"
	@printf "%s\n" "  make start      Run External MCP locally"
	@printf "%s\n" "  make test       Run unittest suite"
	@printf "%s\n" "  make check      Compile source/tests"
	@printf "%s\n" "  make env-check  Validate env schema with Varlock"

env-check:
	$(VARLOCK) load --agent --path $(VARLOCK_PATH) >/dev/null

sync:
	uv sync

start: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m app

test: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m unittest discover -s tests

check: sync
	PYTHONPATH=$(PYTHONPATH) uv run python -m compileall src tests
