import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { scanProject } from '@acg/cli';
import { generateBom } from '@acg/cli';
import { resolve } from 'node:path';

export async function scanProjectHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { path?: string };
  const rootPath = resolve(body.path ?? process.cwd());

  try {
    const result = scanProject(rootPath);
    return reply.send(result);
  } catch (err) {
    return reply.status(500).send({ error: `Scan failed: ${err}` });
  }
}

export async function generateBomHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { path?: string };
  const rootPath = resolve(body.path ?? process.cwd());

  try {
    const bom = generateBom(rootPath);
    return reply.send(bom);
  } catch (err) {
    return reply.status(500).send({ error: `BOM generation failed: ${err}` });
  }
}

export async function compliancePacksHandler(request: FastifyRequest, reply: FastifyReply) {
  // Import from CLI package
  const { compliancePacks } = await import('@acg/cli');
  return reply.send({ packs: compliancePacks, total: compliancePacks.length });
}
