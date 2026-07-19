import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { generateBom } from '../lib/bom.js';
import { createClient, type BomResponse } from '../lib/api-client.js';
import { getGlobalOpts } from '../program.js';
import { resolve } from 'node:path';

const CATEGORY_ICONS: Record<string, string> = {
  model: '🧠',
  framework: '📦',
  database: '🗄️',
  policy: '📋',
  guardrail: '🛡️',
  observability: '📊',
  mcp: '🔌',
  'ci-cd': '⚙️',
  sdk: '📚',
  'compliance-pack': '✅',
};

const CATEGORY_LABELS: Record<string, string> = {
  model: 'AI Models',
  framework: 'Frameworks',
  database: 'Data Stores',
  policy: 'Policy Engines',
  guardrail: 'Guardrails',
  observability: 'Observability',
  mcp: 'MCP Servers',
  'ci-cd': 'CI/CD',
  sdk: 'SDKs',
  'compliance-pack': 'Compliance Packs',
};

function printBom(bom: BomResponse, remote = false): void {
  console.log('');
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan(`│  AI Bill of Materials${remote ? ' (remote)' : ''}                       │`));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
  console.log('');
  console.log(chalk.gray(`  Generated: ${bom.generatedAt}`));
  console.log('');

  const sortedCategories = Object.keys(bom.categories).sort();

  for (const cat of sortedCategories) {
    const icon = CATEGORY_ICONS[cat] || '•';
    const label = CATEGORY_LABELS[cat] || cat;
    const items = bom.categories[cat];

    console.log(chalk.bold(`  ${icon} ${label} (${items.length})`));
    for (const item of items) {
      const ver = item.version ? chalk.gray(`@${item.version}`) : '';
      const conf = item.confidence === 'high' ? chalk.green('●') : item.confidence === 'medium' ? chalk.yellow('◐') : chalk.gray('○');
      const src = item.source ? chalk.gray(` [${item.source}]`) : '';
      console.log(`    ${conf} ${chalk.white(item.name)}${ver}${src}`);
    }
    console.log('');
  }

  console.log(chalk.bold(`  Total: ${bom.entries.length} components across ${sortedCategories.length} categories`));
}

export function bomCommand(): Command {
  return new Command('bom')
    .description('Generate an AI Bill of Materials from a project')
    .argument('[path]', 'Project root path', '.')
    .option('-f, --format <format>', 'Output format', 'table')
    .option('--json', 'Output as JSON')
    .option('--remote', 'Generate via remote Admin API')
    .action(async (path: string, opts: { format: string; json: boolean; remote: boolean }, cmd: Command) => {
      const spinner = ora('Generating AI Bill of Materials...').start();
      const globals = getGlobalOpts(cmd);

      try {
        if (opts.remote && globals.adminUrl) {
          const client = createClient(globals);
          const bom = await client.generateBom(resolve(path));
          spinner.succeed(`Found ${bom.entries.length} AI/ML components (remote)`);
          if (opts.json) {
            console.log(JSON.stringify(bom, null, 2));
          } else {
            printBom(bom, true);
          }
        } else {
          const root = resolve(path);
          const bom = generateBom(root);
          spinner.succeed(`Found ${bom.entries.length} AI/ML components`);
          if (opts.json) {
            console.log(JSON.stringify(bom, null, 2));
          } else {
            printBom(bom, false);
          }
        }
      } catch (err) {
        spinner.fail(`BOM generation failed: ${err}`);
        process.exit(1);
      }
    });
}
