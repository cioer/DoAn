import os
import json
import logging
import subprocess
import datetime
from typing import Dict, Any, Optional

# Cố gắng import docxtpl, nếu không có thì dùng mock (chỉ để demo environment)
try:
    from docxtpl import DocxTemplate
    HAS_DOCXTPL = True
except ImportError:
    HAS_DOCXTPL = False
    from docx import Document # Fallback basic

# Setup Logging
logging.basicConfig(
    filename='form_engine/logs/engine.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FormEngine:
    def __init__(self, template_dir="form_engine/templates", output_dir="form_engine/output"):
        self.template_dir = template_dir
        self.output_dir = output_dir
        
        # Tạo output dir theo ngày
        self.today_dir = os.path.join(self.output_dir, datetime.datetime.now().strftime("%Y-%m-%d"))
        os.makedirs(self.today_dir, exist_ok=True)

    def _get_output_path(self, base_name: str, ext: str) -> str:
        timestamp = datetime.datetime.now().strftime("%H%M%S")
        return os.path.join(self.today_dir, f"{base_name}_{timestamp}.{ext}")

    def render(self, template_name: str, context: Dict[str, Any], user_id: str = "system") -> Dict[str, str]:
        """
        Quy trình chuẩn:
        1. Load Template
        2. Merge Context
        3. Save DOCX
        4. Convert PDF (nếu có LibreOffice)
        5. Return paths
        """
        template_path = os.path.join(self.template_dir, template_name)
        if not os.path.exists(template_path):
            error_msg = f"Template {template_name} not found at {template_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)

        logger.info(f"Start processing {template_name} for user {user_id}")
        
        # 1. & 2. Render
        docx_output_path = self._get_output_path(template_name.replace(".docx", ""), "docx")
        
        try:
            if HAS_DOCXTPL:
                doc = DocxTemplate(template_path)
                doc.render(context)
                doc.save(docx_output_path)
            else:
                # Fallback thô sơ cho môi trường không có docxtpl (chỉ replace text)
                doc = Document(template_path)
                for p in doc.paragraphs:
                    for key, val in context.items():
                        if isinstance(val, str) and f"{{{{ {key} }}}}" in p.text:
                            p.text = p.text.replace(f"{{{{ {key} }}}}", val)
                doc.save(docx_output_path)
                logger.warning("Using basic fallback renderer (no rich features)")

        except Exception as e:
            logger.error(f"Render failed: {str(e)}")
            raise e

        # 3. Convert PDF (LibreOffice)
        pdf_output_path = self._get_output_path(template_name.replace(".docx", ""), "pdf")
        
        try:
            # Kiểm tra xem soffice có tồn tại không
            cmd_check = ["soffice", "--version"]
            subprocess.run(cmd_check, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Convert
            cmd = [
                "soffice", "--headless", "--convert-to", "pdf",
                "--outdir", self.today_dir,
                docx_output_path
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # LibreOffice lưu file với tên gốc, ta cần đảm bảo đúng path
            # (Thường nó sẽ tự đặt tên giống docx nhưng đuôi pdf trong outdir)
            expected_pdf = docx_output_path.replace(".docx", ".pdf")
            if os.path.exists(expected_pdf):
                pdf_output_path = expected_pdf
            else:
                pdf_output_path = None
                
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("LibreOffice not found or failed. Skipping PDF generation.")
            pdf_output_path = None

        result = {
            "docx": docx_output_path,
            "pdf": pdf_output_path,
            "timestamp": datetime.datetime.now().isoformat(),
            "user": user_id
        }
        
        # 4. Audit Log
        with open("form_engine/logs/audit.jsonl", "a", encoding='utf-8') as f:
            f.write(json.dumps(result, ensure_ascii=False) + "\n")
            
        return result
