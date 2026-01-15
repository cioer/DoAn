import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDT004() {
  // Find proposal by code
  const proposal = await prisma.proposal.findFirst({
    where: { code: 'DT-004' },
    include: {
      owner: { select: { id: true, displayName: true, email: true, role: true } },
      faculty: { select: { id: true, name: true, code: true } },
      council: { select: { id: true, name: true } },
    },
  });

  if (!proposal) {
    console.log('Proposal DT-004 not found');
    await prisma.$disconnect();
    return;
  }

  console.log('='.repeat(60));
  console.log('THÔNG TIN ĐỀ TÀI DT-004');
  console.log('='.repeat(60));
  console.log(`ID: ${proposal.id}`);
  console.log(`Mã: ${proposal.code}`);
  console.log(`Tiêu đề: ${proposal.title}`);
  console.log(`Trạng thái: ${proposal.state}`);
  console.log(`Chủ nhiệm: ${proposal.owner.displayName} (${proposal.owner.email}) - Role: ${proposal.owner.role}`);
  console.log(`Khoa: ${proposal.faculty?.name || 'N/A'} (${proposal.faculty?.code || 'N/A'})`);
  console.log(`Hội đồng: ${proposal.council?.name || 'Chưa gán'}`);
  console.log(`Người giữ (holder): ${proposal.holderUser || 'Chưa gán'}`);
  console.log(`Đơn vị giữ: ${proposal.holderUnit || 'Chưa gán'}`);
  console.log(`SLA Deadline: ${proposal.slaDeadline || 'Chưa đặt'}`);

  // Determine current responsible role based on state
  console.log('\n' + '-'.repeat(60));
  console.log('PHÂN CÔNG THEO TRẠNG THÁI:');

  const stateMapping: Record<string, string> = {
    'DRAFT': 'Chủ nhiệm đề tài (GIANG_VIEN) - Hoàn thiện đề tài',
    'FACULTY_REVIEW': 'Trưởng khoa (QUAN_LY_KHOA) - Xét duyệt khoa',
    'SCHOOL_SELECTION_REVIEW': 'Phòng KHCN (PHONG_KHCN) - Lựa chọn đề tài cấp trường',
    'OUTLINE_COUNCIL_REVIEW': 'Hội đồng (HOI_DONG/THU_KY_HOI_DONG) - Đánh giá đề tài',
    'SCHOOL_ACCEPTANCE_REVIEW': 'Ban Giám Học (BAN_GIAM_HOC) - Nghiệm thu cấp trường',
    'APPROVED': 'Chủ nhiệm đề tài - Bắt đầu thực hiện',
    'IN_PROGRESS': 'Chủ nhiệm đề tài - Đang thực hiện',
    'COMPLETED': 'Đã hoàn thành - Chờ bàn giao',
    'HANDOVER': 'Đã bàn giao',
    'REJECTED': 'Đã từ chối',
    'CHANGES_REQUESTED': 'Cần hoàn thiện theo yêu cầu',
    'PAUSED': 'Tạm dừng',
  };

  const responsible = stateMapping[proposal.state] || 'Không xác định';
  console.log(`Trạng thái: ${proposal.state}`);
  console.log(`Người/Vai trò chịu trách nhiệm: ${responsible}`);

  // Get workflow logs for this proposal
  console.log('\n' + '-'.repeat(60));
  console.log('LỊCH SỬ WORKFLOW:');
  const logs = await prisma.workflowLog.findMany({
    where: { proposalId: proposal.id },
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  if (logs.length === 0) {
    console.log('Chưa có hoạt động nào');
  } else {
    logs.forEach((log) => {
      console.log(`- ${log.timestamp.toLocaleString('vi-VN')}: ${log.action} bởi ${log.actorName || 'System'} (ID: ${log.actorId})`);
      if (log.comment) {
        console.log(`  Comment: ${log.comment}`);
      }
    });
  }

  // Check council assignment if in council review
  if (proposal.state === 'OUTLINE_COUNCIL_REVIEW' && proposal.councilId) {
    console.log('\n' + '-'.repeat(60));
    console.log('THÔNG TIN HỘI ĐỒNG:');
    const councilMembers = await prisma.councilMember.findMany({
      where: { councilId: proposal.councilId },
      include: {
        user: { select: { displayName: true, email: true, role: true } },
      },
    });
    console.log(`Hội đồng: ${proposal.council?.name}`);
    console.log(`Thành viên (${councilMembers.length}):`);
    councilMembers.forEach((cm) => {
      console.log(`  - ${cm.user.displayName} (${cm.user.email}) - Role: ${cm.role}`);
    });
  }

  console.log('='.repeat(60));

  await prisma.$disconnect();
}
checkDT004().catch(console.error);
