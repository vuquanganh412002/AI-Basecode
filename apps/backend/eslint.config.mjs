// @ts-check
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // Specs deliberately type mocks as `any` (.claude/rules/testing.md —
      // strict mock typing widens mockRejectedValue args to `never`).
      '@typescript-eslint/no-explicit-any': 'off',
      // Japanese copy (mail templates, comments, fixtures, BOM in regex)
      // legitimately contains full-width spaces / U+FEFF; only flag them
      // in actual code positions.
      'no-irregular-whitespace': [
        'error',
        {
          skipStrings: true,
          skipTemplates: true,
          skipComments: true,
          skipRegExps: true,
        },
      ],
      // ── Existing-violation rules, downgraded to `warn` so the first lint
      //    adoption doesn't force a codebase-wide cleanup. Tighten back to
      //    'error' once the warnings are paid off.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        // ignoreRestSiblings: DTO specs use `const { field, ...rest } = VALID`
        // to build an object minus one key — the plucked var is never read.
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-require-imports': 'warn',
      'no-useless-catch': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      // `// @ts-nocheck — TDD red phase` banner is the project convention
      // for specs awaiting implementation (.claude/rules/testing.md).
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
);
