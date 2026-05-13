---
name: makefile-targets
description: >
  Generate a Makefile with standard build, push, run, and development targets for a
  Dockerized full-stack application. Use when the user wants to create or update a Makefile,
  add make targets, generate build automation, or set up a build pipeline.
  Triggered by phrases like "create Makefile", "generate make targets", "add make commands",
  "set up build automation", "Makefile for Docker".
---

Generate a Makefile with targets for building Docker images, pushing to a registry,
running the stack with Docker Compose, and local development workflows.
The Makefile uses git commit count + hash for automatic version tagging.

---

## Steps

### 1. Gather project context

Inspect the project before generating:

- Read existing `Makefile` if present — ask before overwriting
- Check for Docker files: `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`
  - If any are missing, invoke the **docker-setup** skill to create them before continuing
- Detect `docker-compose.yml` / `compose.yml` presence (determines `up`/`down` targets)
- Detect backend + frontend directories (`backend/`, `frontend/`)
- Detect backend runtime: `requirements.txt` → Python, `package.json` → Node
- Detect frontend framework from `frontend/package.json` (`start` vs `dev` script)
- Identify app name from root directory name

If a Docker registry URL is needed but not obvious, use **AskUserQuestion** to ask.
Otherwise infer and proceed — the user can always override via `DOCKER_REGISTRY=...`.

### 2. Generate the Makefile

**Location**: `Makefile` (project root)

Use this template and fill in `<APP_NAME>`, `<BACKEND_PORT>`, and `<FRONTEND_PORT>`:

```makefile
.PHONY: help build build-backend build-frontend push push-backend push-frontend \
        check-git-clean version up down logs restart clean \
        install-backend install-frontend dev-backend dev-frontend test

# ── Image configuration ────────────────────────────────────────────────────────
DOCKER_REGISTRY  ?= docker-lxc:5000
DOCKER_USERNAME  ?= admin
IMAGE_NAME_BACKEND  ?= <app-name>-backend
IMAGE_NAME_FRONTEND ?= <app-name>-frontend
DOCKER_IMAGE_BACKEND  = $(DOCKER_REGISTRY)/$(IMAGE_NAME_BACKEND)
DOCKER_IMAGE_FRONTEND = $(DOCKER_REGISTRY)/$(IMAGE_NAME_FRONTEND)

# ── Version (git commit count + short hash) ───────────────────────────────────
COMMIT_COUNT := $(shell git rev-list --count HEAD 2>/dev/null || echo "0")
COMMIT_HASH  := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION      := $(COMMIT_COUNT)-$(COMMIT_HASH)
BUILD_DATE   := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo "<AppName> - Make Commands"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  make build            - Build both Docker images"
	@echo "  make build-backend    - Build backend image"
	@echo "  make build-frontend   - Build frontend image"
	@echo "  make push             - Push both images to registry"
	@echo "  make push-backend     - Push backend image"
	@echo "  make push-frontend    - Push frontend image"
	@echo "  make version          - Show current version tag"
	@echo ""
	@echo "Run & Manage:"
	@echo "  make up               - Start all services (Docker Compose)"
	@echo "  make down             - Stop all services"
	@echo "  make logs             - Tail logs from all services"
	@echo "  make restart          - Restart all services"
	@echo "  make clean            - Remove containers, volumes, build artifacts"
	@echo ""
	@echo "Development:"
	@echo "  make install-backend  - Install backend dependencies"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo "  make dev-backend      - Run backend dev server"
	@echo "  make dev-frontend     - Run frontend dev server"
	@echo ""
	@echo "Current version: $(VERSION)"

# ── Version info ──────────────────────────────────────────────────────────────
version:
	@echo "Commit Count:   $(COMMIT_COUNT)"
	@echo "Commit Hash:    $(COMMIT_HASH)"
	@echo "Version:        $(VERSION)"
	@echo "Build Date:     $(BUILD_DATE)"
	@echo "Backend Image:  $(DOCKER_IMAGE_BACKEND):$(VERSION)"
	@echo "Frontend Image: $(DOCKER_IMAGE_FRONTEND):$(VERSION)"

# ── Build ─────────────────────────────────────────────────────────────────────
build-backend:
	@echo "Building backend: $(DOCKER_IMAGE_BACKEND):$(VERSION)"
	docker build \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		--build-arg VCS_REF=$(COMMIT_HASH) \
		--build-arg VERSION=$(VERSION) \
		-t $(DOCKER_IMAGE_BACKEND):$(VERSION) \
		-t $(DOCKER_IMAGE_BACKEND):latest \
		-f backend/Dockerfile \
		./backend
	@echo "Built: $(DOCKER_IMAGE_BACKEND):$(VERSION)"

build-frontend:
	@echo "Building frontend: $(DOCKER_IMAGE_FRONTEND):$(VERSION)"
	docker build \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		--build-arg VCS_REF=$(COMMIT_HASH) \
		--build-arg VERSION=$(VERSION) \
		--build-arg VITE_API_BASE_URL=http://localhost:<BACKEND_PORT>/api \
		-t $(DOCKER_IMAGE_FRONTEND):$(VERSION) \
		-t $(DOCKER_IMAGE_FRONTEND):latest \
		-f frontend/Dockerfile \
		./frontend
	@echo "Built: $(DOCKER_IMAGE_FRONTEND):$(VERSION)"

build: build-backend build-frontend

# ── Push guards ───────────────────────────────────────────────────────────────
# Blocks push if there are uncommitted changes, unless VERSION=testing
check-git-clean:
	@if [ "$(VERSION)" != "testing" ]; then \
		if [ -n "$$(git status --porcelain 2>/dev/null)" ]; then \
			echo "Error: Uncommitted changes detected."; \
			echo "Commit your changes or use VERSION=testing to bypass."; \
			exit 1; \
		fi; \
	else \
		echo "VERSION=testing — skipping git clean check"; \
	fi

# ── Push ──────────────────────────────────────────────────────────────────────
push-backend: check-git-clean build-backend
	docker push $(DOCKER_IMAGE_BACKEND):$(VERSION)
	docker push $(DOCKER_IMAGE_BACKEND):latest

push-frontend: check-git-clean build-frontend
	docker push $(DOCKER_IMAGE_FRONTEND):$(VERSION)
	docker push $(DOCKER_IMAGE_FRONTEND):latest

push: push-backend push-frontend

# ── Compose lifecycle ─────────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:
	docker compose down -v
	rm -rf backend/__pycache__ backend/app/__pycache__
	rm -rf frontend/node_modules frontend/dist frontend/build
	rm -rf data/*.db

# ── Local development ─────────────────────────────────────────────────────────
install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port <BACKEND_PORT>

dev-frontend:
	cd frontend && npm run dev
```

### 3. Adapt for backend runtime

| Runtime | `dev-backend` command | `install-backend` command |
|---|---|---|
| Python/uvicorn | `uvicorn app.main:app --reload` | `pip install -r requirements.txt` |
| Python/Flask | `flask run --debug` | `pip install -r requirements.txt` |
| Node/Express | `node --watch src/index.js` | `npm install` |
| Node/NestJS | `npm run start:dev` | `npm install` |

### 4. Adapt for frontend framework

| Framework | `dev-frontend` | Build output dir in `clean` |
|---|---|---|
| Vite (React/Vue) | `npm run dev` | `dist/` |
| Create React App | `npm start` | `build/` |
| Next.js | `npm run dev` | `.next/` |

Also update the `--build-arg` in `build-frontend`:
- Vite: `VITE_API_BASE_URL`
- CRA: `REACT_APP_API_URL`
- Next.js: `NEXT_PUBLIC_API_URL`

### 5. Optional targets to add if relevant

**Test target** (add after install targets):
```makefile
test:
	cd backend && pytest
	cd frontend && npm test -- --watchAll=false
```

**Migration target** (for apps with Alembic / Prisma / Flyway):
```makefile
migrate:
	cd backend && alembic upgrade head

migrate-new:
	cd backend && alembic revision --autogenerate -m "$(MSG)"
```

Add these if the project has `alembic.ini` or `prisma/schema.prisma`.

### 6. Show summary

After writing the Makefile, display:
- Key targets and what they do
- How to build: `make build`
- How to start: `make up`
- How to push: `make push` (or `VERSION=testing make push` to skip git-clean check)
- Version scheme explanation: `<commit_count>-<short_hash>` (e.g., `42-a3f7d1c`)

## Prerequisites

The Makefile targets assume Docker configuration files are already in place:
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `frontend/docker-entrypoint.sh`
- `docker-compose.yml`

If any of these are missing, invoke the **docker-setup** skill first to generate them,
then return here to generate the Makefile.
