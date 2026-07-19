import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ScanResult {
  secrets: Array<{ type: string; file: string; line: number; severity: string }>;
  models: Array<{ provider: string; model: string; file: string; line: number }>;
  guardrails: Array<{ type: string; file: string }>;
  summary: {
    totalFindings: number;
    bySeverity: { high: number; medium: number; low: number };
  };
}

interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
  recommendations: string[];
}

let statusBarItem: vscode.StatusBarItem;
let diagnosticCollection: vscode.DiagnosticCollection;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('ACG');
  diagnosticCollection = vscode.languages.createDiagnosticCollection('acg');

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'acg.score';
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('acg.scan', scanWorkspace),
    vscode.commands.registerCommand('acg.score', showScore),
    vscode.commands.registerCommand('acg.bom', generateBom),
    vscode.commands.registerCommand('acg.packs', listPacks),
    vscode.commands.registerCommand('acg.configure', configureSettings)
  );

  // Scan on save
  const config = vscode.workspace.getConfiguration('acg');
  if (config.get<boolean>('scanOnSave')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (isSupportedLanguage(doc.fileName)) {
          scanFile(doc.fileName);
        }
      })
    );
  }

  // Initial scan
  updateStatusBar('$(sync~spin) Scanning...');
  scanWorkspace().then(() => {
    updateStatusBarItem();
  });

  outputChannel.appendLine('ACG extension activated');
}

function isSupportedLanguage(filename: string): boolean {
  const ext = path.extname(filename);
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go'].includes(ext);
}

async function scanWorkspace() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showWarningMessage('No workspace open');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  outputChannel.appendLine(`Scanning workspace: ${rootPath}`);

  try {
    const { stdout } = await execAsync(
      `cd "${rootPath}" && acg scan --json 2>/dev/null || echo '{"secrets":[],"models":[],"guardrails":[],"summary":{"totalFindings":0,"bySeverity":{"high":0,"medium":0,"low":0}}}'`
    );

    const result: ScanResult = JSON.parse(stdout.trim());
    updateDiagnostics(result);
    updateStatusBarFromResult(result);

    if (result.summary.totalFindings > 0) {
      vscode.window.showWarningMessage(
        `ACG: ${result.summary.totalFindings} compliance finding(s) detected`
      );
    }
  } catch (err) {
    outputChannel.appendLine(`Scan error: ${err}`);
    // Fallback: basic pattern scan
    await basicScan(rootPath);
  }
}

async function scanFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const findings = detectPatterns(content, filePath);
    if (findings.length > 0) {
      const diagnostics = findings.map((f) => {
        const range = new vscode.Range(
          new vscode.Position(f.line - 1, 0),
          new vscode.Position(f.line - 1, 100)
        );
        const severity =
          f.severity === 'high'
            ? vscode.DiagnosticSeverity.Error
            : f.severity === 'medium'
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information;
        return new vscode.Diagnostic(range, f.message, severity);
      });
      diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
    }
  } catch {
    // Ignore read errors
  }
}

function detectPatterns(
  content: string,
  filePath: string
): Array<{ line: number; message: string; severity: string }> {
  const findings: Array<{ line: number; message: string; severity: string }> =
    [];
  const lines = content.split('\n');

  const patterns = [
    {
      regex: /(?:sk-|api[_-]?key|token|secret|password)\s*[:=]\s*['"][^'"]+['"]/gi,
      message: 'Potential secret or API key detected',
      severity: 'high',
    },
    {
      regex:
        /(?:openai|anthropic|ollama|huggingface)\.(?:com|ai|io)\/v\d/gi,
      message: 'AI provider endpoint detected',
      severity: 'medium',
    },
    {
      regex:
        /(?:gpt-4|gpt-3\.5|claude|llama|gemini|mistral)/gi,
      message: 'AI model reference detected',
      severity: 'low',
    },
    {
      regex: /(?:\.env|dotenv|process\.env)/gi,
      message: 'Environment variable usage detected',
      severity: 'low',
    },
  ];

  lines.forEach((line, idx) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        findings.push({
          line: idx + 1,
          message: pattern.message,
          severity: pattern.severity,
        });
      }
      pattern.regex.lastIndex = 0; // Reset regex
    }
  });

  return findings;
}

async function basicScan(rootPath: string) {
  outputChannel.appendLine('Running basic pattern scan...');
  // Walk files and detect patterns
  const files = await findFiles(rootPath, ['*.ts', '*.js', '*.py', '*.go']);
  let totalFindings = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const findings = detectPatterns(content, file);
      if (findings.length > 0) {
        totalFindings += findings.length;
        const uri = vscode.Uri.file(file);
        const diagnostics = findings.map((f) => {
          const range = new vscode.Range(
            new vscode.Position(f.line - 1, 0),
            new vscode.Position(f.line - 1, 100)
          );
          const severity =
            f.severity === 'high'
              ? vscode.DiagnosticSeverity.Error
              : f.severity === 'medium'
              ? vscode.DiagnosticSeverity.Warning
              : vscode.DiagnosticSeverity.Information;
          return new vscode.Diagnostic(range, f.message, severity);
        });
        diagnosticCollection.set(uri, diagnostics);
      }
    } catch {
      // Skip unreadable files
    }
  }

  updateStatusBarFromResult({
    secrets: [],
    models: [],
    guardrails: [],
    summary: {
      totalFindings,
      bySeverity: { high: 0, medium: 0, low: 0 },
    },
  });
}

function updateDiagnostics(result: ScanResult) {
  diagnosticCollection.clear();

  for (const secret of result.secrets) {
    const uri = vscode.Uri.file(
      path.isAbsolute(secret.file)
        ? secret.file
        : vscode.workspace.workspaceFolders?.[0]
        ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, secret.file)
        : secret.file
    );
    const range = new vscode.Range(
      new vscode.Position(secret.line - 1, 0),
      new vscode.Position(secret.line - 1, 100)
    );
    const diagnostic = new vscode.Diagnostic(
      range,
      `${secret.type} detected — potential compliance risk`,
      vscode.DiagnosticSeverity.Error
    );
    diagnostic.source = 'ACG';
    diagnosticCollection.set(uri, [
      ...(diagnosticCollection.get(uri) || []),
      diagnostic,
    ]);
  }
}

function updateStatusBarFromResult(result: ScanResult) {
  const { totalFindings, bySeverity } = result.summary;
  if (totalFindings === 0) {
    updateStatusBar('$(check) ACG: Clean');
  } else {
    const high = bySeverity.high > 0 ? ` $(error)${bySeverity.high}` : '';
    const med =
      bySeverity.medium > 0 ? ` $(warning)${bySeverity.medium}` : '';
    updateStatusBar(`$(alert) ACG: ${totalFindings}${high}${med}`);
  }
}

function updateStatusBar(text: string) {
  statusBarItem.text = text;
  statusBarItem.tooltip = 'AI Compliance Gateway — Click to see score';
  statusBarItem.show();
}

async function showScore() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  try {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const { stdout } = await execAsync(
      `cd "${rootPath}" && acg score --json 2>/dev/null || echo '{"score":0,"breakdown":{},"recommendations":[]}'`
    );
    const result: ScoreResult = JSON.parse(stdout.trim());

    const panel = vscode.window.createWebviewPanel(
      'acgScore',
      'ACG Compliance Score',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    panel.webview.html = getScoreHtml(result);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to get score: ${err}`);
  }
}

function getScoreHtml(result: ScoreResult): string {
  const color =
    result.score >= 80
      ? '#22c55e'
      : result.score >= 60
      ? '#eab308'
      : '#ef4444';
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; }
    .score { font-size: 48px; font-weight: bold; color: ${color}; }
    .bar { height: 8px; background: #e5e7eb; border-radius: 4px; margin: 4px 0; }
    .fill { height: 100%; border-radius: 4px; background: ${color}; }
    .item { display: flex; justify-content: space-between; margin: 8px 0; }
  </style>
</head>
<body>
  <h2>Compliance Score</h2>
  <div class="score">${result.score}/100</div>
  <div class="bar"><div class="fill" style="width:${result.score}%"></div></div>
  <h3>Breakdown</h3>
  ${Object.entries(result.breakdown)
    .map(
      ([k, v]) =>
        `<div class="item"><span>${k}</span><span>${v}</span></div>`
    )
    .join('')}
  <h3>Recommendations</h3>
  <ul>${result.recommendations.map((r) => `<li>${r}</li>`).join('')}</ul>
</body>
</html>`;
}

async function generateBom() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  try {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const { stdout } = await execAsync(
      `cd "${rootPath}" && acg bom --json 2>/dev/null || echo '{"entries":[]}'`
    );
    const bom = JSON.parse(stdout.trim());
    outputChannel.appendLine(
      `BOM: ${bom.entries?.length ?? 0} AI components detected`
    );
    outputChannel.show();
    vscode.window.showInformationMessage(
      `ACG: ${bom.entries?.length ?? 0} AI components found`
    );
  } catch (err) {
    vscode.window.showErrorMessage(`BOM generation failed: ${err}`);
  }
}

async function listPacks() {
  const packs = [
    'dpdp (Digital Personal Data Protection Act)',
    'hipaa (Health Insurance Portability)',
    'gdpr (General Data Protection)',
    'pci-dss (Payment Card Industry)',
    'soc2 (SOC 2 Type II)',
    'abdm (Ayushman Bharat Digital)',
    'ai-safety (AI Safety Guidelines)',
    'banking (Banking Regulations)',
  ];

  const selected = await vscode.window.showQuickPick(packs, {
    placeHolder: 'Select a compliance pack',
  });

  if (selected) {
    const packId = selected.split(' ')[0];
    const config = vscode.workspace.getConfiguration('acg');
    await config.update('compliancePack', packId, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`ACG: Compliance pack set to ${packId}`);
  }
}

async function configureSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'acg');
}

async function findFiles(
  root: string,
  patterns: string[]
): Promise<string[]> {
  const files: string[] = [];
  const ignore = ['node_modules', '.git', 'dist', 'build', '__pycache__'];

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (ignore.includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (
          patterns.some(
            (p) =>
              entry.name.endsWith(p.replace('*', ''))
          )
        ) {
          files.push(full);
        }
      }
    } catch {
      // Skip
    }
  }

  walk(root);
  return files;
}

export function deactivate() {
  statusBarItem.dispose();
  diagnosticCollection.dispose();
  outputChannel.dispose();
}
