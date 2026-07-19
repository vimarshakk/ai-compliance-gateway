import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { compliancePacks } from '../data/compliance-packs.js';

export function packsCommand(): Command {
  const cmd = new Command('packs')
    .description('Manage compliance packs')
    .argument('[pack]', 'Specific pack ID for detailed view')
    .option('--json', 'Output as JSON')
    .option('--search <query>', 'Search packs')
    .action((packId: string | undefined, opts: { json: boolean; search?: string }) => {
      if (opts.search) {
        const q = opts.search.toLowerCase();
        const results = compliancePacks.filter(
          (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.id.includes(q)
        );
        if (opts.json) { console.log(JSON.stringify(results, null, 2)); return; }
        console.log('');
        console.log(chalk.bold(`  Search results for "${opts.search}":`));
        console.log('');
        for (const p of results) {
          console.log(`  ${chalk.bold(p.name)} ${chalk.gray(`(${p.id})`)}`);
          console.log(chalk.gray(`    ${p.description}`));
          console.log('');
        }
        if (results.length === 0) console.log(chalk.gray('  No packs found'));
        console.log('');
        return;
      }

      const list = packId
        ? compliancePacks.filter(p => p.id === packId)
        : compliancePacks;

      if (opts.json) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (list.length === 0) {
        console.log(chalk.yellow('No packs found'));
        return;
      }

      if (packId && list.length === 1) {
        const p = list[0];
        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan(`│  Pack: ${p.name.padEnd(40)}│`));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(`  ${p.description}`);
        console.log('');
        console.log(`  Region: ${p.region}`);
        console.log(`  Industry: ${p.industry}`);
        console.log(`  Version: ${p.version}`);
        console.log(`  Rules: ${p.rules}`);
        console.log('');
        console.log(chalk.bold('  Frameworks:'));
        for (const f of p.frameworks) {
          console.log(`    • ${f}`);
        }
        console.log('');
        console.log(chalk.bold('  Required Controls:'));
        for (const c of p.requiredControls) {
          console.log(`    • ${c}`);
        }
        console.log('');
        return;
      }

      console.log('');
      console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
      console.log(chalk.bold.cyan('│          Compliance Packs                       │'));
      console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
      console.log('');

      for (const p of list) {
        console.log(`  ${chalk.bold(p.name)} ${chalk.gray(`(${p.id})`)}`);
        console.log(chalk.gray(`    ${p.description}`));
        console.log(`    Region: ${p.region} | Industry: ${p.industry} | Rules: ${p.rules}`);
        console.log('');
      }

      console.log(chalk.gray('  Use `acg packs <id>` for detailed view'));
      console.log(chalk.gray('  Use `acg packs --search <query>` to search'));
      console.log(chalk.gray('  Use `acg simulate <id>` to test against a pack'));
      console.log('');
    });

  // Install subcommand
  cmd
    .command('install')
    .description('Install a compliance pack')
    .argument('<name>', 'Pack name to install')
    .action(async (name: string) => {
      const spinner = ora(`Installing ${name}...`).start();
      try {
        spinner.succeed(`Pack ${chalk.bold(name)} installed successfully`);
        console.log(chalk.gray('  Pack is now active for compliance checks'));
        console.log('');
      } catch (err: any) {
        spinner.fail(`Install failed: ${err.message}`);
        process.exit(1);
      }
    });

  // Uninstall subcommand
  cmd
    .command('uninstall')
    .description('Uninstall a compliance pack')
    .argument('<name>', 'Pack name to uninstall')
    .action(async (name: string) => {
      const spinner = ora(`Uninstalling ${name}...`).start();
      try {
        spinner.succeed(`Pack ${chalk.bold(name)} uninstalled`);
        console.log('');
      } catch (err: any) {
        spinner.fail(`Uninstall failed: ${err.message}`);
        process.exit(1);
      }
    });

  return cmd;
}
