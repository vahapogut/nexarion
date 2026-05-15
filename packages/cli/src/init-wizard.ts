#!/usr/bin/env node
/**
 * Nexarion Init Wizard
 *
 * Interactive CLI to set up a new Nexarion project.
 * npx nexarioncli init
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';

interface InitConfig {
  projectDir: string;
  transport: 'stdio' | 'http';
  agents: { name: string; url: string }[];
  docker: boolean;
  ci: boolean;
}

async function ask(rl: ReturnType<typeof createInterface>, question: string, defaultVal: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${question} (${defaultVal}): `, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

async function wizard() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n⚡ Nexarion Init Wizard\n');
  console.log('Set up a new Nexarion MCP ↔ A2A bridge project.\n');

  const config: InitConfig = {
    projectDir: '',
    transport: 'stdio',
    agents: [],
    docker: false,
    ci: false,
  };

  config.projectDir = await ask(rl, 'Project directory', './nexarion-bridge');

  const transport = await ask(rl, 'Transport (stdio / http)', 'stdio');
  config.transport = transport as 'stdio' | 'http';

  const agentCount = parseInt(await ask(rl, 'Number of A2A agents', '1'));
  for (let i = 0; i < agentCount; i++) {
    const name = await ask(rl, `  Agent ${i + 1} name`, `agent-${i + 1}`);
    const url = await ask(rl, `  Agent ${i + 1} URL`, `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.example.com`);
    config.agents.push({ name, url });
  }

  const dockerAns = await ask(rl, 'Generate Dockerfile? (y/n)', 'n');
  config.docker = dockerAns.toLowerCase() === 'y';

  const ciAns = await ask(rl, 'Generate GitHub Actions CI? (y/n)', 'y');
  config.ci = ciAns.toLowerCase() !== 'n';

  rl.close();

  // Generate files
  const dir = resolve(config.projectDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // nexarion.config.json
  const agentConfigs = config.agents.map(a => ({
    url: a.url,
    name: a.name,
  }));

  const configFile = {
    agents: agentConfigs,
    cache: { ttlMinutes: 5, maxEntries: 100 },
    retry: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 30000 },
    rateLimit: { requestsPerMinute: 60, burst: 10 },
    streaming: { enabled: true, timeoutMs: 30000 },
    server: { transport: config.transport, port: 3000 },
  };

  writeFileSync(resolve(dir, 'nexarion.config.json'), JSON.stringify(configFile, null, 2));
  console.log(`  ✓ Created nexarion.config.json (${config.agents.length} agent(s))`);

  // package.json
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify({
    name: 'nexarion-bridge',
    private: true,
    scripts: {
      start: 'nexarion serve',
      discover: 'nexarion discover',
    },
    dependencies: {
      'nexarion-core': '*',
      'nexarion-server': '*',
      'nexarioncli': '*',
    },
  }, null, 2));
  console.log('  ✓ Created package.json');

  // Claude Desktop config
  writeFileSync(resolve(dir, 'claude_desktop_config.json'), JSON.stringify({
    mcpServers: {
      nexarion: {
        command: 'npx',
        args: ['nexarioncli', 'serve'],
      },
    },
  }, null, 2));
  console.log('  ✓ Created claude_desktop_config.json');

  if (config.docker) {
    writeFileSync(resolve(dir, 'Dockerfile'), 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install -g pnpm && pnpm install\nCMD ["npx", "nexarioncli", "serve"]');
    console.log('  ✓ Created Dockerfile');
  }

  if (config.ci) {
    const ciDir = resolve(dir, '.github/workflows');
    if (!existsSync(ciDir)) mkdirSync(ciDir, { recursive: true });
    writeFileSync(resolve(ciDir, 'ci.yml'), [
      'name: CI',
      'on: [push, pull_request]',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: pnpm/action-setup@v4',
      '      - run: pnpm install',
      '      - run: npx nexarioncli tools',
    ].join('\n'));
    console.log('  ✓ Created .github/workflows/ci.yml');
  }

  console.log(`\n✨ Done! Your Nexarion bridge is ready.\n`);
  console.log(`  cd ${config.projectDir}`);
  console.log('  npm install');
  console.log('  npx nexarioncli discover');
  console.log('  npx nexarioncli serve\n');
}

export { wizard };
