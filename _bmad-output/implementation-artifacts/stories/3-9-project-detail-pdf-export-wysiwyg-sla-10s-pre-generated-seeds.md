# Story 3.9: Project Detail PDF Export (WYSIWYG, SLA 10s, Pre-Generated Seeds)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Giảng viên/Reviewer,
I want export proposal detail ra PDF giống như UI,
so that tôi có thể in hoặc gửi file cho người khác xem.

## Acceptance Criteria

1. **AC1: PDF Export button on Proposal Detail**
   - Given user đang xem Proposal Detail page
   - When user click button "Xuất PDF"
   - Then UI hiển thị preview modal:
     - Render HTML giống UI (State badge, Holder, SLA, Form data)
     - Force light theme (print theme) ngay cả khi UI đang dark mode
     - Button "Tải xuống" + "Đóng"

2. **AC2: PDF generation with Playwright**
   - Given User click "Tải xuống"
   - When server render PDF
   - Then PDF được export bằng Playwright/Puppeteer headless
   - And PDF layout giống UI:
     - Cùng typography (font, size, weight)
     - Cùng spacing (margins, padding)
     - Badge icon + text (grayscale vẫn đọc được)
     - Table header repeat nếu span nhiều trang

3. **AC3: PDF render progress indicator (SLA 10s)**
   - Given PDF đang render
   - When render time > 10 seconds
   - Then UI hiển thị loader "Đang tạo PDF..." với progress indicator
   - And User có thể đóng modal (PDF generate background)

4. **AC4: Immediate download for fast renders**
   - Given PDF render time ≤ 10 seconds
   - When render hoàn thành
   - Then UI trigger download ngay lập tức
   - And file name format: "{proposal_code}_detail_{timestamp}.pdf"

5. **AC5: Page break at logical boundaries**
   - Given PDF đang render
   - When content quá dài (> 1 trang)
   - Then page break ở logical boundaries (giữa sections)
   - And không break giữa một row của table

6. **AC6: Pre-generated PDFs for seed data**
   - Given Seed data DT-001…DT-010 đã được tạo
   - When Seed script chạy
   - Then Pre-generate PDFs cho tất cả proposals (DT-001.pdf, DT-002.pdf, ...)
   - And `/api/proposals/{id}/pdf` trả pre-generated PDF nếu có
   - And New proposals (không trong seed) generate on-demand

## Tasks / Subtasks

- [ ] Task 1: Create PDF service module (AC: #2, #3, #4)
  - [ ] Create `pdf.service.ts` in `apps/src/modules/pdf/`
  - [ ] Install and configure Playwright (or Puppeteer) for headless PDF generation
  - [ ] Implement `generateProposalPdf(proposalId: string)` method
  - [ ] Implement HTML template for proposal detail (reuse UI components)
  - [ ] Add print CSS with light theme, grayscale support, page breaks
  - [ ] Implement table header repeat for multi-page PDFs
  - [ ] Add timeout handling (10s SLA)

- [ ] Task 2: Create PDF controller with endpoint (AC: #1, #4, #6)
  - [ ] Create `pdf.controller.ts` in `apps/src/modules/pdf/`
  - [ ] Add `GET /api/proposals/:id/pdf` endpoint
  - [ ] Check for pre-generated PDF first (seed data)
  - [ ] If not pre-generated, trigger on-demand generation
  - [ ] Return PDF stream with proper headers (`Content-Type: application/pdf`)
  - [ ] Set file name: `{proposal_code}_detail_{timestamp}.pdf`

- [ ] Task 3: Create PDF module (AC: #2)
  - [ ] Create `pdf.module.ts` in `apps/src/modules/pdf/`
  - [ ] Import PdfService and PdfController
  - [ ] Import ProposalService (for fetching proposal data)
  - [ ] Add PdfModule to app.module.ts imports

- [ ] Task 4: Pre-generate PDFs for seed data (AC: #6)
  - [ ] Create seed PDF generation script or service
  - [ ] Generate PDFs for DT-001 through DT-010 during seed
  - [ ] Store pre-generated PDFs in `public/pdfs/seed/` or storage service
  - [ ] Update seed script to call PDF generation

- [ ] Task 5: Add tests for PDF service (AC: #2, #3, #4, #5)
  - [ ] Test PDF generation with sample proposal data
  - [ ] Test PDF contains all required sections (state badge, holder, SLA, form data)
  - [ ] Test PDF layout matches UI (typography, spacing)
  - [ ] Test table header repeat on multi-page PDFs
  - [ ] Test page breaks at logical boundaries
  - [ ] Test pre-generated PDF lookup

- [ ] Task 6: Add error handling (AC: #3)
  - [ ] Handle PDF generation timeout (> 10s)
  - [ ] Handle Playwright/Puppeteer errors gracefully
  - [ ] Return 500 error with meaningful message if PDF generation fails
  - [ ] Log errors for debugging

- [ ] Task 7: Frontend PDF Export button (AC: #1, #3, #4)
  - [ ] Add "Xuất PDF" button to Proposal Detail page (frontend task)
  - [ ] Implement preview modal with light theme
  - [ ] Add progress indicator for renders > 10s
  - [ ] Trigger download when PDF ready

## Dev Notes

### Architecture References

**NFR5: PDF Parity** (from architecture.md):
- PDF export must match UI layout and typography (WYSIWYG)
- Use Playwright or Puppeteer headless browser for rendering
- Shared CSS between UI and PDF (Tailwind)
- Print theme always light (force white background for readability)

**UX-5: PDF Export Decision (WYSIWYG)** (from architecture.md lines 297-314):
```
| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Rendering | Playwright (or Puppeteer) | WYSIWYG - matches UI exactly |
| CSS Framework | Shared with UI (Tailwind) | Design tokens reused |
| Page Break Control | CSS: break-after: avoid, break-inside: avoid | Prevent ugly cuts |
| Table Header Repeat | CSS: repeat-header | Headers on each page |
| Grayscale Support | Text always exists (no icon-only) | Print/readable |
```

**Technology Stack** (from architecture.md):
- Playwright or Puppeteer for headless PDF generation
- NestJS 10.x for PDF service module
- Shared CSS (Tailwind) between UI and PDF
- PDF storage: `public/pdfs/seed/` for pre-generated

### Previous Story Intelligence

**Story 3.8 (Idempotency Keys) - Key Learnings:**
- Created IdempotencyInterceptor and IdempotencyCacheService
- Used NestJS Interceptor pattern - apply similar pattern for PDF service
- 51 tests pass (23 interceptor + 28 cache service)
- Module structure: `apps/src/common/interceptors/` for shared services

**Files from Story 3.8 to Reference:**
- `apps/src/common/interceptors/idempotency.module.ts` - Module pattern for global services
- `apps/src/modules/workflow/workflow.module.ts` - Feature module import pattern
- Test patterns: `*.spec.ts` with comprehensive coverage

### Implementation Considerations

1. **PDF Service Structure:**
   ```typescript
   // apps/src/modules/pdf/pdf.service.ts
   @Injectable()
   export class PdfService {
     async generateProposalPdf(proposalId: string): Promise<Buffer> {
       // 1. Fetch proposal data with all sections
       // 2. Render HTML template
       // 3. Use Playwright to generate PDF
       // 4. Return PDF buffer
     }
   }
   ```

2. **Playwright Installation:**
   ```bash
   npm install playwright
   npx playwright install chromium
   ```

3. **PDF Generation Pattern:**
   ```typescript
   import { chromium } from 'playwright';

   const browser = await chromium.launch();
   const page = await browser.newPage();
   await page.setContent(htmlContent);
   const pdfBuffer = await page.pdf({
     format: 'A4',
     printBackground: true,
     margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
   });
   await browser.close();
   ```

4. **Print CSS Considerations:**
   ```css
   @media print {
     /* Force light theme */
     body { background: white !important; color: black !important; }

     /* Page break control */
     .section { break-after: avoid; }
     table { break-inside: avoid; }
     tr { break-inside: avoid; }

     /* Table header repeat */
     thead { display: table-header-group; }

     /* Icon + text for grayscale */
     .badge::before { content: attr(data-label); }
   }
   ```

5. **Pre-generated PDF Storage:**
   - Seed PDFs stored in `public/pdfs/seed/{proposalId}.pdf`
   - API checks file existence first before generating
   - Static serving for pre-generated PDFs (faster)

6. **Error Handling:**
   - Timeout: Set Playwright page timeout to 10s
   - Graceful degradation: Return error message if PDF generation fails
   - Logging: Log errors with proposalId for debugging

### Project Structure Notes

**Files to Create:**
- `apps/src/modules/pdf/pdf.service.ts` - PDF generation service
- `apps/src/modules/pdf/pdf.controller.ts` - PDF endpoint controller
- `apps/src/modules/pdf/pdf.module.ts` - PDF module
- `apps/src/modules/pdf/pdf.service.spec.ts` - Tests
- `public/pdfs/seed/` - Pre-generated PDF storage

**Files to Modify:**
- `apps/src/app.module.ts` - Import PdfModule
- `prisma/seed.ts` or seed scripts - Add PDF pre-generation

**Files to Use (No Changes):**
- `apps/src/modules/proposals/proposals.service.ts` - Fetch proposal data
- `apps/src/modules/workflow/workflow.service.ts` - State transitions (for context)
- `apps/src/modules/workflow/workflow.controller.ts` - Existing patterns

### Edge Cases to Test

- Missing proposal → 404 Not Found
- PDF generation timeout → 500 error with timeout message
- Pre-generated PDF exists → Return immediately
- Large proposal (multi-page) → Correct page breaks
- Dark mode UI → Force light theme in PDF
- Proposal with no data → Handle gracefully

## References

- [epics.md Story 3.9](../../planning-artifacts/epics.md#L1083-L1130) - Full acceptance criteria
- [architecture.md UX-5 PDF Export Decision](../../planning-artifacts/architecture.md#L297-L314) - WYSIWYG approach
- [architecture.md NFR5 PDF Parity](../../planning-artifacts/architecture.md#L125) - PDF must match UI
- [Story 3.8 Idempotency](../stories/3-8-idempotency-keys-anti-double-submit-all-state-changing-actions.md) - Module patterns

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None (story creation)

### Completion Notes List

Story 3.9 created and ready for development.

### File List

**Files to Create:**
- `apps/src/modules/pdf/pdf.service.ts` - PDF generation service with Playwright
- `apps/src/modules/pdf/pdf.controller.ts` - PDF endpoint controller
- `apps/src/modules/pdf/pdf.module.ts` - PDF module
- `apps/src/modules/pdf/pdf.service.spec.ts` - Tests for PDF service
- `public/pdfs/seed/` - Directory for pre-generated PDFs

**Files to Modify:**
- `apps/src/app.module.ts` - Import PdfModule
- Seed scripts - Add PDF pre-generation

**Files to Use (No Changes):**
- `apps/src/modules/proposals/proposals.service.ts` - Fetch proposal data
- `apps/src/modules/workflow/workflow.service.ts` - Workflow context
- `apps/src/common/interceptors/` - Module pattern reference

## Change Log

- 2026-01-06: Story created with comprehensive context from epics and architecture.
- 2026-01-06: Status set to ready-for-dev.
