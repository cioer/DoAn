# Story 5.6: Evaluation PDF Export

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Thư ký Hội đồng/Reviewer,
I want export evaluation ra PDF,
So that tôi có thể lưu hoặc gửi file.

## Acceptance Criteria

1. **AC1: PDF Export Button**
   - Given Evaluation state = FINALIZED
   - When User mở evaluation form
   - Then UI hiển thị "Xuất PDF đánh giá" button
   - And button disabled khi state ≠ FINALIZED

2. **AC2: PDF Content Generation**
   - Given Evaluation state = FINALIZED
   - When User click "Xuất PDF đánh giá"
   - Then PDF được generate với:
     - Proposal info (title, code, council name)
     - Evaluation form data (tất cả sections với scores và comments)
     - Kết luận (Đạt/Không đạt)
     - Evaluator name, role
     - Signature placeholder
     - Timestamp (ngày giờ nộp)

3. **AC3: PDF Download**
   - Given PDF được render thành công
   - When export hoàn tất
   - Then UI trigger download
   - And file name: "{proposal_code}_evaluation_{timestamp}.pdf"
   - And button state: [Xuất PDF] → [⏳ Đang tạo...] → [✅ Đã xuất]

4. **AC4: PDF Styling**
   - Given PDF được generate
   - When render
   - Then PDF sử dụng light theme (force light)
   - And font清晰 readable
   - And page breaks controlled (không cắt text giữa sections)

## Tasks / Subtasks

- [x] Task 1: Backend - PDF Generation Service (AC: #2, #4)
  - [x] Add generateEvaluationPdf() method to PdfService
  - [x] Create HTML template for evaluation PDF with evaluation data structure
  - [x] Fetch evaluation with proposal, evaluator, and council data
  - [x] Integrate Playwright for PDF generation (reuse existing pattern)
  - [x] Force light theme (CSS variables override)
  - [x] Add page break control CSS
  - [x] Handle Vietnamese characters (font embedding)

- [x] Task 2: Backend - Export Endpoint (AC: #1, #2, #3)
  - [x] Create GET /evaluations/:proposalId/export endpoint
  - [x] Validate evaluation.state = FINALIZED
  - [x] Validate user has permission (secretary or admin)
  - [x] Generate PDF using PdfService
  - [x] Return PDF as downloadable stream
  - [x] Set Content-Disposition header

- [x] Task 3: Frontend - Export Button Component (AC: #1)
  - [x] Create ExportPdfButton component
  - [x] Show "Xuất PDF đánh giá" text
  - [x] Disable when evaluation.state ≠ FINALIZED
  - [x] Show loading state: "⏳ Đang tạo..."
  - [x] Show success state: "✅ Đã xuất" (temporarily)
  - [x] Handle error state: "⚠️ Thất bại"

- [x] Task 4: Frontend - Download Handler (AC: #3)
  - [x] Add exportEvaluation API client method
  - [x] Handle blob response
  - [x] Trigger browser download
  - [x] Generate filename: "{code}_evaluation_{timestamp}.pdf"
  - [x] Handle errors gracefully

- [x] Task 5: PDF Template Styling (AC: #4)
  - [x] Create evaluation-specific CSS
  - [x] Force light theme with CSS variables
  - [x] Add page-break-after for each section
  - [x] Style score display (1-5 scale visual)
  - [x] Style signature placeholder area

- [x] Task 6: Unit Tests (AC: #1, #2, #3, #4)
  - [x] Test PDF generation with complete data
  - [x] Test endpoint validates FINALIZED state
  - [x] Test endpoint validates user permissions
  - [x] Test PDF download trigger
  - [x] Test filename generation
  - [x] Test button states (enabled, loading, success, error)

## Dev Notes

### Architecture References

**PDF Export Decision (UX-5 from architecture.md):**
| Aspect | Decision |
|--------|----------|
| **Rendering** | Playwright (NOT separate PDF template) |
| **CSS Framework** | Shared with UI (Tailwind) |
| **Page Break** | CSS: `break-after: avoid`, `break-inside: avoid` |
| **Table Header** | CSS: `repeat-header` |

**PDF Export Button State Machine:**
```
[Xuất PDF] → [⏳ Đang tạo...] → [✅ Đã xuất] or [⚠️ Thất bại]
```

### Epic 5 Context

**Epic 5: School Ops + Council Review**
- FRs covered: FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR40 (partial)
- Story 5.1: School Selection Queue (done)
- Story 5.2: Council Assignment (done)
- Story 5.3: Evaluation Form Draft (done)
- Story 5.4: Preview PDF + Confirm Gate (done)
- Story 5.5: Finalize → Read-Only (done)
- **Story 5.6: Evaluation PDF Export (THIS STORY)** - Generate final PDF

### Dependencies

**Depends on:**
- Story 5.5 (Finalize → Read-Only) - Must have FINALIZED state
- Story 3.9 (Project Detail PDF Export) - Reuse PDF generation infrastructure

**Enables:**
- Epic 6 stories that may need evaluation reference
- Complete Epic 5 deliverables

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  evaluations/
    evaluations.controller.ts   # Add GET /export endpoint
  pdf/
    pdf.service.ts              # Add evaluation PDF generation
    templates/
      evaluation-pdf.html       # Evaluation PDF template
```

**Frontend Structure:**
```
qlnckh/web-apps/src/components/
  evaluation/
    EvaluationForm.tsx          # Add ExportPdfButton
    ExportPdfButton.tsx         # New: PDF export button
  lib/api/
    evaluations.ts              # Add exportEvaluation()
```

### Data Model

**Method Signature:**
```typescript
/**
 * Generate PDF for finalized evaluation
 * @param proposalId - Proposal UUID
 * @param options - PDF generation options
 * @returns PDF buffer
 */
async generateEvaluationPdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer>
```

**Data Fetching for PDF:**
```typescript
// Fetch evaluation with proposal, evaluator, and council data
const evaluation = await this.prisma.evaluation.findFirst({
  where: { proposalId },
  include: {
    proposal: {
      select: { id: true, code: true, title: true, councilId: true, ownerId: true },
    },
    evaluator: {
      select: { id: true, name: true, email: true },
    },
  },
});

if (!evaluation || evaluation.state !== 'FINALIZED') {
  throw new NotFoundException('Không tìm thấy phiếu đánh giá đã hoàn tất');
}

// Fetch council name
const council = evaluation.proposal.councilId
  ? await this.prisma.council.findUnique({
      where: { id: evaluation.proposal.councilId },
      select: { name: true },
    })
  : null;
```

**PDF Response:**
```typescript
// GET /evaluations/:proposalId/export
// Response: application/pdf (binary stream)
// Headers:
//   Content-Disposition: attachment; filename="DT-001_evaluation_1704614400000.pdf"
//   Content-Type: application/pdf
```

### PDF Template Structure

```html
<!-- evaluation-pdf.html -->
<!-- Data structure: evaluation.formData = { scientificContent, researchMethod, feasibility, budget, conclusion, otherComments } -->
<!-- Each score section: { score: number (1-5), comments: string } -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Force light theme */
    :root {
      --bg-primary: #ffffff;
      --text-primary: #000000;
      --text-secondary: #333333;
      --border-color: #cccccc;
    }
    body {
      font-family: 'Times New Roman', serif;
      background: white;
      color: black;
    }
    .page-break { break-after: page; }
    .section-break { break-after: always; }
    .no-break { break-inside: avoid; }
    /* Score visualization */
    .score-dots { display: flex; gap: 4px; }
    .score-dot { width: 12px; height: 12px; border-radius: 50%; }
    .score-dot.filled { background: #000; }
    .score-dot.empty { border: 1px solid #000; }
  </style>
</head>
<body>
  <header>
    <h1>PHIẾU ĐÁNH GIÁ ĐỀ TÀI</h1>
    <div class="proposal-info">
      <p><strong>Tên đề tài:</strong> ${evaluation.proposal.title}</p>
      <p><strong>Mã số:</strong> ${evaluation.proposal.code}</p>
      <p><strong>Hội đồng:</strong> ${council?.name || 'N/A'}</p>
    </div>
  </header>

  <section class="evaluation-section no-break">
    <h2>1. Đánh giá nội dung khoa học</h2>
    <div class="score-display">
      Điểm: ${evaluation.formData.scientificContent.score}/5
    </div>
    <p><strong>Nhận xét:</strong> ${evaluation.formData.scientificContent.comments || 'Không có'}</p>
  </section>

  <section class="evaluation-section no-break">
    <h2>2. Đánh giá phương pháp nghiên cứu</h2>
    <div class="score-display">
      Điểm: ${evaluation.formData.researchMethod.score}/5
    </div>
    <p><strong>Nhận xét:</strong> ${evaluation.formData.researchMethod.comments || 'Không có'}</p>
  </section>

  <section class="evaluation-section no-break">
    <h2>3. Đánh giá tính khả thi</h2>
    <div class="score-display">
      Điểm: ${evaluation.formData.feasibility.score}/5
    </div>
    <p><strong>Nhận xét:</strong> ${evaluation.formData.feasibility.comments || 'Không có'}</p>
  </section>

  <section class="evaluation-section no-break">
    <h2>4. Đánh giá kinh phí</h2>
    <div class="score-display">
      Điểm: ${evaluation.formData.budget.score}/5
    </div>
    <p><strong>Nhận xét:</strong> ${evaluation.formData.budget.comments || 'Không có'}</p>
  </section>

  ${evaluation.formData.otherComments ? `
  <section class="evaluation-section no-break">
    <h2>5. Ý kiến khác</h2>
    <p>${evaluation.formData.otherComments}</p>
  </section>
  ` : ''}

  <section class="conclusion-section no-break">
    <h2>KẾT LUẬN</h2>
    <p><strong>Đánh giá:</strong> ${evaluation.formData.conclusion === 'DAT' ? 'ĐẠT' : 'KHÔNG ĐẠT'}</p>
  </section>

  <footer class="signature-section">
    <div class="signature-line">
      <p><strong>Người đánh giá:</strong> ${evaluation.evaluator.name}</p>
      <p><strong>Chức vụ:</strong> Thư ký Hội đồng</p>
      <div class="signature-placeholder" style="height: 60px; border-bottom: 1px solid #000; margin: 20px 0;"></div>
      <p>Ngày nộp: ${new Date(evaluation.updatedAt).toLocaleDateString('vi-VN')}</p>
    </div>
  </footer>
</body>
</html>
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock Playwright for PDF generation (avoid actual browser in tests)
- Test endpoint validates FINALIZED state
- Test endpoint validates user permissions
- Test PDF content structure

**Frontend Tests:**
- Test button states (enabled/disabled)
- Test loading state display
- Test download trigger with mock blob
- Test error handling

### Vietnamese Localization

All PDF text must be in Vietnamese:
- "PHIẾU ĐÁNH GIÁ ĐỀ TÀI" (Title)
- "Tên đề tài", "Mã số", "Hội đồng" (Proposal info)
- "Đánh giá nội dung khoa học" (Section 1)
- "Đánh giá phương pháp nghiên cứu" (Section 2)
- "Đánh giá tính khả thi" (Section 3)
- "Đánh giá kinh phí" (Section 4)
- "KẾT LUẬN" (Conclusion)
- "ĐẠT" / "KHÔNG ĐẠT" (Pass/Fail)
- "Người đánh giá" (Evaluator)
- "Ngày ..." (Date)

### Code Patterns to Follow

**From Story 3.9 (Project Detail PDF Export):**
- Reuse PdfService infrastructure
- Similar endpoint pattern: GET /:id/export
- Similar filename generation: {code}_{type}_{timestamp}.pdf
- Similar button state machine

**From Epic 4 (Revision PDF Export):**
- Playwright integration pattern
- CSS force-light pattern
- Page break control

**Export Button Pattern:**
```typescript
const [exportState, setExportState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

const handleExport = async () => {
  setExportState('loading');
  try {
    const blob = await evaluationsApi.exportEvaluation(proposalId);
    downloadBlob(blob, filename);
    setExportState('success');
    setTimeout(() => setExportState('idle'), 3000);
  } catch (error) {
    setExportState('error');
    setTimeout(() => setExportState('idle'), 3000);
  }
};
```

### RBAC Pattern

```typescript
// Export available to:
// 1. THU_KY_HOI_DONG (who submitted)
// 2. PHONG_KHCN (school ops)
// 3. ADMIN (system admin)

@RequirePermissions({
  role: ['THU_KY_HOI_DONG', 'PHONG_KHCN', 'ADMIN'],
  action: 'EXPORT_EVALUATION'
})
```

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 5-6 created via create-story workflow. Status: ready-for-dev

### File List

**To Create:**
- `qlnckh/apps/src/modules/pdf/templates/evaluation-pdf.html` - Evaluation PDF template
- `qlnckh/web-apps/src/components/evaluation/ExportPdfButton.tsx` - Export button component
- `qlnckh/web-apps/src/components/evaluation/ExportPdfButton.spec.tsx` - Button tests

**To Modify:**
- `qlnckh/apps/src/modules/pdf/pdf.service.ts` - Add generateEvaluationPdf() method
- `qlnckh/apps/src/modules/pdf/pdf.controller.ts` - Add GET /evaluations/:proposalId/export endpoint
- `qlnckh/web-apps/src/components/evaluation/EvaluationForm.tsx` - Add ExportPdfButton
- `qlnckh/web-apps/src/lib/api/evaluations.ts` - Add exportEvaluation() method
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status to in-progress when starting, done when complete

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 5 context analyzed from epics.md
  - Previous story (5-5) learnings incorporated
  - PDF export patterns from Story 3.9 applied
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution
- 2026-01-07: Validation improvements applied
  - Added generateEvaluationPdf() method signature
  - Added data fetching code for council name
  - Updated PDF template with actual data structure references
  - Fixed export endpoint location (pdf.controller.ts)
  - Updated File List with sprint-status.yaml guidance

## References

- [epics.md Story 5.6](../../planning-artifacts/epics.md#L1706-L1728) - Full requirements
- [architecture.md](../../planning-artifacts/architecture.md) - PDF export decision (UX-5)
- [project-context.md](../../project-context.md) - Implementation rules and patterns
- [Story 3.9](./3-9-project-detail-pdf-export.md) - Reference for PDF export pattern
- [Story 5.5](./5-5-finalize-read-only.md) - Previous story with finalize context
