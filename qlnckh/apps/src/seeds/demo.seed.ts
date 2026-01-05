import { PrismaClient, UserRole, ProjectState, WorkflowAction, Permission } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  DEMO_USERS,
  DEMO_FACULTIES,
  DEMO_PROPOSALS,
  DEMO_HOLIDAYS,
  DEMO_ROLE_PERMISSIONS,
  type DemoProposal,
  type DemoWorkflowLog,
} from './demo-seed-data.constants';

const prisma = new PrismaClient();

/**
 * Demo Seed Script
 *
 * Creates deterministic seed data for demo purposes.
 * All IDs and timestamps are fixed to ensure reproducible demo environments.
 *
 * Usage:
 *   npx ts-node apps/src/seeds/demo.seed.ts
 *   or (after package.json configuration):
 *   npm run seed:demo
 *
 * Deterministic Strategy:
 * - User IDs: Fixed strings (DT-USER-001, etc.)
 * - Faculty IDs: UUID v5 generated from code using crypto
 * - Proposal IDs: UUID v5 generated from code using crypto
 * - Timestamps: Fixed dates (2026-01-01T00:00:00Z)
 */

// ============================================================
// DETERMINISTIC UUID v5 IMPLEMENTATION
// ============================================================

/**
 * DNS namespace for UUID v5 (RFC 4122)
 * Used for generating deterministic UUIDs from string inputs
 */
const DEMO_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Generate a deterministic UUID v5 from a namespace and name
 * This ensures the same input always produces the same UUID
 * Uses Node's built-in crypto module for proper SHA-1 hashing
 *
 * @param namespace - UUID namespace (constant for demo)
 * @param name - String to generate UUID from (e.g., "faculty-FAC-001")
 * @returns Deterministic UUID v5
 */
function generateUUIDv5(namespace: string, name: string): string {
  // Convert namespace UUID to bytes
  const namespaceBytes = uuidToBytes(namespace);
  const nameBytes = Buffer.from(name, 'utf8');

  // Concatenate namespace and name
  const combined = Buffer.concat([namespaceBytes, nameBytes]);

  // Generate SHA-1 hash
  const hash = crypto.createHash('sha1').update(combined).digest();

  // Format as UUID v5 (version 5, variant 10xx)
  const bytes = Buffer.from(hash);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // Version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant

  return bytesToUuid(bytes);
}

/**
 * Convert UUID string to bytes
 */
function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  const buffer = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buffer[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return buffer;
}

/**
 * Convert bytes to UUID string format
 */
function bytesToUuid(buffer: Buffer): string {
  const hex = buffer.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Get a fixed timestamp for deterministic seeding
 */
function getFixedTimestamp(): Date {
  return new Date('2026-01-01T00:00:00.000Z');
}

// ============================================================
// SEEDING FUNCTIONS
// ============================================================

/**
 * Seed faculties with deterministic UUIDs
 */
async function seedFaculties(): Promise<Map<string, string>> {
  console.log('📚 Seeding faculties...');

  const facultyMap = new Map<string, string>();

  for (const faculty of DEMO_FACULTIES) {
    const deterministicId = generateUUIDv5(DEMO_NAMESPACE, `faculty-${faculty.code}`);

    await prisma.faculty.upsert({
      where: { code: faculty.code },
      update: {},
      create: {
        id: deterministicId,
        code: faculty.code,
        name: faculty.name,
        type: faculty.type,
        createdAt: getFixedTimestamp(),
      },
    });

    facultyMap.set(faculty.code, deterministicId);
    console.log(`  ✓ ${faculty.code}: ${faculty.name}`);
  }

  console.log(`✅ Seeded ${facultyMap.size} faculties`);
  return facultyMap;
}

/**
 * Seed users with fixed IDs and hashed passwords
 */
async function seedUsers(facultyMap: Map<string, string>): Promise<void> {
  console.log('👥 Seeding users...');

  const hashedPassword = await bcrypt.hash('Demo@123', 12);

  for (const userData of DEMO_USERS) {
    const facultyId = userData.facultyCode ? facultyMap.get(userData.facultyCode) : null;

    await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: {
        id: userData.id,
        email: userData.email,
        passwordHash: hashedPassword,
        displayName: userData.displayName,
        role: userData.role,
        facultyId,
        createdAt: getFixedTimestamp(),
      },
    });

    console.log(`  ✓ ${userData.id}: ${userData.displayName} (${userData.role})`);
  }

  console.log(`✅ Seeded ${DEMO_USERS.length} users`);
}

/**
 * Seed role permissions for demo personas
 */
async function seedRolePermissions(): Promise<void> {
  console.log('🔐 Seeding role permissions...');

  let count = 0;
  for (const rp of DEMO_ROLE_PERMISSIONS) {
    try {
      await prisma.rolePermission.upsert({
        where: {
          role_permission: {
            role: rp.role,
            permission: rp.permission as Permission,
          },
        },
        create: {
          role: rp.role,
          permission: rp.permission as Permission,
        },
        update: {},
      });
      count++;
    } catch (error) {
      console.warn(`  ⚠ Skipping invalid permission: ${rp.permission} for role ${rp.role}`);
    }
  }

  console.log(`✅ Seeded ${count} role permissions`);
}

/**
 * Create workflow logs for a proposal
 */
async function createWorkflowLogs(
  proposalId: string,
  logs: DemoWorkflowLog[],
): Promise<void> {
  for (const log of logs) {
    await prisma.workflowLog.create({
      data: {
        proposalId,
        action: log.action,
        fromState: log.fromState,
        toState: log.toState,
        actorId: log.actorId,
        actorName: log.actorName,
        returnTargetState: log.returnTargetState,
        returnTargetHolderUnit: log.returnTargetHolderUnit,
        reasonCode: log.reasonCode,
        comment: log.comment,
        timestamp: getFixedTimestamp(),
      },
    });
  }
}

/**
 * Seed proposals with workflow logs
 */
async function seedProposals(facultyMap: Map<string, string>): Promise<void> {
  console.log('📄 Seeding proposals...');

  for (const proposalData of DEMO_PROPOSALS) {
    const facultyId = facultyMap.get(proposalData.facultyCode);
    if (!facultyId) {
      console.error(`  ❌ Faculty not found: ${proposalData.facultyCode}`);
      continue;
    }

    // Verify owner exists
    const owner = await prisma.user.findUnique({
      where: { id: proposalData.ownerId },
    });
    if (!owner) {
      console.error(`  ❌ Owner not found: ${proposalData.ownerId}`);
      continue;
    }

    // Generate deterministic proposal ID
    const proposalId = generateUUIDv5(DEMO_NAMESPACE, `proposal-${proposalData.code}`);

    // Upsert proposal
    await prisma.proposal.upsert({
      where: { code: proposalData.code },
      update: {},
      create: {
        id: proposalId,
        code: proposalData.code,
        title: proposalData.title,
        state: proposalData.state,
        ownerId: proposalData.ownerId,
        facultyId,
        holderUnit: proposalData.holderUnit,
        holderUser: proposalData.holderUser,
        slaStartDate: proposalData.state !== ProjectState.DRAFT ? getFixedTimestamp() : null,
        slaDeadline: proposalData.state !== ProjectState.DRAFT ? new Date('2026-01-08T00:00:00.000Z') : null,
        createdAt: getFixedTimestamp(),
      },
    });

    // Create workflow logs
    if (proposalData.workflowLogs && proposalData.workflowLogs.length > 0) {
      await createWorkflowLogs(proposalId, proposalData.workflowLogs);
    }

    console.log(`  ✓ ${proposalData.code}: ${proposalData.title} (${proposalData.state})`);
  }

  console.log(`✅ Seeded ${DEMO_PROPOSALS.length} proposals`);
}

/**
 * Seed business calendar (holidays)
 */
async function seedBusinessCalendar(): Promise<void> {
  console.log('📅 Seeding business calendar...');

  for (const holiday of DEMO_HOLIDAYS) {
    await prisma.businessCalendar.upsert({
      where: { date: new Date(holiday.date) },
      update: {},
      create: {
        date: new Date(holiday.date),
        name: holiday.name,
        isHoliday: holiday.isHoliday,
        isWorkingDay: holiday.isWorkingDay,
        recurring: holiday.recurring,
        createdAt: getFixedTimestamp(),
      },
    });

    console.log(`  ✓ ${holiday.date}: ${holiday.name}`);
  }

  console.log(`✅ Seeded ${DEMO_HOLIDAYS.length} holidays`);
}

// ============================================================
// CLEANING FUNCTION (for demo mode reset)
// ============================================================

/**
 * Clean existing demo data before reseeding
 * Only runs in DEMO mode to prevent accidental data loss
 */
async function cleanDemoData(): Promise<void> {
  if (process.env.APP_MODE !== 'demo') {
    console.log('ℹ️ Skipping clean (APP_MODE is not "demo")');
    return;
  }

  console.log('🧹 Cleaning existing demo data...');

  await prisma.workflowLog.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.businessCalendar.deleteMany({});

  // Only delete demo users (those with DT-USER-XXX pattern)
  await prisma.user.deleteMany({
    where: {
      id: {
        startsWith: 'DT-USER-',
      },
    },
  });

  // Only delete demo faculties (those with FAC-XXX code)
  await prisma.faculty.deleteMany({
    where: {
      code: {
        startsWith: 'FAC-',
      },
    },
  });

  console.log('✅ Cleaned existing demo data');
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

/**
 * Main seed function
 * Runs all seeding steps in order
 */
async function main(): Promise<void> {
  console.log('🌱 Starting demo seed...');
  console.log('');

  // Clean existing data (only in demo mode)
  await cleanDemoData();
  console.log('');

  // Seed in order: faculties → users → permissions → proposals → calendar
  const facultyMap = await seedFaculties();
  console.log('');

  await seedUsers(facultyMap);
  console.log('');

  await seedRolePermissions();
  console.log('');

  await seedProposals(facultyMap);
  console.log('');

  await seedBusinessCalendar();
  console.log('');

  // Summary
  console.log('');
  console.log('✅ Demo seed completed!');
  console.log('========================================');
  console.log(`   Users:    ${DEMO_USERS.length}`);
  console.log(`   Faculties: ${DEMO_FACULTIES.length}`);
  console.log(`   Proposals: ${DEMO_PROPOSALS.length}`);
  console.log(`   Holidays:  ${DEMO_HOLIDAYS.length}`);
  console.log(`   Permissions: ${DEMO_ROLE_PERMISSIONS.length}`);
  console.log('========================================');
  console.log('');
  console.log('💡 Demo credentials:');
  console.log('   Email: DT-USER-XXX@demo.qlnckh.edu.vn');
  console.log('   Password: Demo@123');
  console.log('   (XXX = 001-008 for different personas)');
}

// ============================================================
// EXECUTION
// ============================================================

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo seed failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { main as seedDemoData };
