#!/usr/bin/env node

/**
 * ACG MCP Server
 *
 * Exposes ACG tools to Claude, Cursor, and other MCP-compatible AI tools.
 *
 * Tools provided:
 *   - acg_scan: Scan a codebase for compliance issues
 *   - acg_score: Get compliance score for a project
 *   - acg_bom: Generate AI Bill of Materials
 *   - acg_compliance_packs: List available compliance packs
 *   - acg_chat: Send a chat completion with compliance checks
 *   - acg_moderate: Moderate content for PII/toxicity
 *
 * Usage:
 *   npx @acg/mcp-server
 *   # or
 *   acg-mcp
 *
 * Environment:
 *   GATEWAY_URL — ACG Gateway URL (default: http://localhost:3000)
 *   ADMIN_URL   — ACG Admin URL (default: http://localhost:3002)
 *   ACG_API_KEY — API key for authentication
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000';
const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3002';
const API_KEY = process.env.ACG_API_KEY ?? '';

// ─── Helpers ────────────────────────────────────────────

async function acgRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = path.startsWith('/v1') || path.startsWith('/engines')
    ? `${ADMIN_URL}${path}`
    : `${GATEWAY_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) headers['X-Api-Key'] = API_KEY;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`ACG Error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json();
}

// ─── MCP Server ─────────────────────────────────────────

const server = new McpServer({
  name: 'acg-mcp',
  version: '0.1.0',
});

// ─── Tool: acg_scan ─────────────────────────────────────

server.tool(
  'acg_scan',
  'Scan a codebase for AI compliance issues (secrets, model references, guardrails)',
  {
    path: z.string().describe('Path to the project directory to scan'),
  },
  async ({ path }) => {
    try {
      const result = await acgRequest('POST', '/v1/tools/scan', {
        path,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Scan failed: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: acg_score ────────────────────────────────────

server.tool(
  'acg_score',
  'Get the compliance score for a project',
  {
    path: z.string().describe('Path to the project directory'),
  },
  async ({ path }) => {
    try {
      const result = await acgRequest('POST', '/v1/tools/scan', { path });
      const scoreResult = await acgRequest('POST', '/v1/tools/bom', { path });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                scan: result,
                bom: scoreResult,
                message: 'Use the CLI command `acg score` for a formatted score',
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Score calculation failed: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: acg_bom ──────────────────────────────────────

server.tool(
  'acg_bom',
  'Generate an AI Bill of Materials for a project',
  {
    path: z.string().describe('Path to the project directory'),
  },
  async ({ path }) => {
    try {
      const result = await acgRequest('POST', '/v1/tools/bom', { path });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `BOM generation failed: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: acg_compliance_packs ─────────────────────────

server.tool(
  'acg_compliance_packs',
  'List available compliance packs (DPDP, HIPAA, GDPR, PCI-DSS, SOC2, etc.)',
  {},
  async () => {
    try {
      const result = await acgRequest('GET', '/v1/tools/packs');
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to list packs: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: acg_chat ─────────────────────────────────────

server.tool(
  'acg_chat',
  'Send a chat completion with compliance checks through ACG',
  {
    message: z.string().describe('User message to send'),
    model: z.string().optional().describe('Model to use (default: gpt-4o-mini)'),
    compliance_pack: z
      .string()
      .optional()
      .describe('Compliance pack to enable (dpdp, hipaa, gdpr, pci-dss, soc2)'),
  },
  async ({ message, model, compliance_pack }) => {
    try {
      const body: Record<string, unknown> = {
        model: model ?? 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
      };
      if (compliance_pack) body.compliancePack = compliance_pack;

      const result = await acgRequest('POST', '/chat/completions', body);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Chat failed: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: acg_moderate ─────────────────────────────────

server.tool(
  'acg_moderate',
  'Moderate content for PII, profanity, and toxicity',
  {
    text: z.string().describe('Text content to moderate'),
  },
  async ({ text }) => {
    try {
      const result = await acgRequest('POST', '/moderations', {
        text,
        contentTypes: ['pii', 'profanity', 'toxicity'],
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Moderation failed: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Tool: acg_health ───────────────────────────────────

server.tool(
  'acg_health',
  'Check if the ACG gateway is healthy',
  {},
  async () => {
    try {
      const result = await acgRequest('GET', '/health');
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Health check failed: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Start ──────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ACG MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
