const process = require('node:process');

const spec = process.argv[2] ?? '';

module.exports = {
    'node-option': ['import=tsx'],
    require: ['tests/mocha-setup.ts'],
    extensions: ['ts'],
    spec: [`tests/**/*${spec}*.test.ts`],
    timeout: 10000,
};
