"""
API Request/Response schemas
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


# =============================================================================
# Request Schemas
# =============================================================================

class RenderFormRequest(BaseModel):
    """Request to render a form template"""
    template_name: str = Field(..., description="Name of template file (e.g., '1b.docx')")
    context: Dict[str, Any] = Field(default_factory=dict, description="Variables to replace in template")
    user_id: str = Field(default="system", description="ID of user generating document")
    proposal_id: Optional[str] = Field(None, description="Optional proposal ID for tracking")

    model_config = {
        "json_schema_extra": {
            "example": {
                "template_name": "1b.docx",
                "context": {
                    "khoa": "Cong nghe Thong tin",
                    "ten_de_tai": "Nghien cuu ung dung AI trong giao duc",
                    "chu_nhiem": "TS. Nguyen Van A",
                    "ngay": "16",
                    "thang": "01",
                    "nam": "2026"
                },
                "user_id": "user_123",
                "proposal_id": "proposal_456"
            }
        }
    }


# =============================================================================
# Response Schemas
# =============================================================================

class RenderFormResult(BaseModel):
    """Result of form rendering"""
    docx_path: str
    pdf_path: Optional[str]
    docx_url: str
    pdf_url: Optional[str]
    template: str
    timestamp: str
    user_id: str
    proposal_id: Optional[str]
    sha256_docx: str
    sha256_pdf: Optional[str]


class TemplateInfo(BaseModel):
    """Information about a template"""
    name: str
    path: str
    size: int
    modified: str


class HealthStatus(BaseModel):
    """Health check response"""
    status: str
    version: str
    templates_available: int
    libreoffice_available: bool
    timestamp: str


class ApiResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, str]] = None
    message: Optional[str] = None


class ApiResponseRenderForm(BaseModel):
    """API response for form rendering"""
    success: bool
    data: Optional[RenderFormResult] = None
    error: Optional[Dict[str, str]] = None


class ApiResponseTemplates(BaseModel):
    """API response for templates list"""
    success: bool
    data: Optional[List[TemplateInfo]] = None
    error: Optional[Dict[str, str]] = None


class ApiResponseTemplateInfo(BaseModel):
    """API response for single template info"""
    success: bool
    data: Optional[TemplateInfo] = None
    error: Optional[Dict[str, str]] = None
