import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject, type ScanResult } from '../lib/scanner.js';
import { createClient, type ScanResponse } from '../lib/api-client.js';
import { getGlobalOpts, type GlobalOpts } from '../program.js';
import { resolve } from 'node:path';

function formatFinding(f: { type: string; severity: string; file: string; line?: number; message: string }): string {
  const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪' }[f.severity] || '⚪';
  const loc = f.line ? `${f.file}:${f.line}` : f.file;
  return `${icon} ${chalk.bold(f.type.toUpperCase())} ${f.message} ${chalk.gray(`(${loc})`)}`;
}

function riskColor(score: number): (s: string) => string {
  if (score >= 50) return chalk.red;
  if (score >= 25) return chalk.yellow;
  return chalk.green;
}

function printScanResult(result: ScanResponse, remote = false): void {
  console.log('');
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan(`│  AI Compliance Gateway Scan${remote ? ' (remote)' : ''}             │`));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
  console.log('');

  const risk = riskColor(result.summary.riskScore);
  console.log(`  Risk Score: ${risk(String(result.summary.riskScore))} / 100`);
  console.log(`  Files Scanned: ${result.filesScanned}`);
  console.log('');

  if (result.summary.sdks.length > 0) {
    console.log(chalk.bold('  AI SDKs Detected:'));
    for (const sdk of result.summary.sdks) {
      console.log(`    ✓ ${sdk}`);
    }
    console.log('');
  }

  if (result.summary.modelRefs.length > 0) {
    console.log(chalk.bold('  Model References:'));
    for (const model of result.summary.modelRefs.slice(0, 15)) {
      console.log(`    • ${model}`);
    }
    if (result.summary.modelRefs.length > 15) {
      console.log(chalk.gray(`    ... and ${result.summary.modelRefs.length - 15} more`));
    }
    console.log('');
  }

  const crits = result.findings.filter(f => f.severity === 'critical');
  const highs = result.findings.filter(f => f.severity === 'high');

  if (crits.length > 0) {
    console.log(chalk.bold.red(`  ⚠ ${crits.length} Critical Finding(s):`));
    for (const f of crits.slice(0, 10)) console.log(`    ${formatFinding(f)}`);
    console.log('');
  }

  if (highs.length > 0) {
    console.log(chalk.bold.yellow(`  ⚠ ${highs.length} High Finding(s):`));
    for (const f of highs.slice(0, 10)) console.log(`    ${formatFinding(f)}`);
    console.log('');
  }

  if (crits.length === 0 && highs.length === 0) {
    console.log(chalk.green('  ✅ No critical or high severity findings'));
    console.log('');
  }

  const med = result.findings.filter(f => f.severity === 'medium');
  const low = result.findings.filter(f => f.severity === 'low');
  console.log(chalk.gray(`  Summary: ${crits.length} critical, ${highs.length} high, ${med.length} medium, ${low.length} low, ${result.findings.filter(f => f.severity === 'info').length} info`));
}

export function scanCommand(): Command {
  return new Command('scan')
    .description('Scan a project for AI SDKs, prompts, secrets, env vars, and model references')
    .argument('[path]', 'Project root path', '.')
    .option('-f, --format <format>', 'Output format', 'table')
    .option('--json', 'Output as JSON')
    .option('--remote', 'Scan via remote Admin API instead of locally')
    .action(async (path: string, opts: { format: string; json: boolean; remote: boolean }, cmd: Command) => {
      const spinner = ora('Scanning project...').start();
      const globals = getGlobalOpts(cmd);

      try {
        if (opts.remote && globals.adminUrl) {
          const client = createClient(globals);
          const result = await client.scanProject(resolve(path));
          spinner.succeed(`Scanned ${result.filesScanned} files (remote)`);
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            printScanResult(result, true);
          }
        } else {
          const root = resolve(path);
          const result = scanProject(root);
          spinner.succeed(`Scanned ${result.filesScanned} files`);
          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            printScanResult(result, false);
          }
        }
      } catch (err) {
        spinner.fail(`Scan failed: ${err}`);
        process.exit(1);
      }
    });
}
