import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@admin.com';
  const password = 'demo12345';
  const displayName = 'Admin User';
  const role = UserRole.ADMIN;

  console.log('🔐 Creating admin user...');

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('⚠️  User already exists, updating password...');
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash: hashedPassword,
        role,
        displayName,
        deletedAt: null, // Restore if soft-deleted
      },
    });
  } else {
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash: hashedPassword,
        displayName,
        role,
      },
    });
  }

  console.log('✅ Admin user created/updated!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role: ${role}`);

  await prisma.$disconnect();
}

createAdmin().catch(console.error);
