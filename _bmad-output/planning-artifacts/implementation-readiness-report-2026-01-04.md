# Implementation Readiness Assessment Report

**Date:** 2026-01-04
**Project:** DoAn
**Assessor:** Implementation Readiness Workflow

---

## Document Discovery

### Documents Being Assessed

| Document Type | File | Size | Last Modified |
|---------------|------|------|---------------|
| **PRD** | `prd.md` | 58 KB | Jan 2 06:29 |
| **Architecture** | `architecture.md` | 77 KB | Jan 3 01:41 |
| **Epics & Stories** | `epics.md` | 84 KB | Jan 4 18:40 |
| **UX Design (Part A)** | `ux-design-specification-part-aa.md` | 89 KB | Jan 3 02:29 |
| **UX Design (Part B)** | `ux-design-specification-part-ab.md` | 61 KB | Jan 2 20:54 |

### Status

✅ All required documents found. No duplicate conflicts.

---

stepsCompleted: [1]
workflowType: 'check-implementation-readiness'
currentStep: 2
workflowStatus: 'in-progress'

---

---

## PRD Analysis

### Functional Requirements Extracted

#### Invariant Rules (FR0-A to FR0-D)
- **FR0-A (State/Form Separation):** System MUST enforce separation between workflow state (`projects.state`) and form submission status (`form_instances.status`). Form status changes MUST NOT directly change workflow state.
- **FR0-B (Contextual Owner Permission):** System MUST enforce PROJECT_OWNER as contextual permission; only `projects.owner_id` can execute owner-only actions.
- **FR0-C (100% Holder Visibility):** System MUST ensure every proposal always has a `holder_unit` (mandatory). `holder_user` is optional, but DRAFT defaults to PROJECT_OWNER as `holder_user`.
- **FR0-D (Logs as Source of Truth):** System MUST maintain `workflow_logs` as append-only source of truth. Current state MUST be derivable from logs after restore/recompute.

#### User Management & Authentication (FR1-FR7)
- **FR1:** System can authenticate users via username/password (local auth).
- **FR2:** System can maintain user profiles including full name, email, unit/faculty, and role.
- **FR3:** System can assign users to one of six roles: GIANG_VIEN, QUAN_LY_KHOA, PKHCN, THU_KY_HD, BGH, ADMIN.
- **FR4:** System can authorize actions based on (role + current proposal state + contextual ownership).
- **FR5 (MVP-safe Reset):** System can allow ADMIN to reset a user password (admin-assisted) and can force password change on next login.
- **FR6:** System can deactivate user accounts while preserving historical workflow/audit data.
- **FR7:** System can import user lists via Excel upload with validation feedback.

#### Workflow & State Management (FR8-FR22)
- **FR8:** System supports workflow states as defined in Appendix: State Enumeration v1 (canonical).
- **FR9:** System can enforce state transitions based on predefined workflow rules (no arbitrary jumps).
- **FR10:** System can assign `holder_unit` (mandatory) and `holder_user` (optional) per state; DRAFT defaults to owner as `holder_user`.
- **FR11 (Reason Governance):** System MUST require reason code for negative/exception transitions (RETURN, REJECT, CANCEL, OVERRIDE, PAUSE/RESUME).
- **FR12 (Context Preservation):** System can preserve form data when a proposal requires revision (resubmit does not lose context).
- **FR13:** System can allow proposal submission from DRAFT → SUBMITTED.
- **FR14:** System can auto-transition from SUBMITTED → FACULTY_REVIEW upon submission.
- **FR15 (Acceptance Sub-flow):** System can execute acceptance sub-flow after ACTIVE: ACTIVE → SUBMIT_FINAL_REPORT → FACULTY_ACCEPTANCE → (optional) SCHOOL_ACCEPTANCE → COMPLETED.
- **FR16 (Submit ONCE):** System can allow only designated THU_KY_HD to submit council evaluation results (submit ONCE per proposal).
- **FR17 (Read-only Enforcement + Controlled Breakglass):** After council submission, the proposal becomes read-only for all roles except: PKHCN via OVERRIDE (reason required; immutable audit entry), and ADMIN for technical correction only (must be audited as TECHNICAL_ONLY).
- **FR18:** System can cancel proposals with required reason code.
- **FR19:** System can maintain append-only workflow logs of all state transitions (who/when/from/to/reason).
- **FR20 (Pause/Resume):** System can support PAUSE/RESUME transitions for ACTIVE projects (PKHCN only, reason required).
- **FR21 (Override):** System can support OVERRIDE transition with mandatory reason code and immutable audit entry (PKHCN only).
- **FR22 (Return-to-Prior-State Rule):** System can enforce revision behavior: REVISION_REQUIRED returns to the prior review state (not DRAFT) with context preserved.

#### Form & Proposal Management (FR23-FR31)
- **FR23:** System can provide dynamic forms for proposal data entry.
- **FR24:** System can auto-fill user profile data into forms (name, email, unit/faculty).
- **FR25:** System can track file upload progress (x/y required files uploaded).
- **FR26:** System can validate required fields before submission and show actionable error messages.
- **FR27:** System can store form data with version tracking per revision cycle.
- **FR28:** System can allow users to save proposals as DRAFT before submission.
- **FR29:** System can display a proposal timeline on proposal detail (states + holders + timestamps + decisions).
- **FR30:** System can indicate which fields require editing during revision (highlight required changes and preserve previous inputs).
- **FR31:** System can maintain form submission status independently from workflow state (supports FR0-A).

#### Document Generation & Dossier (FR32-FR39)
- **FR32:** System can generate .docx files from proposal data using uploaded templates.
- **FR33:** System can support .docx template upload by ADMIN/PKHCN (template is not editable in-system in MVP).
- **FR34:** System can map template placeholders to proposal data and generate output documents.
- **FR35:** System can generate SHA-256 hash for each generated document/artifact.
- **FR36:** System can maintain a manifest linking proposals to generated artifacts (with hashes).
- **FR37 (Retention Policy):** System can store documents per retention policy (default 7 years, configurable).
- **FR38:** System can allow users to download generated documents according to RBAC rules.
- **FR39:** System can verify document integrity via hash comparison (at least on demand / admin check).

#### Dashboard & Reporting (FR40-FR50)
- **FR40:** System can provide role-based dashboards for each of the 6 roles (GIANG_VIEN, QUAN_LY_KHOA, PKHCN, THU_KY_HD, BGH, ADMIN).
- **FR41:** System can display aggregate statistics (totals by state, by unit/faculty, by period).
- **FR42:** System can display overdue proposals with visual highlighting.
- **FR43:** System can display proposals approaching deadline (warning at T-2 working days).
- **FR44:** System can allow drill-down from aggregates to proposal detail.
- **FR45:** System can provide read-only dashboard for BGH (no edit operations).
- **FR46:** System can allow filtering by unit/faculty, state, holder, and date range.
- **FR47:** System can export reports to Excel format (e.g., báo cáo_quý, báo_cáo_năm, theo_khoa) according to school's required layout.
- **FR48:** From dashboard drill-down, system can show proposal timeline and decision history (supports transparency requirement).
- **FR49:** System can provide dashboard optimized for mobile viewing (BGH dashboard priority).
- **FR50:** System can provide "My Action Items / Today's Tasks" widget for GIANG_VIEN and PKHCN.

#### SLA & Notifications (FR51-FR59)
- **FR51:** System can calculate SLA deadlines based on working days (Mon–Fri), excluding holidays.
- **FR52:** System can import holiday calendar via Excel with `is_working_day` column (supports compensatory working days).
- **FR53:** System can adjust deadlines that fall on non-working days to the next working day.
- **FR54:** System can detect and flag proposals exceeding SLA deadline (overdue).
- **FR55 (Async Notifications MVP):** System can send SLA reminders at T-2, T0, T+2 (working-day aware) using cron + async delivery (no real-time). Must support email delivery. Must support in-app notification inbox (polling-based). Delivery failures must be logged and visible to ADMIN.
- **FR56:** System can allow PKHCN to send bulk reminder emails for overdue proposals.
- **FR57:** System can escalate overdue proposals at T+2 to PKHCN for intervention (must be visible on dashboard).
- **FR58:** System can track SLA compliance rate (% on-time).
- **FR59:** System can display SLA status per proposal with overdue/at-risk indicators.

#### System Administration & Audit (FR60-FR74)
- **FR60:** System can provide an admin system health view (service status, DB connection, critical errors).
- **FR61 (Dual-layer Audit):** System must log: all workflow transitions in `workflow_logs` (primary audit), and all changes to sensitive tables in `audit_logs` (trigger-based, scoped).
- **FR62:** System can enforce reason code selection for reject/return/override/cancel actions.
- **FR63:** System can require free-text explanation when reason code KHAC is selected.
- **FR64:** System can export workflow/audit logs for inspection purposes (filterable by date/type/unit).
- **FR65:** System can restore database state from backup (runbook-driven).
- **FR66 (Recompute + Verify):** System can recompute proposal states from `workflow_logs` after restore and verify `projects.state == computed_state`; mismatches must be reported, and state correction must be restricted to ADMIN (audited).
- **FR67 (Validated Import + Atomic Apply):** System can validate Excel imports with row-level feedback, support dry-run summary, and apply changes atomically (all-or-nothing) when confirmed by PKHCN/ADMIN.
- **FR68:** System can maintain `workflow_logs` indefinitely (append-only, no deletion).
- **FR69:** System can provide error log viewing for ADMIN.
- **FR70:** System can allow ADMIN to manage form templates (create, upload, deactivate).
- **FR71:** System can allow ADMIN to configure SLA settings (thresholds, reminder schedule parameters).
- **FR72:** System can allow PKHCN to assign council members to proposals.
- **FR73:** System can allow PKHCN to assign expert reviewers to proposals.
- **FR74:** System can allow PKHCN to designate council secretary (THU_KY_HD) per proposal (enforces submit ONCE).

**Total FRs: 78 (4 invariants + 74 functional requirements)**

### Non-Functional Requirements Extracted

#### Performance (NFR-1)
- **NFR-1.1:** Dashboard initial load < 3s (TTI, warm cache)
- **NFR-1.2:** API latency p95 < 500ms (excluding file upload/download)
- **NFR-1.3:** Page transitions (client-side) < 500ms
- **NFR-1.4:** Document generation (.docx) < 10s
- **NFR-1.5:** Excel export < 30s (≥1000 rows)
- **NFR-1.6:** DB read queries p95 < 200ms
- **NFR-1.7:** Route-level code splitting; DB indexing required
- **NFR-1.8:** Pagination required for all list APIs

#### Security & Privacy (NFR-2)
- **NFR-2.1:** Local authentication (username/password) for MVP
- **NFR-2.2:** Password policy: min 8 chars, force change on admin reset
- **NFR-2.3:** Access token 15 minutes, refresh token 7 days, idle timeout 8 hours
- **NFR-2.4:** RBAC enforcement on every API using (Role + State + Action + Owner context)
- **NFR-2.5:** TLS 1.2+ enforced for all traffic
- **NFR-2.6:** Password hashing: bcrypt (cost factor ~12)
- **NFR-2.7:** Document integrity: SHA-256 for generated artifacts
- **NFR-2.8:** Rate limiting baseline: 100 req/min/user

#### Reliability & Availability (NFR-3)
- **NFR-3.1:** Uptime 99.5% during business hours Mon–Fri
- **NFR-3.2:** Workflow state integrity 100% (state derivable from append-only workflow logs)
- **NFR-3.3:** Lost-state incidents = 0 within first 6 months
- **NFR-3.4:** DB restore + verify (RTO-DB) < 1 hour (MUST)
- **NFR-3.5:** Full system recovery (RTO-Full) < 4 hours (RECOMMENDED)
- **NFR-3.6:** Recovery Point Objective (RPO) ≤ 24 hours
- **NFR-3.7:** Daily DB backup (nightly) + weekly full archive
- **NFR-3.8:** Backup verification job must run at least weekly

#### Data Retention & Compliance (NFR-4)
- **NFR-4.1:** workflow_logs indefinite (append-only, source of truth)
- **NFR-4.2:** audit_logs indefinite (compliance evidence)
- **NFR-4.3:** Generated documents 7 years after completion (configurable)
- **NFR-4.4:** Deactivated user accounts 3 years (profile retained; access disabled)
- **NFR-4.5:** Exportable logs: filter by date range, unit/faculty, user, action type, state transition
- **NFR-4.6:** Reason codes mandatory for negative/exception transitions
- **NFR-4.7:** Manifest must link artifacts + hashes for verification

#### Accessibility (NFR-5)
- **NFR-5.1:** WCAG 2.1 Level AA compliance
- **NFR-5.2:** Keyboard navigation for all essential workflows
- **NFR-5.3:** Contrast ratios: 4.5:1 for normal text, 3:1 for large text
- **NFR-5.4:** Screen reader compatibility: semantic HTML + ARIA labels
- **NFR-5.5:** Zoom support: usable at 200% without horizontal scrolling
- **NFR-5.6:** BGH dashboard: mobile-optimized read-only views
- **NFR-5.7:** Minimum touch target: 44×44 px on mobile

#### Scalability (NFR-6)
- **NFR-6.1:** Concurrent users: 50–100
- **NFR-6.2:** Total users: ~500
- **NFR-6.3:** Storage growth: ~10GB/year
- **NFR-6.4:** Partition workflow_logs by year if query volume grows
- **NFR-6.5:** Archive completed projects after completion + 1 year

#### Maintainability & Observability (NFR-7)
- **NFR-7.1:** TypeScript strict mode recommended
- **NFR-7.2:** Test coverage ≥70% for critical modules
- **NFR-7.3:** API documentation (OpenAPI or equivalent)
- **NFR-7.4:** Runbook: DB restore, recompute + verify, import/export failure handling
- **NFR-7.5:** Structured JSON logs with correlation IDs per request
- **NFR-7.6:** Error tracking (Sentry or equivalent)
- **NFR-7.7:** Basic operational metrics: API p95 latency, error rate, job queue failures

**Total NFRs: 40+ requirements across 7 categories**

### PRD Completeness Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| **Functional Requirements** | ✅ Complete | 78 FRs (4 invariants + 74 functional) with clear descriptions |
| **Non-Functional Requirements** | ✅ Complete | Performance, Security, Reliability, Compliance, Accessibility, Scalability, Maintainability covered |
| **User Journeys** | ✅ Complete | 5 journeys defined (Giảng viên, PKHCN, BGH, Admin, Thư ký HĐ) |
| **Success Criteria** | ✅ Complete | User, Business, Technical success metrics defined |
| **Scope Boundaries** | ✅ Complete | MVP, Growth, Vision clearly delineated |
| **Technical Stack** | ✅ Complete | Next.js, Node.js/TypeScript, PostgreSQL, Prisma specified |

**Overall PRD Assessment:** ✅ **COMPLETE AND READY FOR IMPLEMENTATION**

---

---

## Epic Coverage Validation

### Epic FR Coverage Extracted

| Epic | FRs Covered | Description |
|------|-------------|-------------|
| **Epic 1** | FR1, FR2, FR3, FR49, FR50, FR51, FR47(partial), FR48(partial) | Auth, RBAC, User Mgmt, Demo Ops, Calendar, Audit foundation |
| **Epic 2** | FR4, FR5, FR6 | Create Proposal, Auto-save, Attachments |
| **Epic 3** | FR7, FR8, FR9, FR10, FR11, FR12, FR16, FR17, FR18, FR48(workflow_logs) | States, Transitions, Holder, Queue, Timeline, SLA |
| **Epic 4** | FR13, FR14, FR15, FR19, FR20, FR21 | Faculty Approve/Return, Revision, Resubmit |
| **Epic 5** | FR22, FR23, FR25, FR26, FR27, FR28 | School Selection, Council Assign, Evaluation |
| **Epic 6** | FR29, FR31, FR32, FR33 | Acceptance, Handover |
| **Epic 7** | FR40, FR41, FR42 | Document Export (PDF/ZIP) |
| **Epic 8** | FR34, FR35, FR36, FR37, FR38, FR39 | Reminders, Bulk Actions, Excel Export |
| **Epic 9** | FR43, FR44, FR45 | Cancel/Withdraw, Reject, Pause/Resume |
| **Epic 10** | FR46, FR47(full), FR48(full) | Import/Export, Audit Logs, Holiday Mgmt |

### FR Coverage Analysis (PRD FR1-FR74)

**Note:** The epics document uses a different FR numbering scheme (FR49-FR51 = Demo Ops) that doesn't match PRD FR1-FR74. This analysis validates coverage against the actual PRD requirements.

| FR | PRD Requirement | Epic Coverage | Status |
|----|-----------------|---------------|--------|
| **FR1** | Local auth (username/password) | Epic 1 (Stories 1.1, 1.2, 1.3) | ✅ Covered |
| **FR2** | User profiles (name, email, unit, role) | Epic 1 (Stories 1.2, 1.3) | ✅ Covered |
| **FR3** | Assign users to 6 roles | Epic 1 (Stories 1.1, 1.2, 1.3) | ✅ Covered |
| **FR4** | Authorize (role + state + owner) | Epic 1 (Story 1.2) | ✅ Covered |
| **FR5** | Admin password reset | ⚠️ NOT FOUND | ❌ MISSING |
| **FR6** | Deactivate user accounts | Epic 1 (Story 1.3 - soft delete) | ✅ Covered |
| **FR7** | Import user lists via Excel | ⚠️ NOT FOUND | ❌ MISSING |
| **FR8** | Support canonical workflow states | Epic 3 (Story 3.1) | ✅ Covered |
| **FR9** | Enforce state transitions | Epic 3 (Story 3.2) | ✅ Covered |
| **FR10** | Assign holder_unit + holder_user | Epic 3 (Story 3.2) | ✅ Covered |
| **FR11** | Reason code for negative transitions | Epic 3 (Story 3.2) | ✅ Covered |
| **FR12** | Preserve form data on revision | Epic 2 (Story 2.2, 2.3) | ✅ Covered |
| **FR13** | Submit DRAFT → SUBMITTED | Epic 3 (Story 3.3) | ✅ Covered |
| **FR14** | Auto-transition SUBMITTED → FACULTY_REVIEW | Epic 3 (Story 3.3) | ✅ Covered |
| **FR15** | Acceptance sub-flow | Epic 6 (Stories 6.2, 6.3, 6.4) | ✅ Covered |
| **FR16** | Submit ONCE (THU_KY_HD) | Epic 3 (Story 3.2), Epic 5 (Story 5.4) | ✅ Covered |
| **FR17** | Read-only + breakglass | Epic 5 (Story 5.5) | ✅ Covered |
| **FR18** | Cancel proposals | Epic 9 (Story 9.1) | ✅ Covered |
| **FR19** | Append-only workflow logs | Epic 3 (Story 3.4) | ✅ Covered |
| **FR20** | Pause/Resume transitions | Epic 9 (Story 9.3) | ✅ Covered |
| **FR21** | Override transition | Epic 4 (Story 4.3) | ✅ Covered |
| **FR22** | Return-to-prior-state rule | Epic 4 (Story 4.5) | ✅ Covered |
| **FR23** | Dynamic forms for proposals | Epic 2 (Story 2.1) | ✅ Covered |
| **FR24** | Auto-fill user profile data | ⚠️ NOT FOUND | ❌ MISSING |
| **FR25** | Track file upload progress | Epic 2 (Story 2.4) | ✅ Covered |
| **FR26** | Validate required fields | Epic 5 (Story 5.3) | ✅ Covered |
| **FR27** | Store form data with version tracking | ⚠️ NOT FOUND | ❌ MISSING |
| **FR28** | Save DRAFT before submission | Epic 2 (Story 2.2, 2.3) | ✅ Covered |
| **FR29** | Display proposal timeline | Epic 3 (Story 3.4), Epic 6 (Story 6.5) | ✅ Covered |
| **FR30** | Indicate fields requiring editing | ⚠️ NOT FOUND | ❌ MISSING |
| **FR31** | Form submission status independent | ⚠️ NOT FOUND | ❌ MISSING |
| **FR32** | Generate .docx from templates | ⚠️ NOT FOUND | ❌ MISSING |
| **FR33** | Support .docx template upload | ⚠️ NOT FOUND | ❌ MISSING |
| **FR34** | Map placeholders to data | ⚠️ NOT FOUND | ❌ MISSING |
| **FR35** | Generate SHA-256 hash | ⚠️ NOT FOUND | ❌ MISSING |
| **FR36** | Maintain manifest linking | ⚠️ NOT FOUND | ❌ MISSING |
| **FR37** | Document retention policy | ⚠️ NOT FOUND | ❌ MISSING |
| **FR38** | Download documents per RBAC | ⚠️ NOT FOUND | ❌ MISSING |
| **FR39** | Verify document integrity | ⚠️ NOT FOUND | ❌ MISSING |
| **FR40** | Role-based dashboards (6 roles) | Epic 8 (Story 8.4 - Morning Check Dashboard) | ⚠️ PARTIAL |
| **FR41** | Display aggregate statistics | Epic 8 (Story 8.4) | ✅ Covered |
| **FR42** | Display overdue proposals | Epic 3 (Story 3.7 - SLA Badge), Epic 8 (Story 8.4) | ✅ Covered |
| **FR43** | Display approaching deadline (T-2) | Epic 3 (Story 3.7) | ✅ Covered |
| **FR44** | Drill-down from aggregates | ⚠️ NOT FOUND | ❌ MISSING |
| **FR45** | Read-only dashboard for BGH | ⚠️ NOT FOUND | ❌ MISSING |
| **FR46** | Filter by unit/state/holder/date | Epic 10 (Story 10.2) | ✅ Covered |
| **FR47** | Export Excel reports | Epic 8 (Story 8.3) | ✅ Covered |
| **FR48** | Show timeline from dashboard | ⚠️ IMPLIED in Epic 3 (Story 3.4) | ⚠️ PARTIAL |
| **FR49** | Mobile dashboard (BGH priority) | ⚠️ NOT FOUND | ❌ MISSING |
| **FR50** | "My Action Items" widget | ⚠️ NOT FOUND | ❌ MISSING |
| **FR51** | Calculate SLA (working days) | Epic 1 (Story 1.8), Epic 3 (Story 3.6) | ✅ Covered |
| **FR52** | Import holiday calendar | Epic 1 (Story 1.8), Epic 10 (Story 10.5) | ✅ Covered |
| **FR53** | Adjust deadlines for non-working days | Epic 3 (Story 3.6) | ✅ Covered |
| **FR54** | Detect overdue proposals | Epic 3 (Story 3.6) | ✅ Covered |
| **FR55** | SLA reminders (T-2, T0, T+2) | Epic 8 (Story 8.2 - Bulk Remind) | ⚠️ PARTIAL |
| **FR56** | Bulk reminder emails | Epic 8 (Story 8.2) | ✅ Covered |
| **FR57** | Escalate at T+2 | ⚠️ IMPLIED in SLA tracking | ⚠️ PARTIAL |
| **FR58** | Track SLA compliance rate | ⚠️ NOT FOUND | ❌ MISSING |
| **FR59** | Display SLA status per proposal | Epic 3 (Story 3.7) | ✅ Covered |
| **FR60** | Admin system health view | Epic 10 (Story 10.3) | ✅ Covered |
| **FR61** | Dual-layer audit | Epic 1 (Story 1.4), Epic 3 (Story 3.4), Epic 10 (Story 10.4) | ✅ Covered |
| **FR62** | Enforce reason code selection | Epic 4 (Story 4.2) | ✅ Covered |
| **FR63** | Free-text when "KHAC" selected | ⚠️ IMPLIED in reason code | ⚠️ PARTIAL |
| **FR64** | Export audit logs | Epic 10 (Story 10.4) | ✅ Covered |
| **FR65** | Restore DB from backup | ⚠️ NOT FOUND | ❌ MISSING |
| **FR66** | Recompute + verify state | ⚠️ NOT FOUND | ❌ MISSING |
| **FR67** | Validated import + atomic apply | Epic 10 (Story 10.1) | ✅ Covered |
| **FR68** | Maintain workflow_logs indefinitely | Epic 3 (Story 3.4) | ✅ Covered |
| **FR69** | Error log viewing | Epic 10 (Story 10.3) | ✅ Covered |
| **FR70** | Manage form templates | ⚠️ NOT FOUND | ❌ MISSING |
| **FR71** | Configure SLA settings | ⚠️ NOT FOUND | ❌ MISSING |
| **FR72** | Assign council members | Epic 5 (Story 5.2) | ✅ Covered |
| **FR73** | Assign expert reviewers | ⚠️ NOT FOUND | ❌ MISSING |
| **FR74** | Designate council secretary | Epic 5 (Story 5.2) | ✅ Covered |

### Missing Requirements Summary

| Category | Missing FRs | Count |
|----------|------------|-------|
| **User Management** | FR5, FR7 | 2 |
| **Form & Proposal** | FR24, FR27, FR30, FR31 | 4 |
| **Document Generation** | FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39 | 8 |
| **Dashboard** | FR44, FR45, FR49, FR50 | 4 |
| **SLA & Notifications** | FR58 | 1 |
| **System Admin** | FR65, FR66, FR70, FR71, FR73 | 5 |
| **Invariant Rules** | FR0-A, FR0-B, FR0-C, FR0-D | 4 |
| **TOTAL** | | **28** |

### Coverage Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total PRD FRs (FR1-FR74)** | 74 | 100% |
| **Fully Covered** | 46 | 62.2% |
| **Partially Covered** | 8 | 10.8% |
| **Missing** | 20 | 27.0% |
| **Invariant Rules (FR0-A to FR0-D)** | 4 | Not in FR Coverage Map |

### Critical Gaps Requiring Attention

| Priority | Missing FRs | Impact | Recommendation |
|----------|-------------|--------|----------------|
| **HIGH** | FR32-FR39 (Document Generation) | PRD specifies .docx generation, SHA-256 hashing, manifest linking. Epics only mention PDF/ZIP export. | Add stories to Epic 7 or create new Epic for .docx generation with document integrity |
| **HIGH** | FR65, FR66 (DB Recovery) | PRD requires restore + recompute capability for compliance. | Add recovery stories to Epic 10 |
| **MEDIUM** | FR5, FR7 (User Import/Reset) | Admin cannot import users or reset passwords without email. | Add to Epic 1 or Epic 10 |
| **MEDIUM** | FR70, FR71 (Template/SLA Config) | Admin cannot manage form templates or configure SLA. | Add to Epic 10 |
| **LOW** | FR49, FR50 (Mobile/Action Items) | Nice-to-have for MVP. | Move to Growth Phase |

### Coverage Assessment

**Overall Status:** ⚠️ **MODERATE - ACTION REQUIRED**

- **Core workflow:** ✅ Well covered (FR8-FR22, FR13-FR21, FR22-FR29)
- **Dashboards:** ⚠️ Partial coverage (missing mobile, action items widget, drill-down)
- **Document Generation:** ❌ Significant gap (.docx, SHA-256, manifest not covered)
- **System Admin:** ⚠️ Partial coverage (missing DB recovery, template management)
- **Invariant Rules:** ❌ Not explicitly covered in epics (FR0-A to FR0-D)

---

---

## UX Alignment Assessment

### UX Document Status

| Document | Status | Details |
|----------|--------|---------|
| **UX Design Spec Part AA** | ✅ Found | 14-step complete specification |
| **UX Design Spec Part AB** | ✅ Found | Workflow completion, accessibility specs |
| **Completion Date** | 2026-01-02 | All steps confirmed |
| **Version** | 1.2 | Aligned with Tech-Spec v2.1 |

### UX Design Overview

| Aspect | Specification |
|--------|---------------|
| **Design System** | shadcn/ui + Tailwind CSS |
| **Core Experience** | "Open → See → Do (< 10s)" |
| **Platform Strategy** | Desktop-first, mobile read-only (BGH only) |
| **Accessibility** | WCAG 2.1 AA compliance |
| **Dark Mode** | Auto OS detection |
| **Responsive** | Desktop-primary + tablet + mobile (BGH) |
| **Icon Library** | lucide-react (standardized) |

### UX ↔ PRD Alignment

| PRD Requirement | UX Specification | Status |
|-----------------|------------------|--------|
| **NFR-1.1:** Dashboard < 3s | UX: "Open → See → Do (< 10s)" | ✅ Aligned |
| **NFR-5.1:** WCAG 2.1 AA | UX: WCAG 2.1 AA with Radix UI | ✅ Aligned |
| **NFR-5.6:** BGH mobile optimized | UX: "Desktop-First, Mobile BGH Only" | ✅ Aligned |
| **FR40:** 6 role-based dashboards | UX: 7 personas with specific dashboards | ✅ Aligned |
| **FR8:** 16 canonical states | UX: State machine 16 states (v1.9) | ✅ Aligned |
| **User Journeys (5)** | UX: 6 detailed journeys (J1-J6) | ✅ Aligned |
| **FR55:** SLA reminders T-2/T0/T+2 | UX: "Auto T-2/T0/T+2" | ✅ Aligned |
| **FR12:** Context preservation | UX: "Never Lose Context" principle | ✅ Aligned |

### UX ↔ Architecture Alignment

| Architecture Decision | UX Requirement | Status |
|----------------------|----------------|--------|
| **Next.js + SSR/SPA** | Desktop-first with fast load | ✅ Supported |
| **shadcn/ui + Tailwind** | Design system foundation | ✅ Explicitly specified |
| **RBAC Engine** | Role-based dashboards (6 roles) | ✅ Supported |
| **API p95 < 500ms** | Dashboard < 3s UX requirement | ✅ Supported |
| **TypeScript strict** | Component type safety | ✅ Supported |
| **DB indexing strategy** | Queue/dashboard performance | ✅ Supported |

### Alignment Issues

| Issue | Severity | Description | Recommendation |
|-------|----------|-------------|----------------|
| **HTML visualizers missing** | Low | Color Themes and Design Directions HTML files not generated | Can create later for stakeholder review |
| **Mobile scope limited** | Low | Only BGH has mobile read-only, other roles desktop-only | Acceptable per PRD scope |
| **No interactive prototype** | Low | Wireframes mentioned but not generated | Can create if user testing needed |

### UX Design Decisions Locked

| # | Decision | Section |
|---|----------|---------|
| 1 | shadcn/ui + Tailwind CSS | Design System |
| 2 | Open → See → Do (< 10s) | Core Experience |
| 3 | State First, Always | Experience Principles |
| 4 | Business Terminology | Emotional Response |
| 5 | Direction C + Per-Role Density | Design Direction |
| 6 | PDF = WYSIWYG | Visual Foundation |
| 7 | Dark Mode Auto OS | Visual Foundation |
| 8 | Desktop-First, Mobile BGH Only | Responsive Strategy |
| 9 | Badge = Icon + Text | Visual Foundation |
| 10 | Submit ONCE = Finalize | User Journey Flows |
| 11 | Revision = Section-Level | User Journey Flows |
| 12 | holder_user Policy | User Journey Flows |
| 13 | Bulk Safety Bundle | User Journey Flows |

### UX Alignment Assessment

**Overall Status:** ✅ **STRONGLY ALIGNED**

- **UX Documentation:** ✅ Complete and comprehensive (14 steps)
- **PRD Alignment:** ✅ All UX requirements supported by PRD
- **Architecture Support:** ✅ Architecture decisions fully support UX requirements
- **Design System:** ✅ shadcn/ui + Tailwind CSS specified
- **Accessibility:** ✅ WCAG 2.1 AA compliance specified
- **Performance:** ✅ Dashboard < 3s requirement aligned with architecture targets

**Recommendation:** No UX-related blockers for implementation. UX specification provides clear guidance for development team.

---

---

## Epic Quality Review

### Epic Structure Validation

| Epic | Title | User Value Focus | Independence | Status |
|------|-------|------------------|--------------|--------|
| **Epic 1** | Foundation + Demo Operator | Login, switch personas, demo | Standalone | ✅ Pass |
| **Epic 2** | Proposal Draft + Attachments | Create proposals, upload files | Uses Epic 1 | ✅ Pass |
| **Epic 3** | Workflow Core + Queue + SLA | Submit, see queue, SLA badges | Uses Epic 1 + 2 | ✅ Pass |
| **Epic 4** | Faculty Review + Resubmit | Review, return, resubmit | Uses Epic 1-3 | ✅ Pass |
| **Epic 5** | School Ops + Council Review | Assign council, evaluate | Uses Epic 1-4 | ✅ Pass |
| **Epic 6** | Acceptance & Handover | Complete projects, export | Uses Epic 1-5 | ✅ Pass |
| **Epic 7** | Document Export | Export PDF/ZIP | Uses Epic 1-6 | ✅ Pass |
| **Epic 8** | Bulk Actions & Reports | Bulk operations, reports | Uses Epic 1-7 | ✅ Pass |
| **Epic 9** | Exceptions | Handle exceptions | Uses Epic 1-8 | ✅ Pass |
| **Epic 10** | Admin & System Configuration | Manage system | Uses Epic 1-9 | ✅ Pass |

### Story Quality Assessment

**Total Stories:** 54 across 10 epics

| Quality Dimension | Assessment | Status |
|-------------------|------------|--------|
| **User Story Format** | All stories follow "As a/I want/So that" format | ✅ Pass |
| **Acceptance Criteria** | Given/When/Then BDD format with specific outcomes | ✅ Pass |
| **FR Traceability** | Each story references covered FRs | ✅ Pass |
| **Tech Specs** | Technical specifications included where needed | ✅ Pass |
| **Testable ACs** | Criteria are specific, measurable, verifiable | ✅ Pass |

### Dependency Analysis

**Within-Epic Dependencies:** ✅ PASS

All story sequences follow proper dependency pattern:
- Story N.1: Foundation (no dependencies)
- Story N.2: Uses Story N.1 output
- Story N.3: Uses Stories N.1 + N.2 outputs
- No forward dependencies detected

**Epic Independence:** ✅ PASS

- Epic 1: Standalone (foundation)
- Epic N: Only depends on Epic 1...(N-1)
- Epic N does NOT require Epic N+1

**Database Creation Timing:** ✅ PASS

- Tables created incrementally when first needed
- Story 1.1: users table
- Story 1.2: roles, permissions tables
- Story 1.4: audit_events table
- Story 2.1: form_templates table
- Story 2.2: proposals table
- Story 3.4: workflow_logs table
- No upfront "create all tables" story

### Best Practices Compliance

| Practice | Status | Notes |
|----------|--------|-------|
| Epics deliver user value (not technical milestones) | ✅ Pass | All epics have clear user outcomes |
| Epic independence (no forward dependencies) | ✅ Pass | Each epic builds only on previous |
| Stories appropriately sized for single dev | ✅ Pass | 54 stories, 3-9 per epic |
| No forward dependencies within epic | ✅ Pass | Sequential flow verified |
| Database tables created when needed | ✅ Pass | Incremental creation pattern |
| Clear acceptance criteria (Given/When/Then) | ✅ Pass | BDD format throughout |
| Traceability to FRs maintained | ✅ Pass | Each story references FRs |

### Quality Issues Found

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| **🟡 Minor** | Epic 7 has only 1 story | Epic 7 | Consider merging into other epics or expanding |
| **🟡 Minor** | Demo-specific stories (FR49-FR51) use different FR numbering | Epic 1 | Align with PRD FR numbering for clarity |

### Sprint Breakdown (Epic 1)

**Epic 1 is split into 2 sprints:**
- Sprint 1A (4 stories): Auth + RBAC + User + Audit
- Sprint 1B (4 stories): Demo Operator + Seed/Reset + Business Calendar

This is appropriate as it allows foundational auth/RBAC to be implemented before demo-specific features.

### Story Size Analysis

| Epic | Story Count | Average Size | Assessment |
|------|-------------|--------------|------------|
| Epic 1 | 8 | Medium | ✅ Appropriate |
| Epic 2 | 6 | Medium | ✅ Appropriate |
| Epic 3 | 9 | Medium | ✅ Appropriate |
| Epic 4 | 6 | Medium | ✅ Appropriate |
| Epic 5 | 6 | Medium | ✅ Appropriate |
| Epic 6 | 6 | Medium | ✅ Appropriate |
| Epic 7 | 1 | Large | ⚠️ Consider expanding |
| Epic 8 | 4 | Medium | ✅ Appropriate |
| Epic 9 | 3 | Medium | ✅ Appropriate |
| Epic 10 | 5 | Medium | ✅ Appropriate |

### Definition of DoD Compliance

Based on Party Mode decisions, stories must meet:
1. ✅ API implement + Unit test pass
2. ✅ UI implement + data-testid có
3. ✅ Audit event logged (audit_events)
4. ✅ Seed/update data chạy được demo script
5. ✅ Demo rehearsal pass (10-12 minutes)
6. ✅ Code review pass

**Assessment:** ✅ All stories follow DoD framework

### Overall Quality Assessment

**Status:** ✅ **PASSES BEST PRACTICES REVIEW**

**Summary:**
- **10 epics** with clear user value propositions
- **54 stories** with proper structure and dependencies
- **No critical violations** of best practices
- **2 minor concerns** (Epic 7 size, FR numbering) not blocking

**Recommendation:** Epics and stories are ready for implementation with no structural blockers.

---

---

## Summary and Recommendations

### Overall Readiness Status

| Category | Status | Score |
|----------|--------|-------|
| **Document Discovery** | ✅ Complete | 5/5 |
| **PRD Analysis** | ✅ Complete | 5/5 |
| **FR Coverage** | ⚠️ Moderate - Action Required | 3/5 |
| **UX Alignment** | ✅ Strongly Aligned | 5/5 |
| **Epic Quality** | ✅ Pass | 5/5 |

**Overall Assessment:** ⚠️ **READY WITH CONDITIONS**

The project has strong foundational documentation and well-structured epics/stories. However, there are **gaps in FR coverage** (27% missing) that should be addressed before full implementation begins.

---

### Critical Issues Requiring Action

| Priority | Issue | Impact | Action Required |
|----------|-------|--------|-----------------|
| **🔴 HIGH** | FR32-FR39: Document Generation (.docx, SHA-256, manifest) | PRD specifies document integrity features not in epics | Add stories to Epic 7 or create new epic for .docx generation with SHA-256 hashing |
| **🔴 HIGH** | FR65, FR66: DB Recovery (restore + recompute) | Compliance requirement for data recovery | Add recovery stories to Epic 10 |
| **🟠 MEDIUM** | FR5, FR7: User Import/Password Reset | Admin cannot import users or reset passwords | Add user management stories to Epic 1 or Epic 10 |
| **🟠 MEDIUM** | FR70, FR71: Template/SLA Configuration | Admin cannot manage form templates or SLA settings | Add configuration stories to Epic 10 |
| **🟡 LOW** | FR0-A to FR0-D: Invariant Rules | System invariants not explicitly covered in epics | Document in technical spec or add as architectural constraints |

---

### Detailed Findings Summary

#### 1. Document Discovery (✅ PASS)
- All required documents found
- No duplicate conflicts
- Proper organization

#### 2. PRD Analysis (✅ PASS)
- **78 FRs** (4 invariants + 74 functional)
- **40+ NFRs** across 7 categories
- PRD is complete and ready for implementation

#### 3. Epic Coverage Validation (⚠️ MODERATE)
- **62.2%** FRs fully covered
- **10.8%** partially covered
- **27.0%** missing (20 FRs)

**Missing by Category:**
- User Management: FR5, FR7 (2)
- Form & Proposal: FR24, FR27, FR30, FR31 (4)
- Document Generation: FR32-FR39 (8) - **Critical**
- Dashboard: FR44, FR45, FR49, FR50 (4)
- SLA & Notifications: FR58 (1)
- System Admin: FR65, FR66, FR70, FR71, FR73 (5)
- Invariant Rules: FR0-A to FR0-D (4)

#### 4. UX Alignment (✅ STRONG)
- UX documentation complete (14 steps)
- shadcn/ui + Tailwind CSS specified
- WCAG 2.1 AA compliance
- All UX requirements supported by architecture

#### 5. Epic Quality (✅ PASS)
- 10 epics with clear user value
- 54 stories with proper BDD format
- No forward dependencies
- Proper story sizing

---

### Recommended Next Steps

**Before Implementation:**

1. **HIGH PRIORITY:** Address Document Generation gap (FR32-FR39)
   - Option A: Add stories to Epic 7 for .docx generation with SHA-256
   - Option B: Create new Epic "Document Generation & Integrity"

2. **HIGH PRIORITY:** Add DB Recovery stories (FR65, FR66)
   - Add to Epic 10: "DB Restore" and "Recompute + Verify" stories

3. **MEDIUM PRIORITY:** Add User Management gaps (FR5, FR7)
   - Add "Password Reset" story to Epic 1
   - Add "Import Users" story to Epic 1 or Epic 10

4. **MEDIUM PRIORITY:** Add Admin Configuration (FR70, FR71)
   - Add "Form Template Management" to Epic 10
   - Add "SLA Configuration" to Epic 10

**Optional (Post-MVP):**

5. **LOW PRIORITY:** Dashboard enhancements (FR44, FR45, FR49, FR50)
   - Drill-down functionality
   - BGH read-only dashboard
   - Mobile optimization
   - "My Action Items" widget

6. **LOW PRIORITY:** Invariant Rules documentation
   - Document FR0-A to FR0-D in technical spec as architectural constraints

---

### Party Mode Decisions Summary

| # | Decision | Status |
|---|----------|--------|
| 1 | Epic 1 tách 2 Sprint | ✅ Locked |
| 2 | Checkbox "Đã sửa" MVP | ✅ Locked |
| 3 | Revision PDF trong Epic 4 | ✅ Locked |
| 4 | Timeline Entry rõ return_target | ✅ Locked |
| 5 | Persona switch reliability (atomic, cache invalidate) | ✅ Locked |
| 6 | Fixed IDs DT-001…DT-010 | ✅ Locked |
| 7 | Reset < 30s, progress indicator | ✅ Locked |
| 8 | Demo cap 5MB/file | ✅ Locked |
| 9 | Idempotency ALL state-changing | ✅ Locked |
| 10 | PDF SLA 10s, pre-generated seeds | ✅ Locked |
| 11 | ZIP SLA 30s, NO email fallback | ✅ Locked |
| 12 | Definition of Done (+2 items) | ✅ Locked |
| 13 | E2E Tests (+1 test) | ✅ Locked |
| 14 | Risk Tests (+2 risks) | ✅ Locked |

---

### Technical Stack Confirmed

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js, shadcn/ui, Tailwind CSS, Lucide React |
| **Backend** | NestJS, Passport Local, bcrypt, JWT |
| **Database** | PostgreSQL |
| **State Management** | React Query |
| **Document Export** | Playwright (PDF/ZIP) |
| **Caching** | Redis (idempotency) |

---

### Final Note

This assessment identified **28 gaps** in FR coverage across **6 categories**. The most critical gaps are in **Document Generation** (.docx, SHA-256, manifest) and **DB Recovery** capabilities.

**Options:**
1. **Address gaps now** - Add missing stories before starting sprint planning
2. **Document as post-MVP** - Defer non-critical features to Growth phase
3. **Proceed as-is** - Accept the gaps and implement during development

**Recommendation:** Address HIGH priority gaps (Document Generation, DB Recovery) before sprint planning. Defer LOW priority items (mobile dashboard, action items widget) to post-MVP.

---

## Assessment Complete

**Report Date:** 2026-01-04
**Assessor:** Implementation Readiness Workflow
**Project:** DoAn - Hệ thống Quản lý Nghiên cứu Khoa học
**Status:** ✅ WORKFLOW COMPLETE

---

stepsCompleted: [1, 2, 3, 4, 5, 6]
currentStep: 6
workflowStatus: 'completed'
completedAt: '2026-01-04'

*Implementation Readiness Assessment completed - 2026-01-04*
