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
    const exhaustive = opts.exhaustive === true;
    const max = opts.maxSolutions || (exhaustive ? 500 : 25);
    const candidates = new Map();
    const passLimit = exhaustive ? Math.max(500, max * 2) : Math.max(60, max * 4);
    let searchLimitReached = false;

    // Search separate strategy families. A single DFS used to stop after the
    // first 25 hits, and factorial branches reached that limit before ordinary
    // arithmetic had a fair chance to be explored.
    function search(config, limit) {
      const found = new Map();
      const stateVisits = new Map();
      const stateVisitCap = exhaustive
        ? (digits.length >= 5 ? 48 : 96)
        : (digits.length >= 5 ? 12 : 24);

      function unary(node) {
        const out = [node];
        const v = node.val;
        if (config.factorial && v >= 0 && v <= 5 && Number.isInteger(v) && !node.expr.endsWith('!')) {
          const f = MathEngine.factorial(v);
          if (isFinite(f)) {
            const inner = node.expr;
            const e = (/^[0-9]+$/.test(inner) || (inner[0] === '(' && inner.slice(-1) === ')')) ? `${inner}!` : `(${inner})!`;
            out.push({ expr: e, val: f, literal: false });
          }
        }
        if (config.sqrt && v > 0 && v <= 81 && !node.expr.startsWith('√')) {
          const sq = Math.sqrt(v);
          if (Number.isInteger(sq)) {
            const inner = node.expr;
            const e = (/^[0-9]+!?$/.test(inner) || (inner[0] === '(' && inner.slice(-1) === ')')) ? `√${inner}` : `√(${inner})`;
            out.push({ expr: e, val: sq, literal: false });
          }
        }
        return out;
      }

      function addResult(node) {
        if (Math.abs(node.val - target) >= 1e-7) return;
        const key = MathSolver.simplify(node.expr);
        const checked = MathEngine.evaluate(key);
        if (!checked.success || Math.abs(checked.result - target) >= 1e-7) return;
        if (!MathEngine.validateDigitUsage(key, digits).isValid) return;
        if (!found.has(key)) found.set(key, MathSolver.toLaTeX(key));
      }

      function rec(nodes) {
        if (found.size >= limit) return;
        if (nodes.length === 1) {
          for (const fv of unary(nodes[0])) addResult(fv);
          return;
        }
        const stateKey = nodes
          .map(node => `${Math.round(node.val * 1e7) / 1e7}:${node.literal ? 1 : 0}`)
          .sort()
          .join('|');
        const visits = (stateVisits.get(stateKey) || 0) + 1;
        stateVisits.set(stateKey, visits);
        if (visits > stateVisitCap) return;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const rem = nodes.filter((_, k) => k !== i && k !== j);
            for (const a of unary(nodes[i])) {
              for (const b of unary(nodes[j])) {
                const pairs = [
                  { expr: `(${a.expr} + ${b.expr})`, val: a.val + b.val, literal: false },
                  { expr: `(${a.expr} - ${b.expr})`, val: a.val - b.val, literal: false },
                  { expr: `(${b.expr} - ${a.expr})`, val: b.val - a.val, literal: false },
                  { expr: `(${a.expr} × ${b.expr})`, val: a.val * b.val, literal: false },
                ];
                if (b.val !== 0) pairs.push({ expr: `(${a.expr} ÷ ${b.expr})`, val: a.val / b.val, literal: false });
                if (a.val !== 0) pairs.push({ expr: `(${b.expr} ÷ ${a.expr})`, val: b.val / a.val, literal: false });
                if (config.power && a.val > 0 && a.val <= 10 && b.val >= 0 && b.val <= 4) {
                  const pv = Math.pow(a.val, b.val);
                  if (isFinite(pv) && pv <= 9999) pairs.push({ expr: `(${a.expr} ^ ${b.expr})`, val: pv, literal: false });
                }
                if (config.power && b.val > 0 && b.val <= 10 && a.val >= 0 && a.val <= 4) {
                  const pv = Math.pow(b.val, a.val);
                  if (isFinite(pv) && pv <= 9999) pairs.push({ expr: `(${b.expr} ^ ${a.expr})`, val: pv, literal: false });
                }

                // Sigma is a genuine two-digit operation here: both bounds must
                // be untouched puzzle digits. This prevents invented constants
                // and keeps validateDigitUsage() exact.
                if (
                  config.sigma && a.literal && b.literal &&
                  Number.isInteger(a.val) && Number.isInteger(b.val) &&
                  a.val >= 0 && a.val < b.val && b.val <= 9
                ) {
                  const sv = MathEngine.sigma(a.val, b.val);
                  if (isFinite(sv)) {
                    pairs.push({
                      expr: `\\sum_{i=${a.expr}}^{${b.expr}} i`,
                      val: sv,
                      literal: false
                    });
                  }
                }
                if (
                  config.sigma && a.literal && b.literal &&
                  Number.isInteger(a.val) && Number.isInteger(b.val) &&
                  b.val >= 0 && b.val < a.val && a.val <= 9
                ) {
                  const sv = MathEngine.sigma(b.val, a.val);
                  if (isFinite(sv)) {
                    pairs.push({
                      expr: `\\sum_{i=${b.expr}}^{${a.expr}} i`,
                      val: sv,
                      literal: false
                    });
                  }
                }

                for (const p of pairs) {
                  if (!isFinite(p.val) || Math.abs(p.val) > 999999) continue;
                  rec([...rem, p]);
                  if (found.size >= limit) return;
                }
              }
            }
          }
        }
      }

      rec(digits.map(d => ({ expr: `${d}`, val: d, literal: true })));
      if (found.size >= limit) searchLimitReached = true;
      for (const [raw, latex] of found) {
        if (!candidates.has(raw)) candidates.set(raw, { raw, latex });
      }
    }

    search({ factorial: false, sqrt: false, power: false, sigma: false }, passLimit);
    search({ factorial: false, sqrt: false, power: true,  sigma: false }, passLimit);
    search({ factorial: false, sqrt: true,  power: true,  sigma: false }, passLimit);
    search({ factorial: false, sqrt: true,  power: true,  sigma: true  }, passLimit);
    search({ factorial: true,  sqrt: true,  power: true,  sigma: true  }, passLimit * 2);

    function quality(solution) {
      const raw = solution.raw;
      const factorials = (raw.match(/!/g) || []).length;
      const roots = (raw.match(/√/g) || []).length;
      const powers = (raw.match(/\^/g) || []).length;
      const sigmas = (raw.match(/\\sum/g) || []).length;
      const operators = (raw.match(/[+\-×÷]/g) || []).length;
      return raw.length * 0.025 + operators + roots * 1.4 + powers * 1.8 + sigmas * 1.2 + factorials * 5;
    }

    const buckets = { basic: [], sigma: [], advanced: [], factorial: [] };
    for (const solution of candidates.values()) {
      if (solution.raw.includes('!')) buckets.factorial.push(solution);
      else if (solution.raw.includes('\\sum')) buckets.sigma.push(solution);
      else if (/[√^]/.test(solution.raw)) buckets.advanced.push(solution);
      else buckets.basic.push(solution);
    }
    for (const bucket of Object.values(buckets)) bucket.sort((a, b) => quality(a) - quality(b));

    // Round-robin makes different methods visible near the top. Preview mode
    // caps factorial variants; exhaustive mode keeps them after the other
    // strategy families have had a fair chance to appear.
    const selected = [];
    const factorialCap = Math.max(3, Math.floor(max * 0.25));
    const order = ['basic', 'sigma', 'advanced', 'factorial'];
    let factorialCount = 0;
    while (selected.length < max) {
      let added = false;
      for (const name of order) {
        if (selected.length >= max) break;
        if (!exhaustive && name === 'factorial' && factorialCount >= factorialCap) continue;
        const next = buckets[name].shift();
        if (!next) continue;
        selected.push(next);
        if (name === 'factorial') factorialCount++;
        added = true;
      }
      if (!added) break;
    }
    selected.truncated = exhaustive && (searchLimitReached || candidates.size > max);
    selected.totalFound = candidates.size;
    return selected;
  },

  generateSolvablePuzzle(digitCount = 4, targetMode = '2digit') {
    for (let attempt = 0; attempt < 30; attempt++) {
      const digits = Array.from({ length: digitCount }, () => Math.floor(Math.random() * 10));
      if (!this.isValidDigitSet(digits)) continue;

      // Fast reachability check
      const reachable = new Set();
      const reachableWithoutFactorial = new Set();

      function getUnary(node) {
        const out = [node];
        const v = node.val;
        if (v >= 0 && v <= 5 && Number.isInteger(v)) {
          const f = MathEngine.factorial(v);
          if (isFinite(f)) out.push({ val: f, usesFactorial: true });
        }
        if (v > 0 && v <= 81) {
          const sq = Math.sqrt(v);
          if (Number.isInteger(sq)) out.push({ val: sq, usesFactorial: node.usesFactorial });
        }
        return out;
      }

      function explore(nodes) {
        if (reachable.size > 400) return;
        if (nodes.length === 1) {
          for (const u of getUnary(nodes[0])) {
            const v = Math.round(u.val);
            if (Math.abs(u.val - v) < 1e-7 && v >= 0 && v <= 999) {
              reachable.add(v);
              if (!u.usesFactorial) reachableWithoutFactorial.add(v);
            }
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
                  explore([...rem, { val: v, usesFactorial: a.usesFactorial || b.usesFactorial }]);
                  if (reachable.size > 400) return;
                }
              }
            }
          }
        }
      }

      explore(digits.map(d => ({ val: d, usesFactorial: false })));

      function targetsFor(values) {
        if (targetMode === '24') return values.has(24) ? [24] : [];
        if (targetMode === '2digit') return [...values].filter(v => v >= 10 && v <= 99);
        if (targetMode === '3digit') return [...values].filter(v => v >= 100 && v <= 999);
        return [...values].filter(v => v >= 10 && v <= 999);
      }

      // Prefer targets with at least one non-factorial construction. Fall back
      // only when the chosen mode genuinely has no such reachable target.
      let targets = targetsFor(reachableWithoutFactorial);
      if (targets.length === 0) targets = targetsFor(reachable);

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
    const reachableWithoutFactorial = new Set();

    function getUnary(node) {
      const out = [node];
      const v = node.val;
      if (v >= 0 && v <= 5 && Number.isInteger(v)) {
        const f = MathEngine.factorial(v);
        if (isFinite(f)) out.push({ val: f, usesFactorial: true });
      }
      if (v > 0 && v <= 81) {
        const sq = Math.sqrt(v);
        if (Number.isInteger(sq)) out.push({ val: sq, usesFactorial: node.usesFactorial });
      }
      return out;
    }

    function explore(nodes) {
      if (reachable.size > 400) return;
      if (nodes.length === 1) {
        for (const u of getUnary(nodes[0])) {
          const v = Math.round(u.val);
          if (Math.abs(u.val - v) < 1e-7 && v >= 0 && v <= 999) {
            reachable.add(v);
            if (!u.usesFactorial) reachableWithoutFactorial.add(v);
          }
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
                explore([...rem, { val: v, usesFactorial: a.usesFactorial || b.usesFactorial }]);
                if (reachable.size > 400) return;
              }
            }
          }
        }
      }
    }

    explore(digits.map(d => ({ val: d, usesFactorial: false })));

    function targetsFor(values) {
      if (targetMode === '24') return values.has(24) ? [24] : [];
      if (targetMode === '2digit') return [...values].filter(v => v >= 10 && v <= 99);
      if (targetMode === '3digit') return [...values].filter(v => v >= 100 && v <= 999);
      return [...values].filter(v => v >= 10 && v <= 999);
    }

    let targets = targetsFor(reachableWithoutFactorial);
    if (targets.length === 0) targets = targetsFor(reachable);

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

