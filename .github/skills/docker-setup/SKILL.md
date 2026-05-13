---
name: docker-setup
description: >
  Generate Docker configuration for a full-stack application.
  Use when the user wants to create Dockerfile for backend, Dockerfile for frontend,
  docker-compose.yml, nginx.conf, or docker-entrypoint.sh.
  Triggered by phrases like "create Dockerfile", "dockerize", "set up Docker",
  "generate docker-compose", "containerize the app".
---

Generate Docker configuration files for a full-stack application: backend Dockerfile,
frontend Dockerfile (multi-stage build → nginx), nginx.conf, docker-entrypoint.sh
for runtime config injection, and docker-compose.yml to run the entire stack.

---

## Steps

### 1. Gather project context

Before generating any file, inspect the project layout:

- Detect backend language/framework from files present:
  - `requirements.txt` or `pyproject.toml` → Python (check for FastAPI/Flask/Django)
  - `package.json` in `backend/` → Node.js (check for Express/NestJS)
  - `go.mod` → Go
  - `Cargo.toml` → Rust
- Detect frontend framework from `frontend/package.json`:
  - `react-scripts` / `vite` / `next` / `nuxt`
- Identify the app name from the root directory name or `package.json`/`pyproject.toml`
- Check for existing `Dockerfile`, `docker-compose.yml`, `nginx.conf` — ask before overwriting

If critical context is missing (app name, backend port, API URL env var name), use the
**AskUserQuestion tool** to collect it. Otherwise infer from the codebase and proceed.

### 2. Generate backend Dockerfile

**Location**: `backend/Dockerfile`

**Pattern for Python / FastAPI / uvicorn:**
```dockerfile
FROM python:3.12-slim

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="<AppName> Backend"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE <port>

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "<port>"]
```

**Adapt for other backends:**
- Flask: `CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:<port>", "app:app"]`
- Express/Node: `FROM node:20-alpine`, `RUN npm ci --omit=dev`, `CMD ["node", "src/index.js"]`
- Go: two-stage build — `FROM golang:1.22-alpine AS build` → `FROM scratch` or `alpine`

**Rules:**
- Always use slim/alpine base images
- Always `COPY requirements.txt` (or equivalent) before copying source so Docker layer cache is preserved
- Never embed secrets — use runtime env vars

### 3. Generate frontend Dockerfile (multi-stage)

**Location**: `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION
ARG VITE_API_BASE_URL=http://localhost:8000/api

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY public/ ./public/
COPY src/ ./src/

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ── Production stage ──────────────────────────────────────
FROM nginx:alpine

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="<AppName> Frontend"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

**Notes:**
- Use `dist/` for Vite projects, `build/` for Create React App, `.next/` for Next.js
- The `VITE_API_BASE_URL` build-arg bakes the URL at build time; the entrypoint script also supports overriding it at runtime via `window.RUNTIME_CONFIG`
- For Create React App replace `VITE_API_BASE_URL` with `REACT_APP_API_URL` (or whatever the project uses)

### 4. Generate nginx.conf

**Location**: `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — serve index.html for all unknown routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the backend service
    location /api {
        proxy_pass http://backend:<backend_port>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Replace `<backend_port>` with the actual backend port (e.g., 8000).

### 5. Generate docker-entrypoint.sh

**Location**: `frontend/docker-entrypoint.sh`

This injects runtime environment variables (e.g., backend URL) into the SPA without
requiring a rebuild. The frontend app reads `window.RUNTIME_CONFIG` at startup.

```sh
#!/bin/sh
set -e

# Inject runtime configuration into the SPA
cat > /usr/share/nginx/html/config.js <<EOF
window.RUNTIME_CONFIG = {
  API_BASE_URL: '${API_BASE_URL:-http://localhost:8000/api}'
};
EOF

echo "Runtime config injected:"
cat /usr/share/nginx/html/config.js

exec "$@"
```

After creating the file, remind the user to:
1. Add `<script src="/config.js"></script>` to `public/index.html` (before the app bundle)
2. Read config in the frontend with `window.RUNTIME_CONFIG?.API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL`

### 6. Generate docker-compose.yml

**Location**: `docker-compose.yml` (project root)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
    container_name: <app>-backend
    ports:
      - "<backend_port>:<backend_port>"
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///./data/<app>.db
      - API_HOST=0.0.0.0
      - API_PORT=<backend_port>
      - DEBUG=true
      # Add app-specific env vars here
    volumes:
      - ./data:/app/data          # persist database
      - ./backend/app:/app/app    # hot-reload in dev (remove for prod)
    restart: unless-stopped
    networks:
      - <app>-network

  frontend:
    build:
      context: ./frontend
    container_name: <app>-frontend
    ports:
      - "<frontend_port>:80"
    environment:
      - API_BASE_URL=http://localhost:<backend_port>/api
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - <app>-network

networks:
  <app>-network:
    driver: bridge

volumes:
  <app>-data:
```

**Rules:**
- `volumes: ./backend/app:/app/app` enables hot-reload during development; note this in a comment
- Always add `depends_on: - backend` for the frontend service
- Use named networks to isolate the app stack
- For production, remove the source-mount volume from the backend

### 7. Create the data directory

```bash
mkdir -p data && touch data/.gitkeep
```

Add `data/*.db` to `.gitignore` if not already present.

### 8. Show summary

After all files are written, display:
- List of files created / modified
- How to start: `docker compose up --build`
- How to view logs: `docker compose logs -f`
- Note any manual steps (e.g., adding `<script src="/config.js">` tag)
