import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/helpers/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000
};

export default config;