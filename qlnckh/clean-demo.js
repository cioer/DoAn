const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Cleaning demo data in correct order...');

    // Delete in reverse dependency order to avoid foreign key issues
    // 1. Delete audit events for demo users
    const deletedAuditEvents = await prisma.auditEvent.deleteMany({
      where: { actorUserId: { startsWith: 'DT-USER-' } }
    });
    console.log(`Deleted ${deletedAuditEvents.count} audit events`);

    // 2. Delete workflow logs for demo proposals
    const deletedWorkflowLogs = await prisma.workflowLog.deleteMany({});
    console.log(`Deleted ${deletedWorkflowLogs.count} workflow logs`);

    // 3. Delete proposals
    const deletedProposals = await prisma.proposal.deleteMany({
      where: { code: { startsWith: 'DT-' } }
    });
    console.log(`Deleted ${deletedProposals.count} demo proposals`);

    // 4. Delete evaluations
    const deletedEvaluations = await prisma.evaluation.deleteMany({});
    console.log(`Deleted evaluations`);

    // 5. Delete demo users
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { startsWith: 'DT-USER-' } }
    });
    console.log(`Deleted ${deletedUsers.count} demo users`);

    // 6. Delete demo faculties
    const deletedFaculties = await prisma.faculty.deleteMany({
      where: { code: { startsWith: 'FAC-' } }
    });
    console.log(`Deleted ${deletedFaculties.count} demo faculties`);

    // 7. Delete business calendar entries
    const deletedCalendar = await prisma.businessCalendar.deleteMany({});
    console.log(`Deleted calendar entries`);

    console.log('✅ Demo data cleaned successfully!');
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
