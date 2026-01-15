/**
 * Get Test Tokens Script
 *
 * Generates JWT tokens for testing workflow with different roles
 * Usage: npx ts-node get-test-tokens.ts
 */

import { sign } from 'jsonwebtoken';

// JWT Secret - should match your environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  facultyId: string | null;
}

// Test users - these should match users in your database
const TEST_USERS: User[] = [
  {
    id: 'test-user-001',
    email: 'giangvien@test.edu',
    displayName: 'Nguyễn Văn A - Giảng Viên',
    role: 'GIANG_VIEN',
    facultyId: 'faculty-cntt',
  },
  {
    id: 'test-user-002',
    email: 'quanlykhoa@test.edu',
    displayName: 'Trần Văn B - Quản Lý Khoa',
    role: 'QUAN_LY_KHOA',
    facultyId: 'faculty-cntt',
  },
  {
    id: 'test-user-003',
    email: 'phongkhcn@test.edu',
    displayName: 'Lê Văn C - Phong KHCN',
    role: 'PHONG_KHCN',
    facultyId: null,
  },
  {
    id: 'test-user-004',
    email: 'bgh@test.edu',
    displayName: 'Phạm Văn D - Ban Giám Học',
    role: 'BAN_GIAM_HOC',
    facultyId: null,
  },
  {
    id: 'test-user-005',
    email: 'admin@test.edu',
    displayName: 'Admin User',
    role: 'ADMIN',
    facultyId: null,
  },
];

function generateToken(user: User, expiresIn: string = '7d'): string {
  return sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      facultyId: user.facultyId,
    },
    JWT_SECRET,
    { expiresIn },
  );
}

function main(): void {
  console.log('\n' + '='.repeat(70));
  console.log('Test JWT Tokens for Workflow E2E Testing');
  console.log('='.repeatrepeat(70) + '\n');

  const tokens: Record<string, string> = {};

  TEST_USERS.forEach(user => {
    const token = generateToken(user);
    const varName = `${user.role.toLowerCase()}_TOKEN`;

    tokens[varName] = token;

    console.log(`${user.displayName} (${user.role}):`);
    console.log(`  Export: export ${varName}='${token}'`);
    console.log(`  Email: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log('');
  });

  console.log('='.repeat(70));
  console.log('Quick Export Command (copy & paste):');
  console.log('='.repeat(70));
  console.log(`
export GIANG_VIEN_TOKEN='${tokens.giang_vien_token}'
export QUAN_LY_KHOA_TOKEN='${tokens.quan_ly_khoa_token}'
export PHONG_KHCN_TOKEN='${tokens.phongkhcn_token}'
export BGH_TOKEN='${tokens.ban_giam_hoc_token}'
`);
  console.log('='.repeat(70));
  console.log('\nThen run the E2E test:');
  console.log('  ./test-workflow-e2e.sh http://localhost:3000/api\n');
}

main();

export { TEST_USERS, generateToken };
