# PDF Service Refactor Plan

**File**: [pdf.service.ts](pdf.service.ts) (1,682 lines)
**Goal**: Reduce main service file size while improving maintainability and reusability

## Current Structure Analysis

### File Statistics
- **Total Lines**: 1,682
- **Methods**: 15 public/private methods
- **Responsibilities**: Multiple concerns mixed together
- **HTML Templates**: 3 massive HTML generation methods (400+ lines each)

### Code Breakdown by Category

| Category | Lines | Percentage | Methods |
|----------|-------|------------|---------|
| HTML Generation (Proposal) | ~320 | 19% | `generateProposalHtml()` |
| HTML Generation (Revision) | ~330 | 20% | `generateRevisionHtml()` |
| HTML Generation (Evaluation) | ~390 | 23% | `generateEvaluationHtml()` |
| PDF Generation Logic | ~180 | 11% | 3 generate methods |
| Data Fetching | ~120 | 7% | Prisma queries |
| Helper Methods | ~90 | 5% | 6 utility methods |
| CSS Styles (inline) | ~550 | 33% | Embedded in HTML methods |
| Other | ~202 | 12% | Imports, interfaces, error handling |

### Identified Problems

1. **Massive HTML Templates** - Each HTML generation method is 300-400 lines
2. **Repeated CSS Styles** - Similar CSS patterns duplicated across all 3 templates
3. **Mixed Responsibilities** - Data fetching, HTML generation, PDF rendering in one service
4. **No Reusability** - CSS and HTML patterns are duplicated
5. **Difficult to Maintain** - Adding a new PDF type requires copying 300+ lines
6. **Hard to Test** - Large methods with complex logic are difficult to unit test

### Code Patterns Identified

**Pattern 1: PDF Generation** (Used 3 times)
```typescript
async generate[Type]Pdf(proposalId: string, options: PdfOptions = {}): Promise<Buffer> {
  const startTime = Date.now();

  // 1. Fetch data from Prisma
  const data = await this.prisma.[entity].findUnique(...);

  // 2. Validate data exists
  if (!data) throw new NotFoundException(...);

  // 3. Launch browser
  const browser = await chromium.launch({...});

  try {
    // 4. Generate HTML
    const html = await this.generate[Type]Html(data);

    // 5. Create page and set content
    const page = await browser.newPage();
    await page.setContent(html, {...});

    // 6. Generate PDF
    const pdfBuffer = await page.pdf({...});

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
```

**Pattern 2: HTML Generation** (Used 3 times, 300-400 lines each)
- Similar structure across all 3 types
- Repeated CSS patterns (reset, container, footer, etc.)
- State badges, SLA info, info rows duplicated

**Pattern 3: Helper Methods** (6 methods)
- `escapeHtml()` - XSS prevention
- `formatLabel()` - Convert snake_case to Title Case
- `formatValue()` - Format different data types
- `getStateBadge()` - Get state styling
- `getSlaInfo()` - Calculate SLA status
- `renderFormData()` - Render form fields

## Proposed Architecture

### Service Split Strategy

Split into **5 specialized services**:

```
pdf.service.ts (Main Orchestrator)
├── pdf-generator.service.ts (PDF rendering engine)
├── pdf-template.service.ts (HTML template generation)
├── pdf-data.service.ts (Data fetching)
├── pdf-html-helpers.service.ts (Utility functions)
└── pdf-styles.service.ts (CSS style management)
```

### New Services Overview

#### 1. PdfGeneratorService (~150 lines)
**Purpose**: Core PDF rendering engine using Playwright

**Responsibilities**:
- Launch and manage Playwright browser
- Convert HTML → PDF
- Handle browser lifecycle (launch, close, error handling)
- Apply PDF options (format, margins, timeout)

**Key Methods**:
```typescript
async generatePdfFromHtml(html: string, options: PdfOptions): Promise<Buffer>
private async launchBrowser(): Promise<Browser>
private async generatePdfOnPage(browser: Browser, html: string, options: PdfOptions): Promise<Buffer>
private async closeBrowser(browser: Browser): Promise<void>
```

**Benefits**:
- Reusable across all PDF types
- Centralized browser management
- Consistent error handling
- Easy to mock for testing

---

#### 2. PdfTemplateService (~400 lines)
**Purpose**: Generate HTML templates for different PDF types

**Responsibilities**:
- Generate HTML for Proposal PDF
- Generate HTML for Revision PDF
- Generate HTML for Evaluation PDF
- Use PdfStylesService for consistent styling
- Use PdfHtmlHelpersService for data formatting

**Key Methods**:
```typescript
async generateProposalHtml(proposal: ProposalWithRelations): Promise<string>
async generateRevisionHtml(proposal: Proposal, returnLog: WorkflowLog): Promise<string>
async generateEvaluationHtml(evaluation: EvaluationWithRelations, councilName: string): Promise<string>
```

**Benefits**:
- Separates presentation logic from business logic
- Templates can be independently tested
- Easy to add new PDF types
- Consistent styling through shared services

---

#### 3. PdfDataService (~120 lines)
**Purpose**: Fetch data needed for PDF generation

**Responsibilities**:
- Fetch proposal with relations (owner, template)
- Fetch evaluation with relations (evaluator, council)
- Fetch workflow logs (for revision PDF)
- Fetch council information
- Handle "not found" errors consistently

**Key Methods**:
```typescript
async getProposalForPdf(proposalId: string): Promise<ProposalWithRelations>
async getEvaluationForPdf(proposalId: string): Promise<EvaluationWithRelations>
async getRevisionLog(proposalId: string): Promise<WorkflowLog>
async getCouncilName(councilId: string): Promise<string>
async hasSeedPdf(proposalId: string): Promise<boolean>
async getSeedPdf(proposalId: string): Promise<Buffer>
```

**Benefits**:
- Centralized data fetching logic
- Consistent error handling
- Easy to mock for testing
- Reusable across services

---

#### 4. PdfHtmlHelpersService (~100 lines)
**Purpose**: Utility functions for HTML generation

**Responsibilities**:
- Format labels (snake_case → Title Case)
- Format values (numbers, booleans, arrays, objects)
- Escape HTML (XSS prevention)
- Format dates in Vietnamese locale
- Truncate text
- Render form data as HTML

**Key Methods**:
```typescript
formatLabel(key: string): string
formatValue(value: any): string
escapeHtml(text: string): string
formatDate(date: Date): string
formatDateTime(date: Date): string
truncate(text: string, maxLength: number): string
renderFormData(formData: Record<string, any>): string
```

**Benefits**:
- Reusable across all PDF types
- Consistent formatting
- Easy to test
- Single responsibility

---

#### 5. PdfStylesService (~200 lines)
**Purpose**: Manage CSS styles for PDF generation

**Responsibilities**:
- Provide common CSS patterns (reset, container, sections)
- Generate state badge styles (all 14 states)
- Generate SLA badge styles
- Provide print-specific CSS
- Provide page break utilities

**Key Methods**:
```typescript
getBaseStyles(): string
getStateBadgeStyles(state: string): { className: string; css: string }
getSlaBadgeStyles(status: 'ok' | 'warning' | 'overdue'): { className: string; css: string }
getPageBreakUtilities(): string
getPrintStyles(): string
```

**CSS Modules** (Extracted from inline):
```typescript
// Common styles used across all templates
const COMMON_STYLES = `
  /* Reset */
  * { margin: 0; padding: 0; box-sizing: border; }

  /* Container */
  .container { max-width: 800px; margin: 0 auto; padding: 20px; }

  /* Section */
  .section { margin-bottom: 24px; page-break-inside: avoid; }
  .section-title { font-size: 14px; font-weight: 700; ... }

  /* Info rows */
  .info-row { display: flex; padding: 8px 0; ... }
  .info-label { flex: 0 0 180px; font-weight: 600; ... }
  .info-value { flex: 1; ... }

  /* Footer */
  .footer { margin-top: 32px; padding-top: 16px; ... }
`;

// State badge styles (14 states)
const STATE_BADGE_STYLES = {
  DRAFT: 'background: #fef3c7; color: #92400e;',
  FACULTY_REVIEW: 'background: #dbeafe; color: #1e40af;',
  // ... 12 more states
};

// SLA badge styles
const SLA_BADGE_STYLES = {
  ok: 'background: #d1fae5; color: #065f46;',
  warning: 'background: #fef3c7; color: #92400e;',
  overdue: 'background: #fee2e2; color: #991b1b;',
};
```

**Benefits**:
- Eliminates CSS duplication
- Consistent styling across all PDFs
- Easy to modify global styles
- Reusable across templates

---

#### 6. PdfService (Main) (~150 lines, -91%)
**Purpose**: Thin orchestrator delegating to specialized services

**Responsibilities**:
- Orchestrate PDF generation workflow
- Coordinate between services
- Maintain backward compatibility (same public API)
- Logging and error handling

**Key Methods** (unchanged public API):
```typescript
async generateProposalPdf(proposalId: string, options?: PdfOptions): Promise<Buffer>
async generateRevisionPdf(proposalId: string, options?: PdfOptions): Promise<Buffer>
async generateEvaluationPdf(proposalId: string, options?: PdfOptions): Promise<Buffer>
async saveSeedPdf(proposalId: string, pdfBuffer: Buffer): Promise<void>
async hasSeedPdf(proposalId: string): Promise<boolean>
async getProposalCode(proposalId: string): Promise<string>
async getProposalForExport(proposalId: string): Promise<ProposalExport>
```

**Delegation Pattern**:
```typescript
async generateProposalPdf(proposalId: string, options?: PdfOptions): Promise<Buffer> {
  // 1. Check for pre-generated PDF
  if (await this.data.hasSeedPdf(proposalId)) {
    return this.data.getSeedPdf(proposalId);
  }

  // 2. Fetch data
  const proposal = await this.data.getProposalForPdf(proposalId);

  // 3. Generate HTML
  const html = await this.templates.generateProposalHtml(proposal);

  // 4. Generate PDF
  const pdfBuffer = await this.generator.generatePdfFromHtml(html, options);

  return pdfBuffer;
}
```

## Implementation Phases

### Phase 1: Create Helper Services (Low Risk)
**Goal**: Extract utility functions first (no behavior changes)

**Tasks**:
- [ ] Create `pdf-html-helpers.service.ts`
  - Extract: `escapeHtml()`, `formatLabel()`, `formatValue()`, `formatDate()`, `truncate()`, `renderFormData()`
  - Write unit tests for each method (existing tests already cover this)
  - ~100 lines

- [ ] Create `pdf-styles.service.ts`
  - Extract all CSS patterns to constants/style methods
  - Create `getStateBadgeStyles()`, `getSlaBadgeStyles()`, `getBaseStyles()`
  - ~200 lines

**Estimated Impact**:
- Main service: -90 lines
- New services: +300 lines
- Net change: +210 lines (but much better organized)

**Tests**: Existing tests in [pdf.service.spec.ts](pdf.service.spec.ts) already cover helpers

---

### Phase 2: Create Data Service (Low Risk)
**Goal**: Centralize data fetching logic

**Tasks**:
- [ ] Create `pdf-data.service.ts`
  - Extract all Prisma queries
  - Create methods: `getProposalForPdf()`, `getEvaluationForPdf()`, `getRevisionLog()`, `getCouncilName()`
  - Handle "not found" errors consistently
  - ~120 lines

**Estimated Impact**:
- Main service: -120 lines
- New service: +120 lines
- Net change: 0 lines (but cleaner separation)

**Tests**: Need to add tests for data fetching methods

---

### Phase 3: Create PDF Generator Service (Medium Risk)
**Goal**: Extract Playwright browser management

**Tasks**:
- [ ] Create `pdf-generator.service.ts`
  - Extract browser launch/close logic
  - Extract page creation and PDF generation
  - Add proper error handling and cleanup
  - ~150 lines

**Estimated Impact**:
- Main service: -80 lines (browser logic)
- New service: +150 lines
- Net change: +70 lines

**Tests**: Need to mock Playwright (browser, page)

---

### Phase 4: Create Template Service (High Value)
**Goal**: Extract HTML generation logic

**Tasks**:
- [ ] Create `pdf-template.service.ts`
  - Move `generateProposalHtml()` (~320 lines)
  - Move `generateRevisionHtml()` (~330 lines)
  - Move `generateEvaluationHtml()` (~390 lines)
  - Refactor to use PdfStylesService and PdfHtmlHelpersService
  - ~400 lines (reduced from 1,040 due to shared utilities)

**Estimated Impact**:
- Main service: -1,040 lines (HTML methods)
- New service: +400 lines
- Net change: -640 lines (!!)

**Tests**: Need to test HTML output (string matching or snapshot testing)

---

### Phase 5: Refactor Main Service (Final Cleanup)
**Goal**: Convert to thin orchestrator

**Tasks**:
- [ ] Update `pdf.service.ts`
  - Remove all private methods (moved to specialized services)
  - Convert public methods to thin delegators
  - Update constructor to inject new services
  - Maintain backward compatibility (same public API)
  - Target: ~150 lines (from 1,682)

- [ ] Update `pdf.module.ts`
  - Add 5 new services to providers
  - Export new services if needed

- [ ] Update `pdf.service.spec.ts`
  - Update mocks to use new service architecture
  - Ensure all existing tests pass

**Estimated Impact**:
- Main service: 1,682 → 150 lines (-91%)
- New services: ~1,120 lines
- Net change: -412 lines overall

---

### Phase 6: Testing & Validation
**Goal**: Ensure everything works

**Tasks**:
- [ ] Run all PDF tests: `npm test -- pdf.service.spec.ts`
- [ ] Run integration tests for PDF generation
- [ ] Manual testing: Generate each PDF type
- [ ] Performance testing: Ensure SLA < 10s
- [ ] Check for regressions

## Estimated Results

### Code Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Main Service Lines** | 1,682 | 150 | **-91%** |
| **Number of Services** | 1 | 6 | +5 |
| **Total Lines in Module** | 1,682 | 1,270 | **-24%** |
| **CSS Duplication** | 550 lines (×3) | 200 lines (×1) | **-89%** |
| **Methods per Service** | 15 | ~3-4 per service | Better organization |
| **Longest Method** | 390 lines | ~150 lines | **-62%** |

### Maintainability Improvements

✅ **Single Responsibility**: Each service has one clear purpose
✅ **Testability**: Smaller services are easier to mock and test
✅ **Reusability**: Shared styles and helpers eliminate duplication
✅ **Extensibility**: Adding new PDF types requires less code
✅ **Readability**: Clear separation of concerns
✅ **Error Handling**: Centralized in appropriate services

### Performance Impact

⚡ **No Performance Degradation**: Same Playwright operations
⚡ **Potential Improvement**: Better error handling reduces retry attempts
⚡ **Same SLA**: 10-second target still achievable

## Migration Path

### Step 1: Create Feature Branch
```bash
git checkout -b refactor/pdf-service-split
```

### Step 2: Implement Phases 1-3 (Low Risk)
- Create helper services
- Create data service
- Create generator service
- Run tests after each phase

### Step 3: Implement Phase 4 (High Value)
- Create template service
- This is where most of the reduction happens

### Step 4: Implement Phase 5 (Final)
- Refactor main service
- Update module

### Step 5: Test & Validate
- Run all tests
- Manual testing
- Performance validation

### Step 6: Commit & Merge
```bash
git add .
git commit -m "refactor(pdf): split pdf.service.ts into 6 specialized services

- Create PdfHtmlHelpersService (utility functions)
- Create PdfStylesService (CSS management)
- Create PdfDataService (data fetching)
- Create PdfGeneratorService (PDF rendering)
- Create PdfTemplateService (HTML generation)
- Refactor PdfService to thin orchestrator

Main service: 1,682 → 150 lines (-91%)
Total module: 1,682 → 1,270 lines (-24%)

Maintains backward compatibility - same public API"
```

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing tests | High | Low | Keep same public API, update mocks |
| Performance regression | Medium | Low | Same Playwright operations, better error handling |
| CSS inconsistencies | Medium | Low | Centralized styles ensure consistency |
| Integration issues | Medium | Low | Comprehensive testing before merge |

## Success Criteria

✅ Main service reduced to ≤200 lines (target: 150 lines)
✅ All existing tests pass
✅ No breaking changes to public API
✅ PDF generation SLA < 10 seconds maintained
✅ Code duplication reduced by ≥80%
✅ All services properly mocked in tests

## References

- **Original File**: [pdf.service.ts](pdf.service.ts) (1,682 lines)
- **Base Class**: [pdf-base.service.ts](pdf-base.service.ts) (356 lines) - Already provides some abstractions
- **Configuration**: [pdf.config.ts](pdf.config.ts) (207 lines) - Shared config already exists
- **Tests**: [pdf.service.spec.ts](pdf.service.spec.ts) (299 lines)
- **Module**: [pdf.module.ts](pdf.module.ts) (22 lines)

## Notes

- **Existing Base Class**: There's already a `PdfBaseService` abstract class with some shared functionality
- **Can Leverage**: PdfBaseService provides `generatePdfFromHtml()`, `escapeHtml()`, browser management
- **Should Extend**: Template services can extend PdfBaseService for consistency
- **Config**: PDF_CONFIG already exists with timeout, viewport, fonts
- **CSS Utilities**: PDF_CSS_UTILITIES already extracted (good foundation)

## Conclusion

This refactoring will transform pdf.service.ts from a 1,682-line monolith into a well-organized module with 6 specialized services. The main service will become a thin orchestrator (~150 lines, -91% reduction), while maintaining complete backward compatibility.

The key benefits are:
- **Maintainability**: Easier to understand and modify
- **Testability**: Smaller, focused services are easier to test
- **Reusability**: Shared styles and helpers eliminate duplication
- **Extensibility**: Adding new PDF types is much simpler

This follows the same successful pattern used in the workflow.service.ts refactor (2,303 → 409 lines, -82%).
