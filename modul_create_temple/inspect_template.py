from docx import Document

def inspect_1b():
    try:
        doc = Document('form_engine/templates/1b.docx')
        print("--- NỘI DUNG FILE 1B.DOCX ---")
        for i, p in enumerate(doc.paragraphs):
            # Chỉ in các dòng có chứa nội dung liên quan để dễ nhìn
            if p.text.strip():
                print(f"[{i}] {p.text}")
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    inspect_1b()
