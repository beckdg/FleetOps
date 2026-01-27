import type { Config } from 'jest';

/**
 * Unit test coverage thresholds reflect the current baseline (~18% statements).
 * Raise these incrementally as unit tests expand; CI fails if coverage drops below.
 */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/test/integration/'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts'],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json', 'json-summary', 'cobertura'],
  coverageThreshold: {
    global: {
      statements: 18,
      branches: 16,
      functions: 12,
      lines: 17,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
