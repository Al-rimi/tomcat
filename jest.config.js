exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.ts'],
    moduleNameMapper: {
      '^vscode$': '<rootDir>/test/mocks/vscode.js'
    }
};