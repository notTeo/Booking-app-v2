const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // supertest's default throwaway servers bind the wildcard address and can
    // be shadowed by another local app's 127.0.0.1 listener, which flakes tests
    // with stray 401/404/socket hang up. Use serve() from tests/testRequest.
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'supertest',
              message:
                "Import { serve } from './testRequest' instead: it binds 127.0.0.1 so a stray local listener can't answer test requests.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/tests/testRequest.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
);