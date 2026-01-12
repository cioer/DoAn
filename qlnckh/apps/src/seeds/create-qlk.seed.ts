import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating QUAN_LY_KHOA user...');
  
  // Hash password
  const hashedPassword = await bcrypt.hash('Demo@123', 12);
  
  // Get or create faculty
  let faculty = await prisma.faculty.findFirst({
    where: { code: 'FAC-001' },
  });
  
  if (!faculty) {
    faculty = await prisma.faculty.create({
      data: {
        code: 'FAC-001',
        name: 'Khoa Công nghệ thông tin',
        type: 'FACULTY',
      },
    });
    console.log('Faculty created:', faculty.code);
  }
  
  // Create or update user
  const user = await prisma.user.upsert({
    where: { email: 'DT-USER-002@demo.qlnckh.edu.vn' },
    update: { 
      passwordHash: hashedPassword,
      role: UserRole.QUAN_LY_KHOA,
      facultyId: faculty.id,
    },
    create: {
      id: 'DT-USER-002',
      email: 'DT-USER-002@demo.qlnckh.edu.vn',
      passwordHash: hashedPassword,
      displayName: 'Trần Thị B',
      role: UserRole.QUAN_LY_KHOA,
      facultyId: faculty.id,
    },
  });
  
  console.log('User created:', user.email, user.role, 'faculty:', faculty.code);
  
  // Add faculty permissions
  const permissions = [
    'FACULTY_APPROVE',
    'FACULTY_RETURN',
    'PROPOSAL_VIEW_FACULTY',
    'FACULTY_DASHBOARD_VIEW',
    'FACULTY_USER_MANAGE',
  ];
  
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permission: {
          role: UserRole.QUAN_LY_KHOA,
          permission: permission as any,
        },
      },
      update: {},
      create: {
        role: UserRole.QUAN_LY_KHOA,
        permission: permission as any,
      },
    });
  }
  
  console.log('Permissions added for QUAN_LY_KHOA');
}

main()
  .then(() => {
    console.log('✅ Seed completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
