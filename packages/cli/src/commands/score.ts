import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from '../lib/scanner.js';
import { generateBom } from '../lib/bom.js';
import { compliancePacks, type CompliancePack } from '../data/compliance-packs.js';
import { createClient, type ScoreRecord } from '../lib/api-client.js';
import { getGlobalOpts } from '../program.js';
import { resolve } from 'node:path';

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  items: string[];
}

function barChart(score: number, max: number, width: number = 30): string {
  const filled = Math.round((score / max) * width);
  const empty = width - filled;
  const color = score / max >= 0.8 ? chalk.green : score / max >= 0.5 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

export function scoreCommand(): Command {
  return new Command('score')
    .description('Calculate AI compliance score for a project')
    .argument('[path]', 'Project root path', '.')
    .option('-p, --pack <pack>', 'Compliance pack ID (e.g., dpdp, hipaa, gdpr)')
    .option('--json', 'Output as JSON')
    .option('--remote', 'Calculate via remote Admin API')
    .option('--save', 'Save score to Admin API history')
    .action(async (path: string, opts: { pack?: string; json: boolean; remote: boolean; save: boolean }, cmd: Command) => {
      const spinner = ora('Analyzing compliance posture...').start();
      const globals = getGlobalOpts(cmd);

      try {
        let scanResult: ReturnType<typeof scanProject>;
        let bomResult: ReturnType<typeof generateBom>;

        if (opts.remote && globals.adminUrl) {
          const client = createClient(globals);
          const remoteScan = await client.scanProject(resolve(path));
          const remoteBom = await client.generateBom(resolve(path));
          // Adapt remote responses to local types (they share the same shape)
          scanResult = { rootPath: remoteScan.rootPath, filesScanned: remoteScan.filesScanned, findings: remoteScan.findings, summary: remoteScan.summary } as ReturnType<typeof scanProject>;
          bomResult = { rootPath: remoteBom.rootPath, generatedAt: remoteBom.generatedAt, entries: remoteBom.entries, categories: remoteBom.categories } as ReturnType<typeof generateBom>;
        } else {
          scanResult = scanProject(resolve(path));
          bomResult = generateBom(resolve(path));
        }

        const breakdowns: ScoreBreakdown[] = [];

        // Secrets score
        const secretsPenalty = Math.min(25, scanResult.summary.secretsFound * 25);
        breakdowns.push({
          category: 'Secret Management',
          score: 25 - secretsPenalty,
          maxScore: 25,
          items: scanResult.summary.secretsFound === 0
            ? ['No secrets detected']
            : [`${scanResult.summary.secretsFound} secrets detected — rotate immediately`],
        });

        // SDK coverage
        const sdkScore = Math.min(20, (scanResult.summary.sdks.length > 0 ? 10 : 0) + (scanResult.summary.configsFound > 0 ? 10 : 0));
        breakdowns.push({
          category: 'SDK Coverage',
          score: sdkScore,
          maxScore: 20,
          items: [
            ...(scanResult.summary.sdks.map(s => `SDK: ${s}`)),
            ...(scanResult.summary.configsFound > 0 ? [`${scanResult.summary.configsFound} observability config(s) found`] : []),
          ],
        });

        // Env var score
        const envPenalty = Math.min(15, scanResult.summary.envVarsFound * 3);
        breakdowns.push({
          category: 'Environment Hygiene',
          score: 15 - envPenalty,
          maxScore: 15,
          items: scanResult.summary.envVarsFound === 0
            ? ['No AI env vars exposed']
            : [`${scanResult.summary.envVarsFound} AI env vars detected`],
        });

        // Guardrail coverage
        const guardrailTools = bomResult.entries.filter(e => e.category === 'guardrail' || e.category === 'policy');
        const guardrailScore = Math.min(20, guardrailTools.length * 10);
        breakdowns.push({
          category: 'Guardrail Coverage',
          score: guardrailScore,
          maxScore: 20,
          items: guardrailTools.length === 0
            ? ['No guardrail tools detected']
            : guardrailTools.map(g => `Tool: ${g.name}`),
        });

        // Observability
        const obsTools = bomResult.entries.filter(e => e.category === 'observability');
        const obsScore = Math.min(10, obsTools.length * 5);
        breakdowns.push({
          category: 'Observability',
          score: obsScore,
          maxScore: 10,
          items: obsTools.length === 0
            ? ['No observability tools detected']
            : obsTools.map(o => `Tool: ${o.name}`),
        });

        // Prompt hygiene
        const promptPenalty = Math.min(10, scanResult.summary.promptsFound * 5);
        breakdowns.push({
          category: 'Prompt Hygiene',
          score: 10 - promptPenalty,
          maxScore: 10,
          items: scanResult.summary.promptsFound === 0
            ? ['No untracked prompt files']
            : [`${scanResult.summary.promptsFound} prompt file(s) detected — review for safety`],
        });

        let packMatch: CompliancePack | undefined;
        if (opts.pack) {
          packMatch = compliancePacks.find(p => p.id === opts.pack);
        }

        const totalScore = breakdowns.reduce((s, b) => s + b.score, 0);
        const totalMax = breakdowns.reduce((s, b) => s + b.maxScore, 0);
        const pct = Math.round((totalScore / totalMax) * 100);

        // Save to API if requested
        if (opts.save && globals.adminUrl) {
          try {
            const client = createClient(globals);
            await client.createScore({
              organizationId: 'cli-local',
              overallScore: totalScore,
              maxScore: totalMax,
              percentage: pct,
              breakdown: { breakdowns },
              pack: opts.pack,
              scanResult: scanResult.summary as unknown as Record<string, unknown>,
              bomResult: { entries: bomResult.entries.length } as Record<string, unknown>,
            });
          } catch (saveErr) {
            spinner.warn(`Score saved locally but API save failed: ${saveErr}`);
          }
        }

        spinner.succeed('Analysis complete');

        if (opts.json) {
          console.log(JSON.stringify({
            score: totalScore,
            maxScore: totalMax,
            percentage: pct,
            breakdowns,
            pack: packMatch,
            scan: { filesScanned: scanResult.filesScanned, findings: scanResult.findings.length },
            bom: { components: bomResult.entries.length },
          }, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan('│          AI Compliance Score                    │'));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(chalk.bold(`  Overall: ${totalScore}/${totalMax} (${pct}%)`));
        console.log(`  ${barChart(totalScore, totalMax, 40)}`);
        console.log('');

        for (const b of breakdowns) {
          const pctB = Math.round((b.score / b.maxScore) * 100);
          console.log(`  ${chalk.bold(b.category)}: ${b.score}/${b.maxScore} (${pctB}%)`);
          console.log(`  ${barChart(b.score, b.maxScore, 30)}`);
          for (const item of b.items) {
            console.log(chalk.gray(`    • ${item}`));
          }
          console.log('');
        }

        if (packMatch) {
          console.log(chalk.bold(`  Compliance Pack: ${packMatch.name}`));
          console.log(chalk.gray(`  ${packMatch.description}`));
          console.log(chalk.gray(`  Required controls: ${packMatch.requiredControls.join(', ')}`));
          console.log('');
        }

        console.log(chalk.bold('  Recommendations:'));
        if (scanResult.summary.secretsFound > 0) {
          console.log(chalk.red('  🔴 CRITICAL: Rotate detected secrets immediately'));
        }
        if (guardrailTools.length === 0) {
          console.log(chalk.yellow('  🟡 Add OPA for policy enforcement'));
        }
        if (obsTools.length === 0) {
          console.log(chalk.yellow('  🟡 Add Langfuse for AI observability'));
        }
        if (scanResult.summary.envVarsFound > 0) {
          console.log(chalk.blue('  🔵 Review env vars — move to secrets manager'));
        }
        if (totalScore / totalMax >= 0.8) {
          console.log(chalk.green('  🟢 Strong compliance posture'));
        }
      } catch (err) {
        spinner.fail(`Score calculation failed: ${err}`);
        process.exit(1);
      }
    });
}
