"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
    coverageDirectory: './coverage',
    testEnvironment: 'node',
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map