import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

export interface ScanResult {
  rootPath: string;
  filesScanned: number;
  findings: ScanFinding[];
  summary: ScanSummary;
}

export interface ScanFinding {
  type: 'sdk' | 'prompt' | 'secret' | 'env-var' | 'config' | 'model-ref';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line?: number;
  message: string;
  detail?: string;
}

export interface ScanSummary {
  sdks: string[];
  promptsFound: number;
  secretsFound: number;
  envVarsFound: number;
  configsFound: number;
  modelRefs: string[];
  riskScore: number;
}

const SDK_PATTERNS: Array<{ name: string; pattern: RegExp; severity: ScanFinding['severity'] }> = [
  { name: 'openai', pattern: /from\s+['"]openai['"]|require\(['"]openai['"]\)|import.*['"]openai['"]/g, severity: 'info' },
  { name: '@anthropic-ai/sdk', pattern: /from\s+['"]@anthropic-ai\/sdk['"]|require\(['"]@anthropic-ai\/sdk['"]\)|import.*['"]@anthropic-ai\/sdk['"]/g, severity: 'info' },
  { name: '@google/generative-ai', pattern: /from\s+['"]@google\/generative-ai['"]|require\(['"]@google\/generative-ai['"]\)/g, severity: 'info' },
  { name: 'langchain', pattern: /from\s+['"]langchain|require\(['"]langchain|import.*['"]langchain/g, severity: 'info' },
  { name: 'llamaindex', pattern: /from\s+['"]llamaindex|require\(['"]llamaindex|import.*['"]llamaindex/g, severity: 'info' },
  { name: 'anthropic', pattern: /from\s+['"]anthropic['"]|require\(['"]anthropic['"]\)|import.*['"]anthropic['"]/g, severity: 'info' },
  { name: 'cohere-ai', pattern: /from\s+['"]cohere-ai['"]|require\(['"]cohere-ai['"]\)/g, severity: 'info' },
  { name: 'ai (Vercel)', pattern: /from\s+['"]ai['"]|require\(['"]ai['"]\)|import.*['"]ai['"]/g, severity: 'info' },
  { name: 'crewai', pattern: /from\s+['"]crewai['"]|require\(['"]crewai['"]\)|import.*['"]crewai['"]/g, severity: 'info' },
  { name: 'mastra', pattern: /from\s+['"]@mastra|require\(['"]@mastra|import.*['"]@mastra/g, severity: 'info' },
  { name: 'ollama', pattern: /from\s+['"]ollama['"]|require\(['"]ollama['"]\)|import.*['"]ollama['"]/g, severity: 'info' },
];

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp; severity: ScanFinding['severity'] }> = [
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{20,}/g, severity: 'critical' },
  { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9-]{20,}/g, severity: 'critical' },
  { name: 'Google API Key', pattern: /AIza[a-zA-Z0-9_-]{35}/g, severity: 'critical' },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'Bearer Token', pattern: /Bearer\s+[a-zA-Z0-9._-]{20,}/g, severity: 'high' },
  { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9._-]{16,}['"]/gi, severity: 'high' },
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g, severity: 'critical' },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, severity: 'high' },
];

const ENV_VAR_PATTERNS = [
  /OPENAI_API_KEY/g,
  /ANTHROPIC_API_KEY/g,
  /GOOGLE_API_KEY/g,
  /AZURE_OPENAI/g,
  /AWS_BEDROCK/g,
  /COHERE_API_KEY/g,
  /HUGGINGFACE_TOKEN/g,
  /LANGCHAIN_API_KEY/g,
  /LANGFUSE_/g,
  /OPENAI_ORG_ID/g,
];

const MODEL_REF_PATTERNS = [
  /gpt-4o-mini/gi,
  /gpt-4o/gi,
  /gpt-4-turbo/gi,
  /gpt-3\.5-turbo/gi,
  /claude-sonnet/gi,
  /claude-3/gi,
  /gemini/gi,
  /llama/gi,
  /mistral/gi,
  /mixtral/gi,
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', 'build', '.git', '__pycache__', '.venv', 'venv']);

function walkDir(dir: string, root: string, results: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, root, results);
    } else if (EXTENSIONS.has(extname(entry).toLowerCase())) {
      results.push(fullPath);
    }
  }
}

export function scanProject(rootPath: string): ScanResult {
  const files: string[] = [];
  walkDir(rootPath, rootPath, files);

  const findings: ScanFinding[] = [];
  const sdks = new Set<string>();
  const modelRefs = new Set<string>();
  let promptsFound = 0;
  let secretsFound = 0;
  let envVarsFound = 0;
  let configsFound = 0;

  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const relPath = relative(rootPath, filePath);
    const lines = content.split('\n');

    for (const { name, pattern, severity } of SDK_PATTERNS) {
      for (const line of lines) {
        if (pattern.test(line)) {
          sdks.add(name);
          findings.push({ type: 'sdk', severity, file: relPath, message: `AI SDK detected: ${name}` });
        }
        pattern.lastIndex = 0;
      }
    }

    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          secretsFound++;
          findings.push({
            type: 'secret',
            severity,
            file: relPath,
            line: i + 1,
            message: `Potential secret: ${name}`,
            detail: 'Rotated before committing',
          });
        }
        pattern.lastIndex = 0;
      }
    }

    for (const pattern of ENV_VAR_PATTERNS) {
      for (const line of lines) {
        if (pattern.test(line)) {
          envVarsFound++;
          findings.push({ type: 'env-var', severity: 'medium', file: relPath, message: `AI env var: ${pattern.source}` });
        }
        pattern.lastIndex = 0;
      }
    }

    for (const pattern of MODEL_REF_PATTERNS) {
      for (const line of lines) {
        if (pattern.test(line)) {
          modelRefs.add(line.trim().substring(0, 60));
        }
        pattern.lastIndex = 0;
      }
    }

    if (/\.(txt|md|yaml|yml|json)$/.test(filePath)) {
      if (/prompt|template|instruction|system/i.test(filePath)) {
        promptsFound++;
        findings.push({ type: 'prompt', severity: 'low', file: relPath, message: 'Potential prompt file' });
      }
    }

    if (/(langfuse|langsmith|helicone|agenta)/i.test(content)) {
      configsFound++;
      findings.push({ type: 'config', severity: 'info', file: relPath, message: 'AI observability tool detected' });
    }
  }

  const riskScore = Math.min(100,
    secretsFound * 25 +
    envVarsFound * 5 +
    (sdks.size * 2) +
    (promptsFound * 3)
  );

  return {
    rootPath,
    filesScanned: files.length,
    findings,
    summary: {
      sdks: [...sdks],
      promptsFound,
      secretsFound,
      envVarsFound,
      configsFound,
      modelRefs: [...modelRefs],
      riskScore,
    },
  };
}
