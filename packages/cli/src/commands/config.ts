import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.acg');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface ACGConfig {
  gatewayUrl?: string;
  adminUrl?: string;
  apiKey?: string;
  defaultOrg?: string;
  defaultProject?: string;
  defaultPack?: string;
}

function loadConfig(): ACGConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {
    // Ignore
  }
  return {};
}

function saveConfig(config: ACGConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function configCommand(): Command {
  const cmd = new Command('config')
    .description('Manage ACG CLI configuration')
    .option('--show', 'Show current configuration')
    .option('--set <key=value>', 'Set a config value')
    .option('--get <key>', 'Get a config value')
    .option('--init', 'Initialize config with interactive prompts');

  cmd.action(async (opts) => {
    const config = loadConfig();

    if (opts.show || (!opts.set && !opts.get && !opts.init)) {
      console.log('');
      console.log(chalk.bold.cyan('  ACG Configuration'));
      console.log(chalk.gray('  ─────────────────'));
      console.log(`  Gateway URL:   ${config.gatewayUrl ?? chalk.gray('(not set)')}`);
      console.log(`  Admin URL:     ${config.adminUrl ?? chalk.gray('(not set)')}`);
      console.log(`  API Key:       ${config.apiKey ? chalk.gray('••••••••') + config.apiKey.slice(-4) : chalk.gray('(not set)')}`);
      console.log(`  Default Org:   ${config.defaultOrg ?? chalk.gray('(not set)')}`);
      console.log(`  Default Project:${config.defaultProject ?? chalk.gray('(not set)')}`);
      console.log(`  Default Pack:  ${config.defaultPack ?? chalk.gray('(not set)')}`);
      console.log('');
      console.log(chalk.gray(`  Config file: ${CONFIG_FILE}`));
      console.log('');
      return;
    }

    if (opts.set) {
      const [key, ...valueParts] = opts.set.split('=');
      const value = valueParts.join('=');
      const validKeys = ['gatewayUrl', 'adminUrl', 'apiKey', 'defaultOrg', 'defaultProject', 'defaultPack'];

      if (!validKeys.includes(key)) {
        console.error(chalk.red(`  Invalid key: ${key}`));
        console.error(chalk.gray(`  Valid keys: ${validKeys.join(', ')}`));
        process.exit(1);
      }

      (config as any)[key] = value;
      saveConfig(config);
      console.log(chalk.green(`  ✓ Set ${key} = ${key === 'apiKey' ? '••••••••' + value.slice(-4) : value}`));
    }

    if (opts.get) {
      const value = (config as any)[opts.get];
      if (value === undefined) {
        console.error(chalk.red(`  Not set: ${opts.get}`));
        process.exit(1);
      }
      console.log(value);
    }

    if (opts.init) {
      console.log('');
      console.log(chalk.bold.cyan('  ACG Configuration Setup'));
      console.log('');

      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

      const gatewayUrl = await ask(`  Gateway URL [${config.gatewayUrl ?? 'http://localhost:3000'}]: `);
      const adminUrl = await ask(`  Admin URL [${config.adminUrl ?? 'http://localhost:3002'}]: `);
      const apiKey = await ask(`  API Key [${config.apiKey ?? ''}]: `);
      const defaultOrg = await ask(`  Default Org [${config.defaultOrg ?? 'my-org'}]: `);

      rl.close();

      config.gatewayUrl = gatewayUrl || config.gatewayUrl || 'http://localhost:3000';
      config.adminUrl = adminUrl || config.adminUrl || 'http://localhost:3002';
      config.apiKey = apiKey || config.apiKey;
      config.defaultOrg = defaultOrg || config.defaultOrg || 'my-org';

      saveConfig(config);
      console.log(chalk.green('\n  ✓ Configuration saved'));
    }
  });

  return cmd;
}
