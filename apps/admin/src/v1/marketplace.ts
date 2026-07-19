import type { FastifyRequest, FastifyReply } from 'fastify';
import { PackRegistry } from '@acg/marketplace';
import { PluginRegistry, type PluginManifest } from '@acg/community-plugins';
import { RBACManager, AuditTrail, SSOManager, OrganizationManager, type Role } from '@acg/governance';

export const packRegistry = new PackRegistry();
export const pluginRegistry = new PluginRegistry();
export const rbac = new RBACManager();
export const auditTrail = new AuditTrail();
export const sso = new SSOManager();
export const orgManager = new OrganizationManager();

// Marketplace handlers
export async function listPacksHandler(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ packs: packRegistry.list().map((p: any) => ({ name: p.manifest.name, version: p.manifest.version, verified: p.verified, downloads: p.downloads })) });
}

export async function getPackHandler(request: FastifyRequest, reply: FastifyReply) {
  const { name } = request.params as { name: string };
  const pack = packRegistry.get(name);
  if (!pack) return reply.code(404).send({ error: 'Pack not found' });
  return reply.send(pack);
}

export async function installPackHandler(request: FastifyRequest, reply: FastifyReply) {
  const { name } = request.params as { name: string };
  return reply.send(packRegistry.install(name));
}

export async function uninstallPackHandler(request: FastifyRequest, reply: FastifyReply) {
  const { name } = request.params as { name: string };
  return reply.send({ success: packRegistry.uninstall(name) });
}

export async function searchPacksHandler(request: FastifyRequest, reply: FastifyReply) {
  const { q } = request.query as { q: string };
  return reply.send({ results: packRegistry.search(q ?? '') });
}

// Plugin handlers
export async function listPluginsHandler(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ plugins: pluginRegistry.listAvailable().map((p: any) => ({ name: p.name, version: p.version, type: p.type })) });
}

export async function validatePluginHandler(request: FastifyRequest, reply: FastifyReply) {
  const manifest = request.body as PluginManifest;
  return reply.send(pluginRegistry.validate(manifest));
}

export async function installPluginHandler(request: FastifyRequest, reply: FastifyReply) {
  const { manifest, config } = request.body as { manifest: PluginManifest; config?: Record<string, unknown> };
  return reply.send(pluginRegistry.install(manifest, config));
}

// RBAC handlers
export async function assignRoleHandler(request: FastifyRequest, reply: FastifyReply) {
  const { userId, role, assignedBy } = request.body as { userId: string; role: Role; assignedBy: string };
  rbac.assignRole(userId, role, assignedBy);
  return reply.send({ success: true });
}

export async function checkPermissionHandler(request: FastifyRequest, reply: FastifyReply) {
  const { userId, resource, action } = request.query as { userId: string; resource: string; action: string };
  return reply.send({ allowed: rbac.hasPermission(userId, resource, action as any) });
}

// Audit handlers
export async function queryAuditHandler(request: FastifyRequest, reply: FastifyReply) {
  const filters = request.query as { userId?: string; action?: string; limit?: number };
  return reply.send({ entries: auditTrail.query(filters) });
}

export async function auditStatsHandler(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(auditTrail.stats());
}
