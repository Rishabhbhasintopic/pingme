from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.conversations import router as conversations_router
from backend.app.api.v1.devices import router as devices_router
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.messages import router as messages_router
from backend.app.api.v1.push import router as push_router
from backend.app.api.v1.ws import router as ws_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(messages_router)
api_v1_router.include_router(conversations_router)
api_v1_router.include_router(devices_router)
api_v1_router.include_router(push_router)
api_v1_router.include_router(health_router)
api_v1_router.include_router(ws_router)
