// Readability rules only; formatting is Prettier's job (npm run format).
// Existing violations are listed in eslint-suppressions.json and get fixed
// over time; new code must pass.
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
