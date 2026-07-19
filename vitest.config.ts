import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@acg/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@acg/contracts': path.resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@acg/connectors': path.resolve(__dirname, 'packages/connectors/src/index.ts'),
      '@acg/workflows': path.resolve(__dirname, 'packages/workflows/src/index.ts'),
      '@acg/sdk': path.resolve(__dirname, 'packages/sdk-typescript/src/index.ts'),
      '@acg/ai-router': path.resolve(__dirname, 'packages/ai-router/src/index.ts'),
      '@acg/risk-engine': path.resolve(__dirname, 'packages/risk-engine/src/index.ts'),
      '@acg/governance-engine': path.resolve(__dirname, 'packages/governance-engine/src/index.ts'),
      '@acg/compliance-engine': path.resolve(__dirname, 'packages/compliance-engine/src/index.ts'),
      '@acg/kernel': path.resolve(__dirname, 'packages/kernel/src/index.ts'),
      '@acg/billing': path.resolve(__dirname, 'packages/billing/src/index.ts'),
      '@acg/admin': path.resolve(__dirname, 'apps/admin/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.ts', 'apps/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.config.*'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
