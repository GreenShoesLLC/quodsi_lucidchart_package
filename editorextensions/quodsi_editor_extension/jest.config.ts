// editorextensions/quodsi_editor_extension/jest.config.ts
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }] },
  moduleNameMapper: {
    '^@quodsi/lucid-shared$': '<rootDir>/../../lucid-shared/dist',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^lucid-extension-sdk$': '<rootDir>/tests/__mocks__/lucid-extension-sdk.ts',
  },
  // Route the real SDK to our hand-rolled mock for unit tests.
  setupFiles: [],
  // webpack DefinePlugin constants (see webpack.config.js). Empty = no local
  // override, the same as a cloud bundle.
  globals: {
    __LOCAL_API_OVERRIDE__: '',
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
};

export default config;
