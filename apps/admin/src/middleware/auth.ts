import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface JWTPayload {
  sub: string;
  orgId: string;
  role?: string;
  iat: number;
  exp: number;
}

function verifyJWT(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [headerB64, payloadB64, sig] = parts;
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`${headerB64}.${payloadB64}`);
  const expectedSig = hmac.digest('base64url');

  if (sig !== expectedSig) throw new Error('Invalid signature');

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as JWTPayload;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

export function createJWT(sub: string, orgId: string, role?: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub, orgId, role, iat: now, exp: now + 3600 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyJWT(token);
    (request as FastifyRequest & { userId: string; orgId: string }).userId = payload.sub;
    (request as FastifyRequest & { userId: string; orgId: string }).orgId = payload.orgId;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

export function signJWT(sub: string, orgId: string, role?: string): string {
  return createJWT(sub, orgId, role);
}
