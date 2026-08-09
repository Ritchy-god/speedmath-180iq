/**
 * 180 IQ Solver Engine - Stable Clean Version
 */

const MathSolver = {

  isValidDigitSet(digits) {
    if (!digits || digits.length === 0) return false;
    const counts = {};
    for (const d of digits) counts[d] = (counts[d] || 0) + 1;
    if ((counts[0] || 0) > 1) return false;
    for (let d = 1; d <= 9; d++) if ((counts[d] || 0) > 2) return false;
    return true;
  },

  toLaTeX(expr) {
    if (!expr) return '';
    let s = expr;
    s = s.replace(/√\(([^()]+)\)/g, '\\sqrt{$1}').replace(/√([0-9]+!?)/g, '\\sqrt{$1}');
    s = s.replace(/\\sum_\{i=([0-9]+!?)\}\^\{([^}]+)\} i/g, '\\sum_{i=$1}^{$2} i');
    s = s.replace(/×/g, '\\times ').replace(/÷/g, '\\div ');
    // Wrap exponent RHS in braces
    s = s.replace(/\^\s*(\([^()]+\)|[0-9]+!?|\\sqrt\{[^{}]*\})/g, '^{$1}');
    return s;
  },

  simplify(expr) {
    if (!expr) return '';
    let s = expr.trim();
    for (let i = 0; i < 5; i++) {
      const n = s
        .replace(/\(\s*\(([^()]+)\)\s*\)/g, '($1)')
        .replace(/\(\s*([0-9]+!?)\s*\)/g, '$1')
        .replace(/\(\s*(√[0-9]+!?)\s*\)/g, '$1');
      if (n === s) break;
      s = n;
    }
    return s;
  },

  solve(digits, target, opts = {}) {
    const max = opts.maxSolutions || 25;
    const found = new Map();

    function unary(node) {
      const out = [node];
      const v = node.val;
      if (v >= 0 && v <= 5 && Number.isInteger(v) && !node.expr.endsWith('!')) {
        const f = MathEngine.factorial(v);
        if (isFinite(f)) {
          const inner = node.expr;
          const e = (/^[0-9]+$/.test(inner) || (inner[0] === '(' && inner.slice(-1) === ')')) ? `${inner}!` : `(${inner})!`;
          out.push({ expr: e, val: f });
        }
      }
      if (v > 0 && v <= 81 && !node.expr.startsWith('√')) {
        const sq = Math.sqrt(v);
        if (Number.isInteger(sq)) {
          const inner = node.expr;
          const e = (/^[0-9]+!?$/.test(inner) || (inner[0] === '(' && inner.slice(-1) === ')')) ? `√${inner}` : `√(${inner})`;
          out.push({ expr: e, val: sq });
        }
      }
      return out;
    }

    function rec(nodes) {
      if (found.size >= max) return;
      if (nodes.length === 1) {
        for (const fv of unary(nodes[0])) {
          if (Math.abs(fv.val - target) < 1e-7) {
            const key = MathSolver.simplify(fv.expr);
            if (!found.has(key)) found.set(key, MathSolver.toLaTeX(key));
          }
        }
        return;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const rem = nodes.filter((_, k) => k !== i && k !== j);
          for (const a of unary(nodes[i])) {
            for (const b of unary(nodes[j])) {
              const pairs = [
                { expr: `(${a.expr} + ${b.expr})`, val: a.val + b.val },
                { expr: `(${a.expr} - ${b.expr})`, val: a.val - b.val },
                { expr: `(${b.expr} - ${a.expr})`, val: b.val - a.val },
                { expr: `(${a.expr} × ${b.expr})`, val: a.val * b.val },
              ];
              if (b.val !== 0) pairs.push({ expr: `(${a.expr} ÷ ${b.expr})`, val: a.val / b.val });
              if (a.val !== 0) pairs.push({ expr: `(${b.expr} ÷ ${a.expr})`, val: b.val / a.val });
              if (a.val > 0 && a.val <= 10 && b.val >= 0 && b.val <= 4) {
                const pv = Math.pow(a.val, b.val);
                if (isFinite(pv) && pv <= 9999) pairs.push({ expr: `(${a.expr} ^ ${b.expr})`, val: pv });
              }
              for (const p of pairs) {
                if (!isFinite(p.val)) continue;
                rec([...rem, p]);
                if (found.size >= max) return;
              }
            }
          }
        }
      }
    }

    rec(digits.map(d => ({ expr: `${d}`, val: d })));
    return [...found.entries()].map(([raw, latex]) => ({ raw, latex }));
  },

  generateSolvablePuzzle(digitCount = 4, targetMode = '2digit') {
    for (let attempt = 0; attempt < 30; attempt++) {
      const digits = Array.from({ length: digitCount }, () => Math.floor(Math.random() * 10));
      if (!this.isValidDigitSet(digits)) continue;

      // Fast reachability check
      const reachable = new Set();

      function getUnary(node) {
        const out = [node];
        const v = node.val;
        if (v >= 0 && v <= 5 && Number.isInteger(v)) {
          const f = MathEngine.factorial(v);
          if (isFinite(f)) out.push({ val: f });
        }
        if (v > 0 && v <= 81) {
          const sq = Math.sqrt(v);
          if (Number.isInteger(sq)) out.push({ val: sq });
        }
        return out;
      }

      function explore(nodes) {
        if (reachable.size > 400) return;
        if (nodes.length === 1) {
          for (const u of getUnary(nodes[0])) {
            const v = Math.round(u.val);
            if (Math.abs(u.val - v) < 1e-7 && v >= 0 && v <= 999) reachable.add(v);
          }
          return;
        }
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const rem = nodes.filter((_, k) => k !== i && k !== j);
            for (const a of getUnary(nodes[i])) {
              for (const b of getUnary(nodes[j])) {
                const vals = [a.val + b.val, a.val - b.val, b.val - a.val, a.val * b.val];
                if (b.val !== 0) vals.push(a.val / b.val);
                if (a.val !== 0) vals.push(b.val / a.val);
                for (const v of vals) {
                  if (!isFinite(v)) continue;
                  explore([...rem, { val: v }]);
                  if (reachable.size > 400) return;
                }
              }
            }
          }
        }
      }

      explore(digits.map(d => ({ val: d })));

      let targets = [];
      if (targetMode === '24') {
        if (reachable.has(24)) targets = [24];
      } else if (targetMode === '2digit') {
        targets = [...reachable].filter(v => v >= 10 && v <= 99);
      } else if (targetMode === '3digit') {
        targets = [...reachable].filter(v => v >= 100 && v <= 999);
      } else {
        targets = [...reachable].filter(v => v >= 10 && v <= 999);
      }

      if (targets.length === 0) continue;
      const t = targets[Math.floor(Math.random() * targets.length)];
      const solutions = this.solve(digits, t, { maxSolutions: 25 });
      if (solutions.length > 0) return { digits, target: t, solutions };
    }

    // Fallback
    const fd = digitCount >= 5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
    const ft = targetMode === '3digit' ? 120 : 24;
    return { digits: fd, target: ft, solutions: this.solve(fd, ft) };
  },

  // Given existing digits, pick a NEW random solvable target (different from current if possible)
  generateSolvablePuzzleFromDigits(digits, targetMode = '2digit') {
    if (!digits || digits.length === 0) return this.generateSolvablePuzzle(4, targetMode);

    const reachable = new Set();

    function getUnary(node) {
      const out = [node];
      const v = node.val;
      if (v >= 0 && v <= 5 && Number.isInteger(v)) {
        const f = MathEngine.factorial(v);
        if (isFinite(f)) out.push({ val: f });
      }
      if (v > 0 && v <= 81) {
        const sq = Math.sqrt(v);
        if (Number.isInteger(sq)) out.push({ val: sq });
      }
      return out;
    }

    function explore(nodes) {
      if (reachable.size > 400) return;
      if (nodes.length === 1) {
        for (const u of getUnary(nodes[0])) {
          const v = Math.round(u.val);
          if (Math.abs(u.val - v) < 1e-7 && v >= 0 && v <= 999) reachable.add(v);
        }
        return;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const rem = nodes.filter((_, k) => k !== i && k !== j);
          for (const a of getUnary(nodes[i])) {
            for (const b of getUnary(nodes[j])) {
              const vals = [a.val + b.val, a.val - b.val, b.val - a.val, a.val * b.val];
              if (b.val !== 0) vals.push(a.val / b.val);
              if (a.val !== 0) vals.push(b.val / a.val);
              for (const v of vals) {
                if (!isFinite(v)) continue;
                explore([...rem, { val: v }]);
                if (reachable.size > 400) return;
              }
            }
          }
        }
      }
    }

    explore(digits.map(d => ({ val: d })));

    let targets = [];
    if (targetMode === '24') {
      if (reachable.has(24)) targets = [24];
    } else if (targetMode === '2digit') {
      targets = [...reachable].filter(v => v >= 10 && v <= 99);
    } else if (targetMode === '3digit') {
      targets = [...reachable].filter(v => v >= 100 && v <= 999);
    } else {
      targets = [...reachable].filter(v => v >= 10 && v <= 999);
    }

    // Try picking a different target from current
    const currentTarget = typeof window !== 'undefined' && window._lastTarget ? window._lastTarget : -1;
    const otherTargets = targets.filter(v => v !== currentTarget);
    const pool = otherTargets.length > 0 ? otherTargets : targets;

    if (pool.length === 0) {
      // Fallback: same digits, just return what we have
      return { digits, target: targets[0] || 0, solutions: this.solve(digits, targets[0] || 0) };
    }

    const t = pool[Math.floor(Math.random() * pool.length)];
    if (typeof window !== 'undefined') window._lastTarget = t;
    const solutions = this.solve(digits, t, { maxSolutions: 25 });
    return { digits, target: t, solutions };
  }
};

if (typeof window !== 'undefined') window.MathSolver = MathSolver;

