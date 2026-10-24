import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration: defaults to SQLite for zero-config local run, supports PostgreSQL via env
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'wally_finance.db'}")

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "wally-student-finance-secret-key-change-in-production-2026")
TOKEN_EXPIRE_DAYS = int(os.getenv("TOKEN_EXPIRE_DAYS", "30"))

# Static frontend folder path (points to "frontend" or legacy "mannus project")
FRONTEND_DIR = (BASE_DIR.parent / "frontend") if (BASE_DIR.parent / "frontend").exists() else (BASE_DIR.parent / "mannus project")

# CORS origins
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*"
]
