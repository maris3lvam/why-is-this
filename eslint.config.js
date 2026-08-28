import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Core principle: APIs must never write to stdout/stderr
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
    },
  },
  {
    // Relax console rule for test files only
    files: ['test/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'vitest.config.ts',
      'tsup.config.ts',
      'eslint.config.js',
    ],
  },
);
