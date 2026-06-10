module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest-setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/test/playwright/'],
  moduleNameMapper: {
    '^dexie$': require.resolve('dexie'),
    '^d3-(.+)$': '<rootDir>/node_modules/d3-$1/dist/d3-$1.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}
