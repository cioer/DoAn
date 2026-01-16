"""
Form rendering API routes
"""

from fastapi import APIRouter, HTTPException
from typing import List
import logging

from ..schemas import (
    RenderFormRequest,
    ApiResponseRenderForm,
    ApiResponseTemplates,
    ApiResponseTemplateInfo,
    TemplateInfo,
    RenderFormResult
)
from ...core.engine import FormEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/forms", tags=["Forms"])

# Initialize engine (singleton pattern)
_engine = None


def get_engine() -> FormEngine:
    global _engine
    if _engine is None:
        _engine = FormEngine()
    return _engine


@router.post("/render", response_model=ApiResponseRenderForm)
async def render_form(request: RenderFormRequest):
    """
    Render a form template with provided context data.

    - **template_name**: Name of the template file (e.g., "1b.docx")
    - **context**: Dictionary of variables to replace in the template
    - **user_id**: ID of the user generating the document
    - **proposal_id**: Optional proposal ID for tracking

    Returns paths and URLs to generated DOCX and PDF files.
    """
    try:
        engine = get_engine()

        result = engine.render(
            template_name=request.template_name,
            context=request.context,
            user_id=request.user_id,
            proposal_id=request.proposal_id
        )

        return ApiResponseRenderForm(
            success=True,
            data=RenderFormResult(**result)
        )

    except FileNotFoundError as e:
        logger.error(f"Template not found: {e}")
        return ApiResponseRenderForm(
            success=False,
            error={
                "code": "TEMPLATE_NOT_FOUND",
                "message": str(e)
            }
        )

    except Exception as e:
        logger.exception(f"Error rendering form: {e}")
        return ApiResponseRenderForm(
            success=False,
            error={
                "code": "RENDER_ERROR",
                "message": str(e)
            }
        )


@router.get("/templates", response_model=ApiResponseTemplates)
async def list_templates():
    """
    List all available templates.

    Returns a list of template names with their metadata.
    """
    try:
        engine = get_engine()
        templates = engine.get_available_templates()

        return ApiResponseTemplates(
            success=True,
            data=[TemplateInfo(**t) for t in templates]
        )

    except Exception as e:
        logger.exception(f"Error listing templates: {e}")
        return ApiResponseTemplates(
            success=False,
            error={
                "code": "LIST_ERROR",
                "message": str(e)
            }
        )


@router.get("/templates/{template_name}", response_model=ApiResponseTemplateInfo)
async def get_template_info(template_name: str):
    """
    Get information about a specific template.

    - **template_name**: Name of the template file
    """
    try:
        engine = get_engine()
        template_info = engine.get_template_info(template_name)

        if template_info is None:
            return ApiResponseTemplateInfo(
                success=False,
                error={
                    "code": "TEMPLATE_NOT_FOUND",
                    "message": f"Template '{template_name}' not found"
                }
            )

        return ApiResponseTemplateInfo(
            success=True,
            data=TemplateInfo(**template_info)
        )

    except Exception as e:
        logger.exception(f"Error getting template info: {e}")
        return ApiResponseTemplateInfo(
            success=False,
            error={
                "code": "INFO_ERROR",
                "message": str(e)
            }
        )
