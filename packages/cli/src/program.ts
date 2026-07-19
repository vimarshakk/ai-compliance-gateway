#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { scanCommand } from './commands/scan.js';
import { bomCommand } from './commands/bom.js';
import { scoreCommand } from './commands/score.js';
import { simulateCommand } from './commands/simulate.js';
import { providersCommand } from './commands/providers.js';
import { packsCommand } from './commands/packs.js';
import { kernelCommand } from './commands/kernel.js';
import { configCommand } from './commands/config.js';
import { doctorCommand } from './commands/doctor.js';
import { initCommand } from './commands/init.js';

export interface GlobalOpts {
  adminUrl?: string;
  gatewayUrl?: string;
  apiKey?: string;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('acg')
    .description(chalk.bold.cyan('AI Compliance Gateway — CLI'))
    .version('0.1.0')
    .option('--admin-url <url>', 'Admin API URL (default: http://localhost:3002)')
    .option('--gateway-url <url>', 'Gateway API URL (default: http://localhost:3000)')
    .option('--api-key <key>', 'API key for authenticated requests');

  program.addCommand(scanCommand());
  program.addCommand(bomCommand());
  program.addCommand(scoreCommand());
  program.addCommand(simulateCommand());
  program.addCommand(providersCommand());
  program.addCommand(packsCommand());
  program.addCommand(kernelCommand());
  program.addCommand(configCommand());
  program.addCommand(doctorCommand());
  program.addCommand(initCommand());

  // Default: show help
  program.action(() => {
    program.help();
  });

  return program;
}

export function getGlobalOpts(cmd: Command): GlobalOpts {
  const opts = cmd.optsWithGlobals();
  return {
    adminUrl: opts.adminUrl,
    gatewayUrl: opts.gatewayUrl,
    apiKey: opts.apiKey,
  };
}

// Run if executed directly
if (typeof require !== 'undefined' || typeof process !== 'undefined') {
  const isMain = process.argv[1] &&
    (process.argv[1].endsWith('acg') ||
     process.argv[1].endsWith('acg.js') ||
     process.argv[1].endsWith('index.js'));

  if (isMain) {
    createProgram().parse();
  }
}
