/**
 * @acg/governance
 *
 * Organization governance — RBAC, SSO/SAML stub, audit trails, organization hierarchy.
 */

// ─── RBAC ───────────────────────────────────────────────

export type Role = 'owner' | 'admin' | 'compliance-officer' | 'developer' | 'viewer';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'export';
}

export interface RoleDefinition {
  role: Role;
  description: string;
  permissions: Permission[];
  inheritsFrom?: Role;
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'owner',
    description: 'Full access to all resources and organization settings',
    permissions: [
      { resource: '*', action: 'create' },
      { resource: '*', action: 'read' },
      { resource: '*', action: 'update' },
      { resource: '*', action: 'delete' },
      { resource: '*', action: 'execute' },
      { resource: '*', action: 'export' },
    ],
  },
  {
    role: 'admin',
    description: 'Manage users, policies, and organization settings',
    permissions: [
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      { resource: 'policies', action: 'create' },
      { resource: 'policies', action: 'read' },
      { resource: 'policies', action: 'update' },
      { resource: 'policies', action: 'delete' },
      { resource: 'projects', action: 'create' },
      { resource: 'projects', action: 'read' },
      { resource: 'projects', action: 'update' },
      { resource: 'billing', action: 'read' },
      { resource: 'billing', action: 'update' },
      { resource: 'audit-logs', action: 'read' },
      { resource: 'scan', action: 'execute' },
    ],
    inheritsFrom: 'developer',
  },
  {
    role: 'compliance-officer',
    description: 'Manage compliance policies, view audit trails, manage packs',
    permissions: [
      { resource: 'policies', action: 'create' },
      { resource: 'policies', action: 'read' },
      { resource: 'policies', action: 'update' },
      { resource: 'policies', action: 'delete' },
      { resource: 'compliance-packs', action: 'read' },
      { resource: 'compliance-packs', action: 'execute' },
      { resource: 'audit-logs', action: 'read' },
      { resource: 'audit-logs', action: 'export' },
      { resource: 'compliance-scores', action: 'read' },
      { resource: 'scan', action: 'execute' },
    ],
    inheritsFrom: 'viewer',
  },
  {
    role: 'developer',
    description: 'Run scans, view results, manage own API keys',
    permissions: [
      { resource: 'scan', action: 'execute' },
      { resource: 'scan-results', action: 'read' },
      { resource: 'bom', action: 'read' },
      { resource: 'compliance-scores', action: 'read' },
      { resource: 'api-keys', action: 'create' },
      { resource: 'api-keys', action: 'read' },
      { resource: 'api-keys', action: 'delete' },
      { resource: 'projects', action: 'read' },
    ],
    inheritsFrom: 'viewer',
  },
  {
    role: 'viewer',
    description: 'Read-only access to compliance data',
    permissions: [
      { resource: 'dashboard', action: 'read' },
      { resource: 'compliance-scores', action: 'read' },
      { resource: 'scan-results', action: 'read' },
      { resource: 'bom', action: 'read' },
    ],
  },
];

export class RBACManager {
  private roles: Map<Role, RoleDefinition> = new Map();
  private userRoles: Map<string, { role: Role; assignedAt: Date; assignedBy: string }> = new Map();

  constructor() {
    for (const def of ROLE_DEFINITIONS) {
      this.roles.set(def.role, def);
    }
  }

  /** Assign a role to a user */
  assignRole(userId: string, role: Role, assignedBy: string): void {
    this.userRoles.set(userId, { role, assignedAt: new Date(), assignedBy });
  }

  /** Remove a user's role */
  removeRole(userId: string): boolean {
    return this.userRoles.delete(userId);
  }

  /** Get a user's role */
  getUserRole(userId: string): Role | undefined {
    return this.userRoles.get(userId)?.role;
  }

  /** Check if a user has a specific permission */
  hasPermission(userId: string, resource: string, action: Permission['action']): boolean {
    const userRole = this.userRoles.get(userId)?.role;
    if (!userRole) return false;

    const roleDef = this.roles.get(userRole);
    if (!roleDef) return false;

    return this.checkPermission(roleDef, resource, action);
  }

  private checkPermission(roleDef: RoleDefinition, resource: string, action: Permission['action']): boolean {
    // Check direct permissions
    for (const perm of roleDef.permissions) {
      if ((perm.resource === '*' || perm.resource === resource) && perm.action === action) {
        return true;
      }
    }

    // Check inherited permissions
    if (roleDef.inheritsFrom) {
      const parentDef = this.roles.get(roleDef.inheritsFrom);
      if (parentDef) return this.checkPermission(parentDef, resource, action);
    }

    return false;
  }

  /** List all roles */
  listRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /** Get role definition */
  getRole(role: Role): RoleDefinition | undefined {
    return this.roles.get(role);
  }

  /** List users with their roles */
  listUsers(): Array<{ userId: string; role: Role; assignedAt: Date }> {
    return Array.from(this.userRoles.entries()).map(([userId, data]) => ({
      userId,
      role: data.role,
      assignedAt: data.assignedAt,
    }));
  }
}

// ─── Audit Trail ────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'denied';
}

export class AuditTrail {
  private entries: AuditEntry[] = [];

  /** Record an audit event */
  record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const auditEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };
    this.entries.push(auditEntry);
    return auditEntry;
  }

  /** Query audit entries */
  query(filters: {
    userId?: string;
    organizationId?: string;
    action?: string;
    resource?: string;
    outcome?: AuditEntry['outcome'];
    since?: Date;
    limit?: number;
  }): AuditEntry[] {
    let results = [...this.entries];

    if (filters.userId) results = results.filter((e) => e.userId === filters.userId);
    if (filters.organizationId) results = results.filter((e) => e.organizationId === filters.organizationId);
    if (filters.action) results = results.filter((e) => e.action === filters.action);
    if (filters.resource) results = results.filter((e) => e.resource === filters.resource);
    if (filters.outcome) results = results.filter((e) => e.outcome === filters.outcome);
    if (filters.since) results = results.filter((e) => e.timestamp >= filters.since!);

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) results = results.slice(0, filters.limit);

    return results;
  }

  /** Get audit statistics */
  stats(): {
    total: number;
    byAction: Record<string, number>;
    byOutcome: Record<string, number>;
    recentFailures: AuditEntry[];
  } {
    const byAction: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};

    for (const entry of this.entries) {
      byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;
      byOutcome[entry.outcome] = (byOutcome[entry.outcome] ?? 0) + 1;
    }

    const recentFailures = this.entries
      .filter((e) => e.outcome === 'failure' || e.outcome === 'denied')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return { total: this.entries.length, byAction, byOutcome, recentFailures };
  }

  /** Export entries as JSON */
  export(): AuditEntry[] {
    return [...this.entries];
  }

  /** Clear all entries */
  clear(): void {
    this.entries = [];
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

// ─── SSO/SAML Stub ─────────────────────────────────────

export interface SSOConfig {
  enabled: boolean;
  provider: 'saml' | 'oidc' | 'oauth2' | 'azure-ad' | 'google-workspace' | null;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  callbackUrl?: string;
  domain?: string; // e.g. "company.com"
}

export interface SSOUser {
  email: string;
  name: string;
  provider: string;
  providerUserId: string;
  groups: string[];
  role?: Role;
}

export class SSOManager {
  private config: SSOConfig = {
    enabled: false,
    provider: null,
  };

  private ssoUsers: Map<string, SSOUser> = new Map();

  /** Configure SSO */
  configure(config: SSOConfig): void {
    this.config = config;
  }

  /** Get current SSO config */
  getConfig(): SSOConfig {
    return { ...this.config };
  }

  /** Check if SSO is configured */
  isConfigured(): boolean {
    return this.config.enabled && this.config.provider !== null;
  }

  /** Simulate SSO login (stub) */
  simulateLogin(email: string, name: string): SSOUser {
    const user: SSOUser = {
      email,
      name,
      provider: this.config.provider ?? 'unknown',
      providerUserId: `sso_${email}`,
      groups: ['default'],
    };

    this.ssoUsers.set(email, user);
    return user;
  }

  /** Map SSO group to ACG role */
  mapGroupToRole(group: string): Role {
    const mapping: Record<string, Role> = {
      'admin': 'admin',
      'compliance': 'compliance-officer',
      'developers': 'developer',
      'readonly': 'viewer',
      'owners': 'owner',
    };
    return mapping[group] ?? 'viewer';
  }

  /** List SSO users */
  listUsers(): SSOUser[] {
    return Array.from(this.ssoUsers.values());
  }
}

// ─── Organization Manager ───────────────────────────────

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'developer' | 'startup' | 'business' | 'enterprise';
  createdAt: Date;
  settings: {
    defaultCompliancePacks: string[];
    dataRegion: string;
    ssoEnabled: boolean;
    auditRetentionDays: number;
  };
}

export class OrganizationManager {
  private orgs: Map<string, Organization> = new Map();

  /** Create an organization */
  create(id: string, name: string, plan: Organization['plan'] = 'free'): Organization {
    const org: Organization = {
      id,
      name,
      plan,
      createdAt: new Date(),
      settings: {
        defaultCompliancePacks: [],
        dataRegion: 'us-east-1',
        ssoEnabled: false,
        auditRetentionDays: 90,
      },
    };
    this.orgs.set(id, org);
    return org;
  }

  /** Get an organization */
  get(id: string): Organization | undefined {
    return this.orgs.get(id);
  }

  /** Update organization settings */
  updateSettings(id: string, settings: Partial<Organization['settings']>): boolean {
    const org = this.orgs.get(id);
    if (!org) return false;
    org.settings = { ...org.settings, ...settings };
    return true;
  }

  /** List all organizations */
  list(): Organization[] {
    return Array.from(this.orgs.values());
  }
}
