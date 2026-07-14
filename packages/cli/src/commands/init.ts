import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const TEMPLATES = {
  default: {
    name: 'Default',
    description: 'General-purpose AI compliance setup',
    pack: 'dpdp',
    config: {
      project: 'my-project',
      compliance: {
        pack: 'dpdp',
        severity: 'medium',
      },
      gateway: {
        url: 'http://localhost:3000',
      },
    },
  },
  healthcare: {
    name: 'Healthcare',
    description: 'HIPAA-compliant healthcare AI',
    pack: 'hipaa',
    config: {
      project: 'healthcare-ai',
      compliance: {
        pack: 'hipaa',
        severity: 'high',
      },
      gateway: {
        url: 'http://localhost:3000',
      },
    },
  },
  fintech: {
    name: 'Fintech',
    description: 'PCI-DSS and banking compliance',
    pack: 'pci-dss',
    config: {
      project: 'fintech-ai',
      compliance: {
        pack: 'pci-dss',
        severity: 'critical',
      },
      gateway: {
        url: 'http://localhost:3000',
      },
    },
  },
};

function writeConfig(dir: string, config: Record<string, unknown>): void {
  const configPath = path.join(dir, 'acg.json');
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow(`  ⚠ ${configPath} already exists, skipping`));
    return;
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(chalk.green(`  ✓ Created ${configPath}`));
}

function writeGitignore(dir: string): void {
  const gitignorePath = path.join(dir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    console.log(chalk.yellow(`  ⚠ .gitignore already exists, skipping`));
    return;
  }
  const content = `# ACG
acg.json
acg-scan.json
acg-bom.json
acg-report.*

# Dependencies
node_modules/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
`;
  fs.writeFileSync(gitignorePath, content);
  console.log(chalk.green(`  ✓ Created .gitignore`));
}

function writeReadme(dir: string, template: string): void {
  const readmePath = path.join(dir, 'README.md');
  if (fs.existsSync(readmePath)) {
    console.log(chalk.yellow(`  ⚠ README.md already exists, skipping`));
    return;
  }
  const tmpl = TEMPLATES[template as keyof typeof TEMPLATES];
  const content = `# ${tmpl.name} AI Compliance

This project uses ACG for AI compliance monitoring.

## Quick Start

\`\`\`bash
# Install ACG CLI
npm install -g @acg/cli

# Scan for compliance issues
acg scan .

# Check compliance score
acg score .

# Generate AI Bill of Materials
acg bom .
\`\`\`

## Compliance Pack

This project uses the **${tmpl.pack}** compliance pack.

See [ACG Documentation](https://docs.acg.dev) for more information.
`;
  fs.writeFileSync(readmePath, content);
  console.log(chalk.green(`  ✓ Created README.md`));
}

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize a new ACG project')
    .option('--template <name>', 'Project template: default, healthcare, fintech', 'default')
    .option('--pack <name>', 'Default compliance pack')
    .option('--dir <path>', 'Directory to initialize', '.')
    .action((options) => {
      const template = options.template;
      if (!TEMPLATES[template as keyof typeof TEMPLATES]) {
        console.error(chalk.red(`Unknown template: ${template}`));
        console.error(chalk.gray(`Available templates: ${Object.keys(TEMPLATES).join(', ')}`));
        process.exit(1);
      }

      const tmpl = TEMPLATES[template as keyof typeof TEMPLATES];
      const dir = path.resolve(options.dir);

      console.log(chalk.bold.cyan('\n🚀 ACG Project Initialization\n'));
      console.log(`  Template: ${chalk.bold(tmpl.name)}`);
      console.log(`  Description: ${tmpl.description}`);
      console.log(`  Compliance Pack: ${chalk.bold(options.pack || tmpl.pack)}`);
      console.log(`  Directory: ${dir}\n`);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(chalk.green(`  ✓ Created directory ${dir}`));
      }

      // Write configuration
      const config = { ...tmpl.config };
      if (options.pack) {
        (config.compliance as Record<string, string>).pack = options.pack;
      }
      writeConfig(dir, config);

      // Write .gitignore
      writeGitignore(dir);

      // Write README
      writeReadme(dir, template);

      console.log(chalk.bold.green('\n✓ Project initialized!\n'));
      console.log(chalk.gray('  Next steps:'));
      console.log(chalk.gray('    1. Review acg.json configuration'));
      console.log(chalk.gray('    2. Run "acg scan ." to scan for issues'));
      console.log(chalk.gray('    3. Run "acg score ." to check compliance score'));
      console.log(chalk.gray('    4. Run "acg bom ." to generate AI Bill of Materials\n'));
    });
}
