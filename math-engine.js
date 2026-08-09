/**
 * 180 IQ Math Engine
 * Handles tokenization, parsing, evaluation, and rule validation.
 * Supports generalized Sigma notation \sum_{i=a}^{b} i for any valid lower and upper bounds (a, b).
 */

const MathEngine = {
  // Factorial helper
  factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 10) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  },

  // Generalized Summation helper (Sigma a..b)
  sigma(a, b = null) {
    if (b === null) {
      // Single argument fallback: 1..a
      b = a;
      a = 1;
    }
    if (a > b || a < 0 || b > 100 || !Number.isInteger(a) || !Number.isInteger(b)) return NaN;
    return ((b - a + 1) * (a + b)) / 2;
  },

  // Extract single-digit tokens from a user expression string
  extractUsedDigits(expression) {
    const sanitized = expression
      .replace(/\\sum_\{i=([0-9]+)\}\^\{([^}]+)\} i/g, ' $1 $2 ')
      .replace(/Σ_\{i=([0-9]+)\}\^\{([^}]+)\} i/g, ' $1 $2 ')
      .replace(/sqrt|root|sigma|sum/gi, ' ')
      .replace(/[+\-*\/^!()√×÷={}_\\i]/g, ' ');
    
    const tokens = sanitized.trim().split(/\s+/).filter(Boolean);
    const digits = [];
    
    for (const tok of tokens) {
      for (const char of tok) {
        if (/[0-9]/.test(char)) {
          digits.push(parseInt(char, 10));
        }
      }
    }
    return digits;
  },

  // Validate digit usage against given puzzle digits
  validateDigitUsage(expression, targetDigits) {
    const used = this.extractUsedDigits(expression);
    
    const sortedTarget = [...targetDigits].sort((a, b) => a - b);
    const sortedUsed = [...used].sort((a, b) => a - b);

    const isExactMatch =
      sortedTarget.length === sortedUsed.length &&
      sortedTarget.every((val, idx) => val === sortedUsed[idx]);

    return {
      isValid: isExactMatch,
      usedCount: sortedUsed.length,
      targetCount: sortedTarget.length,
      usedDigits: sortedUsed,
      targetDigits: sortedTarget,
      missingDigits: sortedTarget.filter(d => !sortedUsed.includes(d)),
      extraDigits: sortedUsed.filter(d => !sortedTarget.includes(d))
    };
  },

  // Tokenize math expression into tokens suitable for Shunting-yard parser
  tokenize(expr) {
    let clean = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/\\sum_\{i=([0-9]+)\}\^\{([^}]+)\} i/g, 'SIGMA($1,$2)')
      .replace(/Σ_\{i=([0-9]+)\}\^\{([^}]+)\} i/g, 'SIGMA($1,$2)')
      .replace(/Σ\(([^)]+)\)/g, 'SIGMA(1,$1)')
      .replace(/Σ([0-9]+)/g, 'SIGMA(1,$1)')
      .replace(/√\(([^)]+)\)/g, 'SQRT($1)')
      .replace(/√([0-9]+)/g, 'SQRT($1)');

    const tokens = [];
    let i = 0;
    while (i < clean.length) {
      const char = clean[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(clean[i + 1] || ''))) {
        let numStr = '';
        let hasDecimalPoint = false;
        while (i < clean.length) {
          if (/[0-9]/.test(clean[i])) {
            numStr += clean[i];
            i++;
          } else if (clean[i] === '.' && !hasDecimalPoint) {
            hasDecimalPoint = true;
            numStr += clean[i];
            i++;
          } else {
            break;
          }
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      if (clean.substring(i, i + 5) === 'SIGMA') {
        tokens.push({ type: 'FUNCTION', value: 'SIGMA' });
        i += 5;
        continue;
      }

      if (clean.substring(i, i + 4) === 'SQRT') {
        tokens.push({ type: 'FUNCTION', value: 'SQRT' });
        i += 4;
        continue;
      }

      if (['+', '-', '*', '/', '^', '!', '(', ')', ','].includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }

      throw new Error(`ตัวอักขระไม่ถูกต้อง: "${char}"`);
    }

    return tokens;
  },

  // Safe Math Expression Evaluator
  evaluate(expression) {
    try {
      if (!expression || !expression.trim()) {
        return { success: false, error: 'กรุณาใส่สมการ' };
      }

      const tokens = this.tokenize(expression);
      const val = this.parseAndEval(tokens);

      if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
        return { success: false, error: 'สมการคำนวณไม่ได้ หรือได้ค่าหาที่สุดไม่ได้' };
      }

      const rounded = Math.abs(val - Math.round(val)) < 1e-9 ? Math.round(val) : val;

      return { success: true, result: rounded };
    } catch (err) {
      return { success: false, error: err.message || 'รูปแบบสมการไม่ถูกต้อง' };
    }
  },

  // Shunting-yard algorithm to evaluate infix tokens directly
  parseAndEval(tokens) {
    const outputStack = [];
    const opStack = [];

    const precedence = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
      '^': 3,
      '!': 4,
      'SIGMA': 4,
      'SQRT': 4
    };

    const isRightAssociative = op => op === '^';

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'NUMBER') {
        outputStack.push(token.value);
      } else if (token.type === 'FUNCTION') {
        opStack.push(token.value);
      } else if (token.type === 'OPERATOR') {
        const op = token.value;

        if (op === '(') {
          opStack.push(op);
        } else if (op === ')') {
          while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
            this.applyOp(opStack.pop(), outputStack);
          }
          if (opStack.length === 0) throw new Error('วงเล็บไม่สมดุล');
          opStack.pop();
          
          if (opStack.length > 0 && (opStack[opStack.length - 1] === 'SIGMA' || opStack[opStack.length - 1] === 'SQRT')) {
            this.applyOp(opStack.pop(), outputStack);
          }
        } else if (op === '!') {
          if (outputStack.length === 0) throw new Error('เครื่องหมาย ! ต้องอยู่หลังตัวเลข');
          const top = outputStack.pop();
          const fact = this.factorial(top);
          if (isNaN(fact)) throw new Error(`ไม่สามารถหา ${top}! ได้`);
          outputStack.push(fact);
        } else if (op === ',') {
          // Argument separator for multi-parameter functions like SIGMA(a, b)
          while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
            this.applyOp(opStack.pop(), outputStack);
          }
        } else {
          while (
            opStack.length > 0 &&
            opStack[opStack.length - 1] !== '(' &&
            ((precedence[opStack[opStack.length - 1]] > precedence[op]) ||
              (precedence[opStack[opStack.length - 1]] === precedence[op] && !isRightAssociative(op)))
          ) {
            this.applyOp(opStack.pop(), outputStack);
          }
          opStack.push(op);
        }
      }
    }

    while (opStack.length > 0) {
      const op = opStack.pop();
      if (op === '(' || op === ')') throw new Error('วงเล็บไม่สมดุล');
      this.applyOp(op, outputStack);
    }

    if (outputStack.length !== 1) {
      throw new Error('สมการไม่สมบูรณ์');
    }

    return outputStack[0];
  },

  applyOp(op, stack) {
    if (op === 'SIGMA') {
      if (stack.length >= 2) {
        const b = stack.pop();
        const a = stack.pop();
        const res = this.sigma(a, b);
        if (isNaN(res)) throw new Error(`ไม่สามารถหา Σ_{i=${a}}^{${b}} i ได้`);
        stack.push(res);
        return;
      } else if (stack.length === 1) {
        const b = stack.pop();
        const res = this.sigma(1, b);
        if (isNaN(res)) throw new Error(`ไม่สามารถหา Σ_{i=1}^{${b}} i ได้`);
        stack.push(res);
        return;
      }
      throw new Error('เครื่องหมาย Σ ขาดตัวเลขในการคำนวณ');
    }

    if (op === 'SQRT') {
      if (stack.length < 1) throw new Error('เครื่องหมาย √ ขาดตัวเลข');
      const val = stack.pop();
      if (val < 0) throw new Error('ไม่สามารถถอดรากที่สองของจำนวนลบได้');
      const res = Math.sqrt(val);
      stack.push(res);
      return;
    }

    if (stack.length < 2) throw new Error(`เครื่องหมาย ${op} ขาดตัวเลขในการคำนวณ`);
    const b = stack.pop();
    const a = stack.pop();

    let res = 0;
    switch (op) {
      case '+': res = a + b; break;
      case '-': res = a - b; break;
      case '*': res = a * b; break;
      case '/':
        if (b === 0) throw new Error('ไม่สามารถหารด้วย 0 ได้');
        res = a / b;
        break;
      case '^':
        if (a === 0 && b <= 0) throw new Error('0 ไม่สามารถยกกำลังด้วย 0 หรือเลขติดลบได้');
        if (a < 0 && !Number.isInteger(b)) throw new Error('จำนวนลบยกกำลังด้วยเศษส่วนไม่ได้');
        res = Math.pow(a, b);
        break;
      default:
        throw new Error(`เครื่องหมายไม่รู้จัก: ${op}`);
    }

    stack.push(res);
  }
};

if (typeof window !== 'undefined') {
  window.MathEngine = MathEngine;
}
