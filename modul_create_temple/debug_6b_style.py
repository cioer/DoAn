from docx import Document

def check_bold_status():
    doc = Document("form_engine/output/2026-01-16/6b_rejected.docx")
    
    print("--- CHECK BOLD STATUS ---")
    count = 0
    for p in doc.paragraphs:
        if "không đạt yêu cầu" in p.text: # Tìm dòng nội dung
            count += 1
            print(f"[{count}] Content: {p.text[:30]}...")
            print(f"    - Paragraph Style: {p.style.name}")
            for i, run in enumerate(p.runs):
                print(f"    - Run {i}: Bold={run.bold}, Text='{run.text[:20]}...'")

if __name__ == "__main__":
    check_bold_status()
