import logging
import shutil
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine
from app.db import base  # noqa: F401 — ensures all models are registered
from app.models import base as _models  # noqa: F401
from app.routers import auth, users, groups, slots, installments, draw, payouts

logger = logging.getLogger(__name__)


def _db_path_from_url(database_url: str) -> Path | None:
    """Return the filesystem Path for a sqlite:/// URL, or None for non-SQLite."""
    if not database_url.startswith("sqlite"):
        return None
    # sqlite:///./path  →  parsed.path = "/./path"
    parsed = urlparse(database_url)
    raw = parsed.path.lstrip("/")  # "./chit_fund.db" or absolute
    return Path(raw).resolve()


def _backup_database(db_file: Path) -> None:
    """Copy the SQLite DB (plus any WAL/SHM files) into a timestamped backup dir."""
    backup_dir = db_file.parent / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for suffix in ("", "-wal", "-shm"):
        src = db_file.with_suffix(db_file.suffix + suffix) if suffix else db_file
        if src.exists():
            shutil.copy2(src, backup_dir / src.name)
            logger.info("Backed up %s → %s", src, backup_dir / src.name)


def _run_migrations() -> None:
    """Run alembic upgrade head using the project alembic.ini."""
    # alembic.ini lives one level above the app/ package (i.e. backend/)
    ini_path = Path(__file__).parent.parent / "alembic.ini"
    alembic_cfg = Config(str(ini_path))
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_file = _db_path_from_url(settings.DATABASE_URL)

    if db_file is None:
        logger.info("Non-SQLite database — skipping backup; running migrations.")
        _run_migrations()
    elif not db_file.exists():
        logger.info("Database not found at %s — creating via migrations.", db_file)
        _run_migrations()
    else:
        logger.info("Database found at %s — backing up before migration.", db_file)
        _backup_database(db_file)
        _run_migrations()

    logger.info("Database is up to date.")
    yield


app = FastAPI(title="Chit Fund API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
app.include_router(slots.router, prefix="/api/groups", tags=["slots"])
app.include_router(installments.router, prefix="/api/groups", tags=["installments"])
app.include_router(draw.router, prefix="/api/groups", tags=["draw"])
app.include_router(payouts.router, prefix="/api/groups", tags=["payouts"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
