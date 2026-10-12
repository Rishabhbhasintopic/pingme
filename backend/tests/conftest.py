import os
import tempfile
from datetime import datetime, timedelta, timezone
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["PINGME_DATA_DIR"] = tempfile.mkdtemp()

from backend.app.core.config import settings
from backend.app.core.database import Base, get_db
from backend.app.core.security import hash_token
from backend.app.main import app
from backend.app.models.models import APIToken, utc_now
from backend.app.services import push_service

# Use in-memory SQLite with StaticPool for fast, isolated tests
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

TEST_ADMIN_TOKEN = "pm_test_admin_token_1234567890abcdef"
TEST_REVOKED_TOKEN = "pm_test_revoked_token_abcdef123456"
TEST_EXPIRED_TOKEN = "pm_test_expired_token_fedcba654321"


@pytest.fixture(scope="session", autouse=True)
def mock_push_delivery(monkeypatch_session=None):
    """Mock push delivery to avoid external network requests during tests."""
    original_send = push_service.send_web_push

    def mock_send(subscription, payload, db, message_id=None):
        if "expired" in subscription.endpoint:
            subscription.is_active = False
            db.commit()
            return False
        return True

    push_service.send_web_push = mock_send
    yield
    push_service.send_web_push = original_send


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()

    # Seed test tokens
    admin_tok = APIToken(
        name="Test Admin Token",
        token_hash=hash_token(TEST_ADMIN_TOKEN),
        token_prefix=TEST_ADMIN_TOKEN[:8] + "...",
        is_revoked=False,
        created_at=utc_now(),
    )
    revoked_tok = APIToken(
        name="Test Revoked Token",
        token_hash=hash_token(TEST_REVOKED_TOKEN),
        token_prefix=TEST_REVOKED_TOKEN[:8] + "...",
        is_revoked=True,
        created_at=utc_now(),
    )
    expired_tok = APIToken(
        name="Test Expired Token",
        token_hash=hash_token(TEST_EXPIRED_TOKEN),
        token_prefix=TEST_EXPIRED_TOKEN[:8] + "...",
        is_revoked=False,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        created_at=utc_now() - timedelta(days=2),
    )
    session.add_all([admin_tok, revoked_tok, expired_tok])
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers() -> dict:
    return {"Authorization": f"Bearer {TEST_ADMIN_TOKEN}"}


@pytest.fixture
def api_key_headers() -> dict:
    return {"X-API-Key": TEST_ADMIN_TOKEN}
