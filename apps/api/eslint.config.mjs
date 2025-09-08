import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nestjsConfig = require('@fleetops/eslint-config/nestjs-flat.js');

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  ...nestjsConfig,
];
