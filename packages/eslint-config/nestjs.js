/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./index.js'),
  rules: {
    ...require('./index.js').rules,
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
