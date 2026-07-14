import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import http from 'http';
import { getGlobalOpts } from '../program.js';

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'warn';
  message: string;
  url?: string;
}

function checkUrl(url: string): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ ok: false, message: 'Timeout (3s)' });
    }, 3000);

    http.get(url, (res) => {
      clearTimeout(timeout);
      if (res.statusCode === 200) {
        resolve({ ok: true, message: `HTTP ${res.statusCode}` });
      } else {
        resolve({ ok: false, message: `HTTP ${res.statusCode}` });
      }
      res.resume();
    }).on('error', (err) => {
      clearTimeout(timeout);
      resolve({ ok: false, message: err.message });
    });
  });
}

async function runHealthChecks(opts: { adminUrl: string; gatewayUrl: string }): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const major = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (major >= 18) {
      checks.push({ name: 'Node.js', status: 'ok', message: nodeVersion });
    } else {
      checks.push({ name: 'Node.js', status: 'warn', message: `${nodeVersion} (recommended: 18+)` });
    }
  } catch {
    checks.push({ name: 'Node.js', status: 'error', message: 'Not found' });
  }

  // Check Docker
  try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim();
    checks.push({ name: 'Docker', status: 'ok', message: dockerVersion });
  } catch {
    checks.push({ name: 'Docker', status: 'warn', message: 'Not found (optional)' });
  }

  // Check Gateway
  const gatewayCheck = await checkUrl(`${opts.gatewayUrl}/health`);
  checks.push({
    name: 'Gateway',
    status: gatewayCheck.ok ? 'ok' : 'error',
    message: gatewayCheck.message,
    url: opts.gatewayUrl,
  });

  // Check Admin API
  const adminCheck = await checkUrl(`${opts.adminUrl}/health`);
  checks.push({
    name: 'Admin API',
    status: adminCheck.ok ? 'ok' : 'error',
    message: adminCheck.message,
    url: opts.adminUrl,
  });

  return checks;
}

function formatCheck(check: HealthCheck): string {
  const icon = check.status === 'ok' ? chalk.green('✓') :
               check.status === 'warn' ? chalk.yellow('⚠') :
               chalk.red('✗');
  const name = check.status === 'ok' ? chalk.green(check.name) :
               check.status === 'warn' ? chalk.yellow(check.name) :
               chalk.red(check.name);
  return `  ${icon} ${name.padEnd(12)} ${check.message}`;
}

export function doctorCommand(): Command {
  return new Command('doctor')
    .description('Check system health and configuration')
    .option('--verbose', 'Show detailed health information')
    .option('--fix', 'Attempt to fix issues automatically')
    .action(async (options) => {
      const opts = getGlobalOpts(new Command().opts());
      const adminUrl = opts.adminUrl || 'http://localhost:3002';
      const gatewayUrl = opts.gatewayUrl || 'http://localhost:3000';

      console.log(chalk.bold.cyan('\n🏥 ACG Health Check\n'));

      const checks = await runHealthChecks({ adminUrl, gatewayUrl });

      // Display results
      for (const check of checks) {
        console.log(formatCheck(check));
      }

      // Summary
      const errors = checks.filter(c => c.status === 'error').length;
      const warnings = checks.filter(c => c.status === 'warn').length;
      const ok = checks.filter(c => c.status === 'ok').length;

      console.log('');
      if (errors === 0 && warnings === 0) {
        console.log(chalk.green(`  ✓ All ${ok} checks passed`));
      } else {
        if (errors > 0) console.log(chalk.red(`  ✗ ${errors} error(s)`));
        if (warnings > 0) console.log(chalk.yellow(`  ⚠ ${warnings} warning(s)`));
        if (ok > 0) console.log(chalk.green(`  ✓ ${ok} check(s) passed`));
      }

      console.log('');

      // Verbose output
      if (options.verbose) {
        console.log(chalk.bold('  Configuration:'));
        console.log(`    Admin URL:    ${adminUrl}`);
        console.log(`    Gateway URL:  ${gatewayUrl}`);
        console.log('');
      }

      // Fix option
      if (options.fix && errors > 0) {
        console.log(chalk.yellow('  Attempting to fix issues...\n'));

        for (const check of checks) {
          if (check.status === 'error') {
            if (check.name === 'Gateway' || check.name === 'Admin API') {
              console.log(chalk.yellow(`    Restarting ${check.name}...`));
              try {
                execSync('docker compose restart', { stdio: 'inherit' });
                console.log(chalk.green(`    ✓ ${check.name} restarted`));
              } catch {
                console.log(chalk.red(`    ✗ Failed to restart ${check.name}`));
              }
            }
          }
        }
        console.log('');
      }

      // Exit code
      process.exit(errors > 0 ? 1 : 0);
    });
}
