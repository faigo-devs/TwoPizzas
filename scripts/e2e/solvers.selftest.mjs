import assert from 'node:assert/strict';
import { generatePuzzle, isCorrect } from '../../core/tasks/index.ts';
import { canonical, sameResponse, solve, wrongResponse } from './lib/solvers.mjs';

const kinds = ['review', 'order', 'incident', 'merge'];
const sizes = ['S', 'M', 'L'];
let checked = 0;

for (const kind of kinds) {
  for (const size of sizes) {
    for (const workers of [1, 2]) {
      for (const dependency of workers === 2 ? [false, true] : [false]) {
        for (let n = 0; n < 40; n += 1) {
          const puzzle = generatePuzzle({ kind, size, seed: `selftest-${kind}-${size}-${workers}-${dependency}-${n}`, workers, dependency });
          const pieces = [...puzzle.parts, ...(puzzle.dependencyPart ? [puzzle.dependencyPart] : [])];
          const combined = solve(canonical(pieces));
          assert.ok(combined, `${kind} ${size} ${workers} ${dependency} ${n}: no solution`);
          assert.ok(isCorrect(puzzle, combined), `${kind} ${size} ${workers} ${dependency} ${n}: wrong solution`);
          const fromFull = solve(canonical([puzzle.fullPart]));
          assert.ok(isCorrect(puzzle, fromFull), `${kind} ${size} full ${n}: wrong solution`);
          assert.ok(sameResponse(combined, fromFull));
          const wrong = wrongResponse(combined, canonical([puzzle.fullPart]));
          assert.ok(!isCorrect(puzzle, wrong), `${kind} ${size} ${n}: wrongResponse is right`);
          checked += 1;
        }
      }
    }
  }
}
process.stdout.write(`solvers self-test: ${checked} puzzles solved from their parts\n`);
