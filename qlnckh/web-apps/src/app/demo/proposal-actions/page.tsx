/**
 * Proposal Actions Demo Page (Story 4.1)
 *
 * Showcases the Faculty Approve Action:
 * - AC1: "Duyệt hồ sơ" button for QUAN_LY_KHOA/THU_KY_KHOA
 * - AC2: Button hidden for wrong roles/states
 * - AC3: State transition FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW
 * - AC4: Workflow log entry
 * - AC5: Idempotency key handling
 */

'use client';

import { useState } from 'react';
import { ProposalActions } from '@/components/workflow/ProposalActions';
import { SLABadge } from '@/components/workflow/SLABadge';

// Mock users for demo
const MOCK_USERS = {
  quanLyKhoa: {
    id: 'user-qlk',
    role: 'QUAN_LY_KHOA',
    facultyId: 'faculty-cntt',
  },
  thuKyKhoa: {
    id: 'user-tkk',
    role: 'THU_KY_KHOA',
    facultyId: 'faculty-cntt',
  },
  giangVien: {
    id: 'user-gv',
    role: 'GIANG_VIEN',
    facultyId: 'faculty-cntt',
  },
  phongKHCN: {
    id: 'user-pkhcn',
    role: 'PHONG_KHCN',
    facultyId: null,
  },
};

// Mock proposals
const MOCK_PROPOSALS = {
  facultyReview: {
    id: 'proposal-001',
    code: 'DT-2024-001',
    title: 'Nghiên cứu ứng dụng AI trong giáo dục',
    state: 'FACULTY_REVIEW',
    slaDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
  },
  draft: {
    id: 'proposal-002',
    code: 'DT-2024-002',
    title: 'Phát triển Blockchain',
    state: 'DRAFT',
    slaDeadline: null,
  },
  schoolSelection: {
    id: 'proposal-003',
    code: 'DT-2024-003',
    title: 'Mobile App Development',
    state: 'SCHOOL_SELECTION_REVIEW',
    slaDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

export default function ProposalActionsDemoPage() {
  const [currentUser, setCurrentUser] = useState(MOCK_USERS.giangVien);
  const [selectedProposal, setSelectedProposal] = useState(MOCK_PROPOSALS.facultyReview);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const handleUserChange = (userKey: string) => {
    setCurrentUser(MOCK_USERS[userKey as keyof typeof MOCK_USERS]);
    setActionLog((prev) => [...prev, `Switched to ${userKey}`]);
  };

  const handleProposalChange = (proposalKey: string) => {
    setSelectedProposal(MOCK_PROPOSALS[proposalKey as keyof typeof MOCK_PROPOSALS]);
    setActionLog((prev) => [...prev, `Selected proposal: ${proposalKey}`]);
  };

  const handleActionSuccess = () => {
    setActionLog((prev) => [...prev, '✅ Approve action succeeded! State transitioned.']);
  };

  const handleActionError = (error: { code: string; message: string }) => {
    setActionLog((prev) => [...prev, `❌ Error: ${error.code} - ${error.message}`]);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Proposal Actions Demo (Story 4.1)</h1>
      <p className="text-muted-foreground mb-8">
        Faculty Approve Action - Duyệt hồ sơ ở cấp Khoa
      </p>

      {/* User Selection */}
      <section className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">1. Chọn vai trò (Role)</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(MOCK_USERS).map(([key, user]) => (
            <button
              key={key}
              onClick={() => handleUserChange(key)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                currentUser.id === user.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {user.role}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Current role: <strong>{currentUser.role}</strong>
        </p>
      </section>

      {/* Proposal Selection */}
      <section className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">2. Chọn đề tài</h2>
        <div className="space-y-2">
          {Object.entries(MOCK_PROPOSALS).map(([key, proposal]) => (
            <button
              key={key}
              onClick={() => handleProposalChange(key)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                selectedProposal.id === proposal.id
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-300 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{proposal.code}</div>
              <div className="text-sm text-gray-600">{proposal.title}</div>
              <div className="text-xs text-gray-500">State: {proposal.state}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Action Display */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">3. Xử lý hành động</h2>
        <div className="p-6 border rounded-lg bg-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="font-bold text-lg">{selectedProposal.code}</div>
              <div className="text-gray-600">{selectedProposal.title}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Trạng thái</div>
              <div className="font-medium">{selectedProposal.state}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="text-sm text-gray-500">SLA Status</div>
              <SLABadge
                slaDeadline={selectedProposal.slaDeadline}
                currentState={selectedProposal.state}
              />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-500">Hành động</div>
              <ProposalActions
                proposalId={selectedProposal.id}
                proposalState={selectedProposal.state}
                currentUser={currentUser}
                onActionSuccess={handleActionSuccess}
                onActionError={handleActionError}
              />
            </div>
          </div>

          {/* AC2: Button visibility explanation */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
            <strong>AC2: Button Visibility Rule</strong>
            <p className="mt-1">
              Button hiển thị khi: <code>state === 'FACULTY_REVIEW'</code> AND role in{' '}
              <code>['QUAN_LY_KHOA', 'THU_KY_KHOA']</code>
            </p>
            <p className="mt-1">
              Current: state = <strong>{selectedProposal.state}</strong>, role = <strong>{currentUser.role}</strong> →{' '}
              {selectedProposal.state === 'FACULTY_REVIEW' &&
              ['QUAN_LY_KHOA', 'THU_KY_KHOA'].includes(currentUser.role) ? (
                <span className="text-green-700">✅ Button hiển thị</span>
              ) : (
                <span className="text-red-700">❌ Button ẩn</span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Action Log */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">4. Action Log</h2>
        <div className="p-4 border rounded-lg bg-gray-900 text-green-400 font-mono text-sm min-h-32">
          {actionLog.length === 0 ? (
            <p className="text-gray-500">// No actions yet...</p>
          ) : (
            actionLog.map((log, i) => (
              <div key={i}>{log}</div>
            ))
          )}
        </div>
      </section>

      {/* AC Explanation */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">5. Acceptance Criteria</h2>
        <div className="space-y-4">
          <details className="border rounded-lg">
            <summary className="p-4 bg-gray-50 cursor-pointer font-medium">
              AC1 & AC2: UI Button Display - RBAC Gated
            </summary>
            <div className="p-4 border-t">
              <p><strong>Given:</strong> User có role = QUAN_LY_KHOA hoặc THU_KY_KHOA</p>
              <p><strong>And:</strong> Proposal state = FACULTY_REVIEW</p>
              <p><strong>When:</strong> UI renders</p>
              <p><strong>Then:</strong> Button "Duyệt hồ sơ" hiển thị</p>
              <p className="mt-2 text-sm text-gray-600">✅ Implemented: CanApprove() checks role and state</p>
            </div>
          </details>

          <details className="border rounded-lg">
            <summary className="p-4 bg-gray-50 cursor-pointer font-medium">
              AC3 & AC4: Approve Action - State Transition + Workflow Log
            </summary>
            <div className="p-4 border-t">
              <p><strong>Given:</strong> User click "Duyệt hồ sơ"</p>
              <p><strong>When:</strong> Action được execute với idempotency key</p>
              <p><strong>Then:</strong> State chuyển FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW</p>
              <p><strong>And:</strong> holder_unit = PHONG_KHCN</p>
              <p><strong>And:</strong> Workflow log được tạo với action=APPROVE</p>
              <p className="mt-2 text-sm text-gray-600">✅ Implemented: workflowApi.approveFacultyReview() with header</p>
            </div>
          </details>

          <details className="border rounded-lg">
            <summary className="p-4 bg-gray-50 cursor-pointer font-medium">
              AC5: Idempotency Key (Anti-Double-Submit)
            </summary>
            <div className="p-4 border-t">
              <p><strong>Given:</strong> Request với idempotency key</p>
              <p><strong>When:</strong> Backend nhận request</p>
              <p><strong>Then:</strong> Validate key uniqueness, return 409 nếu duplicate</p>
              <p className="mt-2 text-sm text-gray-600">✅ Implemented: X-Idempotency-Key header sent</p>
              <p className="text-sm text-gray-600">✅ Implemented: UUID v4 generation on client</p>
            </div>
          </details>

          <details className="border rounded-lg">
            <summary className="p-4 bg-gray-50 cursor-pointer font-medium">
              AC6: Backend RBAC Check
            </summary>
            <div className="p-4 border-t">
              <p><strong>Given:</strong> API POST /api/workflow/:id/approve-faculty được gọi</p>
              <p><strong>When:</strong> User không có required role</p>
              <p><strong>Then:</strong> Return 403 Forbidden</p>
              <p className="mt-2 text-sm text-gray-600">✅ Implemented: @RequireRoles(UserRole.QUAN_LY_KHOA, UserRole.THU_KY_KHOA)</p>
            </div>
          </details>
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-lg font-semibold mb-4">6. Code Example</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import { ProposalActions } from '@/components/workflow/ProposalActions';

<ProposalActions
  proposalId={proposal.id}
  proposalState={proposal.state}
  currentUser={user}
  onActionSuccess={() => refreshProposal()}
  onActionError={(error) => showError(error.message)}
/>`}
        </pre>
      </section>
    </div>
  );
}
