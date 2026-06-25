SHELL := /bin/sh

HOST ?= 127.0.0.1
PORT ?= 3005

.DEFAULT_GOAL := help

.PHONY: help env install start dev build preview lint

help:
	@printf "%s\n" "frontend_migration targets:"
	@printf "%s\n" "  make start    Run Next.js locally with Bun"
	@printf "%s\n" "  make install  Install dependencies"
	@printf "%s\n" "  make build    Build production bundle"
	@printf "%s\n" "  make preview  Run built Next.js app"
	@printf "%s\n" "  make lint     Run lint"
	@printf "%s\n" "  make env      Print local env file guidance"

env:
	@printf "%s\n" ".env is local-only and ignored by git. Keep secret values out of commits."

install:
	bun install

start: install
	bun next dev -H $(HOST) -p $(PORT)

dev: start

build: install
	bun run build

preview:
	bun next start -H $(HOST) -p $(PORT)

lint: install
	bun run lint
