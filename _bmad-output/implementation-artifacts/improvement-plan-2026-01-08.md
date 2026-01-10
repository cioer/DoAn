# Kế Hoạch Cải Thiện Project QLNCKH
**Ngày tạo:** 2026-01-08
**Người tạo:** Party Mode Agents Collective
**Project:** DoAn - Hệ thống Quản lý Nghiên cứu Khoa học

---

## 📊 Tổng Quan Trạng Thái Hiện Tại

| Metric | Trạng thái | Đánh giá |
|--------|------------|----------|
| Epics complete | 10/10 | ✅ Hoàn thành |
| Stories | 57 stories | ✅ Hoàn thành |
| Type safety violations | 27 → 0 | ✅ Cải thiện tốt |
| Test coverage | 0 → 130+ tests | ✅ Progress tốt |
| Architecture score | 7.5/10 | ⚠️ Cần cải thiện |
| UX score | 7/10 | ⚠️ Cần polish |
| Quality gate | 7/10 | ⚠️ Cần rigor hơn |

---

## 🎯 4 Giai Đoạn Cải Thiện

### PHASE 1: AUDIT & ANALYSIS (Quick Wins - Week 1)

```
Priority: HIGH │ Effort: 5 story points │ Goal: Hiểu rõ current state
```

| Task | Owner | Output | Deadline |
|------|-------|--------|----------|
| 1.1 Code health check | Dev | Type safety report | Day 2 |
| 1.2 Test coverage gap | TEA | Coverage matrix | Day 3 |
| 1.3 UI component inventory | UX | Component catalog | Day 4 |
| 1.4 Performance baseline | Architect | Baseline metrics | Day 5 |

### PHASE 2: CRITICAL IMPROVEMENTS (High Priority - Week 2-3)

```
Priority: HIGH │ Effort: 13 story points │ Goal: Fix foundation issues
```

| Task | Owner | Output | Deadline |
|------|-------|--------|----------|
| 2.1 Design token system | UX + Dev | tailwind.config.js + tokens | Week 2 |
| 2.2 Component standardization | Dev | Base component library | Week 2-3 |
| 2.3 State machine testing | TEA + Dev | Transition test matrix | Week 3 |
| 2.4 SLA edge case coverage | TEA + Dev | Boundary test suite | Week 3 |

### PHASE 3: POLISH & ENHANCEMENT (Medium Priority - Week 4)

```
Priority: MEDIUM │ Effort: 8 story points │ Goal: UX polish
```

| Task | Owner | Output | Deadline |
|------|-------|--------|----------|
| 3.1 Mobile UX audit | UX | Mobile improvements | Week 4 |
| 3.2 Micro-interactions | UX + Dev | Animation system | Week 4 |
| 3.3 User documentation | Tech Writer | User guides | Week 4 |
| 3.4 Accessibility audit | UX + Dev | A11y fixes | Week 4 |

### PHASE 4: VALIDATION (Quality Gate - Week 5)

```
Priority: HIGH │ Effort: 5 story points │ Goal: Verify quality
```

| Task | Owner | Output | Deadline |
|------|-------|--------|----------|
| 4.1 E2E expansion | TEA + Dev | Full journey tests | Week 5 |
| 4.2 User acceptance | PM + SM | UAT report | Week 5 |
| 4.3 Performance test | Architect | Load test report | Week 5 |

---

## 🔧 Technical Improvements Detail

### Design System Foundation

```typescript
// 1. Create design tokens
// File: web-apps/src/tokens/index.ts
export const tokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    secondary: {
      50: '#fff7ed',
      500: '#f97316',
      600: '#ea580c',
    },
    // ... semantic colors
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  }
};
```

### Component Standardization

```typescript
// 2. Create base components with variants
// File: web-apps/src/components/ui/Button.tsx
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'rounded-md font-medium transition-colors focus:outline-none focus:ring-2',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-white border border-gray-300 text-gray-700',
        destructive: 'bg-orange-600 hover:bg-orange-700 text-white',
        ghost: 'hover:bg-gray-100 text-gray-700',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      }
    }
  }
);

export const Button = ({ variant = 'primary', size = 'md', ...props }) => {
  return <button className={buttonVariants({ variant, size })} {...props} />;
};
```

---

## 🧪 Testing Strategy

### Critical Test Areas

| Area | Current | Target | Priority |
|------|---------|--------|----------|
| State transitions | Partial | 100% coverage | HIGH |
| Exception actions | E2E only | Unit + E2E | HIGH |
| RBAC guards | Basic | All roles | MEDIUM |
| SLA calculations | Basic | Edge cases | HIGH |
| Bulk operations | None | Load test | MEDIUM |

### State Machine Test Matrix

```typescript
// Test all valid transitions
const stateTransitions = [
  ['DRAFT', 'FACULTY_REVIEW'],
  ['FACULTY_REVIEW', 'SCHOOL_REVIEW'],
  ['FACULTY_REVIEW', 'CHANGES_REQUESTED'],
  ['SCHOOL_REVIEW', 'EVALUATION'],
  ['SCHOOL_REVIEW', 'CHANGES_REQUESTED'],
  ['EVALUATION', 'ACCEPTED'],
  ['ACCEPTED', 'HANDED_OVER'],
  // ... exception transitions
];

// Test all exception actions
const exceptionActions = [
  'CANCEL', 'WITHDRAW', 'REJECT', 'PAUSE', 'RESUME'
];
```

---

## 📱 UX Improvements

### Immediate Wins (Week 1-2)

1. **Color System**: Define accessible palette (WCAG AA compliant)
2. **Typography Scale**: Establish size/line-height/spacing system
3. **Spacing Tokens**: 4px base scale for consistency

### Short Term (Week 3-4)

1. **State Transitions**: Add animations between workflow states
2. **Feedback Loops**: Enhanced success/error visual feedback
3. **Empty States**: Design for zero-state scenarios

### Medium Term (Month 2)

1. **Mobile**: Responsive redesign for complex forms
2. **User Testing**: Observe real academic staff workflows
3. **Help System**: Contextual tooltips and guides

---

## 📈 Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Type safety violations | 0 | Maintain 0 | Ongoing |
| Test coverage | ~70% | 90%+ | Week 4 |
| Component reusability | Unknown | 80%+ | Week 3 |
| E2E pass rate | Unknown | 100% | Week 5 |
| Performance (p95) | Unknown | <2s | Week 5 |
| Accessibility score | Unknown | WCAG AA | Week 4 |

---

## 🚀 Execution Timeline

```
Week 1:     ████░░░░░░░░░░░░░░░  Audit & Analysis
Week 2-3:   ░░░░████████████░░░░  Critical Improvements
Week 4:     ░░░░░░░░░░░░░░░████░  Polish & Enhancement
Week 5:     ░░░░░░░░░░░░░░░░░░██  Validation
```

**Total Estimated Effort**: 26-31 story points ≈ 4-5 weeks với 1 full-stack dev

---

## 📋 Next Steps

1. ✅ Review plan with stakeholders
2. ⏳ Create stories for each phase
3. ⏳ Assign to sprint backlog
4. ⏳ Begin Phase 1 execution

---

*Generated by Party Mode Agents Collective*
*Bob (SM), Winston (Architect), Sally (UX), Murat (TEA), Barry (Quick Flow)*
