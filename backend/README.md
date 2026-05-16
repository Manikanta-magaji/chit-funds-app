# Chit Fund Backend

FastAPI backend for the Chit Fund management application. Uses SQLite for storage, Alembic for schema migrations, and JWT cookies for authentication.

## Requirements

- Python 3.11+
- pip

## Setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install the package and its dependencies
pip install -e ".[dev]"
```

## Configuration

Create a `.env` file in the `backend/` directory. All variables are optional — defaults work for local development.

```env
# Secret key for signing JWT tokens. Change this in production.
SECRET_KEY=change-me-in-production

# SQLite database file path (relative to the backend directory)
DATABASE_URL=sqlite:///./chit_fund.db

# Google OAuth credentials (leave blank to disable Google login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# Allowed CORS origins (comma-separated list as a JSON array)
CORS_ORIGINS=["http://localhost:5173"]

# Frontend base URL used for OAuth redirects
FRONTEND_URL=http://localhost:5173
```

## Database Migrations

Migrations are managed with [Alembic](https://alembic.sqlalchemy.org/). Always run from the `backend/` directory.

### Apply all pending migrations (bring DB up to date)

```bash
alembic upgrade head
```

### Check current migration state

```bash
alembic current
```

### View migration history

```bash
alembic history --verbose
```

### Roll back the last migration

```bash
alembic downgrade -1
```

### Create a new migration after changing models

```bash
alembic revision --autogenerate -m "describe your change"
```

Review the generated file in `alembic/versions/` before applying it — autogenerate is not always perfect.

## Running the Development Server

```bash
# Make sure migrations are applied first
alembic upgrade head

# Start the server with auto-reload
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs (Swagger UI): `http://localhost:8000/docs`

## Running Tests

```bash
pytest tests/
```

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app, router registration, CORS
│   ├── core/
│   │   ├── config.py    # Settings loaded from .env
│   │   ├── jwt.py       # Token creation and verification
│   │   ├── mobile.py    # Mobile number normalisation
│   │   └── security.py  # Password hashing
│   ├── db/
│   │   ├── session.py   # SQLAlchemy engine and session factory
│   │   └── base.py      # Declarative base
│   ├── models/
│   │   └── models.py    # ORM models (User, ChitGroup, ContributorSlot, …)
│   ├── routers/
│   │   ├── auth.py      # /api/auth — register, login, Google OAuth
│   │   ├── users.py     # /api/users
│   │   ├── groups.py    # /api/groups
│   │   ├── slots.py     # /api/groups/{id}/slots
│   │   ├── installments.py
│   │   ├── draw.py
│   │   └── payouts.py
│   └── schemas/         # Pydantic request/response models
├── alembic/
│   └── versions/        # Migration scripts
├── alembic.ini
├── pyproject.toml
└── tests/
```

## Docker

The backend is containerised and wired up in the root `docker-compose.yml`. The `docker-entrypoint.sh` automatically runs `alembic upgrade head` before starting the server, so no manual migration step is needed when using Docker.

```bash
# From the repo root
docker compose up --build
```
