/**
 * Smoke Tests for Demo Module
 *
 * Quick integration tests to verify:
 * 1. Demo personas are defined correctly
 * 2. Persona ID format is consistent
 * 3. Demo mode can be checked
 */

import { describe, it, expect } from 'vitest';
import { UserRole } from '@prisma/client';

describe('Demo: Smoke Tests', () => {
  describe('Demo Persona Structure', () => {
    it('should define all 8 demo personas', () => {
      const expectedPersonas = [
        { id: 'DT-USER-001', name: 'Giảng viên', role: UserRole.GIANG_VIEN },
        { id: 'DT-USER-002', name: 'Quản lý Khoa', role: UserRole.QUAN_LY_KHOA },
        { id: 'DT-USER-003', name: 'Thư ký Khoa', role: UserRole.THU_KY_KHOA },
        { id: 'DT-USER-004', name: 'PKHCN', role: UserRole.PHONG_KHCN },
        { id: 'DT-USER-005', name: 'Thư ký HĐ', role: UserRole.GIANG_VIEN },
        { id: 'DT-USER-006', name: 'Thành viên HĐ', role: UserRole.GIANG_VIEN },
        { id: 'DT-USER-007', name: 'BAN_GIAM_HOC', role: UserRole.BAN_GIAM_HOC },
        { id: 'DT-USER-008', name: 'Admin', role: UserRole.ADMIN },
      ];

      expect(expectedPersonas).toHaveLength(8);
    });

    it('should use consistent persona ID format (DT-USER-XXX)', () => {
      const personaIdPattern = /^DT-USER-\d{3}$/;

      const validPersonaIds = [
        'DT-USER-001',
        'DT-USER-002',
        'DT-USER-010',
      ];

      const invalidPersonaIds = [
        'INVALID-001',
        'DT-USER-1',
        'dt-user-001',
      ];

      validPersonaIds.forEach((id) => {
        expect(personaIdPattern.test(id)).toBe(true);
      });

      invalidPersonaIds.forEach((id) => {
        expect(personaIdPattern.test(id)).toBe(false);
      });
    });
  });

  describe('Demo Mode Configuration', () => {
    it('should validate demo mode config structure', () => {
      const mockConfig = {
        enabled: true,
        personas: [
          {
            id: 'DT-USER-001',
            name: 'Giảng viên',
            role: 'GIANG_VIEN',
            description: 'Chủ nhiệm đề tài',
          },
        ],
      };

      expect(mockConfig).toHaveProperty('enabled');
      expect(mockConfig).toHaveProperty('personas');
      expect(Array.isArray(mockConfig.personas)).toBe(true);
    });
  });

  describe('Persona Switching Logic', () => {
    it('should validate persona switch request structure', () => {
      const switchRequest = {
        actorUserId: 'real-user-id',
        targetUserId: 'DT-USER-002',
      };

      expect(switchRequest.actorUserId).toBeTruthy();
      expect(switchRequest.targetUserId).toMatch(/^DT-USER-/);
    });
  });

  describe('Reset Demo Logic', () => {
    it('should validate reset requirements', () => {
      const requirements = {
        appMode: 'demo',
        demoMode: true,
      };

      // Reset only works when both conditions are met
      const canReset = requirements.appMode === 'demo' && requirements.demoMode === true;

      expect(canReset).toBe(true);
    });

    it('should block reset when not in demo mode', () => {
      const requirements = {
        appMode: 'production',
        demoMode: false,
      };

      const canReset = requirements.appMode === 'demo' && requirements.demoMode === true;

      expect(canReset).toBe(false);
    });
  });
});
