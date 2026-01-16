from docx import Document
import os

def debug_6b_layout():
    path = "form_engine/output/2026-01-16/6b_rejected.docx"
    doc = Document(path)
    
    print("--- PARAGRAPH ANALYSIS (SECTION 7) ---")
    
    # Tìm vùng Mục 7
    found_section_7 = False
    count = 0
    
    for i, p in enumerate(doc.paragraphs):
        text = p.text
        # In ra các ký tự ẩn để debug (dấu cách, tab)
        debug_text = text.replace(" ", "•").replace("\t", "→")
        
        if "Kết luận của Hội đồng" in text:
            found_section_7 = True
            print(f"[{i}] [HEADER] {text}")
            continue
            
        if found_section_7:
            if not text.strip():
                print(f"[{i}] [EMPTY] Len={len(text)} Raw='{debug_text}'")
            else:
                print(f"[{i}] [TEXT]  {debug_text}")
            
            count += 1
            if count > 15: break # Chỉ check 15 dòng sau mục 7

if __name__ == "__main__":
    debug_6b_layout()
