module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2021: true, 
    node: true,
    jest: true,
  },
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'apps/api/dist/**'
  ],
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
  },
};