import os
import json
import logging
import subprocess
import datetime
from typing import Dict, Any, Optional

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
        self.today_dir = os.path.join(self.output_dir, datetime.datetime.now().strftime("%Y-%m-%d"))
        os.makedirs(self.today_dir, exist_ok=True)

    def _get_output_path(self, base_name: str, ext: str) -> str:
        timestamp = datetime.datetime.now().strftime("%H%M%S")
        return os.path.join(self.today_dir, f"{base_name}_{timestamp}.{ext}")

    def replace_text_in_element(self, element, context):
        """Helper to replace text in paragraph or cell"""
        if not element.text:
            return

        for key, val in context.items():
            # Check for multiple patterns: {{key}}, {{ key }}, {{key }}
            patterns = [
                f"{{{{ {key} }}}}",
                f"{{{{{key}}}}}",
                f"{{{{ {key}}}}}",
                f"{{{{{key} }}}}"
            ]
            
            val_str = str(val) if val is not None else ""
            
            for pat in patterns:
                if pat in element.text:
                    # SMART REPLACE STRATEGY:
                    # If the pattern is split across runs, simple replace won't work on individual runs.
                    # We modify the whole paragraph text.
                    # Warning: This resets formatting of the whole paragraph to the style of the first run.
                    # But ensures data is filled.
                    
                    # Support Newline \n by adding breaks
                    if '\n' in val_str:
                        parts = val_str.split('\n')
                        # Clear old runs
                        for run in element.runs:
                            run.text = ""
                        
                        # Add parts with breaks
                        if element.runs:
                            r = element.runs[0]
                            r.text = parts[0]
                            for part in parts[1:]:
                                r.add_break()
                                r.add_text(part)
                        else:
                            r = element.add_run(parts[0])
                            for part in parts[1:]:
                                r.add_break()
                                r.add_text(part)
                    else:
                        # Normal replace
                        new_text = element.text.replace(pat, val_str)
                        for run in element.runs:
                            run.text = ""
                        if element.runs:
                            element.runs[0].text = new_text
                        else:
                            element.add_run(new_text)

    def render(self, template_name: str, context: Dict[str, Any], user_id: str = "system") -> Dict[str, str]:
        from docx import Document
        
        template_path = os.path.join(self.template_dir, template_name)
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template {template_name} not found")

        docx_output_path = self._get_output_path(template_name.replace(".docx", ""), "docx")
        
        # Load Document
        doc = Document(template_path)
        
        # 1. Replace in Paragraphs (Body)
        for p in doc.paragraphs:
            self.replace_text_in_element(p, context)

        # 2. Replace in Tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        self.replace_text_in_element(p, context)
        
        # Save DOCX
        doc.save(docx_output_path)
        
        # Convert PDF
        pdf_output_path = None
        try:
            cmd_check = ["soffice", "--version"]
            subprocess.run(cmd_check, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            cmd = ["soffice", "--headless", "--convert-to", "pdf", "--outdir", self.today_dir, docx_output_path]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # LibreOffice output name logic
            expected_pdf = docx_output_path.replace(".docx", ".pdf")
            if os.path.exists(expected_pdf):
                pdf_output_path = expected_pdf
        except:
            logger.warning("PDF Conversion failed or LibreOffice not present")

        result = {
            "docx": docx_output_path,
            "pdf": pdf_output_path,
            "timestamp": datetime.datetime.now().isoformat(),
            "user": user_id
        }
        
        # Audit Log
        with open("form_engine/logs/audit.jsonl", "a", encoding='utf-8') as f:
            f.write(json.dumps(result, ensure_ascii=False) + "\n")

        return result
