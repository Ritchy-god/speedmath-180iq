const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'math-engine.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root, 'solver.js'), 'utf8'));

const digits = [2, 5, 5, 4];
const target = 24;
const solutions = MathSolver.solve(digits, target, { maxSolutions: 25 });

assert(solutions.length > 0, 'solver should find at least one solution');
assert(!solutions[0].raw.includes('!'), 'the first solution should favor a non-factorial method');
assert(solutions.some(solution => solution.raw.includes('\\sum')), 'solver should include a legal summation method');
assert(solutions.some(solution => !/[!√^]/.test(solution.raw) && !solution.raw.includes('\\sum')), 'solver should include ordinary arithmetic');
assert(solutions.filter(solution => solution.raw.includes('!')).length <= 6, 'factorial methods should be capped');

for (const solution of solutions) {
  const evaluated = MathEngine.evaluate(solution.raw);
  assert(evaluated.success, `solution must be parseable: ${solution.raw}`);
  assert(Math.abs(evaluated.result - target) < 1e-7, `solution must equal ${target}: ${solution.raw}`);
  assert(MathEngine.validateDigitUsage(solution.raw, digits).isValid, `solution must use the exact digits: ${solution.raw}`);
}

console.log(`solver diversity test passed (${solutions.length} valid solutions)`);
