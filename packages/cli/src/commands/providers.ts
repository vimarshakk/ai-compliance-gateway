import { Command } from 'commander';
import chalk from 'chalk';
import { providers } from '../data/providers.js';
import { createClient, type ProviderRecord } from '../lib/api-client.js';
import { getGlobalOpts } from '../program.js';

export function providersCommand(): Command {
  const cmd = new Command('providers')
    .description('List certified AI providers and their compliance features')
    .argument('[provider]', 'Specific provider ID (optional)')
    .option('--json', 'Output as JSON')
    .option('-c, --compliance <feature>', 'Filter by compliance feature')
    .option('--remote', 'Fetch from Admin API instead of local data')
    .action(async (providerId: string | undefined, opts: { json: boolean; compliance?: string; remote: boolean }, cmd: Command) => {
      const globals = getGlobalOpts(cmd);

      if (opts.remote && globals.adminUrl) {
        // Remote mode
        const client = createClient(globals);
        try {
          if (providerId) {
            const p = await client.getProvider(providerId);
            printDetailedProvider(p, opts.json);
          } else {
            const certified = opts.compliance ? undefined : true;
            const { providers: remoteProviders } = await client.listProviders(certified);
            printProvidersList(remoteProviders, opts.json, opts.compliance);
          }
        } catch (err) {
          console.error(chalk.red(`Failed to fetch providers: ${err}`));
          process.exit(1);
        }
        return;
      }

      // Local mode
      const list = providerId
        ? providers.filter(p => p.id === providerId)
        : opts.compliance
          ? providers.filter(p => {
              const key = opts.compliance!.replace(/-/g, '_') as keyof typeof p.complianceFeatures;
              return p.complianceFeatures[key as keyof typeof p.complianceFeatures];
            })
          : providers;

      if (opts.json) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (list.length === 0) {
        console.log(chalk.yellow('No providers found matching criteria'));
        return;
      }

      if (providerId && list.length === 1) {
        const p = list[0];
        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan(`│  Provider: ${p.name.padEnd(36)}│`));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(`  Company: ${chalk.bold(p.company)}`);
        console.log(`  API Style: ${p.apiStyle}`);
        console.log(`  Base URL: ${chalk.gray(p.baseUrl)}`);
        console.log(`  Max Tokens: ${p.maxTokens.toLocaleString()}`);
        console.log(`  Regions: ${p.supportedRegions.join(', ')}`);
        console.log('');
        console.log(chalk.bold('  Models:'));
        for (const m of p.models) {
          console.log(`    • ${m}`);
        }
        console.log('');
        console.log(chalk.bold('  Compliance Features:'));
        const features = Object.entries(p.complianceFeatures);
        for (const [key, val] of features) {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
          const icon = val ? chalk.green('✓') : chalk.red('✗');
          console.log(`    ${icon} ${label}`);
        }
        console.log('');

        const complianceScore = features.filter(([, v]) => v).length;
        const maxScore = features.length;
        const pct = Math.round((complianceScore / maxScore) * 100);
        console.log(`  Compliance Score: ${complianceScore}/${maxScore} (${pct}%)`);
        console.log('');
        return;
      }

      // List view
      console.log('');
      console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
      console.log(chalk.bold.cyan('│         Certified AI Providers                  │'));
      console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
      console.log('');

      const header = `  ${'Provider'.padEnd(16)} ${'Company'.padEnd(24)} ${'HIPAA'.padEnd(6)} ${'GDPR'.padEnd(6)} ${'SOC2'.padEnd(6)} ${'PII'.padEnd(6)} ${'Regions'}`;
      console.log(chalk.bold(header));
      console.log(chalk.gray('  ' + '─'.repeat(80)));

      for (const p of list) {
        const f = p.complianceFeatures;
        const row = [
          `  ${p.name.padEnd(16)}`,
          `${p.company.substring(0, 24).padEnd(24)}`,
          `${f.hipaa ? chalk.green('✓') : chalk.red('✗')}`.padEnd(15),
          `${f.gdpr ? chalk.green('✓') : chalk.red('✗')}`.padEnd(15),
          `${f.soc2 ? chalk.green('✓') : chalk.red('✗')}`.padEnd(15),
          `${f.piiFiltering ? chalk.green('✓') : chalk.red('✗')}`.padEnd(15),
          `${p.supportedRegions.join(', ')}`,
        ];
        console.log(row.join(' '));
      }

      console.log('');
      console.log(chalk.gray(`  ${list.length} provider(s) shown`));
      console.log(chalk.gray('  Use `acg providers <id>` for detailed view'));
      console.log('');
    });

  return cmd;
}

function printDetailedProvider(p: ProviderRecord, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(p, null, 2));
    return;
  }
  console.log('');
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan(`│  Provider: ${p.name.padEnd(36)}│`));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
  console.log('');
  console.log(`  Company: ${chalk.bold(p.company)}`);
  console.log(`  API Style: ${p.apiStyle}`);
  console.log(`  Base URL: ${chalk.gray(p.baseUrl)}`);
  console.log(`  Max Tokens: ${p.maxTokens.toLocaleString()}`);
  console.log(`  Regions: ${p.supportedRegions.join(', ')}`);
  console.log(`  Certified: ${p.certified ? chalk.green('Yes') : chalk.red('No')}`);
  console.log('');
  console.log(chalk.bold('  Models:'));
  for (const m of p.models) {
    console.log(`    • ${m}`);
  }
  console.log('');
  console.log(chalk.bold('  Compliance Features:'));
  const features = Object.entries(p.complianceFeatures);
  for (const [key, val] of features) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    const icon = val ? chalk.green('✓') : chalk.red('✗');
    console.log(`    ${icon} ${label}`);
  }
  console.log('');
}

function printProvidersList(list: ProviderRecord[], json: boolean, compliance?: string): void {
  if (json) {
    console.log(JSON.stringify(list, null, 2));
    return;
  }
  if (list.length === 0) {
    console.log(chalk.yellow('No providers found'));
    return;
  }
  console.log('');
  console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
  console.log(chalk.bold.cyan(`│  Certified AI Providers${compliance ? ` (${compliance})` : ''}            │`));
  console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
  console.log('');
  for (const p of list) {
    console.log(`  ${chalk.bold(p.name)} ${chalk.gray(`(${p.id})`)}`);
    console.log(chalk.gray(`    ${p.company} — ${p.models.length} models`));
    console.log('');
  }
  console.log(chalk.gray(`  ${list.length} provider(s)`));
  console.log('');
}
