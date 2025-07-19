/** @type {import('jest').Config} */
const config = {
  displayName: 'Knowledgebase Package',
  preset: 'ts-jest',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts'
  ],
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/**/*', // Exclude Next.js app directory
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Custom Jest environment that loads env vars first
  testEnvironment: '<rootDir>/tests/jest-environment.js',
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // Use ES modules for testing
        module: 'CommonJS',
        target: 'ES2020',
      }
    }]
  },
  
  // Handle ES modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(@vercel/blob)/)'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
};

module.exports = config; 