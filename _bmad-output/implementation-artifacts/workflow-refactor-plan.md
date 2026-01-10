# Workflow Service Refactoring Plan

## Executive Summary

**File**: [workflow.service.ts](../../qlnckh/apps/src/modules/workflow/workflow.service.ts)
**Current Size**: 2,303 lines
**Target Size**: ~600 lines (main orchestrator) + 4 specialized services (~400-500 lines each)
**Estimated Reduction**: -70% in main service, better separation of concerns
**Pattern**: Orchestrator + Specialized Services (similar to proposals.service.ts refactor)

---

## Current Structure Analysis

### Methods in workflow.service.ts (2,303 lines)

The service has **16 transition methods** following a consistent pattern:

#### Core Workflow Methods (Story 5.1-5.6)
1. `submitProposal` (152-273) - DRAFT → FACULTY_REVIEW
2. `approveFacultyReview` (295-414) - FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW
3. `returnFacultyReview` (439-580) - FACULTY_REVIEW → CHANGES_REQUESTED
4. `resubmitProposal` (602-771) - CHANGES_REQUESTED → return_target_state
5. `approveCouncilReview` (1779-1889) - OUTLINE_COUNCIL_REVIEW → APPROVED
6. `returnCouncilReview` (1905-2033) - OUTLINE_COUNCIL_REVIEW → CHANGES_REQUESTED
7. `acceptSchoolReview` (2048-2158) - SCHOOL_ACCEPTANCE_REVIEW → HANDOVER
8. `returnSchoolReview` (2174-2302) - SCHOOL_ACCEPTANCE_REVIEW → CHANGES_REQUESTED

#### Exception Actions (Epic 9)
9. `cancelProposal` (994-1113) - → CANCELLED
10. `withdrawProposal` (1130-1248) - → WITHDRAWN
11. `rejectProposal` (1266-1388) - → REJECTED
12. `pauseProposal` (1438-1593) - → PAUSED
13. `resumeProposal` (1622-1764) - PAUSED → pre-pause state

#### General Methods
14. `transitionState` (783-949) - Generic state transition (legacy, less used)
15. `getWorkflowLogs` (958-963) - Query logs
16. `clearIdempotencyKey` (971-973) - Cache management

### Helper Methods
- `canReject` (1394-1420) - RBAC helper for reject permissions
- `buildPauseComment` (1598-1605) - Comment builder

---

## Code Pattern Analysis

All 16 transition methods follow **IDENTICAL pattern**:

```typescript
async transitionMethod(proposalId, context, ...args): Promise<TransitionResult> {
  const toState = ProjectState.X;
  const action = WorkflowAction.Y;

  // 1. Atomic idempotency (IdempotencyService)
  const idempotencyResult = await this.idempotency.setIfAbsent(
    context.idempotencyKey || `action-${proposalId}`,
    async () => {
      // 2. Get proposal (Prisma)
      const proposal = await this.prisma.proposal.findUnique({...});

      // 3. Validation (WorkflowValidatorService)
      await this.validator.validateTransition(...);

      // 4. Calculate holder (HolderAssignmentService)
      const holder = this.holder.getHolderForState(...);

      // 5. Get user display name
      const actorDisplayName = await this.getUserDisplayName(context.userId);

      // 6. Calculate SLA dates (SlaService)
      const slaDeadline = await this.slaService.calculateDeadlineWithCutoff(...);

      // 7. Execute transaction (TransactionService)
      const result = await this.transaction.updateProposalWithLog({...});

      // 8. Build transition result
      const transitionResult: TransitionResult = {...};

      // 9. Audit logging (AuditHelperService - fire-and-forget)
      this.auditHelper.logWorkflowTransition(...).catch(...);

      // 10. Log
      this.logger.log(...);

      return transitionResult;
    },
  );

  return idempotencyResult.data;
}
```

**Dedicated pattern**: Each method averages **120 lines** of repetitive code!

---

## Existing Extracted Services (Phase 1)

The service already uses **5 extracted services** from previous refactors:

1. **WorkflowValidatorService** - Transition validation, RBAC checks
2. **IdempotencyService** - Atomic idempotency with Redis support
3. **TransactionService** - Transaction orchestration (update proposal + log)
4. **HolderAssignmentService** - Calculate holder_unit/holder_user for each state
5. **AuditHelperService** - Fire-and-forget audit logging with retry

**Observation**: Phase 1 was excellent. The remaining issue is **16 near-identical transition methods**.

---

## Proposed Architecture

### Service Split Strategy

#### 1. **WorkflowStateMachineService** (~450 lines)
**Responsibility**: Define transition rules and execute state transitions

```typescript
@Injectable()
export class WorkflowStateMachineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: WorkflowValidatorService,
    private readonly holder: HolderAssignmentService,
    private readonly sla: SlaService,
    private readonly transaction: TransactionService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  // Generic transition executor - replaces 16 repetitive methods
  async executeTransition(
    proposalId: string,
    toState: ProjectState,
    action: WorkflowAction,
    context: TransitionContext,
    options?: {
      reasonCode?: string;
      comment?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<TransitionResult> {
    // Unified logic for all transitions
  }

  // Special cases
  async executeReturnTransition(
    proposalId: string,
    toState: ProjectState,
    returnTargetState: ProjectState,
    returnTargetHolderUnit: string,
    context: TransitionContext,
    options?: { reason?: string; reasonCode?: string; reasonSections?: string[]; }
  ): Promise<TransitionResult> {
    // Handle RETURN action with return target storage
  }

  async executeResubmitTransition(
    proposalId: string,
    checkedSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Fetch latest RETURN log and transition back
  }
}
```

**Benefits**:
- Eliminates 1,800+ lines of repetitive code
- Single source of truth for transition logic
- Easier to test and maintain

---

#### 2. **WorkflowActionsService** (~350 lines)
**Responsibility**: Business-specific action methods (semantic API)

```typescript
@Injectable()
export class WorkflowActionsService {
  constructor(
    private readonly stateMachine: WorkflowStateMachineService,
  ) {}

  // Core workflow actions
  async submit(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.FACULTY_REVIEW,
      WorkflowAction.SUBMIT,
      context,
      { slaDays: 3, slaCutoffHour: 17 },
    );
  }

  async approveFaculty(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.SCHOOL_SELECTION_REVIEW,
      WorkflowAction.APPROVE,
      context,
      { slaDays: 3, slaCutoffHour: 17 },
    );
  }

  async returnFaculty(
    proposalId: string,
    reason: string,
    reasonCode: string,
    reasonSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeReturnTransition(
      proposalId,
      ProjectState.CHANGES_REQUESTED,
      ProjectState.FACULTY_REVIEW,
      context.userFacultyId,
      context,
      { reason, reasonCode, reasonSections },
    );
  }

  async approveCouncil(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.APPROVED,
      WorkflowAction.APPROVE,
      context,
    );
  }

  async returnCouncil(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeReturnTransition(
      proposalId,
      ProjectState.CHANGES_REQUESTED,
      ProjectState.OUTLINE_COUNCIL_REVIEW,
      // councilId from proposal
      context,
      { reason },
    );
  }

  async acceptSchool(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.HANDOVER,
      WorkflowAction.ACCEPT,
      context,
    );
  }

  async returnSchool(
    proposalId: string,
    reason: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeReturnTransition(
      proposalId,
      ProjectState.CHANGES_REQUESTED,
      ProjectState.SCHOOL_ACCEPTANCE_REVIEW,
      'PHONG_KHCN',
      context,
      { reason },
    );
  }

  async resubmit(
    proposalId: string,
    checkedSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeResubmitTransition(
      proposalId,
      checkedSections,
      context,
    );
  }

  // Exception actions
  async cancel(proposalId: string, reason?: string, context: TransitionContext): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.CANCELLED,
      WorkflowAction.CANCEL,
      context,
      { comment: reason || 'Hủy bỏ đề tài' },
    );
  }

  async withdraw(proposalId: string, reason?: string, context: TransitionContext): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.WITHDRAWN,
      WorkflowAction.WITHDRAW,
      context,
      { comment: reason || 'Rút hồ sơ đề tài' },
    );
  }

  async reject(
    proposalId: string,
    reasonCode: RejectReasonCode,
    comment: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.REJECTED,
      WorkflowAction.REJECT,
      context,
      { reasonCode, comment },
    );
  }

  async pause(
    proposalId: string,
    reason: string,
    expectedResumeAt?: Date,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.stateMachine.executeTransition(
      proposalId,
      ProjectState.PAUSED,
      WorkflowAction.PAUSE,
      context,
      {
        comment: this.buildPauseComment(reason, expectedResumeAt),
        metadata: {
          pauseReason: reason,
          expectedResumeAt,
        },
      },
    );
  }

  async resume(
    proposalId: string,
    comment?: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    // Special logic to restore pre-pause state
    return this.stateMachine.executeResumeTransition(
      proposalId,
      comment || 'Tiếp tục đề tài sau tạm dừng',
      context,
    );
  }

  private buildPauseComment(reason: string, expectedResumeAt?: Date): string {
    let comment = `Tạm dừng: ${reason}`;
    if (expectedResumeAt) {
      const formatted = expectedResumeAt.toLocaleDateString('vi-VN');
      comment += `. Dự kiến tiếp tục: ${formatted}`;
    }
    return comment;
  }
}
```

**Benefits**:
- Clean, semantic API
- Each method is ~10 lines (vs 120 lines before)
- Delegates complexity to `WorkflowStateMachineService`

---

#### 3. **WorkflowQueryService** (~300 lines)
**Responsibility**: Query workflow logs, history, timeline

```typescript
@Injectable()
export class WorkflowQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkflowLogs(proposalId: string): Promise<WorkflowLog[]> {
    return this.prisma.workflowLog.findMany({
      where: { proposalId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getLatestReturnLog(proposalId: string): Promise<WorkflowLog | null> {
    return this.prisma.workflowLog.findFirst({
      where: {
        proposalId,
        toState: ProjectState.CHANGES_REQUESTED,
        action: WorkflowAction.RETURN,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getWorkflowHistory(proposalId: string, options?: {
    limit?: number;
    offset?: number;
    actions?: WorkflowAction[];
  }): Promise<{ logs: WorkflowLog[]; total: number }> {
    // Complex query with filters
  }

  async getProposalTimeline(proposalId: string): Promise<TimelineEvent[]> {
    // Enriched timeline with state transitions
  }
}
```

**Benefits**:
- Separates read operations from write operations
- Reusable query methods
- Easier to optimize queries independently

---

#### 4. **WorkflowOrchestrationService** (~250 lines)
**Responsibility**: Complex multi-step workflows (optional, for future)

```typescript
@Injectable()
export class WorkflowOrchestrationService {
  constructor(
    private readonly actions: WorkflowActionsService,
    private readonly queries: WorkflowQueryService,
  ) {}

  // Future: Auto-approve after timeout
  async autoApproveAfterTimeout(proposalId: string): Promise<void> {
    // Check SLA, auto-approve if timeout
  }

  // Future: Bulk operations
  async bulkApprove(proposalIds: string[], context: TransitionContext): Promise<void> {
    // Execute multiple transitions in parallel
  }

  // Future: Conditional workflows
  async conditionalApprove(proposalId: string, conditions: Condition[]): Promise<void> {
    // Check conditions, route to appropriate state
  }
}
```

**Benefits**:
- Handles complex workflows
- Can be extended without touching core services
- Future-ready for advanced features

---

#### 5. **WorkflowService** (Main Orchestrator - ~400 lines)
**Responsibility**: Public API, coordinates services

```typescript
@Injectable()
export class WorkflowService {
  constructor(
    private readonly actions: WorkflowActionsService,
    private readonly queries: WorkflowQueryService,
    private readonly orchestration: WorkflowOrchestrationService,
    private readonly idempotency: IdempotencyService,
  ) {}

  // Core workflow methods - delegate to actions service
  async submitProposal(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.submit(proposalId, context);
  }

  async approveFacultyReview(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.approveFaculty(proposalId, context);
  }

  async returnFacultyReview(
    proposalId: string,
    reason: string,
    reasonCode: string,
    reasonSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.returnFaculty(proposalId, reason, reasonCode, reasonSections, context);
  }

  async resubmitProposal(
    proposalId: string,
    checkedSections: string[],
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.resubmit(proposalId, checkedSections, context);
  }

  async approveCouncilReview(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.approveCouncil(proposalId, context);
  }

  async returnCouncilReview(proposalId: string, reason: string, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.returnCouncil(proposalId, reason, context);
  }

  async acceptSchoolReview(proposalId: string, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.acceptSchool(proposalId, context);
  }

  async returnSchoolReview(proposalId: string, reason: string, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.returnSchool(proposalId, reason, context);
  }

  // Exception actions
  async cancelProposal(proposalId: string, reason: string | undefined, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.cancel(proposalId, reason, context);
  }

  async withdrawProposal(proposalId: string, reason: string | undefined, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.withdraw(proposalId, reason, context);
  }

  async rejectProposal(
    proposalId: string,
    reasonCode: RejectReasonCode,
    comment: string,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.reject(proposalId, reasonCode, comment, context);
  }

  async pauseProposal(
    proposalId: string,
    reason: string,
    expectedResumeAt: Date | undefined,
    context: TransitionContext,
  ): Promise<TransitionResult> {
    return this.actions.pause(proposalId, reason, expectedResumeAt, context);
  }

  async resumeProposal(proposalId: string, comment: string | undefined, context: TransitionContext): Promise<TransitionResult> {
    return this.actions.resume(proposalId, comment, context);
  }

  // Query methods - delegate to query service
  async getWorkflowLogs(proposalId: string): Promise<WorkflowLog[]> {
    return this.queries.getWorkflowLogs(proposalId);
  }

  async getWorkflowHistory(proposalId: string, options?: {
    limit?: number;
    offset?: number;
    actions?: WorkflowAction[];
  }): Promise<{ logs: WorkflowLog[]; total: number }> {
    return this.queries.getWorkflowHistory(proposalId, options);
  }

  async getProposalTimeline(proposalId: string): Promise<TimelineEvent[]> {
    return this.queries.getProposalTimeline(proposalId);
  }

  // Utility methods
  clearIdempotencyKey(key: string): void {
    this.idempotency.clear(key);
  }
}
```

**Benefits**:
- Thin orchestrator (~400 lines vs 2,303 lines = -83%)
- Maintains backward compatibility (same public API)
- Delegates to specialized services
- Easy to test

---

## Implementation Checklist

### Phase 1: Create New Services
- [ ] Create `workflow-state-machine.service.ts` (~450 lines)
  - [ ] Implement `executeTransition` (generic transition)
  - [ ] Implement `executeReturnTransition` (with return target)
  - [ ] Implement `executeResubmitTransition` (fetch RETURN log)
  - [ ] Implement `executeResumeTransition` (restore pre-pause state)

- [ ] Create `workflow-actions.service.ts` (~350 lines)
  - [ ] Implement 13 action methods (submit, approve*, return*, accept, resubmit, cancel, withdraw, reject, pause, resume)
  - [ ] Move `buildPauseComment` helper
  - [ ] Keep semantic API (method names unchanged)

- [ ] Create `workflow-query.service.ts` (~300 lines)
  - [ ] Move `getWorkflowLogs` from main service
  - [ ] Add `getLatestReturnLog` method
  - [ ] Add `getWorkflowHistory` method (with filters)
  - [ ] Add `getProposalTimeline` method

- [ ] Create `workflow-orchestration.service.ts` (~250 lines, optional)
  - [ ] Stub for future multi-step workflows
  - [ ] Can be empty initially

### Phase 2: Refactor Main Service
- [ ] Update `workflow.service.ts` (~400 lines)
  - [ ] Remove all transition method implementations (1,800+ lines)
  - [ ] Add delegates to `WorkflowActionsService`
  - [ ] Add delegates to `WorkflowQueryService`
  - [ ] Keep public API unchanged (backward compatibility)
  - [ ] Update constructor to inject new services
  - [ ] Remove `canReject` helper (move to WorkflowValidatorService if needed)
  - [ ] Keep `clearIdempotencyKey` utility method

- [ ] Update `workflow.module.ts`
  - [ ] Add 4 new services to providers
  - [ ] Export new services if needed
  - [ ] Verify dependency injection graph

### Phase 3: Update Tests
- [ ] Update `workflow.service.spec.ts`
  - [ ] Create mocks for 4 new services
  - [ ] Update test setup to inject mocks
  - [ ] Verify delegation (e.g., `expect(actions.submit).toHaveBeenCalledWith(...)`)
  - [ ] Keep test coverage >90%

- [ ] Run tests
  ```bash
  npm test -- workflow.service.spec.ts
  ```

- [ ] Verify all tests pass (124/124 passing)

### Phase 4: Verification
- [ ] Run full test suite
  ```bash
  npm test
  ```
  - [ ] All workflow tests pass (124/124)
  - [ ] All integration tests pass
  - [ ] No regressions in other modules

- [ ] Manual API testing
  - [ ] Test submit workflow
  - [ ] Test approve/return workflows
  - [ ] Test exception actions (cancel, withdraw, reject, pause, resume)
  - [ ] Test resubmit flow

### Phase 5: Documentation
- [ ] Update inline comments
- [ ] Update README if needed
- [ ] Document new service architecture

---

## Estimated Impact

### Code Reduction
| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| workflow.service.ts | 2,303 lines | ~400 lines | -83% |
| New services | 0 | 1,350 lines | +1,350 lines |
| **Total** | 2,303 lines | 1,750 lines | **-24%** |

**Key Benefit**: Main service reduced from **2,303 to 400 lines** (-83%), while maintaining same functionality and better separation of concerns.

### Maintainability Improvements
1. **Single Responsibility**: Each service has one clear purpose
2. **Testability**: Smaller services are easier to mock and test
3. **Reusability**: `WorkflowStateMachineService` can be reused for new workflow types
4. **Extensibility**: Add new actions to `WorkflowActionsService` without touching orchestrator
5. **Readability**: 10-line methods vs 120-line methods

### Performance Impact
- **No degradation**: Same number of DB queries, same logic flow
- **Potential improvement**: Better caching opportunities in `WorkflowQueryService`
- **Idempotency**: Still uses `IdempotencyService` (no change)

---

## Risk Assessment

### Low Risk ✅
- **Backward compatibility**: Public API unchanged
- **Test coverage**: 124/124 tests passing, will update mocks
- **Pattern proven**: Same pattern used successfully for proposals.service.ts refactor

### Medium Risk ⚠️
- **Service dependencies**: Need to ensure all dependencies are properly injected
- **Integration tests**: May need to update integration test mocks
- **Documentation**: Need to document new service architecture

### Mitigation Strategies
1. **Incremental rollout**: Create branch, test thoroughly before merge
2. **Comprehensive testing**: Unit tests + integration tests + manual API testing
3. **Feature flags** (optional): Can add feature flags if gradual rollout needed
4. **Rollback plan**: Keep branch backup, can revert if issues arise

---

## Success Criteria

1. ✅ All 124 workflow tests passing
2. ✅ Main service reduced to ~400 lines (-83%)
3. ✅ No breaking changes to public API
4. ✅ Test coverage maintained >90%
5. ✅ Integration tests passing
6. ✅ Manual API verification successful

---

## Next Steps

1. **Get user approval** for this plan
2. **Create feature branch**: `refactor/workflow-service-split`
3. **Implement Phase 1**: Create 4 new services
4. **Implement Phase 2**: Refactor main service
5. **Implement Phase 3**: Update tests
6. **Implement Phase 4**: Verification
7. **Create PR** for code review
8. **Merge to main** after approval

---

## References

- Original proposals refactor: [proposals.service.ts refactor summary](../phase1-task1.6-test-report.md)
- Existing extracted services: WorkflowValidatorService, IdempotencyService, TransactionService, HolderAssignmentService, AuditHelperService
- Prisma schema: [schema.prisma](../../qlnckh/prisma/schema.prisma)

---

**Author**: Claude (BMAD Agent)
**Date**: 2025-01-10
**Status**: Ready for implementation (pending user approval)
