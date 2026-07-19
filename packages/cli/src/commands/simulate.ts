import { Command } from 'commander';
import chalk from 'chalk';
import { compliancePacks } from '../data/compliance-packs.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface PolicyInput {
  provider?: string;
  model?: string;
  prompt?: string;
  response?: string;
  contains_pii?: boolean;
  contains_phi?: boolean;
  contains_financial?: boolean;
  region?: string;
  user_role?: string;
  rate?: number;
}

function simulatePolicyEval(input: PolicyInput, packId?: string): { allowed: boolean; decisions: string[]; appliedPacks: string[] } {
  const decisions: string[] = [];
  const appliedPacks: string[] = [];
  let allowed = true;

  const packsToCheck = packId
    ? compliancePacks.filter(p => p.id === packId)
    : compliancePacks;

  for (const pack of packsToCheck) {
    // Always evaluate — the user selected this pack
    appliedPacks.push(pack.name);

    // Simulate rule evaluation per pack
    if (pack.id === 'dpdp' || pack.id === 'gdpr') {
      if (input.contains_pii) {
        decisions.push(`[${pack.name}] DENY: PII detected — requires consent artifact`);
        allowed = false;
      } else {
        decisions.push(`[${pack.name}] ALLOW: No PII violation`);
      }
    }

    if (pack.id === 'hipaa' || pack.id === 'abdm') {
      if (input.contains_phi) {
        decisions.push(`[${pack.name}] DENY: PHI detected — HIPAA/ABDM violation`);
        allowed = false;
      } else {
        decisions.push(`[${pack.name}] ALLOW: No PHI violation`);
      }
    }

    if (pack.id === 'pci-dss' || pack.id === 'banking') {
      if (input.contains_financial) {
        decisions.push(`[${pack.name}] DENY: Financial data detected — requires encryption + masking`);
        allowed = false;
      } else {
        decisions.push(`[${pack.name}] ALLOW: No financial data violation`);
      }
    }

    if (pack.id === 'ai-safety') {
      const jailbreakPatterns = [
        /ignore.*previous.*instructions/i,
        /you\s+are\s+now\s+DAN/i,
        /bypass.*safety/i,
        /override.*policy/i,
        /jailbreak/i,
        /system\s*prompt.*reveal/i,
      ];

      const prompt = input.prompt;
      if (prompt && jailbreakPatterns.some(p => p.test(prompt))) {
        decisions.push(`[${pack.name}] DENY: Jailbreak attempt detected`);
        allowed = false;
      } else if (prompt) {
        decisions.push(`[${pack.name}] ALLOW: Prompt passes safety check`);
      }
    }

    if (pack.id === 'soc2') {
      if (!input.user_role) {
        decisions.push(`[${pack.name}] DENY: No user role — access control required`);
        allowed = false;
      } else {
        decisions.push(`[${pack.name}] ALLOW: User role present: ${input.user_role}`);
      }
    }

    if (pack.id === 'abdm') {
      if (input.contains_phi && (!input.region || input.region !== 'in')) {
        decisions.push(`[${pack.name}] WARN: Health data should stay in India region`);
      }
    }
  }

  return { allowed, decisions, appliedPacks };
}

export function simulateCommand(): Command {
  const cmd = new Command('simulate')
    .description('Simulate policy evaluation against AI requests')
    .argument('[pack]', 'Compliance pack ID to simulate (or "all")')
    .option('-f, --file <path>', 'JSON file with policy input')
    .option('--provider <provider>', 'AI provider name')
    .option('--model <model>', 'Model name')
    .option('--prompt <prompt>', 'User prompt')
    .option('--response <response>', 'AI response')
    .option('--pii', 'Contains PII')
    .option('--phi', 'Contains PHI')
    .option('--financial', 'Contains financial data')
    .option('--region <region>', 'Data region')
    .option('--role <role>', 'User role')
    .option('--rate <n>', 'Requests per minute', '0')
    .option('--json', 'Output as JSON')
    .action(async (packArg: string | undefined, opts: any) => {
      let input: PolicyInput = {};

      // Load from file
      if (opts.file) {
        const filePath = resolve(opts.file);
        if (!existsSync(filePath)) {
          console.error(chalk.red(`File not found: ${filePath}`));
          process.exit(1);
        }
        input = JSON.parse(readFileSync(filePath, 'utf-8'));
      }

      // Override with CLI flags
      if (opts.provider) input.provider = opts.provider;
      if (opts.model) input.model = opts.model;
      if (opts.prompt) input.prompt = opts.prompt;
      if (opts.response) input.response = opts.response;
      if (opts.pii) input.contains_pii = true;
      if (opts.phi) input.contains_phi = true;
      if (opts.financial) input.contains_financial = true;
      if (opts.region) input.region = opts.region;
      if (opts.role) input.user_role = opts.role;
      if (opts.rate) input.rate = parseInt(opts.rate);

      // Default demo input
      if (Object.keys(input).length === 0) {
        input = {
          provider: 'openai',
          model: 'gpt-4o',
          prompt: 'What is my patient record?',
          contains_phi: true,
          region: 'us',
          user_role: 'nurse',
        };
      }

      const packId = packArg === 'all' ? undefined : packArg;
      const result = simulatePolicyEval(input, packId);

      if (opts.json) {
        console.log(JSON.stringify({ input, ...result }, null, 2));
        return;
      }

      console.log('');
      console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
      console.log(chalk.bold.cyan('│          Policy Simulation Result               │'));
      console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
      console.log('');

      console.log(chalk.bold('  Input:'));
      console.log(`    Provider: ${input.provider || 'unknown'}`);
      console.log(`    Model: ${input.model || 'unknown'}`);
      console.log(`    Prompt: ${input.prompt || '(none)'}`);
      console.log(`    PII: ${input.contains_pii ? chalk.red('YES') : chalk.green('no')}`);
      console.log(`    PHI: ${input.contains_phi ? chalk.red('YES') : chalk.green('no')}`);
      console.log(`    Financial: ${input.contains_financial ? chalk.red('YES') : chalk.green('no')}`);
      console.log(`    Region: ${input.region || 'unknown'}`);
      console.log(`    Role: ${input.user_role || 'unknown'}`);
      console.log('');

      console.log(chalk.bold('  Policy Decisions:'));
      for (const d of result.decisions) {
        const color = d.includes('DENY') ? chalk.red : d.includes('WARN') ? chalk.yellow : chalk.green;
        console.log(`    ${color(d)}`);
      }
      console.log('');

      const verdict = result.allowed
        ? chalk.bold.green('  ✅ ALLOWED — Request passes all policies')
        : chalk.bold.red('  ❌ DENIED — Request violates one or more policies');
      console.log(verdict);
      console.log('');
      console.log(chalk.gray(`  Applied packs: ${result.appliedPacks.join(', ') || 'none'}`));
      console.log('');
    });

  return cmd;
}
