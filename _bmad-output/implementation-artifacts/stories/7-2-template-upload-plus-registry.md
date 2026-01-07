# Story 7.2: Template Upload & Registry

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Admin/PKHCN,
I want upload và quản lý .docx template files,
So that hệ thống có thể generate documents từ templates.

## Acceptance Criteria

1. **AC1: Template Management Page**
   - Given User có role = ADMIN hoặc PHONG_KHCN
   - When User vào Template Management page
   - Then UI hiển thị:
     - Danh sách templates (table)
     - Button "Upload template mới"
     - Per row: Preview, Download, Activate, Delete buttons

2. **AC2: Template Upload Dialog**
   - Given User click "Upload template mới"
   - When Upload modal mở
   - Then User điền:
     - Template name (text, required)
     - Description (textarea)
     - File upload (.docx, required)
     - Template type: proposal_outline, evaluation_form, final_report, etc.

3. **AC3: Placeholder Extraction**
   - Given User upload .docx file
   - When server process file
   - Then extract placeholders:
     - Scan cho `{{variable_name}}` patterns
     - Validate placeholders against known proposal data fields
     - Warn nếu unknown placeholders detected

4. **AC4: Template Activation**
   - Given Template đã upload
   - When Admin click "Activate"
   - Then template được đánh dấu active
   - And chỉ 1 template active per type tại một thời điểm

5. **AC5: Template Usage**
   - Given Template active
   - When Proposal cần generate document
   - Then system dùng active template cho type đó

6. **AC6: RBAC Authorization**
   - Given Template management endpoints
   - When accessing by non-admin user
   - Then return 403 Forbidden
   - Only ADMIN and PHONG_KHCN can manage templates

## Tasks / Subtasks

- [ ] Task 1: Backend - Template Model & Migration (AC: #1, #4)
  - [ ] Create `document_templates` table in Prisma schema
  - [ ] Add fields: id, name, description, template_type, file_path, is_active, placeholders, created_at, updated_at
  - [ ] Create enum for DocumentTemplateType
  - [ ] Run migration

- [ ] Task 2: Backend - Template Upload Service (AC: #2, #3)
  - [ ] Create `DocumentTemplateService`
  - [ ] Implement uploadTemplate() method
  - [ ] Extract placeholders from .docx file
  - [ ] Validate placeholders against proposal data schema
  - [ ] Store file with naming: `template_{id}_{type}_{timestamp}.docx`
  - [ ] Calculate SHA-256 hash for integrity

- [ ] Task 3: Backend - Placeholder Extraction Logic (AC: #3)
  - [ ] Implement regex for `{{variable_name}}` pattern
  - [ ] Define known proposal data fields mapping
  - [ ] Compare extracted placeholders with known fields
  - [ ] Return warnings for unknown placeholders
  - [ ] Store placeholders array in template record

- [ ] Task 4: Backend - Template CRUD Endpoints (AC: #1, #4, #6)
  - [ ] Create GET /templates - List all templates
  - [ ] Create POST /templates - Upload new template
  - [ ] Create PUT /templates/:id/activate - Activate template
  - [ ] Create DELETE /templates/:id - Delete template
  - [ ] Create GET /templates/:id/download - Download template file
  - [ ] Add RBAC guards (ADMIN, PHONG_KHCN)

- [ ] Task 5: Backend - Active Template Resolution (AC: #5)
  - [ ] Implement getActiveTemplate() method
  - [ ] Return active template for given type
  - [ ] Cache active templates in Redis (TTL: 1h)
  - [ ] Invalidate cache on template activate/delete

- [ ] Task 6: Frontend - Template Management Page (AC: #1)
  - [ ] Create TemplateManagement component
  - [ ] Create TemplateList component with table
  - [ ] Add "Upload template mới" button
  - [ ] Add per-row actions (Preview, Download, Activate, Delete)
  - [ ] Add role-based visibility check

- [ ] Task 7: Frontend - Template Upload Dialog (AC: #2)
  - [ ] Create TemplateUploadDialog component
  - [ ] Add form fields: name, description, file upload, type
  - [ ] Add file validation (.docx only)
  - [ ] Add file size validation (max 5MB)
  - [ ] Show extracted placeholders after upload
  - [ ] Show warnings for unknown placeholders

- [ ] Task 8: Frontend - Template Activation UI (AC: #4)
  - [ ] Add "Activate" button per row
  - [ ] Show confirmation dialog before activate
  - [ ] Deactivate previous template of same type
  - [ ] Show success notification
  - [ ] Refresh list after activation

- [ ] Task 9: Unit Tests (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Test template upload with valid .docx
  - [ ] Test placeholder extraction
  - [ ] Test placeholder validation
  - [ ] Test template activation
  - [ ] Test only one active template per type
  - [ ] Test RBAC for all endpoints
  - [ ] Test file validation

- [ ] Task 10: Integration Tests (AC: #1, #2, #3, #4, #5)
  - [ ] Test full upload → activate → use flow
  - [ ] Test placeholder extraction from real .docx
  - [ ] Test template download
  - [ ] Test template deletion

## Dev Notes

### Epic 7 Context

**Epic 7: Document Export (Milestone Completion)**
- FRs covered: FR33, FR70
- Story 7.1: Document Export Completion (Refinement) (done)
- **Story 7.2: Template Upload & Registry (THIS STORY)**
- Story 7.3: DOCX Generation + SHA-256 + Manifest (pending)

**Epic Objective:**
Hoàn thiện PDF/ZIP export và thêm DOCX generation capability với document integrity tracking.

### Dependencies

**Depends on:**
- Story 7.1 (Document Export Completion) - Export patterns established

**Enables:**
- Story 7.3 (DOCX Generation) - Templates available for generation

### Epic 6 Retro Learnings to Apply

From `epic-6-retro-2026-01-07.md`:

1. **Continue Proper DTO Mapping Pattern:**
   ```typescript
   // CORRECT:
   const serviceDto = {
     name: dto.name,
     description: dto.description,
     templateType: dto.templateType,
   };
   ```

2. **Continue WorkflowAction Enum Pattern:**
   ```typescript
   import { WorkflowAction } from '@prisma/client';
   action: WorkflowAction.TEMPLATE_UPLOAD
   action: WorkflowAction.TEMPLATE_ACTIVATE
   ```

3. **Continue Atomic Transaction Pattern:**
   ```typescript
   return this.prisma.$transaction(async (tx) => {
     // 1. Upload file
     // 2. Create template record
     // 3. Deactivate previous template of same type
     // Return new template
   });
   ```

4. **Continue RBAC for Template Management:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(RolesGuard)
   @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
   ```

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  templates/
    templates.controller.ts    # New: Template CRUD endpoints
    templates.service.ts       # New: Template management service
    dto/
      upload-template.dto.ts   # New: Upload DTO
      template.dto.ts          # New: Template response DTO
    templates.module.ts        # New: Module definition
  storage/
    file-storage.service.ts    # Extend: Add template storage
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  app/
    admin/
      templates/
        page.tsx                # New: Template management page
  components/
    template/
      TemplateList.tsx         # New: Template list table
      TemplateUploadDialog.tsx # New: Upload dialog
      TemplateCard.tsx         # New: Template card
  lib/api/
    templates.ts                # New: Template API client
```

### Architecture Compliance

**Database Schema:**
```prisma
model DocumentTemplate {
  id            String                  @id @default(uuid())
  name          String
  description   String?
  templateType  DocumentTemplateType
  filePath      String
  fileName      String
  fileSize      Int
  sha256Hash    String
  version       Int                     @default(1) // For tracking template versions
  placeholders  String[]                // Array of placeholder names
  isActive      Boolean                @default(false)
  createdBy     String
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt
  deletedAt     DateTime?

  documents     Document[]              // Back-relation for generated documents

  @@unique([templateType, isActive])
  @@index([templateType])
  @@index([isActive])
}

enum DocumentTemplateType {
  PROPOSAL_OUTLINE
  EVALUATION_FORM
  FINAL_REPORT
  FACULTY_ACCEPTANCE
  SCHOOL_ACCEPTANCE
  HANDOVER_CHECKLIST
}
```

**CRITICAL: The `@@unique([templateType, isActive])` constraint ensures only ONE active template per type.**
- When `isActive = true`, only one template can exist for each `templateType`
- When `isActive = false`, multiple templates can exist (draft/inactive versions)
- To activate a template: set `isActive = true` on new template, which forces setting `isActive = false` on all other templates of same type in a transaction

**Known Proposal Data Fields (for placeholder validation):**
```typescript
const KNOWN_PLACEHOLDERS = {
  // Project info
  'proposal.code': 'Mã đề tài',
  'proposal.title': 'Tên đề tài',
  'proposal.owner': 'Chủ nhiệm đề tài',
  'proposal.faculty': 'Khoa/Đơn vị',

  // Evaluation info
  'evaluation.council': 'Hội đồng',
  'evaluation.secretary': 'Thư ký',
  'evaluation.decision': 'Kết luận (Đạt/Không đạt)',
  'evaluation.date': 'Ngày đánh giá',

  // Acceptance info
  'acceptance.results': 'Kết quả thực hiện',
  'acceptance.products': 'Sản phẩm đầu ra',
  'acceptance.date': 'Ngày nghiệm thu',

  // Timeline info
  'timeline.startDate': 'Ngày bắt đầu',
  'timeline.endDate': 'Ngày kết thúc',

  // Formatting
  'currentDate': 'Ngày hiện tại',
  'currentYear': 'Năm hiện tại',
};
```

**Placeholder Extraction:**
```typescript
import PizZip from 'pizzip'; // Required: .docx is a ZIP archive
import { parseString } from 'xml2js'; // For parsing XML content

/**
 * Extract placeholders from .docx file
 * NOTE: .docx files are ZIP archives containing XML files.
 * We must unzip and parse word/document.xml to find placeholders.
 */
async extractPlaceholders(docxBuffer: Buffer): Promise<string[]> {
  // 1. Unzip the .docx file
  const zip = new PizZip(docxBuffer);

  // 2. Extract word/document.xml (main content)
  const documentXml = zip.file('word/document.xml')?.asText();
  if (!documentXml) {
    throw new BadRequestException('Invalid DOCX file: missing document.xml');
  }

  // 3. Parse XML and extract text content
  const placeholderRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
  const placeholders = new Set<string>();
  let match;

  while ((match = placeholderRegex.exec(documentXml)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

validatePlaceholders(placeholders: string[]): ValidationResult {
  const unknown = placeholders.filter(p => !KNOWN_PLACEHOLDERS[p]);

  return {
    valid: unknown.length === 0,
    known: placeholders.filter(p => KNOWN_PLACEHOLDERS[p]),
    unknown,
    warnings: unknown.map(p => `Unknown placeholder: {{${p}}}`),
  };
}
```

**NPM Dependencies:**
```bash
npm install pizzip xml2js
npm install -D @types/pizzip @types/xml2js
```

### RBAC Authorization

**Template Management Endpoints:**
```typescript
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
@Controller('templates')
export class TemplatesController {
  @Get()
  findAll() {
    // Return all templates for admin/PKHCN
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadTemplateDto,
    @CurrentUser() user: User,
  ) {
    // Validate .docx file
    // Extract placeholders
    // Store file
    // Create template record
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    // Deactivate other templates of same type
    // Activate this template
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    // Soft delete template
  }
}
```

### Data Model

**Upload Template DTO:**
```typescript
export class UploadTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentTemplateType)
  @IsNotEmpty()
  templateType: DocumentTemplateType;
}
```

**Template Response DTO:**
```typescript
export class TemplateResponseDto {
  id: string;
  name: string;
  description: string | null;
  templateType: DocumentTemplateType;
  fileName: string;
  fileSize: number;
  placeholders: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Testing Standards

**Backend Tests:**
- Test template upload with valid .docx
- Test file validation (.docx only)
- Test file size validation (max 5MB)
- Test placeholder extraction
- Test placeholder validation (known vs unknown)
- Test template activation
- Test only one active template per type
- Test RBAC for all endpoints
- Test template download
- Test template deletion (soft delete)

**Frontend Tests:**
- Test page visibility based on role
- Test upload dialog form validation
- Test file upload with drag-drop
- Test placeholder display after upload
- Test activation confirmation
- Test success/error notifications

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Quản lý Template" (Template Management)
- "Upload template mới" (Upload new template)
- "Tên template" (Template name)
- "Mô tả" (Description)
- "Loại template" (Template type)
- "File template" (Template file)
- "Kích hoạt" (Activate)
- "Tải xuống" (Download)
- "Xóa" (Delete)
- "Placeholder tìm thấy" (Placeholders found)
- "Placeholder không xác định" (Unknown placeholders)
- "Chỉ có 1 template active cho mỗi loại" (Only 1 active template per type)

### Code Patterns to Follow

**From Epic 6 Retro:**
- Proper DTO mapping (no `as unknown`)
- WorkflowAction enum for all actions
- Atomic transactions for state changes
- RBAC guards on all endpoints

**File Upload Pattern:**
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadTemplateDto,
  @CurrentUser() user: User,
) {
  // Validate file
  if (!file.mimetype.includes('officedocument.wordprocessingml')) {
    throw new BadRequestException('Chỉ chấp nhận file .docx');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new BadRequestException('File không được quá 5MB');
  }

  // Process file
  return this.templatesService.upload(file, dto, user.id);
}
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 7-2 created via create-story workflow. Status: ready-for-dev
- Epic 6 retrospective learnings applied (DTO mapping, WorkflowAction enum, atomic transactions, RBAC)
- Document template model designed
- Placeholder extraction logic defined
- Template activation with single-active-per-type constraint
- RBAC for ADMIN and PHONG_KHCN
- File upload validation (.docx, 5MB max)
- Known placeholder fields mapping

### File List

**To Create:**
- `qlnckh/apps/src/modules/templates/templates.controller.ts` - Template CRUD endpoints
- `qlnckh/apps/src/modules/templates/templates.service.ts` - Template management service
- `qlnckh/apps/src/modules/templates/dto/upload-template.dto.ts` - Upload DTO
- `qlnckh/apps/src/modules/templates/dto/template.dto.ts` - Response DTO
- `qlnckh/apps/src/modules/templates/dto/index.ts` - Barrel export
- `qlnckh/apps/src/modules/templates/templates.module.ts` - Module definition
- `qlnckh/web-apps/src/app/admin/templates/page.tsx` - Template management page
- `qlnckh/web-apps/src/components/template/TemplateList.tsx` - Template list table
- `qlnckh/web-apps/src/components/template/TemplateUploadDialog.tsx` - Upload dialog
- `qlnckh/web-apps/src/components/template/TemplateCard.tsx` - Template card
- `qlnckh/web-apps/src/lib/api/templates.ts` - Template API client

**To Modify:**
- `qlnckh/apps/src/app.module.ts` - Import TemplatesModule
- `qlnckh/prisma/schema.prisma` - Add DocumentTemplate model
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 6 retrospective learnings incorporated
  - Proper DTO mapping pattern specified
  - WorkflowAction enum pattern specified
  - Atomic transaction pattern specified
  - RBAC pattern for template management
  - Document template model designed
  - Placeholder extraction logic defined
  - Template activation constraint defined
  - Known placeholder fields mapping
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 7.2](../../planning-artifacts/epics.md#L1958-L2004) - Full requirements
- [epic-6-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-6-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - State machine & patterns
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 7.1](./7-1-document-export-completion-refinement.md) - Previous story
