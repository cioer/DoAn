# Tech Spec: Tích Hợp FormEngine Microservice

**Author:** Coc
**Date:** 2026-01-16
**Status:** Draft
**Type:** Feature Integration

---

## 1. Tổng Quan

### 1.1 Mục Tiêu
Tích hợp module `modul_create_temple` (Python FormEngine) vào hệ thống qlNCKH như một microservice, cung cấp khả năng:
- Tạo 15+ biểu mẫu DOCX (1b-18b) với formatting chính xác
- Chuyển đổi sang PDF qua LibreOffice
- Audit logging cho mọi document được tạo

### 1.2 Phương Án Đã Chọn
**Microservice Architecture** - Giữ nguyên Python FormEngine, wrap với FastAPI, NestJS gọi qua REST API.

```
┌─────────────────────────────────────────────────────────────────┐
│                        qlNCKH System                             │
│  ┌─────────────────┐         HTTP          ┌──────────────────┐ │
│  │   NestJS API    │ ◄───────────────────► │  FormEngine API  │ │
│  │  (Port 4000)    │      localhost:8080   │   (Port 8080)    │ │
│  │                 │                        │    FastAPI       │ │
│  │  DocumentsModule│                        │    Python 3.10+  │ │
│  │  └──FormClient  │                        │    LibreOffice   │ │
│  └─────────────────┘                        └──────────────────┘ │
│          │                                          │            │
│          ▼                                          ▼            │
│     PostgreSQL                              /output/, /templates/│
│     (documents, manifests)                  (DOCX, PDF files)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. FormEngine API (Python FastAPI)

### 2.1 Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/api/v1/forms/render` | Render template → DOCX + PDF |
| `GET` | `/api/v1/forms/templates` | Danh sách templates khả dụng |
| `GET` | `/api/v1/forms/templates/{name}` | Thông tin template cụ thể |
| `GET` | `/api/v1/health` | Health check |

### 2.2 Request/Response Schema

#### POST /api/v1/forms/render

**Request:**
```json
{
  "template_name": "1b.docx",
  "context": {
    "khoa": "Công nghệ Thông tin",
    "ten_de_tai": "Nghiên cứu ứng dụng AI trong giáo dục",
    "chu_nhiem": "TS. Nguyễn Văn A",
    "tinh_cap_thiet": "Nội dung tính cấp thiết...",
    "muc_tieu": "Mục tiêu nghiên cứu...",
    "noi_dung_chinh": "- Nội dung 1\n- Nội dung 2\n- Nội dung 3",
    "ket_qua_du_kien": "Kết quả dự kiến...",
    "ngay": "16",
    "thang": "01",
    "nam": "2026"
  },
  "user_id": "user_123",
  "proposal_id": "proposal_456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "docx_path": "/output/2026-01-16/1b_143022.docx",
    "pdf_path": "/output/2026-01-16/1b_143022.pdf",
    "docx_url": "http://localhost:8080/files/2026-01-16/1b_143022.docx",
    "pdf_url": "http://localhost:8080/files/2026-01-16/1b_143022.pdf",
    "template": "1b.docx",
    "timestamp": "2026-01-16T14:30:22.123456",
    "sha256_docx": "abc123...",
    "sha256_pdf": "def456..."
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Template '99b.docx' không tồn tại"
  }
}
```

### 2.3 File Structure (Python Service)

```
form-engine-service/
├── app/
│   ├── main.py                 # FastAPI app entry
│   ├── api/
│   │   ├── routes/
│   │   │   ├── forms.py        # /forms endpoints
│   │   │   └── health.py       # /health endpoint
│   │   └── deps.py             # Dependencies
│   ├── core/
│   │   ├── config.py           # Settings from env
│   │   └── engine.py           # FormEngine (từ module hiện tại)
│   ├── schemas/
│   │   ├── all_forms.py        # Pydantic schemas (từ module)
│   │   └── request.py          # API request/response schemas
│   └── templates/              # DOCX templates (copy từ module)
├── output/                     # Generated files (mounted volume)
├── logs/                       # Audit logs
├── Dockerfile
├── requirements.txt
└── docker-compose.yml
```

### 2.4 Docker Configuration

**Dockerfile:**
```dockerfile
FROM python:3.10-slim

# Install LibreOffice for PDF conversion
RUN apt-get update && apt-get install -y \
    libreoffice-writer \
    libreoffice-calc \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port
EXPOSE 8080

# Run FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**docker-compose.yml (addition to existing):**
```yaml
services:
  form-engine:
    build:
      context: ./form-engine-service
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    volumes:
      - ./form-engine-service/output:/app/output
      - ./form-engine-service/logs:/app/logs
    environment:
      - FORM_ENGINE_DEBUG=false
      - OUTPUT_DIR=/app/output
      - TEMPLATE_DIR=/app/templates
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - qlnckh-network
```

---

## 3. NestJS Integration

### 3.1 FormEngineClient Service

**Location:** `apps/src/modules/form-engine/`

```typescript
// form-engine.module.ts
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [FormEngineService],
  exports: [FormEngineService],
})
export class FormEngineModule {}

// form-engine.service.ts
@Injectable()
export class FormEngineService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('FORM_ENGINE_URL', 'http://localhost:8080');
  }

  async renderForm(dto: RenderFormDto): Promise<RenderFormResult> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/v1/forms/render`, {
        template_name: dto.templateName,
        context: dto.context,
        user_id: dto.userId,
        proposal_id: dto.proposalId,
      }),
    );

    if (!response.data.success) {
      throw new BadRequestException(response.data.error.message);
    }

    return response.data.data;
  }

  async getTemplates(): Promise<TemplateInfo[]> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/api/v1/forms/templates`),
    );
    return response.data.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/health`),
      );
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
```

### 3.2 DTO Definitions

```typescript
// dto/render-form.dto.ts
export class RenderFormDto {
  @IsString()
  templateName: string;

  @IsObject()
  context: Record<string, any>;

  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  proposalId?: string;
}

// dto/render-form-result.dto.ts
export interface RenderFormResult {
  docx_path: string;
  pdf_path: string;
  docx_url: string;
  pdf_url: string;
  template: string;
  timestamp: string;
  sha256_docx: string;
  sha256_pdf: string;
}
```

### 3.3 Integration với DocumentsModule

```typescript
// documents.service.ts (updated)
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formEngineService: FormEngineService, // NEW
    private readonly auditService: AuditService,
  ) {}

  async generateProposalDocument(
    proposalId: string,
    templateType: DocumentTemplateType,
    user: RequestUser,
  ): Promise<Document> {
    // 1. Get proposal data
    const proposal = await this.getProposalDataForDocx(proposalId);

    // 2. Map templateType to template file
    const templateName = this.mapTemplateTypeToFile(templateType);

    // 3. Build context from proposal
    const context = this.buildContextFromProposal(proposal, templateType);

    // 4. Call FormEngine
    const result = await this.formEngineService.renderForm({
      templateName,
      context,
      userId: user.id,
      proposalId,
    });

    // 5. Copy files to public directory
    const { docxPath, pdfPath } = await this.copyFilesToPublic(result);

    // 6. Save to database
    const document = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          proposalId,
          documentType: templateType,
          filePath: docxPath,
          fileName: path.basename(docxPath),
          fileSize: await this.getFileSize(docxPath),
          sha256Hash: result.sha256_docx,
          generatedBy: user.id,
          generatedAt: new Date(),
        },
      });

      await tx.documentManifest.create({
        data: {
          documentId: doc.id,
          templateVersion: '1.0',
          proposalData: proposal as any,
        },
      });

      return doc;
    });

    // 7. Audit log
    await this.auditService.logEvent({
      action: AuditAction.DOC_GENERATED,
      actorUserId: user.id,
      entityType: 'Document',
      entityId: document.id,
      metadata: { templateType, proposalId },
    });

    return document;
  }

  private mapTemplateTypeToFile(type: DocumentTemplateType): string {
    const mapping: Record<DocumentTemplateType, string> = {
      PROPOSAL_OUTLINE: '1b.docx',
      EVALUATION_FORM: '2b.docx',
      FINAL_REPORT: '10b.docx',
      FACULTY_ACCEPTANCE: '11b.docx',
      SCHOOL_ACCEPTANCE: '12b.docx',
      HANDOVER_CHECKLIST: '17b.docx',
    };
    return mapping[type];
  }
}
```

---

## 4. Template Mapping

### 4.1 Mapping biểu mẫu hiện có → Document Types

| Template | Mẫu | Tên Việt | DocumentTemplateType | Stage |
|----------|-----|----------|---------------------|-------|
| 1b.docx | Mẫu 1b | Phiếu đề xuất đề tài | `PROPOSAL_OUTLINE` | DRAFT |
| 2b.docx | Mẫu 2b | Phiếu đánh giá đề xuất | `EVALUATION_FORM` | FACULTY_REVIEW |
| 3b.docx | Mẫu 3b | Biên bản họp Khoa | `FACULTY_MEETING_MINUTES` | FACULTY_REVIEW |
| 4b.docx | Mẫu 4b | Danh mục tổng hợp | `SUMMARY_CATALOG` | SCHOOL_SELECTION |
| 5b.docx | Mẫu 5b | Phiếu đánh giá Trường | `SCHOOL_EVALUATION` | SCHOOL_SELECTION |
| 6b.docx | Mẫu 6b | Biên bản họp HĐ | `COUNCIL_MEETING_MINUTES` | OUTLINE_COUNCIL |
| 7b.docx | Mẫu 7b | Phiếu yêu cầu chỉnh sửa | `REVISION_REQUEST` | CHANGES_REQUESTED |
| 8b.docx | Mẫu 8b | Phiếu đánh giá NT Khoa | `FACULTY_ACCEPTANCE_EVAL` | FACULTY_ACCEPTANCE |
| 9b.docx | Mẫu 9b | Biên bản NT Khoa | `FACULTY_ACCEPTANCE_MINUTES` | FACULTY_ACCEPTANCE |
| 10b.docx | Mẫu 10b | Báo cáo tổng kết | `FINAL_REPORT` | FACULTY_ACCEPTANCE |
| 11b.docx | Mẫu 11b | Quyết định NT Khoa | `FACULTY_ACCEPTANCE_DECISION` | FACULTY_ACCEPTANCE |
| 12b.docx | Mẫu 12b | Phiếu đánh giá NT Trường | `SCHOOL_ACCEPTANCE_EVAL` | SCHOOL_ACCEPTANCE |
| 13b.docx | Mẫu 13b | Biên bản NT Trường | `SCHOOL_ACCEPTANCE_MINUTES` | SCHOOL_ACCEPTANCE |
| 14b.docx | Mẫu 14b | Quyết định NT Trường | `SCHOOL_ACCEPTANCE_DECISION` | SCHOOL_ACCEPTANCE |
| 15b.docx | Mẫu 15b | Danh sách sản phẩm | `PRODUCT_LIST` | SCHOOL_ACCEPTANCE |
| 16b.docx | Mẫu 16b | Phụ lục sản phẩm | `PRODUCT_APPENDIX` | SCHOOL_ACCEPTANCE |
| 17b.docx | Mẫu 17b | Biên bản bàn giao | `HANDOVER_CHECKLIST` | HANDOVER |
| 18b.docx | Mẫu 18b | Đơn xin gia hạn | `EXTENSION_REQUEST` | PAUSED |

### 4.2 Context Builder cho từng Template

```typescript
// context-builders/proposal-outline.builder.ts
export function buildProposalOutlineContext(proposal: ProposalDataForDocx): Record<string, any> {
  return {
    // Basic info
    khoa: proposal.faculty?.name || '',
    ten_de_tai: proposal.title,
    chu_nhiem: proposal.owner?.name || '',

    // Content sections
    tinh_cap_thiet: proposal.sections?.urgency || '',
    muc_tieu: proposal.sections?.objectives || '',
    noi_dung_chinh: formatBulletList(proposal.sections?.mainContent),
    ket_qua_du_kien: proposal.sections?.expectedResults || '',

    // Timeline
    thoi_gian_thuc_hien: `${proposal.duration || 12} tháng`,
    ngay_bat_dau: formatDate(proposal.startDate),
    ngay_ket_thuc: formatDate(proposal.endDate),

    // Budget
    kinh_phi: formatCurrency(proposal.budget?.total),

    // Date signature
    ngay: new Date().getDate().toString().padStart(2, '0'),
    thang: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    nam: new Date().getFullYear().toString(),
    dia_diem: 'Nam Định',
  };
}
```

---

## 5. Migration Plan

### 5.1 Phase 1: Setup FormEngine Service (1 ngày)

**Tasks:**
- [ ] Tạo `form-engine-service/` từ code hiện tại
- [ ] Wrap với FastAPI
- [ ] Viết Dockerfile + docker-compose
- [ ] Test local với curl

**Files cần tạo:**
```
form-engine-service/
├── app/main.py
├── app/api/routes/forms.py
├── app/api/routes/health.py
├── app/core/engine.py (copy từ modul_create_temple)
├── app/schemas/ (copy từ modul_create_temple)
├── templates/ (copy từ modul_create_temple)
├── Dockerfile
├── requirements.txt
└── docker-compose.yml
```

### 5.2 Phase 2: NestJS Integration (1 ngày)

**Tasks:**
- [ ] Tạo `FormEngineModule` trong NestJS
- [ ] Implement `FormEngineService` với HttpModule
- [ ] Thêm environment variable `FORM_ENGINE_URL`
- [ ] Tích hợp vào `DocumentsModule`
- [ ] Viết unit tests

**Files cần tạo/sửa:**
```
apps/src/modules/
├── form-engine/
│   ├── form-engine.module.ts
│   ├── form-engine.service.ts
│   ├── form-engine.service.spec.ts
│   └── dto/
│       ├── render-form.dto.ts
│       └── render-form-result.dto.ts
└── documents/
    └── documents.service.ts (update)
```

### 5.3 Phase 3: Context Builders (1 ngày)

**Tasks:**
- [ ] Implement context builder cho từng template type
- [ ] Map ProposalDataForDocx → template context
- [ ] Test với sample data

### 5.4 Phase 4: API Endpoints (0.5 ngày)

**Tasks:**
- [ ] Thêm endpoints mới vào DocumentsController
- [ ] Update API documentation
- [ ] Test E2E

### 5.5 Phase 5: Frontend Integration (0.5 ngày)

**Tasks:**
- [ ] Thêm API client cho form generation
- [ ] Update UI cho download DOCX/PDF
- [ ] Test user flow

---

## 6. Environment Configuration

### 6.1 Backend (.env)

```env
# FormEngine Service
FORM_ENGINE_URL=http://localhost:8080
FORM_ENGINE_TIMEOUT=30000
```

### 6.2 Docker Compose (update)

```yaml
# Add to existing docker-compose.yml
services:
  form-engine:
    build:
      context: ./form-engine-service
    ports:
      - "8080:8080"
    volumes:
      - form-engine-output:/app/output
      - form-engine-logs:/app/logs
    environment:
      - OUTPUT_DIR=/app/output
      - TEMPLATE_DIR=/app/templates
    networks:
      - qlnckh-network
    depends_on:
      - api

volumes:
  form-engine-output:
  form-engine-logs:
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// form-engine.service.spec.ts
describe('FormEngineService', () => {
  it('should render form successfully', async () => {
    const result = await service.renderForm({
      templateName: '1b.docx',
      context: { ten_de_tai: 'Test' },
      userId: 'user_1',
    });

    expect(result.docx_path).toContain('.docx');
    expect(result.pdf_path).toContain('.pdf');
  });

  it('should throw error for invalid template', async () => {
    await expect(
      service.renderForm({
        templateName: 'invalid.docx',
        context: {},
        userId: 'user_1',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
```

### 7.2 Integration Tests

```typescript
// documents.e2e-spec.ts
describe('Documents (e2e)', () => {
  it('should generate proposal document', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/documents/proposals/proposal_1/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ templateType: 'PROPOSAL_OUTLINE' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.filePath).toContain('.docx');
  });
});
```

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FormEngine service down | High | Health check + retry logic + fallback to existing docxtemplater |
| LibreOffice timeout | Medium | Increase timeout, queue long operations |
| File permission issues | Medium | Proper volume mounting, user permissions |
| Network latency | Low | Keep services on same network, use async where possible |

---

## 9. Rollback Plan

Nếu có vấn đề:
1. Disable FormEngine integration via feature flag
2. Fallback to existing `DocxService` (docxtemplater)
3. Roll back docker-compose changes

```typescript
// Feature flag in ConfigService
const useFormEngine = this.configService.get('USE_FORM_ENGINE', false);

if (useFormEngine) {
  return this.formEngineService.renderForm(...);
} else {
  return this.docxService.render(...); // existing
}
```

---

## 10. Success Criteria

- [ ] FormEngine service starts và healthy
- [ ] 15 templates render thành công
- [ ] PDF conversion hoạt động
- [ ] Audit log ghi nhận mọi generation
- [ ] Integration tests pass
- [ ] No regression trên existing document flow
