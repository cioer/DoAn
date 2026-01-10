/**
 * Email Templates
 * Story 8.2: Bulk Remind (Gửi email nhắc hàng loạt)
 *
 * Vietnamese email templates for reminder notifications.
 */

/**
 * Reminder Email Data
 * Proper typing - NO as unknown (Epic 7 retro pattern)
 */
export interface ReminderEmailData {
  recipientName: string;
  recipientEmail: string;
  proposals: Array<{
    code: string;
    title: string;
    slaStatus: string;
    slaDeadline: string;
    daysRemaining?: number;
    overdueDays?: number;
  }>;
  appUrl: string;
  sentDate: Date;
}

/**
 * State labels in Vietnamese
 */
const STATE_LABELS: Record<string, string> = {
  ok: 'Đúng hạn',
  warning: 'Sắp đến hạn',
  overdue: 'Quá hạn',
};

/**
 * Format date to Vietnamese locale
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Generate reminder email HTML content
 *
 * @param data - Reminder email data
 * @returns HTML content for email
 */
export function generateReminderEmailHtml(data: ReminderEmailData): string {
  const proposalCount = data.proposals.length;

  // Generate proposal table rows
  const proposalRows = data.proposals
    .map(
      (p) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #ddd;">${p.code}</td>
      <td style="padding: 12px; border: 1px solid #ddd;">${p.title}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
        <span style="color: ${getStatusColor(p.slaStatus)}; font-weight: bold;">
          ${STATE_LABELS[p.slaStatus] || p.slaStatus}
        </span>
      </td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
        ${p.slaDeadline}
      </td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h2 { color: #2c3e50; }
    .highlight { color: #e74c3c; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #3498db; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Thông báo nhắc nhở hồ sơ nghiên cứu khoa học</h2>

    <p>Kính gửi <strong>${data.recipientName}</strong>,</p>

    <p>Bạn có <span class="highlight">${proposalCount}</span> hồ sơ cần xử lý:</p>

    <table>
      <thead>
        <tr>
          <th>Mã hồ sơ</th>
          <th>Tên đề tài</th>
          <th>Trạng thái SLA</th>
          <th>Thời hạn</th>
        </tr>
      </thead>
      <tbody>
        ${proposalRows}
      </tbody>
    </table>

    <p style="margin-top: 20px;">
      Vui lòng đăng nhập hệ thống để xử lý:
      <a href="${data.appUrl}" class="button">${data.appUrl}</a>
    </p>

    <div class="footer">
      <p>Trân trọng,<br><strong>Phòng Khoa học Công nghệ</strong></p>
      <p style="font-size: 11px;">
        Đây là email tự động, vui lòng không trả lời email này.<br>
        Ngày gửi: ${formatDate(data.sentDate)}
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get status color for display
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'ok':
      return '#27ae60';
    case 'warning':
      return '#f39c12';
    case 'overdue':
      return '#e74c3c';
    default:
      return '#7f8c8d';
  }
}

/**
 * Generate reminder email plain text content
 *
 * @param data - Reminder email data
 * @returns Plain text content for email
 */
export function generateReminderEmailText(data: ReminderEmailData): string {
  const proposalCount = data.proposals.length;

  let content = `THONG BAO NHAC NHO HO SO NGHIEN CUU KHOA HOC\n\n`;
  content += `Kinh gui ${data.recipientName},\n\n`;
  content += `Ban co ${proposalCount} ho so can xu ly:\n\n`;

  data.proposals.forEach((p, index) => {
    content += `${index + 1}. ${p.code} - ${p.title}\n`;
    content += `   Trang thai: ${STATE_LABELS[p.slaStatus] || p.slaStatus}\n`;
    content += `   Thoi han: ${p.slaDeadline}\n\n`;
  });

  content += `Vui long dang nhap he thong de xu ly: ${data.appUrl}\n\n`;
  content += `Tran tro,\nPhong Khoa hoc Cong nghe\n\n`;
  content += `Day la email tu dong, vui long khong tra loi email nay.\n`;
  content += `Ngay gui: ${formatDate(data.sentDate)}\n`;

  return content;
}
