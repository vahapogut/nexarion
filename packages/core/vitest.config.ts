
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { coverage: { reporter: ['text', 'json'], thresholds: { branches: 50, functions: 50, lines: 60, statements: 60 } } } });
