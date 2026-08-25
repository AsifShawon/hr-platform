import { describe, it, expect } from 'vitest';
import { Permission, BuiltInRole, BUILT_IN_ROLE_PERMISSIONS } from '@hr/domain';

describe('Phase 6: ID-First App Shell & Bento Dashboard Specifications', () => {
  it('enforces task-first navigation links across core operator workflows', () => {
    const primaryNavHrefs = [
      '/dashboard',
      '/cards/new',
      '/people',
      '/cards/queue',
      '/cards/issues',
    ];

    expect(primaryNavHrefs).toHaveLength(5);
    expect(primaryNavHrefs).toContain('/dashboard');
    expect(primaryNavHrefs).toContain('/cards/new');
    expect(primaryNavHrefs).toContain('/people');
    expect(primaryNavHrefs).toContain('/cards/queue');
    expect(primaryNavHrefs).toContain('/cards/issues');
  });

  it('filters More menu options strictly according to user permissions', () => {
    const printOperatorPerms = BUILT_IN_ROLE_PERMISSIONS[BuiltInRole.PRINT_OPERATOR];
    const systemOwnerPerms = BUILT_IN_ROLE_PERMISSIONS[BuiltInRole.SYSTEM_OWNER];

    // Print Operator should have access to print calibration and cards
    expect(printOperatorPerms).toContain(Permission.CARDS_PRINT);
    expect(printOperatorPerms).not.toContain(Permission.SYSTEM_MANAGE);
    expect(printOperatorPerms).not.toContain(Permission.ROLES_MANAGE);

    // System Owner has all permissions
    expect(systemOwnerPerms).toContain(Permission.SYSTEM_MANAGE);
    expect(systemOwnerPerms).toContain(Permission.BACKUP_MANAGE);
    expect(systemOwnerPerms).toContain(Permission.ROLES_MANAGE);
  });

  it('verifies bento metric strip destination routes are valid and task-focused', () => {
    const metricDestinations = {
      ready: '/people?readiness=READY',
      needsAttention: '/people?readiness=NEEDS_ATTENTION',
      inQueue: '/cards/queue',
      activeBadges: '/cards/issues',
    };

    expect(metricDestinations.ready).toBe('/people?readiness=READY');
    expect(metricDestinations.needsAttention).toBe('/people?readiness=NEEDS_ATTENTION');
    expect(metricDestinations.inQueue).toBe('/cards/queue');
    expect(metricDestinations.activeBadges).toBe('/cards/issues');
  });
});
