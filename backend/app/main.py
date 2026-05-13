from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine
from app.db import base  # noqa: F401 — ensures all models are registered
from app.models import base as _models  # noqa: F401
from app.routers import auth, users, groups, slots, installments, draw, payouts

app = FastAPI(title="Chit Fund API", version="0.1.0")

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
