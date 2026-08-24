import { describe, it, expect } from 'vitest';
import {
  BuiltInRole,
  BUILT_IN_ROLE_PERMISSIONS,
  Permission,
  DEFAULT_CARD_DIMENSIONS,
} from '../src/index.js';

describe('Domain invariants', () => {
  it('system owner must possess all permissions', () => {
    const ownerPerms = BUILT_IN_ROLE_PERMISSIONS[BuiltInRole.SYSTEM_OWNER];
    expect(ownerPerms).toEqual(Object.values(Permission));
  });

  it('auditor viewer must not have edit or issue permissions', () => {
    const auditorPerms = BUILT_IN_ROLE_PERMISSIONS[BuiltInRole.AUDITOR_VIEWER];
    expect(auditorPerms).toContain(Permission.AUDIT_VIEW);
    expect(auditorPerms).not.toContain(Permission.PEOPLE_EDIT);
    expect(auditorPerms).not.toContain(Permission.CARDS_ISSUE);
  });

  it('default card dimensions must be 60x90mm vertical', () => {
    expect(DEFAULT_CARD_DIMENSIONS.widthMm).toBe(60);
    expect(DEFAULT_CARD_DIMENSIONS.heightMm).toBe(90);
    expect(DEFAULT_CARD_DIMENSIONS.orientation).toBe('vertical');
  });
});
