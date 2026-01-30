/**
 * SLA Badge Demo Page (Story 3.7)
 *
 * Showcases all SLA Badge variants:
 * - AC1: OK (Normal) - Clock icon + "Còn X ngày làm việc"
 * - AC2: Warning (T-2) - AlertTriangle icon + "T-2 (Còn X ngày)"
 * - AC3: Overdue - AlertCircle icon + "Quá hạn X ngày"
 * - AC4: Paused - PauseCircle icon + "Đã tạm dừng"
 * - AC5: Icon + Text ALWAYS (no icon-only)
 *
 * This page demonstrates how the SLA Badge would be integrated into:
 * - Task 3: Queue Cards (TaskList/ProjectCard)
 * - Task 4: Proposal Detail (StatusCard)
 */

import { SLABadge } from '../../../components/workflow/SLABadge';

export default function SLABadgeDemoPage() {
  // Demo dates relative to "current time" of 2026-01-07
  const demoDate = new Date('2026-01-07T10:00:00Z');

  // Calculate various deadline scenarios
  const okDeadline = new Date(demoDate);
  okDeadline.setDate(okDeadline.getDate() + 5); // 5 days from now

  const warningDeadline = new Date(demoDate);
  warningDeadline.setDate(warningDeadline.getDate() + 1); // 1 day from now (≤ 2 days)

  const overdueDeadline = new Date(demoDate);
  overdueDeadline.setDate(overdueDeadline.getDate() - 3); // 3 days ago

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">SLA Badge Component Demo (Story 3.7)</h1>
      <p className="text-muted-foreground mb-8">
        Hiển thị badge trạng thái SLA với icon + text (không bao giờ chỉ icon)
      </p>

      {/* Section 1: All Badge Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">1. Tất cả các trạng thái SLA Badge</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AC1: OK Status */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">AC1: OK (Normal)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clock icon + "Còn X ngày làm việc" - Màu xanh dương
            </p>
            <div className="flex items-center gap-4">
              <SLABadge
                slaDeadline={okDeadline.toISOString()}
                currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
              />
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              Deadline: {okDeadline.toLocaleString('vi-VN')}
            </p>
          </div>

          {/* AC2: Warning Status */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">AC2: Warning (T-2)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              AlertTriangle icon + "T-2 (Còn X ngày)" - Màu cam (≤ 2 ngày)
            </p>
            <div className="flex items-center gap-4">
              <SLABadge
                slaDeadline={warningDeadline.toISOString()}
                currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
              />
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              Deadline: {warningDeadline.toLocaleString('vi-VN')}
            </p>
          </div>

          {/* AC3: Overdue Status */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">AC3: Overdue</h3>
            <p className="text-sm text-muted-foreground mb-4">
              AlertCircle icon + "Quá hạn X ngày" - Màu đỏ
            </p>
            <div className="flex items-center gap-4">
              <SLABadge
                slaDeadline={overdueDeadline.toISOString()}
                currentState="FACULTY_COUNCIL_OUTLINE_REVIEW"
              />
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              Deadline: {overdueDeadline.toLocaleString('vi-VN')}
            </p>
          </div>

          {/* AC4: Paused Status */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">AC4: Paused</h3>
            <p className="text-sm text-muted-foreground mb-4">
              PauseCircle icon + "Đã tạm dừng" - Màu xám
            </p>
            <div className="flex items-center gap-4">
              <SLABadge
                slaDeadline={okDeadline.toISOString()}
                currentState="PAUSED"
              />
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              State: PAUSED (slaPausedAt có giá trị)
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Icon + Text Always (AC5) */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">2. Icon + Text LUÔN LUÔN hiển thị (AC5)</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm">
            <strong>Quy tắc UX-7:</strong> Icon-only bị CẤM. Tất cả badges phải hiển thị cả icon và text
            để đảm bảo khả năng đọc khi in grayscale.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <SLABadge slaDeadline={okDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" />
          <SLABadge slaDeadline={warningDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" />
          <SLABadge slaDeadline={overdueDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" />
          <SLABadge slaDeadline={okDeadline.toISOString()} currentState="PAUSED" />
        </div>
      </section>

      {/* Section 3: Compact Variant */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">3. Compact Variant</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Biến thể nhỏ gọn nhưng VẪN có icon + text
        </p>
        <div className="flex flex-wrap gap-4">
          <SLABadge slaDeadline={okDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" compact />
          <SLABadge slaDeadline={warningDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" compact />
          <SLABadge slaDeadline={overdueDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" compact />
          <SLABadge slaDeadline={okDeadline.toISOString()} currentState="PAUSED" compact />
        </div>
      </section>

      {/* Section 4: Task 3 Integration - Queue Card Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">4. Task 3: Tích hợp vào Queue Card</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ví dụ cách hiển thị SLA Badge trên card trong danh sách đề tài cần xử lý
        </p>
        <div className="border rounded-lg p-4 bg-gray-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Mã</th>
                <th className="text-left p-2">Tên đề tài</th>
                <th className="text-left p-2">Trạng thái</th>
                <th className="text-left p-2">SLA</th>
                <th className="text-left p-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">DT-001</td>
                <td className="p-2">Nghiên cứu AI</td>
                <td className="p-2">FACULTY_REVIEW</td>
                <td className="p-2">
                  <SLABadge slaDeadline={okDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" compact />
                </td>
                <td className="p-2"><button className="text-blue-600">Mở</button></td>
              </tr>
              <tr className="border-b">
                <td className="p-2">DT-002</td>
                <td className="p-2">Phát triển Web</td>
                <td className="p-2">FACULTY_REVIEW</td>
                <td className="p-2">
                  <SLABadge slaDeadline={warningDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" compact />
                </td>
                <td className="p-2"><button className="text-blue-600">Mở</button></td>
              </tr>
              <tr className="border-b">
                <td className="p-2">DT-003</td>
                <td className="p-2">Mobile App</td>
                <td className="p-2">SCHOOL_SELECTION</td>
                <td className="p-2">
                  <SLABadge slaDeadline={overdueDeadline.toISOString()} currentState="SCHOOL_COUNCIL_OUTLINE_REVIEW" compact />
                </td>
                <td className="p-2"><button className="text-blue-600">Mở</button></td>
              </tr>
              <tr>
                <td className="p-2">DT-004</td>
                <td className="p-2">Data Mining</td>
                <td className="p-2">IN_PROGRESS</td>
                <td className="p-2">
                  <SLABadge slaDeadline={okDeadline.toISOString()} currentState="PAUSED" compact />
                </td>
                <td className="p-2"><button className="text-blue-600">Mở</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Task 4 Integration - Proposal Detail Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">5. Task 4: Tích hợp vào Proposal Detail</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ví dụ cách hiển thị SLA Badge trên trang chi tiết đề tài
        </p>
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold">Nghiên cứu AI</h3>
              <p className="text-muted-foreground">Mã: DT-001</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="border rounded px-3 py-2">
              <span className="text-sm text-muted-foreground">Trạng thái:</span>
              <span className="ml-2 font-medium">FACULTY_REVIEW</span>
            </div>
            <div className="border rounded px-3 py-2">
              <span className="text-sm text-muted-foreground">SLA:</span>
              <span className="ml-2">
                <SLABadge slaDeadline={okDeadline.toISOString()} currentState="FACULTY_COUNCIL_OUTLINE_REVIEW" compact />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Code Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">6. Ví dụ code</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Import component
import { SLABadge } from '@/components/workflow/SLABadge';

// Basic usage
<SLABadge
  slaDeadline={project.sla_deadline}
  currentState={project.state}
/>

// With paused state
<SLABadge
  slaDeadline={project.sla_deadline}
  currentState={project.state}
  slaPausedAt={project.sla_paused_at}
/>

// Compact variant
<SLABadge
  slaDeadline={project.sla_deadline}
  currentState={project.state}
  compact
/>`}
        </pre>
      </section>

      {/* Footer Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Lưu ý:</strong> Đây là trang demo. Trong thực tế:
          <ul className="list-disc list-inside mt-2 ml-4">
            <li>TaskList component sẽ được tạo trong story tương lai</li>
            <li>Proposal detail page sẽ được nâng cấp để hiển thị SLA Badge</li>
            <li>SLA deadline sẽ được tính từ backend (Story 3.6 SLA Calculator)</li>
          </ul>
        </p>
      </div>
    </div>
  );
}
