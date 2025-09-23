import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const baseConfig = require('@fleetops/eslint-config/flat.js');

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...baseConfig,
];
