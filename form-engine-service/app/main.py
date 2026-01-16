"""
Form Engine Service - FastAPI Application

A microservice for generating DOCX and PDF documents from templates.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import get_settings
from .api.routes import forms, health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Template directory: {settings.template_dir}")
    logger.info(f"Output directory: {settings.output_dir}")

    # Ensure directories exist
    Path(settings.output_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.log_dir).mkdir(parents=True, exist_ok=True)

    yield

    logger.info("Shutting down Form Engine Service")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="""
## Form Engine Service

A microservice for generating DOCX and PDF documents from Word templates.

### Features:
- **Template Rendering**: Fill Word templates with dynamic data
- **PDF Conversion**: Automatic PDF generation via LibreOffice
- **Audit Logging**: Track all document generations
- **SHA256 Integrity**: Hash verification for generated documents

### Endpoints:
- `POST /api/v1/forms/render` - Render a template
- `GET /api/v1/forms/templates` - List available templates
- `GET /api/v1/forms/templates/{name}` - Get template info
- `GET /api/v1/health` - Health check
        """,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount static files for serving generated documents
    output_path = Path(settings.output_dir)
    if output_path.exists():
        app.mount("/files", StaticFiles(directory=str(output_path)), name="files")

    # Include routers
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(forms.router, prefix="/api/v1")

    # Root route
    @app.get("/")
    async def root():
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/api/v1/health"
        }

    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
