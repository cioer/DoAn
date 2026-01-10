/**
 * Vietnamese Holidays Seed Data
 * Story 10.5: AC8 - Vietnamese Holidays Seed Data
 *
 * This file contains Vietnamese holidays for system initialization.
 *
 * @module seeds/holidays.seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate Lunar New Year (Tet) dates for a given year
 * This is a simplified calculation. For production, use a proper lunar calendar library.
 *
 * @param year - Gregorian year
 * @returns Tet holiday dates (day before, 1st, 2nd, 3rd, 4th, 5th day of Tet)
 */
function calculateTetHolidays(year: number): Array<{ date: Date; name: string; recurring: boolean }> {
  // Simplified: Tet usually falls in late January or February
  // For accurate dates, use a library like 'lunarcalendar-js'
  // This is a placeholder implementation

  // Approximate Tet dates (these should be calculated properly)
  const tetStart = new Date(year, 0, 25); // Approximate

  return [
    {
      date: new Date(tetStart.getTime() - 24 * 60 * 60 * 1000), // Day before Tet
      name: 'Ngày 30 Tết (Cả năm)',
      recurring: false,
    },
    {
      date: tetStart,
      name: 'Mùng 1 Tết (Cả năm)',
      recurring: false,
    },
    {
      date: new Date(tetStart.getTime() + 24 * 60 * 60 * 1000),
      name: 'Mùng 2 Tết (Cả năm)',
      recurring: false,
    },
    {
      date: new Date(tetStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      name: 'Mùng 3 Tết (Cả năm)',
      recurring: false,
    },
    {
      date: new Date(tetStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      name: 'Mùng 4 Tết (Cả năm)',
      recurring: false,
    },
    {
      date: new Date(tetStart.getTime() + 4 * 24 * 60 * 60 * 1000),
      name: 'Mùng 5 Tết (Cả năm)',
      recurring: false,
    },
  ];
}

/**
 * Vietnamese holidays configuration
 */
const VIETNAMESE_HOLIDAYS: Array<{ date: string; name: string; recurring: boolean }> = [
  // Fixed date holidays (recurring every year)
  { date: '2026-01-01', name: 'Tết Dương lịch', recurring: true },
  { date: '2026-04-30', name: 'Giải phóng miền Nam, thống nhất đất nước', recurring: true },
  { date: '2026-05-01', name: 'Ngày Quốc tế Lao động', recurring: true },
  { date: '2026-09-02', name: 'Ngày Quốc khánh', recurring: true },
];

/**
 * Seed Vietnamese holidays
 * Story 10.5: AC8 - Vietnamese Holidays Seed Data
 */
export async function seedVietnameseHolidays(): Promise<void> {
  console.log('🌸 Seeding Vietnamese holidays...');

  const currentYear = new Date().getFullYear();
  const seededCount = { holidays: 0 };

  // Seed fixed holidays (recurring)
  for (const holiday of VIETNAMESE_HOLIDAYS) {
    await prisma.businessCalendar.upsert({
      where: {
        date: new Date(holiday.date),
      },
      update: {
        name: holiday.name,
        isHoliday: true,
        recurring: holiday.recurring,
        isWorkingDay: false,
      },
      create: {
        date: new Date(holiday.date),
        name: holiday.name,
        isHoliday: true,
        recurring: holiday.recurring,
        isWorkingDay: false,
      },
    });
    seededCount.holidays++;
  }

  // Seed Tet holidays for current year
  const tetHolidays = calculateTetHolidays(currentYear);
  for (const tet of tetHolidays) {
    await prisma.businessCalendar.upsert({
      where: {
        date: tet.date,
      },
      update: {
        name: tet.name,
        isHoliday: true,
        recurring: tet.recurring,
      },
      create: {
        date: tet.date,
        name: tet.name,
        isHoliday: true,
        recurring: tet.recurring,
        isWorkingDay: false,
      },
    });
    seededCount.holidays++;
  }

  console.log(`✅ Seeded ${seededCount.holidays} Vietnamese holidays`);
}

/**
 * Run the seed if executed directly
 */
if (require.main === module) {
  seedVietnameseHolidays()
    .then(() => {
      console.log('✅ Holidays seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Holidays seeding failed:', error);
      process.exit(1);
    });
}
