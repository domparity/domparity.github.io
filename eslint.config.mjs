// Readability rules only; formatting is Prettier's job (npm run format).
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['data/', 'brand/', 'site/', 'website/build/', 'website/.docusaurus/', '**/node_modules/'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    // Some files carry disable comments for rules this config doesn't enable.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-nested-ternary': 'error',
    },
  },
];
