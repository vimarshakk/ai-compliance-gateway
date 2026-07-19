import { randomBytes, createHash } from 'node:crypto';

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateApiKey(): string {
  return `acg_${randomBytes(32).toString('base64url')}`;
}

export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function immutableHash(data: Record<string, unknown>): string {
  const sorted = Object.keys(data).sort().reduce((a, k) => ({ ...a, [k]: data[k] }), {});
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

export function maskPII(value: string, type: string): string {
  if (!value) return value;
  const masks: Record<string, (v: string) => string> = {
    aadhaar: (v) => v.replace(/\d{4}\s?\d{4}\s?\d{4}/, 'XXXX XXXX XXXX'),
    pan: (v) => v.replace(/[A-Z]{5}\d{4}[A-Z]/, 'XXXXX9999X'),
    email: (v) => v.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    mobile_number: (v) => v.replace(/(\d{2})\d*(\d{2})/, '$1****$2'),
    credit_card: (v) => v.replace(/\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/, 'XXXX XXXX XXXX XXXX'),
    bank_account: (v) => v.replace(/(\d{0}).+(\d{4})/, '****$2'),
    passport: (v) => v.replace(/[A-Z]\d{7}/, 'X*******'),
  };
  return (masks[type] ?? ((v) => v.substring(0, 2) + '*'.repeat(Math.max(0, v.length - 4)) + v.slice(-2)))(value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
