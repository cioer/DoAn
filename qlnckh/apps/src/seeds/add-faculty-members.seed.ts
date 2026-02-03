import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Add faculty members for E2E testing of faculty councils
 * Creates 5 GIANG_VIEN users in the same faculty as truongkhoa
 */
async function main() {
  console.log('📧 Creating faculty members for E2E testing...');

  const hashedPassword = await bcrypt.hash('Demo@123', 12);

  // Find the faculty (FAC-001)
  const faculty = await prisma.faculty.findFirst({
    where: { code: 'FAC-001' },
  });

  if (!faculty) {
    console.error('❌ Faculty FAC-001 not found. Run create-truongkhoa.seed.ts first.');
    process.exit(1);
  }

  console.log(`✅ Found faculty: ${faculty.name} (${faculty.code})`);

  // Create 5 lecturers in the same faculty
  const members = [
    { email: 'gv1@mail.com', displayName: 'Giảng viên 1' },
    { email: 'gv2@mail.com', displayName: 'Giảng viên 2' },
    { email: 'gv3@mail.com', displayName: 'Giảng viên 3' },
    { email: 'gv4@mail.com', displayName: 'Giảng viên 4' },
    { email: 'gv5@mail.com', displayName: 'Giảng viên 5' },
  ];

  for (const member of members) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {
        facultyId: faculty.id,
        role: UserRole.GIANG_VIEN,
      },
      create: {
        email: member.email,
        passwordHash: hashedPassword,
        displayName: member.displayName,
        role: UserRole.GIANG_VIEN,
        facultyId: faculty.id,
      },
    });
    console.log(`✅ Created/Updated: ${user.displayName} (${user.email}) - Faculty: ${faculty.code}`);
  }

  // Also add secretary role user
  const secretary = await prisma.user.upsert({
    where: { email: 'thuky@mail.com' },
    update: {
      facultyId: faculty.id,
      role: UserRole.THU_KY_KHOA,
    },
    create: {
      email: 'thuky@mail.com',
      passwordHash: hashedPassword,
      displayName: 'Thư ký Khoa',
      role: UserRole.THU_KY_KHOA,
      facultyId: faculty.id,
    },
  });
  console.log(`✅ Created/Updated: ${secretary.displayName} (${secretary.email}) - Faculty: ${faculty.code}`);

  console.log('\n📊 Summary:');
  const count = await prisma.user.count({
    where: { facultyId: faculty.id },
  });
  console.log(`   Total users in ${faculty.code}: ${count}`);
}

main()
  .then(() => {
    console.log('\n✅ Seed completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
