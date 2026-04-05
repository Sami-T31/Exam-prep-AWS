import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@exam-prep/shared$': '<rootDir>/../packages/shared/src/index.ts',
    '^@exam-prep/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};

export default createJestConfig(config);
