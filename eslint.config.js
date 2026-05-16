import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [{
  files: ['packages/*/src/**/*.ts'],
  languageOptions: { parser: tsParser },
  plugins: { '@typescript-eslint': tseslint },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
}];
