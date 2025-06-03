import parser from '@typescript-eslint/parser';
import util from 'util';

// (file intentionally left blank - removed for cleanup)

const code = 'vault.getFiles().find(f => f.path === "foo");';
const ast = parser.parse(code, { ecmaVersion: 2020, sourceType: 'module' });
console.log(util.inspect(ast, { depth: 10, colors: true }));
