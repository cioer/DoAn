# Story 7.1: Document Export Completion (Refinement)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want hoàn thiện và refine PDF/ZIP export,
So that tất cả exports consistent và stable.

## Acceptance Criteria

1. **AC1: Template Engine Consistency**
   - Given Core exports đã implement (Epic 3, 4, 5, 6)
   - When review tất cả exports
   - Then Template engine consistent:
     - HTML + Print CSS + Playwright pattern
     - Shared CSS variables for print theme
     - Same font loading strategy
     - Consistent page break handling

2. **AC2: Font Embedding**
   - Given PDF export
   - When review font configuration
   - Then Font embedding đúng:
     - Google Fonts loaded with display-swap
     - Fallback fonts defined
     - Font weights available (400, 500, 600, 700)
     - Vietnamese characters supported

3. **AC3: Dark Mode Handling**
   - Given PDF export
   - When preview modal hiển thị
   - Then Dark mode được xử lý đúng:
     - Force light theme cho PDF generation
     - Preview modal toggle chỉ affect preview display
     - Actual PDF luôn light theme
     - Print CSS override dark mode styles

4. **AC4: Controlled Page Breaks**
   - Given PDF export
   - When review page break configuration
   - Then Page breaks controlled đúng:
     - CSS `break-after: avoid` cho sections
     - CSS `break-inside: avoid` cho cards
     - Table header repeat enabled
     - No orphan/widow lines

5. **AC5: Export Consistency Review**
   - Given Tất cả exports (Project Detail, Revision, Evaluation, Dossier ZIP)
   - When review code consistency
   - Then Tất cả exports follow same pattern:
     - Same Playwright configuration
     - Same error handling
     - Same RBAC pattern
     - Same response streaming

## Tasks / Subtasks

- [ ] Task 1: Backend - Create PDF Service Base Class (AC: #1, #5)
  - [ ] Create `PdfBaseService` in `modules/pdf/`
  - [ ] Define common Playwright config (viewport, waitUntil, timeout)
  - [ ] Define shared font loading strategy
  - [ ] Define shared page break CSS
  - [ ] Define shared error handling pattern
  - [ ] Extract existing PDF generation methods to use base class

- [ ] Task 2: Backend - Refine Font Configuration (AC: #2)
  - [ ] Configure Google Fonts (Roboto/Mulish for Vietnamese)
  - [ ] Add font-face declarations for fallback
  - [ ] Test Vietnamese character rendering
  - [ ] Verify font weights render correctly

- [ ] Task 3: Backend - Fix Dark Mode Handling (AC: #3)
  - [ ] Create print-specific CSS with `@media print`
  - [ ] Force light theme variables in print CSS
  - [ ] Override dark mode styles with print styles
  - [ ] Test PDF generation from dark mode UI

- [ ] Task 4: Backend - Improve Page Break Control (AC: #4)
  - [ ] Add `.page-break` utility class
  - [ ] Add `.no-break` utility class
  - [ ] Enable table header repeat
  - [ ] Configure orphan/widow control
  - [ ] Test multi-page documents

- [ ] Task 5: Backend - Refactor Existing Exports (AC: #5)
  - [ ] Update ProjectDetailPdfService to use base class
  - [ ] Update RevisionPdfService to use base class
  - [ ] Update EvaluationPdfService to use base class
  - [ ] Update DossierService to use shared config
  - [ ] Ensure consistent error handling across all

- [ ] Task 6: Frontend - Export Modal Consistency (AC: #3, #5)
  - [ ] Review all export modals for dark mode handling
  - [ ] Ensure preview modal shows light theme PDF
  - [ ] Add loading indicator consistency
  - [ ] Add error handling consistency
  - [ ] Add download trigger consistency

- [ ] Task 7: Tests - Export Consistency (AC: #1, #2, #3, #4, #5)
  - [ ] Test Vietnamese characters render correctly
  - [ ] Test PDF from dark mode UI
  - [ ] Test multi-page page breaks
  - [ ] Test all export types use same config
  - [ ] Test font weights render correctly
  - [ ] Test table header repeat

## Dev Notes

### Epic 7 Context

**Epic 7: Document Export (Milestone Completion)**
- FRs covered: FR40, FR41, FR42
- Story 7.1: Document Export Completion (Refinement) (THIS STORY)
- Story 7.2: Template Upload & Registry (pending)
- Story 7.3: DOCX Generation + SHA-256 + Manifest (pending)

**Epic Objective:**
Hoàn thiện PDF/ZIP export theo milestone và thêm DOCX generation capability với document integrity tracking.

### Dependencies

**Depends on:**
- Story 3.9 (Project Detail PDF Export) - PDF service exists
- Story 4.6 (Revision PDF Export) - Revision PDF service exists
- Story 5.6 (Evaluation PDF Export) - Evaluation PDF service exists
- Story 6.6 (ZIP Dossier Pack Export) - ZIP export exists

**Enables:**
- Story 7.2 (Template Upload & Registry) - Foundation for DOCX
- Story 7.3 (DOCX Generation) - DOCX generation with integrity

### Epic 6 Retro Learnings to Apply

From `epic-6-retro-2026-01-07.md`:

1. **Continue Proper DTO Mapping Pattern:**
   ```typescript
   // WRONG (from Epic 6 retro):
   dto as unknown as { results: string; products: Array<...> }

   // CORRECT:
   const serviceDto = {
     results: dto.results,
     products: dto.products.map(p => ({
       name: p.name,
       type: p.type,
       note: p.note,
       attachmentId: p.attachmentId,
     })),
     attachmentIds: dto.attachmentIds,
   };
   ```

2. **Continue WorkflowAction Enum Pattern:**
   ```typescript
   import { WorkflowAction } from '@prisma/client';
   // Use enum values, not string literals
   action: WorkflowAction.DOC_EXPORT_REQUESTED
   ```

3. **Continue Atomic Transaction Pattern:**
   ```typescript
   return this.prisma.$transaction(async (tx) => {
     // 1. Update proposal state
     // 2. Update formData
     // 3. Create workflow log entry
     // Return updated proposal
   });
   ```

4. **Continue RBAC for Document Downloads:**
   ```typescript
   @UseGuards(JwtAuthGuard)
   @UseGuards(RolesGuard)
   @RequireRoles(UserRole.GIANG_VIEN, UserRole.ADMIN)
   // Also verify ownership for GIANG_VIEN
   ```

5. **Continue Idempotency Pattern:**
   - Apply IdempotencyInterceptor to document export endpoints
   - Use idempotencyKey for preventing duplicate PDF generation

### Project Structure Notes

**Backend Structure:**
```
qlnckh/apps/src/modules/
  pdf/
    pdf-base.service.ts         # New: Base class for PDF generation
    pdf.config.ts               # New: Shared Playwright config
    pdf.service.ts              # Extend: Main PDF service
    fonts/                      # New: Font loading utilities
      font-loader.ts
      font-config.ts
  dossier/
    dossier.service.ts          # Refactor: Use shared config
```

**Frontend Structure:**
```
qlnckh/web-apps/src/
  components/
    export/
      ExportModal.tsx           # New: Shared export modal
      ExportProgress.tsx        # New: Shared progress indicator
      PdfPreview.tsx            # New: Shared PDF preview component
```

### Architecture Compliance

**PDF Export Decision (UX-5 from architecture.md):**
- Approach: HTML/CSS + Headless Browser (Playwright)
- NOT: Separate PDF template system
- Rationale: WYSIWYG - matches UI exactly

**Playwright Configuration:**
```typescript
const PDF_CONFIG = {
  viewport: { width: 1200, height: 800 },
  waitForSelector: '[data-ready="true"]',
  waitUntil: 'networkidle',
  timeout: 30000, // 30s max
  printBackground: true,
  preferCssPageSize: true,
  displayHeaderFooter: false,
  margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
};
```

**Font Configuration:**
```typescript
const FONTS = {
  primary: 'Roboto, sans-serif',
  weights: [400, 500, 600, 700],
  vietnamese: true,
  display: 'swap',
};
```

**Dark Mode Handling (CSS):**
```css
/* Force light theme for PDF */
@media print {
  :root {
    --background: #ffffff !important;
    --foreground: #000000 !important;
    --primary: #000000 !important;
    --secondary: #666666 !important;
  }

  /* Override dark mode */
  .dark,
  [data-theme="dark"] {
    color-scheme: light !important;
  }
}
```

**Page Break CSS:**
```css
/* Page break utilities */
.page-break {
  break-after: avoid;
  break-inside: avoid;
}

.no-break {
  break-inside: avoid;
}

/* Table header repeat */
table thead {
  display: table-header-group;
}

/* Orphan/Widow control */
p, li {
  orphans: 3;
  widows: 3;
}
```

### RBAC Authorization

**Document Export RBAC Pattern:**
```typescript
@UseGuards(JwtAuthGuard)
@Get(':id/export-pdf')
async exportPdf(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Res() res: Response
) {
  const proposal = await this.prisma.proposal.findUnique({
    where: { id },
    select: { ownerId: true, state: true },
  });

  if (!proposal) {
    throw new NotFoundException('Không tìm thấy đề tài');
  }

  // Check: owner, QUAN_LY_KHOA, PHONG_KHCN, or ADMIN
  const isAdmin = user.role === UserRole.ADMIN;
  const isOwner = proposal.ownerId === user.id;
  const isFaculty = user.role === UserRole.QUAN_LY_KHOA && user.facultyId === proposal.facultyId;
  const isPKHCN = user.role === UserRole.PHONG_KHCN;

  if (!isAdmin && !isOwner && !isFaculty && !isPKHCN) {
    throw new ForbiddenException('Bạn không có quyền xuất PDF');
  }

  // Proceed with export
}
```

### Testing Standards

**Backend Tests:**
- Use Vitest + NestJS testing utilities
- Mock Playwright PDF generation
- Test font loading with Vietnamese text
- Test dark mode to light theme conversion
- Test page break behavior
- Test RBAC for all export types
- Test streaming response

**Frontend Tests:**
- Test export modal shows light theme preview
- Test export button visibility based on permissions
- Test progress indicator
- Test error handling
- Test download trigger

**E2E Tests (Playwright):**
- Test Vietnamese characters in PDF
- Test multi-page documents
- Test table header repeat
- Test export from dark mode UI

### Vietnamese Localization

All UI text must be in Vietnamese:
- "Xuất PDF" (Export PDF button)
- "Đang tạo PDF..." (Loading state)
- "PDF đã sẵn sàng" (Ready notification)
- "Tải xuống" (Download button)
- "Xuất PDF thất bại. Vui lòng thử lại." (Error message)
- "Bạn không có quyền xuất PDF" (403 error)

### Code Patterns to Follow

**From Story 3.9 (Project Detail PDF Export):**
- File: `qlnckh/apps/src/modules/pdf/project-detail-pdf.service.ts`
- Reuse Playwright configuration
- Same streaming pattern for large files
- Same RBAC pattern

**From Story 4.6 (Revision PDF Export):**
- File: `qlnckh/apps/src/modules/pdf/revision-pdf.service.ts`
- Similar PDF generation pattern

**From Story 5.6 (Evaluation PDF Export):**
- File: `qlnckh/apps/src/modules/pdf/evaluation-pdf.service.ts`
- Similar RBAC pattern
- Similar error handling

**From Story 6.6 (ZIP Dossier Pack Export):**
- File: `qlnckh/apps/src/modules/dossier/dossier.service.ts`
- Same async job pattern with Redis
- Same progress tracking
- Same error handling

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

Story 7-1 created via create-story workflow. Status: ready-for-dev
- Epic 6 retrospective learnings applied (DTO mapping, WorkflowAction enum, atomic transactions, RBAC)
- PDF base class pattern established for consistency
- Font configuration for Vietnamese support
- Dark mode handling with print CSS
- Page break control utilities
- Export consistency across all types
- Shared Playwright configuration
- RBAC pattern for document downloads

### File List

**To Create:**
- `qlnckh/apps/src/modules/pdf/pdf-base.service.ts` - Base class for PDF generation
- `qlnckh/apps/src/modules/pdf/pdf.config.ts` - Shared Playwright config
- `qlnckh/apps/src/modules/pdf/fonts/font-loader.ts` - Font loading utilities
- `qlnckh/apps/src/modules/pdf/fonts/font-config.ts` - Font configuration
- `qlnckh/web-apps/src/components/export/ExportModal.tsx` - Shared export modal
- `qlnckh/web-apps/src/components/export/ExportProgress.tsx` - Shared progress indicator
- `qlnckh/web-apps/src/components/export/PdfPreview.tsx` - Shared PDF preview component

**To Modify:**
- `qlnckh/apps/src/modules/pdf/pdf.service.ts` - Extend to use base class
- `qlnckh/apps/src/modules/dossier/dossier.service.ts` - Use shared PDF config
- `qlnckh/apps/src/modules/proposal/proposal.service.ts` - Ensure consistent patterns
- `qlnckh/web-apps/src/components/proposal/ProposalDetail.tsx` - Use shared export modal
- `qlnckh/web-apps/src/styles/globals.css` - Add print CSS with page breaks
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Update story status

## Change Log

- 2026-01-07: Story created via create-story workflow. Status: ready-for-dev
  - Epic 6 context analyzed from epics.md
  - Epic 6 retrospective learnings incorporated
  - Proper DTO mapping pattern specified
  - WorkflowAction enum pattern specified
  - Atomic transaction pattern specified
  - RBAC pattern for document downloads specified
  - PDF base class pattern designed
  - Font configuration for Vietnamese support
  - Dark mode handling with print CSS
  - Page break control utilities
  - Export consistency across all types
  - Comprehensive developer guide created
  - Ready for dev-story workflow execution

## References

- [epics.md Story 7.1](../../planning-artifacts/epics.md#L1931-L1955) - Full requirements
- [epic-6-retro-2026-01-07.md](../../implementation-artifacts/retrospectives/epic-6-retro-2026-01-07.md) - Lessons learned
- [architecture.md](../../planning-artifacts/architecture.md) - PDF export decision (UX-5)
- [project-context.md](../../project-context.md) - Implementation rules
- [Story 3.9](../3-9-project-detail-pdf-export-wysiwyg-sla-10s-pre-generated-seeds.md) - PDF export pattern reference
- [Story 4.6](../4-6-revision-pdf-export.md) - Revision PDF reference
- [Story 5.6](../5-6-evaluation-pdf-export.md) - Evaluation PDF reference
- [Story 6.6](../6-6-zip-dossier-pack-export-sla-30s-progress-pre-generated-seeds.md) - ZIP export reference
