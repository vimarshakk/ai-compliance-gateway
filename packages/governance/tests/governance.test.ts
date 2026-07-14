import { describe, it, expect, beforeEach } from 'vitest';
import { RBACManager, AuditTrail, SSOManager, OrganizationManager, type Role } from '../src/index.js';

describe('RBACManager', () => {
  let rbac: RBACManager;

  beforeEach(() => {
    rbac = new RBACManager();
  });

  it('should have 5 roles defined', () => {
    expect(rbac.listRoles()).toHaveLength(5);
  });

  it('should assign and get user role', () => {
    rbac.assignRole('user1', 'admin', 'owner1');
    expect(rbac.getUserRole('user1')).toBe('admin');
  });

  it('should remove user role', () => {
    rbac.assignRole('user1', 'admin', 'owner1');
    expect(rbac.removeRole('user1')).toBe(true);
    expect(rbac.getUserRole('user1')).toBeUndefined();
  });

  it('should check owner has all permissions', () => {
    rbac.assignRole('owner1', 'owner', 'system');
    expect(rbac.hasPermission('owner1', 'policies', 'create')).toBe(true);
    expect(rbac.hasPermission('owner1', 'billing', 'delete')).toBe(true);
    expect(rbac.hasPermission('owner1', 'anything', 'execute')).toBe(true);
  });

  it('should check viewer has only read permissions', () => {
    rbac.assignRole('viewer1', 'viewer', 'admin1');
    expect(rbac.hasPermission('viewer1', 'dashboard', 'read')).toBe(true);
    expect(rbac.hasPermission('viewer1', 'policies', 'create')).toBe(false);
    expect(rbac.hasPermission('viewer1', 'billing', 'update')).toBe(false);
  });

  it('should check developer can scan', () => {
    rbac.assignRole('dev1', 'developer', 'admin1');
    expect(rbac.hasPermission('dev1', 'scan', 'execute')).toBe(true);
    expect(rbac.hasPermission('dev1', 'scan-results', 'read')).toBe(true);
    expect(rbac.hasPermission('dev1', 'policies', 'create')).toBe(false);
  });

  it('should check compliance-officer can manage policies', () => {
    rbac.assignRole('co1', 'compliance-officer', 'admin1');
    expect(rbac.hasPermission('co1', 'policies', 'create')).toBe(true);
    expect(rbac.hasPermission('co1', 'policies', 'update')).toBe(true);
    expect(rbac.hasPermission('co1', 'audit-logs', 'read')).toBe(true);
    expect(rbac.hasPermission('co1', 'audit-logs', 'export')).toBe(true);
    expect(rbac.hasPermission('co1', 'billing', 'update')).toBe(false);
  });

  it('should check admin inherits developer permissions', () => {
    rbac.assignRole('admin1', 'admin', 'owner1');
    expect(rbac.hasPermission('admin1', 'scan', 'execute')).toBe(true);
    expect(rbac.hasPermission('admin1', 'users', 'create')).toBe(true);
    expect(rbac.hasPermission('admin1', 'billing', 'read')).toBe(true);
  });

  it('should deny unassigned users', () => {
    expect(rbac.hasPermission('nobody', 'dashboard', 'read')).toBe(false);
  });

  it('should list users with roles', () => {
    rbac.assignRole('u1', 'admin', 'owner');
    rbac.assignRole('u2', 'viewer', 'owner');
    const users = rbac.listUsers();
    expect(users).toHaveLength(2);
    expect(users.map((u) => u.userId)).toContain('u1');
    expect(users.map((u) => u.userId)).toContain('u2');
  });
});

describe('AuditTrail', () => {
  let trail: AuditTrail;

  beforeEach(() => {
    trail = new AuditTrail();
  });

  it('should record audit entries', () => {
    const entry = trail.record({
      userId: 'user1',
      organizationId: 'org1',
      action: 'policy.create',
      resource: 'policies',
      outcome: 'success',
    });
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(entry.userId).toBe('user1');
  });

  it('should query by userId', () => {
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'success' });
    trail.record({ userId: 'u2', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'success' });
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'scan', resource: 'scan', outcome: 'success' });

    const results = trail.query({ userId: 'u1' });
    expect(results).toHaveLength(2);
  });

  it('should query by action', () => {
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'success' });
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'scan', resource: 'scan', outcome: 'success' });

    const results = trail.query({ action: 'scan' });
    expect(results).toHaveLength(1);
  });

  it('should query by outcome', () => {
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'success' });
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'failure' });
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'denied' });

    expect(trail.query({ outcome: 'failure' })).toHaveLength(1);
    expect(trail.query({ outcome: 'denied' })).toHaveLength(1);
    expect(trail.query({ outcome: 'success' })).toHaveLength(1);
  });

  it('should query with limit', () => {
    for (let i = 0; i < 20; i++) {
      trail.record({ userId: 'u1', organizationId: 'org1', action: 'test', resource: 'test', outcome: 'success' });
    }
    expect(trail.query({ limit: 5 })).toHaveLength(5);
  });

  it('should return stats', () => {
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'success' });
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'scan', resource: 'scan', outcome: 'failure' });
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'login', resource: 'auth', outcome: 'success' });

    const stats = trail.stats();
    expect(stats.total).toBe(3);
    expect(stats.byAction['login']).toBe(2);
    expect(stats.byAction['scan']).toBe(1);
    expect(stats.byOutcome['success']).toBe(2);
    expect(stats.byOutcome['failure']).toBe(1);
  });

  it('should export and clear', () => {
    trail.record({ userId: 'u1', organizationId: 'org1', action: 'test', resource: 'test', outcome: 'success' });
    expect(trail.export()).toHaveLength(1);
    trail.clear();
    expect(trail.export()).toHaveLength(0);
  });
});

describe('SSOManager', () => {
  let sso: SSOManager;

  beforeEach(() => {
    sso = new SSOManager();
  });

  it('should not be configured by default', () => {
    expect(sso.isConfigured()).toBe(false);
  });

  it('should configure SSO', () => {
    sso.configure({ enabled: true, provider: 'saml', ssoUrl: 'https://sso.example.com', domain: 'example.com' });
    expect(sso.isConfigured()).toBe(true);
    expect(sso.getConfig().provider).toBe('saml');
  });

  it('should simulate login', () => {
    sso.configure({ enabled: true, provider: 'azure-ad' });
    const user = sso.simulateLogin('test@company.com', 'Test User');
    expect(user.email).toBe('test@company.com');
    expect(user.provider).toBe('azure-ad');
  });

  it('should map groups to roles', () => {
    expect(sso.mapGroupToRole('admin')).toBe('admin');
    expect(sso.mapGroupToRole('compliance')).toBe('compliance-officer');
    expect(sso.mapGroupToRole('developers')).toBe('developer');
    expect(sso.mapGroupToRole('unknown')).toBe('viewer');
  });

  it('should list SSO users', () => {
    sso.simulateLogin('a@b.com', 'A');
    sso.simulateLogin('c@d.com', 'C');
    expect(sso.listUsers()).toHaveLength(2);
  });
});

describe('OrganizationManager', () => {
  let orgs: OrganizationManager;

  beforeEach(() => {
    orgs = new OrganizationManager();
  });

  it('should create organization', () => {
    const org = orgs.create('org1', 'Acme Corp', 'business');
    expect(org.id).toBe('org1');
    expect(org.name).toBe('Acme Corp');
    expect(org.plan).toBe('business');
    expect(org.settings.auditRetentionDays).toBe(90);
  });

  it('should get organization', () => {
    orgs.create('org1', 'Acme');
    expect(orgs.get('org1')).toBeDefined();
    expect(orgs.get('org1')!.name).toBe('Acme');
  });

  it('should return undefined for unknown org', () => {
    expect(orgs.get('nonexistent')).toBeUndefined();
  });

  it('should update settings', () => {
    orgs.create('org1', 'Acme');
    expect(orgs.updateSettings('org1', { dataRegion: 'ap-south-1', auditRetentionDays: 365 })).toBe(true);
    expect(orgs.get('org1')!.settings.dataRegion).toBe('ap-south-1');
    expect(orgs.get('org1')!.settings.auditRetentionDays).toBe(365);
  });

  it('should return false when updating unknown org', () => {
    expect(orgs.updateSettings('nonexistent', {})).toBe(false);
  });

  it('should list organizations', () => {
    orgs.create('o1', 'Org 1');
    orgs.create('o2', 'Org 2');
    expect(orgs.list()).toHaveLength(2);
  });
});
