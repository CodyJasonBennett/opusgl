module.exports = {
  transform: {
    '^.+\\.ts$': '@swc/jest',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'ts'],
  verbose: true,
  testTimeout: 30000,
}
