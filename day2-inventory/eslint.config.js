import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const sharedRules = {
  ...tsPlugin.configs.recommended.rules,
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-explicit-any': 'warn',
};

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: sharedRules,
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: sharedRules,
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
