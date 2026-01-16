"""
Health check API routes
"""

from fastapi import APIRouter
import subprocess
import datetime
import logging

from ..schemas import HealthStatus
from ...core.config import get_settings
from ...core.engine import FormEngine

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health"])


def check_libreoffice() -> bool:
    """Check if LibreOffice is available"""
    try:
        result = subprocess.run(
            ["soffice", "--version"],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


@router.get("/health", response_model=HealthStatus)
async def health_check():
    """
    Health check endpoint.

    Returns service status, version, and availability of components.
    """
    settings = get_settings()

    try:
        engine = FormEngine()
        templates = engine.get_available_templates()
        templates_count = len(templates)
    except Exception as e:
        logger.error(f"Error checking templates: {e}")
        templates_count = 0

    return HealthStatus(
        status="healthy",
        version=settings.app_version,
        templates_available=templates_count,
        libreoffice_available=check_libreoffice(),
        timestamp=datetime.datetime.now().isoformat()
    )


@router.get("/")
async def root():
    """Root endpoint - redirects to health check info"""
    settings = get_settings()
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health"
    }
