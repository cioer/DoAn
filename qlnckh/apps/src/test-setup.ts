/**
 * Vitest setup file with Jest compatibility
 * This file provides Jest-like globals for Vitest
 */

import 'reflect-metadata';
import { vi } from 'vitest';

// Make Vitest's vi available as jest for compatibility with existing tests
(globalThis as any).jest = vi;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress logs in tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};
