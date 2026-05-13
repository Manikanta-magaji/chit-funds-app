#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

if [[ -x "$BACKEND_DIR/.venv/bin/uvicorn" ]]; then
  BACKEND_CMD=("$BACKEND_DIR/.venv/bin/uvicorn" "app.main:app" "--reload" "--host" "0.0.0.0" "--port" "8000")
elif command -v uvicorn >/dev/null 2>&1; then
  BACKEND_CMD=("uvicorn" "app.main:app" "--reload" "--host" "0.0.0.0" "--port" "8000")
else
  echo "Could not find uvicorn. Install backend dependencies or create backend/.venv first."
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  FRONTEND_CMD=("npm" "run" "dev")
else
  echo "Could not find npm. Install Node.js and npm first."
  exit 1
fi

cleanup() {
  echo
  echo "Stopping backend and frontend..."
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

echo "Starting backend on http://localhost:8000"
(
  cd "$BACKEND_DIR"
  "${BACKEND_CMD[@]}"
) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173"
(
  cd "$FRONTEND_DIR"
  "${FRONTEND_CMD[@]}"
) &
FRONTEND_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID"
