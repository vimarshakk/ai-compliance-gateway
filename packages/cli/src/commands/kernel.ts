import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../lib/api-client.js';
import { getGlobalOpts } from '../program.js';

interface KernelStats {
  timestamp: string;
  pluginRuntime: { total: number; active: number; loaded: number; inactive: number; error: number; rules: number; policies: number };
  ruleEngine: { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number>; fixable: number };
  registry: { total: number; active: number; deprecated: number; disabled: number; byType: Record<string, number> };
  assetGraph: { totalAssets: number; byType: Record<string, number>; totalEdges: number; byRelation: Record<string, number>; lastScan: number };
  evidenceEngine: { total: number; byType: Record<string, number>; chainValid: boolean; oldestEntry?: number; newestEntry?: number };
}

export function kernelCommand(): Command {
  const cmd = new Command('kernel')
    .description('Query kernel component stats from a running gateway')
    .option('--json', 'Output as JSON');

  cmd
    .command('stats')
    .description('Show kernel component statistics from the gateway')
    .action(async (opts: { json: boolean }, parent: Command) => {
      const spinner = ora('Fetching kernel stats...').start();
      const globals = getGlobalOpts(parent);

      try {
        const client = createClient(globals);
        const gatewayUrl = globals.gatewayUrl || process.env.ACG_GATEWAY_URL || 'http://localhost:3000';

        const res = await fetch(`${gatewayUrl}/kernel/stats`, {
          headers: globals.apiKey ? { 'X-Api-Key': globals.apiKey } : {},
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const stats = await res.json() as KernelStats;
        spinner.succeed('Kernel stats fetched');

        if (opts.json || parent.opts().json) {
          console.log(JSON.stringify(stats, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan('│           Kernel Component Stats                │'));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(chalk.gray(`  Timestamp: ${stats.timestamp}`));
        console.log('');

        // Plugin Runtime
        const pr = stats.pluginRuntime;
        console.log(chalk.bold('  Plugin Runtime'));
        console.log(`    Total: ${pr.total}  Active: ${chalk.green(String(pr.active))}  Loaded: ${pr.loaded}  Inactive: ${pr.inactive}  Error: ${pr.error > 0 ? chalk.red(String(pr.error)) : pr.error}`);
        console.log(`    Rules: ${pr.rules}  Policies: ${pr.policies}`);
        console.log('');

        // Rule Engine
        const re = stats.ruleEngine;
        console.log(chalk.bold('  Rule Engine'));
        console.log(`    Total rules: ${re.total}  Fixable: ${re.fixable}`);
        if (Object.keys(re.byCategory).length > 0) {
          console.log(`    By category: ${Object.entries(re.byCategory).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
        if (Object.keys(re.bySeverity).length > 0) {
          console.log(`    By severity: ${Object.entries(re.bySeverity).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
        console.log('');

        // Registry
        const reg = stats.registry;
        console.log(chalk.bold('  Registry'));
        console.log(`    Total: ${reg.total}  Active: ${chalk.green(String(reg.active))}  Deprecated: ${reg.deprecated}  Disabled: ${reg.disabled}`);
        if (Object.keys(reg.byType).length > 0) {
          console.log(`    By type: ${Object.entries(reg.byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
        console.log('');

        // Asset Graph
        const ag = stats.assetGraph;
        console.log(chalk.bold('  Asset Graph'));
        console.log(`    Assets: ${ag.totalAssets}  Edges: ${ag.totalEdges}`);
        if (Object.keys(ag.byType).length > 0) {
          console.log(`    By type: ${Object.entries(ag.byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
        console.log('');

        // Evidence Engine
        const ee = stats.evidenceEngine;
        console.log(chalk.bold('  Evidence Engine'));
        console.log(`    Total: ${ee.total}  Chain valid: ${ee.chainValid ? chalk.green('yes') : chalk.red('no')}`);
        if (Object.keys(ee.byType).length > 0) {
          console.log(`    By type: ${Object.entries(ee.byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
        console.log('');
      } catch (err) {
        spinner.fail(`Failed to fetch kernel stats: ${err}`);
        process.exit(1);
      }
    });

  cmd
    .command('list-plugins')
    .description('List registered plugins from the gateway')
    .action(async (opts: Record<string, never>, parent: Command) => {
      const spinner = ora('Fetching kernel plugins...').start();
      const globals = getGlobalOpts(parent);

      try {
        const gatewayUrl = globals.gatewayUrl || process.env.ACG_GATEWAY_URL || 'http://localhost:3000';

        const res = await fetch(`${gatewayUrl}/kernel/stats`, {
          headers: globals.apiKey ? { 'X-Api-Key': globals.apiKey } : {},
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const stats = await res.json() as KernelStats;
        spinner.succeed('Kernel plugins fetched');

        if (parent.opts().json) {
          console.log(JSON.stringify(stats.pluginRuntime, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan('│           Registered Plugins                    │'));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(`  Total: ${stats.pluginRuntime.total}`);
        console.log(`  Active: ${chalk.green(String(stats.pluginRuntime.active))}`);
        console.log(`  Rules exposed: ${stats.pluginRuntime.rules}`);
        console.log(`  Policies exposed: ${stats.pluginRuntime.policies}`);
        console.log('');

        if (stats.pluginRuntime.total === 0) {
          console.log(chalk.gray('  No plugins registered yet. Use the PluginRuntime to register plugins.'));
        }
        console.log('');
      } catch (err) {
        spinner.fail(`Failed to fetch kernel plugins: ${err}`);
        process.exit(1);
      }
    });

  cmd
    .command('discover')
    .description('Discover assets from BOM scan and populate asset graph')
    .argument('[path]', 'Project root path', '.')
    .option('--json', 'Output as JSON')
    .action(async (path: string, opts: { json: boolean }, parent: Command) => {
      const spinner = ora('Discovering assets from BOM...').start();
      const globals = getGlobalOpts(parent);

      try {
        const gatewayUrl = globals.gatewayUrl || process.env.ACG_GATEWAY_URL || 'http://localhost:3000';

        // Local BOM scan
        const { generateBom } = await import('../lib/bom.js');
        const { resolve } = await import('node:path');
        const bom = generateBom(resolve(path));

        // Send to gateway for asset graph population
        const res = await fetch(`${gatewayUrl}/kernel/asset-graph/discover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(globals.apiKey ? { 'X-Api-Key': globals.apiKey } : {}),
          },
          body: JSON.stringify({ entries: bom.entries, rootPath: path }),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const result = await res.json() as any;
        spinner.succeed(`Discovered ${result.assetsDiscovered} assets, added ${result.assetsAdded} new`);

        if (opts.json || parent.opts().json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan('│         Asset Graph Discovery                   │'));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(`  Assets discovered: ${result.assetsDiscovered}`);
        console.log(`  Assets added:      ${chalk.green(String(result.assetsAdded))}`);
        console.log(`  Edges added:       ${chalk.green(String(result.edgesAdded))}`);
        console.log('');
        if (result.stats) {
          console.log(chalk.bold('  Graph Stats'));
          console.log(`    Total assets: ${result.stats.totalAssets}`);
          console.log(`    Total edges:  ${result.stats.totalEdges}`);
          if (Object.keys(result.stats.byType).length > 0) {
            console.log(`    By type: ${Object.entries(result.stats.byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
          }
        }
        console.log('');
      } catch (err) {
        spinner.fail(`Asset discovery failed: ${err}`);
        process.exit(1);
      }
    });

  cmd
    .command('asset-graph')
    .description('Query assets from the asset graph')
    .option('--type <type>', 'Filter by asset type (model, tool, provider, policy, mcp-server, connector)')
    .option('--name <name>', 'Filter by asset name (substring match)')
    .option('--json', 'Output as JSON')
    .action(async (opts: { type?: string; name?: string; json: boolean }, parent: Command) => {
      const spinner = ora('Querying asset graph...').start();
      const globals = getGlobalOpts(parent);

      try {
        const gatewayUrl = globals.gatewayUrl || process.env.ACG_GATEWAY_URL || 'http://localhost:3000';
        const params = new URLSearchParams();
        if (opts.type) params.set('type', opts.type);
        if (opts.name) params.set('name', opts.name);

        const res = await fetch(`${gatewayUrl}/kernel/asset-graph?${params.toString()}`, {
          headers: globals.apiKey ? { 'X-Api-Key': globals.apiKey } : {},
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const result = await res.json() as any;
        spinner.succeed(`Found ${result.count} assets`);

        if (opts.json || parent.opts().json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan('│            Asset Graph                          │'));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(`  Total: ${result.count} assets`);
        if (Object.keys(result.stats.byType).length > 0) {
          console.log(`  By type: ${Object.entries(result.stats.byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
        }
        console.log(`  Edges: ${result.stats.totalEdges}`);
        console.log('');

        for (const asset of result.assets) {
          console.log(`  ${chalk.bold(asset.name)} (${asset.type})`);
          console.log(chalk.gray(`    id: ${asset.id}  source: ${asset.source ?? 'unknown'}`));
        }
        console.log('');
      } catch (err) {
        spinner.fail(`Asset graph query failed: ${err}`);
        process.exit(1);
      }
    });

  cmd
    .command('evidence')
    .description('Query evidence chain from the gateway')
    .option('--org <id>', 'Organization ID')
    .option('--type <type>', 'Filter by evidence type')
    .option('--plugin <id>', 'Filter by plugin ID')
    .option('--limit <n>', 'Max records', '20')
    .option('--verify', 'Verify chain integrity')
    .option('--json', 'Output as JSON')
    .action(async (opts: { org?: string; type?: string; plugin?: string; limit: string; verify: boolean; json: boolean }, parent: Command) => {
      const spinner = ora('Querying evidence engine...').start();
      const globals = getGlobalOpts(parent);

      try {
        const gatewayUrl = globals.gatewayUrl || process.env.ACG_GATEWAY_URL || 'http://localhost:3000';

        if (opts.verify && opts.org) {
          const res = await fetch(`${gatewayUrl}/kernel/evidence/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(globals.apiKey ? { 'X-Api-Key': globals.apiKey } : {}),
            },
            body: JSON.stringify({ organizationId: opts.org }),
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          const result = await res.json() as any;
          spinner.succeed(result.chain.valid ? 'Evidence chain is valid' : 'Evidence chain is INVALID');

          if (opts.json || parent.opts().json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log('');
            console.log(`  Organization: ${opts.org}`);
            console.log(`  Chain valid:  ${result.chain.valid ? chalk.green('yes') : chalk.red('no')}`);
            console.log(`  Records:      ${result.chain.count}`);
            console.log('');
          }
          return;
        }

        const params = new URLSearchParams();
        if (opts.org) params.set('organizationId', opts.org);
        if (opts.type) params.set('type', opts.type);
        if (opts.plugin) params.set('pluginId', opts.plugin);
        params.set('limit', opts.limit);

        const res = await fetch(`${gatewayUrl}/kernel/evidence?${params.toString()}`, {
          headers: globals.apiKey ? { 'X-Api-Key': globals.apiKey } : {},
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const result = await res.json() as any;
        spinner.succeed(`Found ${result.count} evidence records`);

        if (opts.json || parent.opts().json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log('');
        console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────┐'));
        console.log(chalk.bold.cyan('│           Evidence Chain                        │'));
        console.log(chalk.bold.cyan('└─────────────────────────────────────────────────┘'));
        console.log('');
        console.log(`  Total records: ${result.count}`);
        console.log(`  Chain valid:   ${result.stats.chainValid ? chalk.green('yes') : chalk.red('no')}`);
        console.log('');

        for (const ev of result.evidence.slice(0, 10)) {
          console.log(`  ${chalk.bold(ev.id.slice(0, 8))}... (${ev.type})`);
          console.log(chalk.gray(`    plugin: ${ev.pluginId}  rule: ${ev.ruleId ?? 'N/A'}  request: ${ev.requestId ?? 'N/A'}`));
          console.log(chalk.gray(`    time: ${ev.timestamp}`));
        }
        if (result.count > 10) console.log(chalk.gray(`  ... and ${result.count - 10} more`));
        console.log('');
      } catch (err) {
        spinner.fail(`Evidence query failed: ${err}`);
        process.exit(1);
      }
    });

  return cmd;
}
