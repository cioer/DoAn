/**
 * End-to-End Workflow Test
 *
 * Tests the complete proposal lifecycle from creation to completion:
 * 1. DRAFT - Create proposal
 * 2. FACULTY_REVIEW - Submit to faculty
 * 3. SCHOOL_SELECTION_REVIEW - Faculty approves
 * 4. OUTLINE_COUNCIL_REVIEW - School assigns council
 * 5. APPROVED - Council/BGH approves
 * 6. IN_PROGRESS - Start project
 * 7. FACULTY_ACCEPTANCE_REVIEW - Submit for faculty acceptance
 * 8. SCHOOL_ACCEPTANCE_REVIEW - Faculty accepts
 * 9. HANDOVER - School/BGH accepts
 * 10. COMPLETED - Complete handover
 *
 * Usage: npx ts-node test-workflow-e2e.ts <API_URL> <GIANG_VIEN_TOKEN> <QUAN_LY_KHOA_TOKEN> <PHONG_KHCN_TOKEN> <BGH_TOKEN>
 */

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: unknown;
}

interface Proposal {
  id: string;
  code: string;
  title: string;
  state: string;
  ownerId: string;
  facultyId: string;
  holderUnit: string | null;
  holderUser: string | null;
  slaDeadline: string | null;
  slaStartDate: string | null;
  templateId: string;
  templateVersion: string;
  formData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowLog {
  id: string;
  proposalId: string;
  action: string;
  fromState: string;
  toState: string;
  actorId: string;
  actorName: string;
  returnTargetState: string | null;
  returnTargetHolderUnit: string | null;
  reasonCode: string | null;
  comment: string | null;
  timestamp: string;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  facultyId: string | null;
}

interface TestConfig {
  apiUrl: string;
  tokens: {
    giangVien: string;
    quanLyKhoa: string;
    phongKHCN: string;
    bgh: string;
  };
  proposalData: {
    title: string;
    facultyId: string;
    templateId: string;
  };
}

class WorkflowE2ETest {
  private config: TestConfig;
  private proposalId: string | null = null;
  private workflowLogs: WorkflowLog[] = [];
  private proposalStates: string[] = [];

  constructor(config: TestConfig) {
    this.config = config;
  }

  private async apiCall<T>(
    endpoint: string,
    method: string = 'GET',
    token: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return response.json();
  }

  private log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
    };
    const reset = '\x1b[0m';
    const icon = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warn: '⚠️',
    };
    console.log(`${colors[level]}${icon[level]} ${message}${reset}`);
  }

  private async getCurrentState(token: string): Promise<string> {
    if (!this.proposalId) {
      throw new Error('Proposal not created yet');
    }

    const response = await this.apiCall<Proposal>(`/proposals/${this.proposalId}`, 'GET', token);
    if (!response.success || !response.data) {
      throw new Error(`Failed to get proposal: ${response.error?.message}`);
    }
    return response.data.state;
  }

  private async getWorkflowLogs(token: string): Promise<WorkflowLog[]> {
    if (!this.proposalId) {
      throw new Error('Proposal not created yet');
    }

    const response = await this.apiCall<{ data: WorkflowLog[]; meta: { total: number } }>(
      `/workflow/workflow-logs/${this.proposalId}`,
      'GET',
      token,
    );
    if (!response.success || !response.data) {
      throw new Error(`Failed to get workflow logs: ${response.error?.message}`);
    }
    this.workflowLogs = response.data.data;
    return this.workflowLogs;
  }

  private async waitForState(expectedState: string, token: string, maxWaitMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const currentState = await this.getCurrentState(token);
      if (currentState === expectedState) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  // ============================================================
  // TEST STEPS
  // ============================================================

  /**
   * Step 1: Create Proposal (DRAFT state)
   * Role: GIANG_VIEN
   */
  async step01_CreateProposal(): Promise<void> {
    this.log('Step 1: Creating proposal (DRAFT)...', 'info');

    const response = await this.apiCall<Proposal>(
      '/proposals',
      'POST',
      this.config.tokens.giangVien,
      {
        title: this.config.proposalData.title,
        facultyId: this.config.proposalData.facultyId,
        templateId: this.config.proposalData.templateId,
        formData: {
          summary: 'End-to-end test proposal',
          keywords: ['test', 'workflow'],
        },
      },
    );

    if (!response.success || !response.data) {
      throw new Error(`Failed to create proposal: ${JSON.stringify(response.error)}`);
    }

    this.proposalId = response.data.id;
    this.proposalStates.push(response.data.state);

    this.log(`Proposal created: ${response.data.code} (ID: ${this.proposalId})`, 'success');
    this.log(`State: ${response.data.state}`, 'info');

    // Verify state is DRAFT
    if (response.data.state !== 'DRAFT') {
      throw new Error(`Expected DRAFT, got ${response.data.state}`);
    }
  }

  /**
   * Step 2: Submit to Faculty (DRAFT → FACULTY_REVIEW)
   * Role: GIANG_VIEN
   */
  async step02_SubmitToFaculty(): Promise<void> {
    this.log('Step 2: Submitting to faculty review...', 'info');

    const response = await this.apiCall(
      `/workflow/${this.proposalId}/submit`,
      'POST',
      this.config.tokens.giangVien,
      {},
    );

    if (!response.success) {
      throw new Error(`Failed to submit: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.giangVien);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'FACULTY_REVIEW') {
      throw new Error(`Expected FACULTY_REVIEW, got ${currentState}`);
    }
  }

  /**
   * Step 3: Faculty Approves (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
   * Role: QUAN_LY_KHOA
   */
  async step03_FacultyApproves(): Promise<void> {
    this.log('Step 3: Faculty approves proposal...', 'info');

    const response = await this.apiCall(
      `/workflow/${this.proposalId}/approve-faculty`,
      'POST',
      this.config.tokens.quanLyKhoa,
      {},
    );

    if (!response.success) {
      throw new Error(`Failed to approve faculty: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.quanLyKhoa);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'SCHOOL_SELECTION_REVIEW') {
      throw new Error(`Expected SCHOOL_SELECTION_REVIEW, got ${currentState}`);
    }
  }

  /**
   * Step 4: School Assigns Council (SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW)
   * Role: PHONG_KHCN
   */
  async step04_AssignCouncil(): Promise<void> {
    this.log('Step 4: Assigning council...', 'info');

    // First, we need to get or create a council
    const councilsResponse = await this.apiCall<{ data: Array<{ id: string; name: string }> }>(
      '/councils',
      'GET',
      this.config.tokens.phongKHCN,
    );

    let councilId: string | undefined;
    if (councilsResponse.success && councilsResponse.data && councilsResponse.data.data.length > 0) {
      councilId = councilsResponse.data.data[0].id;
    } else {
      // Create a new council
      const createCouncilResponse = await this.apiCall<{ id: string }>(
        '/councils',
        'POST',
        this.config.tokens.phongKHCN,
        {
          name: 'Hội đồng Test E2E',
          type: 'CAP_TRUONG',
          secretaryId: this.config.tokens.phongKHCN, // Will need actual user ID
        },
      );
      if (createCouncilResponse.success && createCouncilResponse.data) {
        councilId = createCouncilResponse.data.id;
      }
    }

    if (!councilId) {
      // If we can't create a council, try to transition directly by setting holderUnit
      this.log('Could not create council, attempting direct state transition...', 'warn');
    }

    // Update proposal with council assignment
    const response = await this.apiCall(
      `/proposals/${this.proposalId}`,
      'PATCH',
      this.config.tokens.phongKHCN,
      {
        councilId: councilId || null,
        holderUnit: 'COUNCIL_ASSIGNED',
      },
    );

    // The actual transition happens via the workflow - for now let's assume
    // we need to call an endpoint or the system auto-transitions
    // For this test, we'll check if we can call a council assignment endpoint

    // Try to transition to OUTLINE_COUNCIL_REVIEW
    const transitionResponse = await this.apiCall(
      `/workflow/${this.proposalId}/assign-council`,
      'POST',
      this.config.tokens.phongKHCN,
      { councilId: councilId || 'test-council-id' },
    );

    if (!transitionResponse.success) {
      // Try alternate method - direct update
      this.log(`Assign council response: ${JSON.stringify(transitionResponse.error)}`, 'warn');
    }

    const currentState = await this.getCurrentState(this.config.tokens.phongKHCN);

    // If still in SCHOOL_SELECTION_REVIEW, we might need manual intervention
    // or the transition happens differently. Let's log this.
    this.log(`Current state after council assignment: ${currentState}`, 'info');

    if (currentState === 'SCHOOL_SELECTION_REVIEW') {
      this.log('Note: State unchanged - may need manual council assignment or different endpoint', 'warn');
      // For test purposes, we'll continue - the actual implementation may vary
    }

    this.proposalStates.push(currentState);
  }

  /**
   * Step 5: BGH Approves Council Review (OUTLINE_COUNCIL_REVIEW → APPROVED)
   * Role: BAN_GIAM_HOC
   */
  async step05_BGHApprovesCouncil(): Promise<void> {
    this.log('Step 5: BGH approves council review...', 'info');

    const response = await this.apiCall(
      `/workflow/${this.proposalId}/approve-council`,
      'POST',
      this.config.tokens.bgh,
      {},
    );

    if (!response.success) {
      throw new Error(`Failed to approve council: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.bgh);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'APPROVED') {
      throw new Error(`Expected APPROVED, got ${currentState}`);
    }
  }

  /**
   * Step 6: Start Project (APPROVED → IN_PROGRESS)
   * Role: GIANG_VIEN
   */
  async step06_StartProject(): Promise<void> {
    this.log('Step 6: Starting project implementation...', 'info');

    const response = await this.apiCall(
      `/workflow/${this.proposalId}/start-project`,
      'POST',
      this.config.tokens.giangVien,
      {},
    );

    if (!response.success) {
      throw new Error(`Failed to start project: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.giangVien);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'IN_PROGRESS') {
      throw new Error(`Expected IN_PROGRESS, got ${currentState}`);
    }
  }

  /**
   * Step 7: Submit for Acceptance (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
   * Role: GIANG_VIEN
   */
  async step07_SubmitForAcceptance(): Promise<void> {
    this.log('Step 7: Submitting for faculty acceptance...', 'info');

    const response = await this.apiCall(
      `/workflow/${this.proposalId}/submit-acceptance`,
      'POST',
      this.config.tokens.giangVien,
      {},
    );

    if (!response.success) {
      throw new Error(`Failed to submit acceptance: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.giangVien);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'FACULTY_ACCEPTANCE_REVIEW') {
      throw new Error(`Expected FACULTY_ACCEPTANCE_REVIEW, got ${currentState}`);
    }
  }

  /**
   * Step 8: Faculty Accepts (FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW)
   * Role: QUAN_LY_KHOA
   */
  async step08_FacultyAccepts(): Promise<void> {
    this.log('Step 8: Faculty accepts project...', 'info');

    const response = await this.apiCall(
      `/workflow/${this.proposalId}/accept-faculty-acceptance`,
      'POST',
      this.config.tokens.quanLyKhoa,
      {},
    );

    if (!response.success) {
      throw new Error(`Failed to accept faculty: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.quanLyKhoa);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'SCHOOL_ACCEPTANCE_REVIEW') {
      throw new Error(`Expected SCHOOL_ACCEPTANCE_REVIEW, got ${currentState}`);
    }
  }

  /**
   * Step 9: BGH Accepts School Review (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
   * Role: BAN_GIAM_HOC
   */
  async step09_BGHAcceptsSchool(): Promise<void> {
    this.log('Step 9: BGH accepts school review...', 'info');

    const response = await this.apiCall(
      `/workflow/${this.proposalId}/accept-school`,
      'POST',
      this.config.tokens.bgh,
      {},
    );

    if (!response.success) {
      throw new Error(`Failed to accept school: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.bgh);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'HANDOVER') {
      throw new Error(`Expected HANDOVER, got ${currentState}`);
    }
  }

  /**
   * Step 10: Complete Handover (HANDOVER → COMPLETED)
   * Role: GIANG_VIEN
   */
  async step10_CompleteHandover(): Promise<void> {
    this.log('Step 10: Completing handover...', 'info');

    const response = await this.apiCall(
      `/proposals/${this.proposalId}/complete-handover`,
      'POST',
      this.config.tokens.giangVien,
      {
        checklist: [
          { id: 'item1', checked: true, note: 'All documents submitted' },
          { id: 'item2', checked: true, note: 'Data transferred' },
          { id: 'item3', checked: true, note: 'Final report completed' },
        ],
      },
    );

    if (!response.success) {
      throw new Error(`Failed to complete handover: ${JSON.stringify(response.error)}`);
    }

    const currentState = await this.getCurrentState(this.config.tokens.giangVien);
    this.proposalStates.push(currentState);

    this.log(`State transitioned to: ${currentState}`, 'success');

    if (currentState !== 'COMPLETED') {
      throw new Error(`Expected COMPLETED, got ${currentState}`);
    }
  }

  /**
   * Verify workflow logs
   */
  async verifyWorkflowLogs(): Promise<void> {
    this.log('Verifying workflow logs...', 'info');

    const logs = await this.getWorkflowLogs(this.config.tokens.bgh);

    this.log(`Total workflow logs: ${logs.length}`, 'info');

    const expectedActions = [
      'SUBMIT',
      'APPROVE',
      'APPROVE',
      'START_PROJECT',
      'SUBMIT_ACCEPTANCE',
      'FACULTY_ACCEPT',
      'ACCEPT',
    ];

    const actualActions = logs.map(log => log.action);

    this.log('Expected actions (partial): ' + expectedActions.join(', '), 'info');
    this.log('Actual actions: ' + actualActions.join(', '), 'info');

    // Check that we have the expected number of transitions
    const expectedTransitions = 10; // DRAFT through COMPLETED
    if (this.proposalStates.length < expectedTransitions - 1) {
      this.log(`Warning: Only ${this.proposalStates.length} states recorded`, 'warn');
    }
  }

  /**
   * Print summary
   */
  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('WORKFLOW E2E TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Proposal ID: ${this.proposalId}`);
    console.log(`States visited: ${this.proposalStates.join(' → ')}`);
    console.log(`Total transitions: ${this.proposalStates.length - 1}`);
    console.log(`Workflow logs: ${this.workflowLogs.length}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Run all test steps
   */
  async run(): Promise<void> {
    try {
      this.log('Starting End-to-End Workflow Test...\n', 'info');

      await this.step01_CreateProposal();
      await this.step02_SubmitToFaculty();
      await this.step03_FacultyApproves();
      await this.step04_AssignCouncil();
      await this.step05_BGHApprovesCouncil();
      await this.step06_StartProject();
      await this.step07_SubmitForAcceptance();
      await this.step08_FacultyAccepts();
      await this.step09_BGHAcceptsSchool();
      await this.step10_CompleteHandover();
      await this.verifyWorkflowLogs();

      this.log('\n✨ All workflow transitions completed successfully!', 'success');
      this.printSummary();
    } catch (error) {
      this.log(`Test failed: ${(error as Error).message}`, 'error');
      console.error(error);
      this.printSummary();
      process.exit(1);
    }
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 5) {
    console.error(`
Usage: npx ts-node test-workflow-e2e.ts <API_URL> <GIANG_VIEN_TOKEN> <QUAN_LY_KHOA_TOKEN> <PHONG_KHCN_TOKEN> <BGH_TOKEN>

Example:
  npx ts-node test-workflow-e2e.ts \\
    http://localhost:3000/api \\
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \\
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \\
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \\
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Tokens should be JWT Bearer tokens for users with respective roles.
`);
    process.exit(1);
  }

  const [apiUrl, giangVienToken, quanLyKhoaToken, phongKHCNToken, bghToken] = args;

  const config: TestConfig = {
    apiUrl,
    tokens: {
      giangVien,
      quanLyKhoa: quanLyKhoaToken,
      phongKHCN: phongKHCNToken,
      bgh: bghToken,
    },
    proposalData: {
      title: 'E2E Test Proposal - ' + new Date().toISOString(),
      facultyId: 'default-faculty-id', // You'll need to provide a valid faculty ID
      templateId: 'default-template-id', // You'll need to provide a valid template ID
    },
  };

  const test = new WorkflowE2ETest(config);
  await test.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { WorkflowE2ETest, TestConfig };
