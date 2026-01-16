# Form Engine Service

Microservice for generating DOCX and PDF documents from Word templates.

## Features

- Template-based document generation
- Automatic PDF conversion via LibreOffice
- Smart variable replacement (handles split XML runs)
- List alignment preservation
- Non-breaking space for date lines
- SHA256 integrity hashing
- Audit logging

## Quick Start

### 1. Copy templates

```bash
# Copy templates from modul_create_temple
cp -r ../modul_create_temple/form_engine/templates ./templates
```

### 2. Run with Docker

```bash
# Build and run
docker-compose up -d

# Check health
curl http://localhost:8080/api/v1/health
```

### 3. Run locally (development)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FORM_ENGINE_TEMPLATE_DIR=./templates
export FORM_ENGINE_OUTPUT_DIR=./output
export FORM_ENGINE_LOG_DIR=./logs

# Run
uvicorn app.main:app --reload --port 8080
```

## API Endpoints

### Render Form
```bash
POST /api/v1/forms/render

{
  "template_name": "1b.docx",
  "context": {
    "khoa": "Cong nghe Thong tin",
    "ten_de_tai": "Nghien cuu AI",
    "chu_nhiem": "TS. Nguyen Van A"
  },
  "user_id": "user_123",
  "proposal_id": "proposal_456"
}
```

### List Templates
```bash
GET /api/v1/forms/templates
```

### Get Template Info
```bash
GET /api/v1/forms/templates/1b.docx
```

### Health Check
```bash
GET /api/v1/health
```

## Integration with qlNCKH

Add to your NestJS `.env`:
```
FORM_ENGINE_URL=http://localhost:8080
```

Then use `FormEngineService` to call the API.

## Directory Structure

```
form-engine-service/
├── app/
│   ├── main.py           # FastAPI application
│   ├── api/
│   │   ├── routes/
│   │   │   ├── forms.py  # Form rendering endpoints
│   │   │   └── health.py # Health check endpoint
│   │   └── schemas.py    # Pydantic models
│   └── core/
│       ├── config.py     # Settings from env
│       └── engine.py     # FormEngine (document generation)
├── templates/            # DOCX templates
├── output/               # Generated files (by date)
├── logs/                 # Audit logs
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Available Templates

| Template | Description |
|----------|-------------|
| 1b.docx | Phieu de xuat de tai |
| 2b.docx | Phieu danh gia de xuat |
| 3b.docx | Bien ban hop Khoa |
| 4b.docx | Danh muc tong hop |
| 5b.docx | Phieu danh gia Truong |
| 6b.docx | Bien ban hop Hoi dong |
| 7b.docx | Phieu yeu cau chinh sua |
| 8b.docx | Phieu danh gia NT Khoa |
| 9b.docx | Bien ban NT Khoa |
| 10b.docx | Bao cao tong ket |
| 11b.docx | Quyet dinh NT Khoa |
| 12b.docx | Phieu danh gia NT Truong |
| 13b.docx | Bien ban NT Truong |
| 14b.docx | Quyet dinh NT Truong |
| 18b.docx | Don xin gia han |
