import { RuleTester } from '@typescript-eslint/rule-tester';

RuleTester.afterAll = () => {};
RuleTester.describe = (text, fn) => fn();
RuleTester.it = (text, fn) => fn();
