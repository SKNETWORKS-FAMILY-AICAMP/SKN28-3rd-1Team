SHELL := /bin/sh

.DEFAULT_GOAL := help

.PHONY: help env env-check start infra-up infra-down be-sync be-start fe-start be-check fe-check docker-build

help:
	@printf "%s\n" "rag targets:"
	@printf "%s\n" "  make start      Prepare env and start RAG infra"
	@printf "%s\n" "  make env-check  Validate current RAG env schemas"
	@printf "%s\n" "  make infra-up   Start Memgraph, Lab, Redis"
	@printf "%s\n" "  make be-sync    Sync RAG backend uv environment into be/.venv"
	@printf "%s\n" "  make be-start   Run RAG backend locally"
	@printf "%s\n" "  make fe-start   Run RAG frontend locally"
	@printf "%s\n" "  make be-check   Compile RAG backend"
	@printf "%s\n" "  make fe-check   Lint/build RAG frontend"
	@printf "%s\n" "  make docker-build Build RAG backend/frontend images"

env:
	@printf "%s\n" "RAG env is managed by Varlock. Run 'make env-check' to validate schemas."

env-check:
	$(MAKE) -C infra env-check
	$(MAKE) -C be env-check
	$(MAKE) -C fe env-check

start: infra-up
	@printf "%s\n" "RAG infra is running."
	@printf "%s\n" "Run 'make be-start' and 'make fe-start' in separate terminals for local services."

infra-up: env
	$(MAKE) -C infra up

infra-down:
	$(MAKE) -C infra down

be-sync: env
	$(MAKE) -C be sync

be-start: env
	$(MAKE) -C be start

fe-start: env
	$(MAKE) -C fe start

be-check:
	$(MAKE) -C be check

fe-check:
	$(MAKE) -C fe lint
	$(MAKE) -C fe build

docker-build:
	$(MAKE) -C be docker-build
	$(MAKE) -C fe docker-build
