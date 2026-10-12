import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import settings
from backend.app.core.database import Base, SessionLocal, engine
from backend.app.core.security import hash_token
from backend.app.models.models import APIToken, utc_now
from backend.app.services.push_service import ensure_vapid_keys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pingme")


def init_db():
    """Create tables and ensure initial admin token exists."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        token_count = db.query(APIToken).count()
        if token_count == 0 and settings.INITIAL_ADMIN_TOKEN:
            init_token = APIToken(
                name="Initial Admin Token",
                token_hash=hash_token(settings.INITIAL_ADMIN_TOKEN),
                token_prefix=settings.INITIAL_ADMIN_TOKEN[:8] + "...",
                is_revoked=False,
                created_at=utc_now(),
            )
            db.add(init_token)
            db.commit()
            logger.info("Database initialized with initial admin token (%s)", init_token.token_prefix)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting %s backend server...", settings.PROJECT_NAME)
    init_db()
    ensure_vapid_keys()
    yield
    # Shutdown
    logger.info("Stopping %s backend server...", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-Ready iOS Voice Messaging PWA Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in settings.CORS_ORIGINS else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_v1_router)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
