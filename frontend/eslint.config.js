import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginReact from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  { settings: { react: { version: 'detect' } } },
  pluginReact.configs.flat.recommended,
  reactHooksPlugin.configs.flat.recommended,
  {
    rules: {
      semi: 2,
      eqeqeq: [2, 'always'],
      quotes: [2, 'single'],
    },
  },
  eslintConfigPrettier,
]);
