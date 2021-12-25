module.exports = {
  transform: {
    '^.+\\.(ts|js)$': '@swc/jest',
  },
  testMatch: ['<rootDir>/tests/**/*.test.{js,ts}'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'ts'],
  verbose: true,
  testTimeout: 30000,
}
