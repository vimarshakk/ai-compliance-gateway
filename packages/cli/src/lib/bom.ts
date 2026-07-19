import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

export interface BomEntry {
  category: 'model' | 'framework' | 'database' | 'policy' | 'guardrail' | 'observability' | 'mcp' | 'ci-cd' | 'compliance-pack' | 'sdk';
  name: string;
  version?: string;
  source?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface BomResult {
  rootPath: string;
  generatedAt: string;
  entries: BomEntry[];
  categories: Record<string, BomEntry[]>;
}

const MODEL_REFS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /gpt-4o-mini/i, name: 'GPT-4o Mini' },
  { pattern: /gpt-4o/i, name: 'GPT-4o' },
  { pattern: /gpt-4-turbo/i, name: 'GPT-4 Turbo' },
  { pattern: /gpt-3\.?5-turbo/i, name: 'GPT-3.5 Turbo' },
  { pattern: /claude-sonnet/i, name: 'Claude Sonnet' },
  { pattern: /claude-3-5-haiku/i, name: 'Claude 3.5 Haiku' },
  { pattern: /claude-3-opus/i, name: 'Claude 3 Opus' },
  { pattern: /gemini-2\.?0-flash/i, name: 'Gemini 2.0 Flash' },
  { pattern: /gemini-1\.?5-pro/i, name: 'Gemini 1.5 Pro' },
  { pattern: /gemini-1\.?5-flash/i, name: 'Gemini 1.5 Flash' },
  { pattern: /llama-?3/i, name: 'Llama 3' },
  { pattern: /mixtral/i, name: 'Mixtral' },
  { pattern: /mistral/i, name: 'Mistral' },
  { pattern: /phi-?3/i, name: 'Phi-3' },
  { pattern: /codellama/i, name: 'CodeLlama' },
];

const FRAMEWORKS: Array<{ pattern: RegExp; name: string; category: BomEntry['category'] }> = [
  { pattern: /langchain/i, name: 'LangChain', category: 'framework' },
  { pattern: /llamaindex/i, name: 'LlamaIndex', category: 'framework' },
  { pattern: /crewai/i, name: 'CrewAI', category: 'framework' },
  { pattern: /@mastra/i, name: 'Mastra', category: 'framework' },
  { pattern: /openai-agents/i, name: 'OpenAI Agents SDK', category: 'framework' },
  { pattern: /vercel.*ai|ai\/react/i, name: 'Vercel AI SDK', category: 'framework' },
  { pattern: /autogen/i, name: 'AutoGen', category: 'framework' },
  { pattern: /semantic-kernel/i, name: 'Semantic Kernel', category: 'framework' },
];

const INFRA_REFS: Array<{ pattern: RegExp; name: string; category: BomEntry['category'] }> = [
  { pattern: /qdrant/i, name: 'Qdrant', category: 'database' },
  { pattern: /pinecone/i, name: 'Pinecone', category: 'database' },
  { pattern: /weaviate/i, name: 'Weaviate', category: 'database' },
  { pattern: /chroma/i, name: 'ChromaDB', category: 'database' },
  { pattern: /redis/i, name: 'Redis', category: 'database' },
  { pattern: /postgres|prisma/i, name: 'PostgreSQL', category: 'database' },
  { pattern: /mongo/i, name: 'MongoDB', category: 'database' },
  { pattern: /langfuse/i, name: 'Langfuse', category: 'observability' },
  { pattern: /langsmith/i, name: 'LangSmith', category: 'observability' },
  { pattern: /helicone/i, name: 'Helicone', category: 'observability' },
  { pattern: /opentelemetry|otel/i, name: 'OpenTelemetry', category: 'observability' },
  { pattern: /prometheus/i, name: 'Prometheus', category: 'observability' },
  { pattern: /grafana/i, name: 'Grafana', category: 'observability' },
  { pattern: /nats/i, name: 'NATS', category: 'database' },
  { pattern: /rabbitmq/i, name: 'RabbitMQ', category: 'database' },
  { pattern: /minio/i, name: 'MinIO', category: 'database' },
  { pattern: /vault/i, name: 'HashiCorp Vault', category: 'database' },
  { pattern: /opa|open-policy-agent/i, name: 'Open Policy Agent', category: 'policy' },
  { pattern: /presidio/i, name: 'Microsoft Presidio', category: 'guardrail' },
  { pattern: /nemo.guardrails/i, name: 'NeMo Guardrails', category: 'guardrail' },
  { pattern: /guardrails/i, name: 'Guardrails AI', category: 'guardrail' },
  { pattern: /mcp|mcp-server/i, name: 'MCP Server', category: 'mcp' },
  { pattern: /\.github\/workflows/i, name: 'GitHub Actions', category: 'ci-cd' },
  { pattern: /gitlab.*ci/i, name: 'GitLab CI', category: 'ci-cd' },
  { pattern: /jenkins/i, name: 'Jenkins', category: 'ci-cd' },
];

const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', 'build', '.git', '__pycache__', '.venv', 'venv']);
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.yaml', '.yml', '.json', '.toml', '.lock']);

function walkDir(dir: string, root: string, results: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, root, results);
    } else if (SCAN_EXTENSIONS.has(extname(entry).toLowerCase())) {
      results.push(fullPath);
    }
  }
}

function readPackageJson(rootPath: string): Record<string, string> {
  const pkgPath = join(rootPath, 'package.json');
  if (!existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return {};
  }
}

function readLockfileVersions(rootPath: string): Record<string, string> {
  const versions: Record<string, string> = {};
  const lockPath = join(rootPath, 'pnpm-lock.yaml');
  if (!existsSync(lockPath)) return versions;
  try {
    const content = readFileSync(lockPath, 'utf-8');
    const matches = content.matchAll(/^  ([a-z@][a-z0-9@/_-]+): ([^\s]+)/gm);
    for (const [, name, ver] of matches) {
      if (name && ver) versions[name] = ver;
    }
  } catch { /* ignore */ }
  return versions;
}

export function generateBom(rootPath: string): BomResult {
  const files: string[] = [];
  walkDir(rootPath, rootPath, files);

  const entries: BomEntry[] = [];
  const seen = new Set<string>();

  const pkgDeps = readPackageJson(rootPath);
  const lockVersions = readLockfileVersions(rootPath);

  function addEntry(category: BomEntry['category'], name: string, source?: string, confidence: BomEntry['confidence'] = 'high', version?: string) {
    const key = `${category}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    const resolvedVersion = version || lockVersions[name];
    entries.push({ category, name, version: resolvedVersion, source, confidence });
  }

  for (const [depName] of Object.entries(pkgDeps)) {
    for (const { pattern, name } of MODEL_REFS) {
      if (pattern.test(depName)) addEntry('model', name, 'package.json', 'high');
    }
    for (const { pattern, name, category } of FRAMEWORKS) {
      if (pattern.test(depName)) addEntry(category, name, 'package.json', 'high');
    }
    for (const { pattern, name, category } of INFRA_REFS) {
      if (pattern.test(depName)) addEntry(category, name, 'package.json', 'high');
    }
  }

  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const relPath = relative(rootPath, filePath);

    for (const { pattern, name } of MODEL_REFS) {
      if (pattern.test(content)) addEntry('model', name, relPath, 'medium');
    }
    for (const { pattern, name, category } of FRAMEWORKS) {
      if (pattern.test(content)) addEntry(category, name, relPath, 'medium');
    }
    for (const { pattern, name, category } of INFRA_REFS) {
      if (pattern.test(content)) addEntry(category, name, relPath, 'medium');
    }
  }

  const categories: Record<string, BomEntry[]> = {};
  for (const entry of entries) {
    if (!categories[entry.category]) categories[entry.category] = [];
    categories[entry.category].push(entry);
  }

  return {
    rootPath,
    generatedAt: new Date().toISOString(),
    entries,
    categories,
  };
}
