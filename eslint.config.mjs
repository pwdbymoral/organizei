import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['**/.next/**', '**/node_modules/**', '**/drizzle/**', '**/dist/**'] },
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: { parser: tsParser },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'import/no-cycle': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
