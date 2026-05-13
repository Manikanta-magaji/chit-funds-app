.PHONY: help build build-backend build-frontend push push-backend push-frontend \
        check-git-clean version up down logs restart clean \
        install-backend install-frontend dev-backend dev-frontend \
        migrate migrate-new test

# ── Image configuration ────────────────────────────────────────────────────────
DOCKER_REGISTRY     ?= docker-lxc:5000
DOCKER_USERNAME     ?= admin
IMAGE_NAME_BACKEND  ?= chit-fund-backend
IMAGE_NAME_FRONTEND ?= chit-fund-frontend
DOCKER_IMAGE_BACKEND  = $(DOCKER_REGISTRY)/$(IMAGE_NAME_BACKEND)
DOCKER_IMAGE_FRONTEND = $(DOCKER_REGISTRY)/$(IMAGE_NAME_FRONTEND)

# ── Version (git commit count + short hash) ───────────────────────────────────
COMMIT_COUNT := $(shell git rev-list --count HEAD 2>/dev/null || echo "0")
COMMIT_HASH  := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION      := $(COMMIT_COUNT)-$(COMMIT_HASH)
BUILD_DATE   := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo "Chit Fund App - Make Commands"
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
	@echo "Database:"
	@echo "  make migrate          - Run Alembic migrations (head)"
	@echo "  make migrate-new      - Create new migration (MSG=<message>)"
	@echo ""
	@echo "Development:"
	@echo "  make install-backend  - Install backend dependencies"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo "  make dev-backend      - Run backend dev server (port 8000)"
	@echo "  make dev-frontend     - Run frontend dev server (port 5173)"
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
	rm -rf frontend/node_modules frontend/dist
	rm -rf data/*.db

# ── Database ──────────────────────────────────────────────────────────────────
migrate:
	cd backend && alembic upgrade head

migrate-new:
	cd backend && alembic revision --autogenerate -m "$(MSG)"

# ── Local development ─────────────────────────────────────────────────────────
install-backend:
	cd backend && pip install -e .

install-frontend:
	cd frontend && npm install

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev
