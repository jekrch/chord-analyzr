import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  {
    // Generated API client and build artifacts are not ours to lint.
    ignores: ['dist', 'build', 'src/api/**', 'coverage'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The React-Compiler rules in react-hooks v7 flag many pre-existing
      // patterns app-wide. Keep them advisory for now (surface, don't block);
      // tighten to 'error' as the offending code is migrated.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Advisory at first — surface, don't block, on the existing codebase.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Test and config files run in Node and use test globals.
    files: ['**/*.{test,spec}.{ts,tsx}', '**/setupTests.ts', '*.config.{js,ts}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
)
