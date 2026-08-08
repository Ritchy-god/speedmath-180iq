/**
 * 180 IQ Speed Math Game - App Controller (Clean Rewrite)
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     State
  ========================================================================== */
  const state = {
    gameMode: 'practice', // 'practice' or 'competition'
    compTotalItems: 30,
    compCurrentItem: 1,
    hasCompletedRound: false,

    scratchpadMode: 'show', // 'show' or 'hide'

    digitCount: 5,
    targetMode: '3digit',
    customTarget: 100,
    timerMode: '30',   // '30', '45', '60', '90', 'countup', 'none'

    currentDigits: [],
    targetValue: 0,
    solutions: [],
    isPuzzleRevealed: false,
    isDigitsRevealed: false,

    timerSeconds: 30,
    timerMax: 30,
    isTimerRunning: false,
    timerInterval: null,

    isSolutionsOpen: false
  };

  /* ==========================================================================
     DOM Elements
  ========================================================================== */
  const el = {
    digitsContainer:      document.getElementById('digits-container'),
    targetBox:            document.getElementById('target-box'),
    timerValue:           document.getElementById('timer-value'),
    timerProgress:        document.getElementById('timer-progress'),
    solutionsHeader:      document.getElementById('solutions-header'),
    solutionsBadge:       document.getElementById('solutions-badge'),
    solutionsContent:     document.getElementById('solutions-content'),
    solutionsToggle:      document.getElementById('solutions-toggle-icon'),
    btnRollDigits:        document.getElementById('btn-roll-digits'),
    btnRollTarget:        document.getElementById('btn-roll-target'),
    btnCheckAnswer:       document.getElementById('btn-check-answer'),
    btnSound:             document.getElementById('btn-sound'),
    soundStatusText:      document.getElementById('sound-status-text'),
    btnSettings:          document.getElementById('btn-settings'),
    questionBadge:        document.getElementById('question-badge'),
    compItemCurr:         document.getElementById('comp-item-curr'),
    compItemTotal:        document.getElementById('comp-item-total'),
    scratchpadContainer:  document.getElementById('scratchpad-container'),
    selectScratchpadMode: document.getElementById('select-scratchpad-mode'),
    modalSettings:        document.getElementById('modal-settings'),
    btnCloseModal:        document.getElementById('btn-close-modal'),
    btnSaveSettings:      document.getElementById('btn-save-settings'),
    modalCheckResult:     document.getElementById('modal-check-result'),
    btnCloseCheckModal:   document.getElementById('btn-close-check-modal'),
    btnConfirmCheckModal: document.getElementById('btn-confirm-check-modal'),
    selectGameMode:       document.getElementById('select-game-mode'),
    compItemsGroup:       document.getElementById('comp-items-group'),
    inputCompItems:       document.getElementById('input-comp-items'),
    selectDigitMode:      document.getElementById('select-digit-count'),
    selectTargetMode:     document.getElementById('select-target-mode'),
    customTargetGroup:    document.getElementById('custom-target-group'),
    inputCustomTarget:    document.getElementById('input-custom-target'),
    selectTimerMode:      document.getElementById('select-timer-mode'),
    particlesCanvas:      document.getElementById('particles-canvas'),
  };

  /* ==========================================================================
     Init
  ========================================================================== */
  function init() {
    bindEvents();
    setupParticles();
    scratchpad.init();
    updateQuestionBadge();
    updateScratchpadVisibility();
    loadNewPuzzle();
  }

  /* ==========================================================================
     Events
  ========================================================================== */
  function bindEvents() {
    on(el.btnRollDigits,        'click', doRollDigits);
    on(el.btnRollTarget,        'click', doRollTarget);
    on(el.btnCheckAnswer,       'click', doCheckAnswer);
    on(el.btnCloseCheckModal,   'click', closeCheckModal);
    on(el.btnConfirmCheckModal, 'click', closeCheckModal);
    on(el.btnSound,             'click', doToggleSound);
    on(el.btnSettings,          'click', () => openModal());
    on(el.btnCloseModal,        'click', () => closeModal());
    on(el.btnSaveSettings,      'click', doSaveSettings);
    on(el.solutionsHeader,      'click', toggleSolutions);
    on(el.selectTargetMode,     'change', onTargetModeChange);
    on(el.selectGameMode,       'change', onGameModeChange);
    on(el.modalSettings,        'click', (e) => { if (e.target === el.modalSettings) closeModal(); });
    on(el.modalCheckResult,     'click', (e) => { if (e.target === el.modalCheckResult) closeCheckModal(); });
  }

  function on(elem, event, fn) {
    if (elem) elem.addEventListener(event, fn);
  }

  /* ==========================================================================
     Sound helper
  ========================================================================== */
  function playClick() {
    try { if (window.soundFX) window.soundFX.playClick(); } catch(e) {}
  }
  function playWarning() {
    try { if (window.soundFX) window.soundFX.playWarningTick(); } catch(e) {}
  }
  function playAlarm() {
    try { if (window.soundFX) window.soundFX.playAlarmRinging(); } catch(e) {}
  }

  /* ==========================================================================
     Question Counter Badge (Top-Left)
  ========================================================================== */
  function updateQuestionBadge() {
    if (!el.questionBadge) return;
    if (state.gameMode === 'competition') {
      el.questionBadge.style.display = 'inline-flex';
      if (el.compItemCurr)  el.compItemCurr.textContent  = state.compCurrentItem;
      if (el.compItemTotal) el.compItemTotal.textContent = state.compTotalItems;
    } else {
      el.questionBadge.style.display = 'none';
    }
  }

  /* ==========================================================================
     Puzzle Loading
  ========================================================================== */
  function isGame24() { return state.targetMode === '24'; }

  function getCountAndMode() {
    if (isGame24()) return { count: 4, tMode: '24' };
    return { count: state.digitCount, tMode: state.targetMode };
  }

  function updateAppTitle() {
    const titleEl = document.querySelector('.brand-title');
    if (!titleEl) return;
    if (isGame24()) {
      titleEl.textContent = 'เกม 24';
    } else {
      titleEl.textContent = 'คิดเลขเร็ว 180 IQ';
    }
  }

  function rollNewDigits() {
    const { count, tMode } = getCountAndMode();
    const puzzle = MathSolver.generateSolvablePuzzle(count, tMode);
    state.currentDigits      = puzzle.digits;
    state.reachableTargets   = puzzle.reachableTargets || null;
    state.cachedTargetMode   = tMode;
    state.targetValue  = puzzle.target;
    state.solutions    = puzzle.solutions;
  }

  function pickNewTargetFromDigits() {
    const { tMode } = getCountAndMode();
    const puzzle = MathSolver.generateSolvablePuzzleFromDigits(state.currentDigits, tMode);
    state.targetValue = puzzle.target;
    state.solutions   = puzzle.solutions;
  }

  /* ==========================================================================
     Roll Actions
  ========================================================================== */

  // Button 1: สุ่มโจทย์
  function doRollDigits() {
    // Check if competition items completed
    if (state.gameMode === 'competition') {
      if (state.hasCompletedRound && state.compCurrentItem >= state.compTotalItems) {
        playClick();
        alert(`🏆 การแข่งขันครบ ${state.compTotalItems} ข้อเรียบร้อยแล้ว!\n\nกด OK เพื่อยืนยันและรีเซ็ตกลับมาเริ่มข้อที่ 1 ใหม่`);
        state.compCurrentItem = 1;
        state.hasCompletedRound = false;
        updateQuestionBadge();
      } else if (state.hasCompletedRound) {
        state.compCurrentItem++;
        state.hasCompletedRound = false;
        updateQuestionBadge();
      }
    }

    if (el.btnCheckAnswer) el.btnCheckAnswer.style.display = 'none';
    playClick();
    stopTimer();
    rollNewDigits();
    if (scratchpad) scratchpad.clear();

    state.isDigitsRevealed = true;

    if (isGame24()) {
      state.targetValue = 24;
      state.solutions = MathSolver.solve(state.currentDigits, 24, { maxSolutions: 25 });
      state.isPuzzleRevealed = true;
      renderDigits();
      if (el.targetBox) {
        el.targetBox.classList.remove('puzzle-masked');
        el.targetBox.textContent = '24';
      }
      renderSolutions();
      setBadge(`${state.solutions.length} คำตอบ`);
      startTimer();
    } else {
      state.isPuzzleRevealed = false;
      renderDigits();
      if (el.targetBox) {
        el.targetBox.textContent = '??';
        el.targetBox.classList.add('puzzle-masked');
      }
      setBadge('? คำตอบ');
      setSolutionsPlaceholder('🔒 กดปุ่ม "🎯 2. สุ่มคำตอบ & เริ่มเวลา" เพื่อแสดงเฉลย');
      resetTimerDisplay();
    }
  }

  // Button 2: สุ่มคำตอบ
  function doRollTarget() {
    if (state.gameMode === 'competition' && state.hasCompletedRound && state.compCurrentItem >= state.compTotalItems) {
      playClick();
      alert(`🏆 การแข่งขันครบ ${state.compTotalItems} ข้อเรียบร้อยแล้ว!\n\nกด OK เพื่อยืนยันและรีเซ็ตกลับมาเริ่มข้อที่ 1 ใหม่`);
      state.compCurrentItem = 1;
      state.hasCompletedRound = false;
      updateQuestionBadge();
      doRollDigits();
      return;
    }

    if (el.btnCheckAnswer) el.btnCheckAnswer.style.display = 'none';
    playClick();

    if (isGame24()) {
      if (!state.isDigitsRevealed || state.currentDigits.length === 0) {
        rollNewDigits();
        state.isDigitsRevealed = true;
        state.targetValue = 24;
        state.solutions = MathSolver.solve(state.currentDigits, 24, { maxSolutions: 25 });
        state.isPuzzleRevealed = true;
        renderDigits();
        if (el.targetBox) {
          el.targetBox.classList.remove('puzzle-masked');
          el.targetBox.textContent = '24';
        }
        renderSolutions();
      }
      startTimer();
      return;
    }

    if (!state.isDigitsRevealed || state.currentDigits.length === 0) {
      rollNewDigits();
      state.isDigitsRevealed = true;
      renderDigits();
    } else {
      pickNewTargetFromDigits();
    }

    state.isPuzzleRevealed = true;
    if (el.targetBox) {
      el.targetBox.classList.remove('puzzle-masked');
      el.targetBox.textContent = state.targetValue;
    }
    renderSolutions();
    startTimer();
  }

  function loadNewPuzzle() {
    stopTimer();
    state.isDigitsRevealed = false;
    state.isPuzzleRevealed = false;
    rollNewDigits();
    renderMasked();
    resetTimerDisplay();
  }

  /* ==========================================================================
     Render Helpers
  ========================================================================== */
  function renderMasked() {
    if (!el.digitsContainer) return;
    el.digitsContainer.innerHTML = '';
    (state.currentDigits || [1,2,3,4]).forEach(() => {
      const c = document.createElement('div');
      c.className = 'digit-card puzzle-masked';
      c.textContent = '?';
      el.digitsContainer.appendChild(c);
    });
    if (el.targetBox) {
      el.targetBox.textContent = '??';
      el.targetBox.classList.add('puzzle-masked');
    }
    setBadge('? คำตอบ');
    setSolutionsPlaceholder('🔒 กดปุ่ม "🎯 2. สุ่มคำตอบ & เริ่มเวลา" เพื่อเริ่มเกม');
  }

  function renderDigits() {
    if (!el.digitsContainer) return;
    el.digitsContainer.innerHTML = '';
    state.currentDigits.forEach(d => {
      const c = document.createElement('div');
      c.className = 'digit-card';
      c.textContent = d;
      el.digitsContainer.appendChild(c);
    });
  }

  function renderSolutions() {
    const list = state.solutions || [];
    setBadge(`${list.length} คำตอบ`);
    if (!el.solutionsContent) return;
    el.solutionsContent.innerHTML = '';

    if (list.length === 0) {
      setSolutionsPlaceholder('ไม่พบเฉลยจากตัวเลขชุดนี้');
      return;
    }

    const frag = document.createDocumentFragment();
    const tasks = [];

    list.forEach(sol => {
      const chip = document.createElement('div');
      chip.className = 'solution-chip';
      const span = document.createElement('span');
      span.className = 'solution-latex';
      span.textContent = `${sol.raw} = ${state.targetValue}`;
      chip.appendChild(span);
      frag.appendChild(chip);
      tasks.push({ span, latex: `${sol.latex} = ${state.targetValue}`, raw: `${sol.raw} = ${state.targetValue}` });
    });

    el.solutionsContent.appendChild(frag);

    // Render KaTeX asynchronously
    setTimeout(() => {
      tasks.forEach(t => {
        if (!window.katex) return;
        try { window.katex.render(t.latex, t.span, { throwOnError: false }); }
        catch(e) { t.span.textContent = t.raw; }
      });
    }, 20);
  }

  function setBadge(text) {
    if (el.solutionsBadge) el.solutionsBadge.textContent = text;
  }

  function setSolutionsPlaceholder(msg) {
    if (!el.solutionsContent) return;
    el.solutionsContent.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:1rem;">${msg}</div>`;
  }

  function toggleSolutions() {
    state.isSolutionsOpen = !state.isSolutionsOpen;
    if (el.solutionsContent) el.solutionsContent.classList.toggle('open', state.isSolutionsOpen);
    if (el.solutionsToggle) el.solutionsToggle.style.transform = state.isSolutionsOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  /* ==========================================================================
     Timer
  ========================================================================== */
  function getTimerSeconds() {
    const m = state.timerMode;
    if (m === 'none' || m === 'countup') return 0;
    const n = parseInt(m, 10);
    return isNaN(n) ? 30 : n;
  }

  function resetTimerDisplay() {
    const secs = getTimerSeconds();
    if (el.timerValue) el.timerValue.textContent = secs || '∞';
    if (el.timerProgress) {
      el.timerProgress.style.strokeDashoffset = 0;
      el.timerProgress.classList.remove('warning', 'danger');
    }
  }

  function startTimer() {
    stopTimer();

    const m = state.timerMode;
    if (m === 'none') {
      if (el.timerValue) el.timerValue.textContent = '∞';
      return;
    }

    const isCountUp = m === 'countup';
    const totalSecs = isCountUp ? 0 : getTimerSeconds();

    state.timerSeconds = totalSecs;
    state.timerMax = totalSecs > 0 ? totalSecs : 1;
    state.isTimerRunning = true;

    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
      if (!state.isTimerRunning) return;

      if (isCountUp) {
        state.timerSeconds++;
      } else {
        state.timerSeconds--;
        updateTimerDisplay();
        if (state.timerSeconds <= 5 && state.timerSeconds > 0) playWarning();
        if (state.timerSeconds <= 0) {
          stopTimer();
          playAlarm();
          state.hasCompletedRound = true;
          if (el.btnCheckAnswer) el.btnCheckAnswer.style.display = 'inline-flex';
          return;
        }
      }
    }, 1000);
  }

  function stopTimer() {
    state.isTimerRunning = false;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  function updateTimerDisplay() {
    if (el.timerValue) el.timerValue.textContent = state.timerSeconds;

    const isCountdown = state.timerMode !== 'countup' && state.timerMode !== 'none';
    if (isCountdown && el.timerProgress) {
      const circ = 339.29;
      const ratio = Math.max(0, state.timerSeconds / state.timerMax);
      el.timerProgress.style.strokeDashoffset = circ * (1 - ratio);
      el.timerProgress.classList.remove('warning', 'danger');
      if (state.timerSeconds <= 5) el.timerProgress.classList.add('danger');
      else if (state.timerSeconds <= 10) el.timerProgress.classList.add('warning');
    }
  }

  function updateScratchpadVisibility() {
    if (!el.scratchpadContainer) return;
    if (state.scratchpadMode === 'show') {
      el.scratchpadContainer.style.display = 'flex';
      scratchpad.resizeCanvas();
    } else {
      el.scratchpadContainer.style.display = 'none';
    }
  }

  /* ==========================================================================
     Scratchpad Manager (Drawing Canvas for iPad/Smartboard/Mouse)
  ========================================================================== */
  const scratchpad = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    color: '#ffffff',
    lineWidth: 3,
    isEraser: false,
    digitModel: null,
    strokes: [],
    currentStroke: null,
    strokeTrackingValid: true,

    init() {
      this.canvas = document.getElementById('scratchpad-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.bindEvents();
      this.bindControls();
    },

    resizeCanvas() {
      if (!this.canvas) return;
      const wrapper = this.canvas.parentElement;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;

      // Store canvas content before resize
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && this.canvas.width > 0 && this.canvas.height > 0) {
        tempCtx.drawImage(this.canvas, 0, 0);
      }

      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;

      this.ctx.scale(dpr, dpr);

      // Restore drawing
      if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        this.ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr);
      }
    },

    getPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    },

    startDrawing(e) {
      e.preventDefault();
      this.isDrawing = true;
      if (e.pointerId !== undefined && this.canvas.setPointerCapture) {
        this.canvas.setPointerCapture(e.pointerId);
      }
      const pos = this.getPos(e);
      this.lastX = pos.x;
      this.lastY = pos.y;
      if (this.isEraser) {
        this.currentStroke = null;
        this.strokeTrackingValid = false;
      } else if (this.strokeTrackingValid) {
        this.currentStroke = [pos];
        this.strokes.push(this.currentStroke);
      }
    },

    draw(e) {
      if (!this.isDrawing) return;
      e.preventDefault();
      // Pointer events may contain several pen samples. Drawing all of them
      // produces a much cleaner glyph than joining only the latest samples.
      const samples = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const sample of samples) {
        const pos = this.getPos(sample);
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (this.isEraser) {
          this.ctx.globalCompositeOperation = 'destination-out';
          this.ctx.lineWidth = 18;
        } else {
          this.ctx.globalCompositeOperation = 'source-over';
          this.ctx.strokeStyle = this.color;
          this.ctx.lineWidth = this.lineWidth;
        }

        this.ctx.stroke();
        this.lastX = pos.x;
        this.lastY = pos.y;
        if (this.currentStroke) this.currentStroke.push(pos);
      }
    },

    stopDrawing(e) {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.currentStroke = null;
        this.ctx.beginPath();
      }
    },

    clear() {
      if (!this.canvas || !this.ctx) return;
      const dpr = window.devicePixelRatio || 1;
      this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
      this.strokes = [];
      this.currentStroke = null;
      this.strokeTrackingValid = true;
    },

    bindEvents() {
      const c = this.canvas;
      if (!c) return;

      c.addEventListener('pointerdown', (e) => this.startDrawing(e));
      c.addEventListener('pointermove', (e) => this.draw(e));
      c.addEventListener('pointerup', (e) => this.stopDrawing(e));
      c.addEventListener('pointercancel', (e) => this.stopDrawing(e));
      c.addEventListener('pointerleave', (e) => this.stopDrawing(e));

      // Pointer events already cover mouse, touch and stylus. Registering touch
      // events as well caused some mobile browsers to draw every stroke twice.
    },

    isCanvasBlank() {
      if (!this.canvas || !this.ctx) return true;
      try {
        const pixelData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        for (let i = 3; i < pixelData.length; i += 4) {
          if (pixelData[i] > 0) return false;
        }
      } catch(e) {}
      return true;
    },

    getPreprocessedCanvas() {
      if (!this.canvas) return null;
      const w = this.canvas.width;
      const h = this.canvas.height;

      const padding = 50;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w + padding * 2;
      offCanvas.height = h + padding * 2;
      const offCtx = offCanvas.getContext('2d');

      // 1. Solid White Background
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      const srcData = this.ctx.getImageData(0, 0, w, h);
      const data = srcData.data;

      // 2. Binary mask of drawn pixels
      const mask = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (a > 20 && (r + g + b) / 3 > 20) {
          mask[i / 4] = 1;
        }
      }

      // 3. Dilate strokes slightly (thickens thin handwritten lines for OCR)
      const dilated = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (mask[idx] || mask[idx - 1] || mask[idx + 1] || mask[idx - w] || mask[idx + w]) {
            dilated[idx] = 1;
          }
        }
      }

      // 4. Render as crisp black strokes on white canvas
      const dstData = offCtx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const val = dilated[i] ? 0 : 255;
        const px = i * 4;
        dstData.data[px] = val;
        dstData.data[px + 1] = val;
        dstData.data[px + 2] = val;
        dstData.data[px + 3] = 255;
      }

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      tempCanvas.getContext('2d').putImageData(dstData, 0, 0);

      offCtx.drawImage(tempCanvas, padding, padding);
      return offCanvas;
    },

    segmentAndRecognizeClusters(ctx, w, h) {
      if (!ctx || w <= 0 || h <= 0) return [];
      try {
        const srcData = ctx.getImageData(0, 0, w, h);
        const data = srcData.data;

        // 1. Column density
        const colCounts = new Int32Array(w);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (data[idx + 3] > 20) colCounts[x]++;
          }
        }

        const clusters = [];
        let inCluster = false;
        let startX = 0;
        let emptyCount = 0;
        const gapThreshold = Math.max(5, Math.round((window.devicePixelRatio || 1) * 6));

        for (let x = 0; x < w; x++) {
          if (colCounts[x] > 0) {
            if (!inCluster) {
              inCluster = true;
              startX = x;
            }
            emptyCount = 0;
          } else {
            if (inCluster) {
              emptyCount++;
              if (emptyCount > gapThreshold || x === w - 1) {
                inCluster = false;
                const endX = x - emptyCount;
                if (endX - startX + 1 > 1) {
                  clusters.push({ x0: startX, x1: endX });
                }
              }
            }
          }
        }
        if (inCluster) {
          clusters.push({ x0: startX, x1: w - 1 });
        }

        for (const cl of clusters) {
          let minY = h, maxY = 0;
          for (let y = 0; y < h; y++) {
            for (let x = cl.x0; x <= cl.x1; x++) {
              const idx = (y * w + x) * 4;
              if (data[idx + 3] > 20) {
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          cl.y0 = minY;
          cl.y1 = maxY;
          cl.w = cl.x1 - cl.x0 + 1;
          cl.h = Math.max(1, maxY - minY + 1);
        }

        return clusters;
      } catch(e) {
        return [];
      }
    },

    segmentStrokeClusters(w, h) {
      if (!this.strokeTrackingValid || this.strokes.length === 0) return [];
      const dpr = window.devicePixelRatio || 1;
      const boxes = this.strokes.map(points => {
        if (!points || points.length === 0) return null;
        const xs = points.map(p => p.x * dpr);
        const ys = points.map(p => p.y * dpr);
        return {
          x0: Math.min(...xs), x1: Math.max(...xs),
          y0: Math.min(...ys), y1: Math.max(...ys)
        };
      }).filter(Boolean);
      if (boxes.length === 0) return [];

      // Strokes whose horizontal footprints overlap belong to the same glyph.
      // This naturally joins +, =, ÷, i and multi-stroke digits while keeping
      // neighbouring glyphs separate even when their visual gap is very small.
      const parent = boxes.map((_, i) => i);
      const find = (i) => {
        while (parent[i] !== i) {
          parent[i] = parent[parent[i]];
          i = parent[i];
        }
        return i;
      };
      const unite = (a, b) => {
        const rootA = find(a), rootB = find(b);
        if (rootA !== rootB) parent[rootB] = rootA;
      };
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const overlapX = Math.min(boxes[i].x1, boxes[j].x1) - Math.max(boxes[i].x0, boxes[j].x0);
          if (overlapX >= 0) unite(i, j);
        }
      }

      const groups = new Map();
      boxes.forEach((box, i) => {
        const root = find(i);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(box);
      });
      const padding = Math.max(2, Math.round(3 * dpr));
      return Array.from(groups.values()).map(group => {
        const x0 = Math.max(0, Math.floor(Math.min(...group.map(b => b.x0)) - padding));
        const y0 = Math.max(0, Math.floor(Math.min(...group.map(b => b.y0)) - padding));
        const x1 = Math.min(w - 1, Math.ceil(Math.max(...group.map(b => b.x1)) + padding));
        const y1 = Math.min(h - 1, Math.ceil(Math.max(...group.map(b => b.y1)) + padding));
        return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      }).sort((a, b) => a.x0 - b.x0);
    },

    isEqualsSignCluster(cl, ctx) {
      // An equals sign is a short, wide glyph. The previous "two or more row
      // peaks" test also matched 2, 3 and 5 because those digits contain
      // several horizontal strokes.
      if (!cl || cl.w < 8 || cl.w / Math.max(1, cl.h) < 1.35) return false;
      try {
        const srcData = ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h);
        const rowCounts = new Int32Array(cl.h);
        for (let y = 0; y < cl.h; y++) {
          for (let x = 0; x < cl.w; x++) {
            if (srcData.data[(y * cl.w + x) * 4 + 3] > 20) rowCounts[y]++;
          }
        }
        const bands = [];
        let inPeak = false;
        let bandStart = 0;
        for (let y = 0; y < cl.h; y++) {
          if (rowCounts[y] > Math.max(2, cl.w * 0.25)) {
            if (!inPeak) { inPeak = true; bandStart = y; }
          } else if (inPeak) {
            bands.push({ y0: bandStart, y1: y - 1 });
            inPeak = false;
          }
        }
        if (inPeak) bands.push({ y0: bandStart, y1: cl.h - 1 });

        if (bands.length !== 2) return false;
        const firstHeight = bands[0].y1 - bands[0].y0 + 1;
        const secondHeight = bands[1].y1 - bands[1].y0 + 1;
        const gap = bands[1].y0 - bands[0].y1 - 1;
        return gap > 0 && firstHeight < cl.h * 0.45 && secondHeight < cl.h * 0.45;
      } catch(e) {
        return false;
      }
    },

    classifyStrokeSymbol(cl) {
      if (!cl || !this.strokeTrackingValid || this.strokes.length === 0) return '';
      const dpr = window.devicePixelRatio || 1;
      const candidates = this.strokes.map(points => {
        if (!points || points.length === 0) return null;
        const xs = points.map(p => p.x * dpr);
        const ys = points.map(p => p.y * dpr);
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const y0 = Math.min(...ys), y1 = Math.max(...ys);
        return {
          points, x0, x1, y0, y1,
          w: x1 - x0, h: y1 - y0,
          cx: (x0 + x1) / 2,
          cy: (y0 + y1) / 2
        };
      }).filter(stroke => stroke &&
        stroke.cx >= cl.x0 - 4 * dpr && stroke.cx <= cl.x1 + 4 * dpr &&
        stroke.y1 >= cl.y0 - 4 * dpr && stroke.y0 <= cl.y1 + 4 * dpr
      );
      if (candidates.length === 0) return '';

      const minLength = 8 * dpr;
      const horizontal = candidates.filter(s => s.w >= minLength && s.w > s.h * 4);
      const vertical = candidates.filter(s => s.h >= minLength && s.h > s.w * 4);
      const dots = candidates.filter(s => s.w < minLength && s.h < minLength);

      if (horizontal.length >= 2 && vertical.length === 0) return '=';
      if (horizontal.length === 1 && dots.length >= 2) return '÷';
      if (candidates.length === 2 && horizontal.length === 1 && vertical.length === 1) {
        const crosses = horizontal.some(hLine => vertical.some(vLine =>
          vLine.cx >= hLine.x0 - 4 * dpr && vLine.cx <= hLine.x1 + 4 * dpr &&
          hLine.cy >= vLine.y0 - 4 * dpr && hLine.cy <= vLine.y1 + 4 * dpr
        ));
        if (crosses) return '+';
      }
      if (horizontal.length === 1 && candidates.length === 1) return '-';

      const diagonals = candidates.filter(s => {
        if (s.w < minLength || s.h < minLength || s.points.length < 2) return false;
        const first = s.points[0];
        const last = s.points[s.points.length - 1];
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        return Math.abs(dx) > 4 && Math.abs(dy) > 4 && Math.abs(dx / dy) > 0.35 && Math.abs(dx / dy) < 2.85;
      });
      if (diagonals.length >= 2) {
        const slopes = diagonals.map(s => {
          const first = s.points[0];
          const last = s.points[s.points.length - 1];
          return (last.y - first.y) / (last.x - first.x);
        });
        if (slopes.some(a => slopes.some(b => a * b < 0))) return '×';
      }
      return '';
    },

    isRasterCrossCluster(cl) {
      if (!cl || !this.ctx || cl.w < 4 || cl.h < 4) return false;
      try {
        const data = this.ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h).data;
        const rows = new Int32Array(cl.h);
        const cols = new Int32Array(cl.w);
        for (let y = 0; y < cl.h; y++) {
          for (let x = 0; x < cl.w; x++) {
            if (data[(y * cl.w + x) * 4 + 3] > 20) {
              rows[y]++;
              cols[x]++;
            }
          }
        }
        let rowIndex = 0, colIndex = 0;
        for (let y = 1; y < rows.length; y++) if (rows[y] > rows[rowIndex]) rowIndex = y;
        for (let x = 1; x < cols.length; x++) if (cols[x] > cols[colIndex]) colIndex = x;
        const centralRow = rowIndex / cl.h > 0.18 && rowIndex / cl.h < 0.82;
        const centralCol = colIndex / cl.w > 0.18 && colIndex / cl.w < 0.82;
        return centralRow && centralCol && rows[rowIndex] / cl.w > 0.62 && cols[colIndex] / cl.h > 0.62;
      } catch(e) {
        return false;
      }
    },

    analyzeClusterShape(cl) {
      if (!cl || !this.ctx || cl.w < 1 || cl.h < 1) return { narrowOne: false, holes: [] };
      try {
        const src = this.ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h).data;
        const pw = cl.w + 2;
        const ph = cl.h + 2;
        const ink = new Uint8Array(pw * ph);
        for (let y = 0; y < cl.h; y++) {
          for (let x = 0; x < cl.w; x++) {
            if (src[(y * cl.w + x) * 4 + 3] > 20) ink[(y + 1) * pw + x + 1] = 1;
          }
        }

        // Flood-fill the outside. Any sizeable transparent region left over is
        // an enclosed loop, which distinguishes handwritten 6 from 5.
        const outside = new Uint8Array(pw * ph);
        const queue = [0];
        outside[0] = 1;
        for (let q = 0; q < queue.length; q++) {
          const idx = queue[q];
          const x = idx % pw;
          const y = Math.floor(idx / pw);
          const neighbours = [];
          if (x > 0) neighbours.push(idx - 1);
          if (x + 1 < pw) neighbours.push(idx + 1);
          if (y > 0) neighbours.push(idx - pw);
          if (y + 1 < ph) neighbours.push(idx + pw);
          for (const next of neighbours) {
            if (!ink[next] && !outside[next]) {
              outside[next] = 1;
              queue.push(next);
            }
          }
        }

        const seen = new Uint8Array(pw * ph);
        const holes = [];
        const minArea = Math.max(4, Math.round(cl.w * cl.h * 0.008));
        for (let start = 0; start < ink.length; start++) {
          if (ink[start] || outside[start] || seen[start]) continue;
          const component = [start];
          seen[start] = 1;
          let area = 0;
          let sumY = 0;
          for (let q = 0; q < component.length; q++) {
            const idx = component[q];
            const x = idx % pw;
            const y = Math.floor(idx / pw);
            area++;
            sumY += y - 1;
            const neighbours = [];
            if (x > 0) neighbours.push(idx - 1);
            if (x + 1 < pw) neighbours.push(idx + 1);
            if (y > 0) neighbours.push(idx - pw);
            if (y + 1 < ph) neighbours.push(idx + pw);
            for (const next of neighbours) {
              if (!ink[next] && !outside[next] && !seen[next]) {
                seen[next] = 1;
                component.push(next);
              }
            }
          }
          if (area >= minArea) holes.push({ area, centerY: sumY / area / cl.h });
        }

        return {
          // Keep this deliberately strict: a handwritten 2 can also have a
          // narrow column footprint when its strokes do not overlap perfectly.
          narrowOne: cl.w / Math.max(1, cl.h) < 0.18 && holes.length === 0,
          holes: holes.sort((a, b) => b.area - a.area)
        };
      } catch(e) {
        return { narrowOne: false, holes: [] };
      }
    },

    getDigitModel() {
      if (this.digitModel) return this.digitModel;
      const source = window.SPEEDMATH_DIGIT_MODEL;
      if (!source) return null;

      const decode = (encoded) => {
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Float32Array(bytes.buffer);
      };

      this.digitModel = {
        inputSize: source.inputSize,
        hiddenSize: source.hiddenSize,
        outputSize: source.outputSize,
        w1: decode(source.w1),
        b1: decode(source.b1),
        w2: decode(source.w2),
        b2: decode(source.b2)
      };
      return this.digitModel;
    },

    clusterToDigitInput(cl) {
      if (!cl || !this.ctx) return null;
      const sourceData = this.ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h).data;
      let minX = cl.w, minY = cl.h, maxX = -1, maxY = -1;
      for (let y = 0; y < cl.h; y++) {
        for (let x = 0; x < cl.w; x++) {
          if (sourceData[(y * cl.w + x) * 4 + 3] > 20) {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
      if (maxX < minX || maxY < minY) return null;
      const glyphW = maxX - minX + 1;
      const glyphH = maxY - minY + 1;
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = glyphW;
      sourceCanvas.height = glyphH;
      const sourceCtx = sourceCanvas.getContext('2d');
      const image = sourceCtx.createImageData(glyphW, glyphH);
      for (let y = 0; y < glyphH; y++) {
        for (let x = 0; x < glyphW; x++) {
          const sourceIndex = ((y + minY) * cl.w + x + minX) * 4;
          const value = sourceData[sourceIndex + 3] > 20 ? 255 : 0;
          const px = (y * glyphW + x) * 4;
          image.data[px] = value;
          image.data[px + 1] = value;
          image.data[px + 2] = value;
          image.data[px + 3] = 255;
        }
      }
      sourceCtx.putImageData(image, 0, 0);

      // MNIST digits occupy roughly a 20x20 box centered on a 28x28 image.
      const target = document.createElement('canvas');
      target.width = 28;
      target.height = 28;
      const targetCtx = target.getContext('2d');
      targetCtx.fillStyle = '#000000';
      targetCtx.fillRect(0, 0, 28, 28);
      const scale = Math.min(20 / glyphW, 20 / glyphH);
      const drawW = Math.max(1, Math.round(glyphW * scale));
      const drawH = Math.max(1, Math.round(glyphH * scale));
      const offsetX = Math.floor((28 - drawW) / 2);
      const offsetY = Math.floor((28 - drawH) / 2);
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.imageSmoothingQuality = 'high';
      targetCtx.drawImage(sourceCanvas, offsetX, offsetY, drawW, drawH);

      const pixels = targetCtx.getImageData(0, 0, 28, 28).data;
      let mass = 0, weightedX = 0, weightedY = 0;
      for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
          const value = pixels[(y * 28 + x) * 4] / 255;
          mass += value;
          weightedX += x * value;
          weightedY += y * value;
        }
      }
      const shiftX = mass > 0 ? Math.round(13.5 - weightedX / mass) : 0;
      const shiftY = mass > 0 ? Math.round(13.5 - weightedY / mass) : 0;
      const input = new Float32Array(784);
      for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
          const sourceX = x - shiftX;
          const sourceY = y - shiftY;
          if (sourceX >= 0 && sourceX < 28 && sourceY >= 0 && sourceY < 28) {
            input[y * 28 + x] = pixels[(sourceY * 28 + sourceX) * 4] / 255;
          }
        }
      }
      return input;
    },

    predictDigit(cl) {
      const model = this.getDigitModel();
      const input = this.clusterToDigitInput(cl);
      if (!model || !input) return null;

      const hidden = new Float32Array(model.hiddenSize);
      for (let j = 0; j < model.hiddenSize; j++) {
        let value = model.b1[j];
        for (let i = 0; i < model.inputSize; i++) {
          value += input[i] * model.w1[i * model.hiddenSize + j];
        }
        hidden[j] = Math.max(0, value);
      }

      const logits = new Float32Array(model.outputSize);
      let maxLogit = -Infinity;
      for (let k = 0; k < model.outputSize; k++) {
        let value = model.b2[k];
        for (let j = 0; j < model.hiddenSize; j++) {
          value += hidden[j] * model.w2[j * model.outputSize + k];
        }
        logits[k] = value;
        if (value > maxLogit) maxLogit = value;
      }

      let total = 0;
      const probabilities = new Float32Array(model.outputSize);
      for (let k = 0; k < model.outputSize; k++) {
        probabilities[k] = Math.exp(logits[k] - maxLogit);
        total += probabilities[k];
      }
      const ranked = Array.from(probabilities, (value, digit) => ({
        digit,
        confidence: value / total
      })).sort((a, b) => b.confidence - a.confidence);

      return {
        digit: String(ranked[0].digit),
        confidence: ranked[0].confidence,
        margin: ranked[0].confidence - ranked[1].confidence,
        alternatives: ranked.slice(0, 3)
      };
    },

    resolveDigitFromShape(prediction, shape) {
      if (!prediction) return '';
      let digit = prediction.digit;
      const lowConfidence = prediction.confidence < 0.65 || prediction.margin < 0.15;
      if (lowConfidence && shape && shape.holes.length >= 2 && ['0', '5', '6', '8', '9'].includes(digit)) {
        return '8';
      }
      if (lowConfidence && shape && shape.holes.length === 1 && ['0', '5', '6', '8', '9'].includes(digit)) {
        const loopY = shape.holes[0].centerY;
        digit = loopY > 0.54 ? '6' : (loopY < 0.46 ? '9' : '0');
      }
      return digit;
    },

    cropClusterToCanvas(cl) {
      const padding = Math.max(18, Math.round(Math.max(cl.w, cl.h) * 0.25));
      // Tesseract performs poorly on the tiny crops produced by a high-DPI
      // canvas. Normalize every cluster to a generous input size.
      const scale = Math.max(1, Math.min(4, 160 / Math.max(cl.w, cl.h)));
      const offCanvas = document.createElement('canvas');
      offCanvas.width = Math.round((cl.w + padding * 2) * scale);
      offCanvas.height = Math.round((cl.h + padding * 2) * scale);
      const offCtx = offCanvas.getContext('2d');

      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      const srcData = this.ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h);
      const data = srcData.data;

      const dstData = offCtx.createImageData(cl.w, cl.h);
      for (let i = 0; i < cl.w * cl.h; i++) {
        const a = data[i * 4 + 3];
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const isDrawn = a > 20 && (r + g + b) / 3 > 20;
        const val = isDrawn ? 0 : 255;
        const px = i * 4;
        dstData.data[px] = val;
        dstData.data[px + 1] = val;
        dstData.data[px + 2] = val;
        dstData.data[px + 3] = 255;
      }

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cl.w;
      tempCanvas.height = cl.h;
      tempCanvas.getContext('2d').putImageData(dstData, 0, 0);

      offCtx.imageSmoothingEnabled = true;
      offCtx.imageSmoothingQuality = 'high';
      offCtx.drawImage(
        tempCanvas,
        Math.round(padding * scale),
        Math.round(padding * scale),
        Math.round(cl.w * scale),
        Math.round(cl.h * scale)
      );
      return offCanvas;
    },

    parse2DSpatialOCR(res) {
      if (!res || !res.data) return '';

      const symbols = res.data.symbols || [];
      if (symbols.length === 0) return '';

      // 1. Find candidate Sigma symbol ('Σ', 'E', 'W', 'M', 'Z', 'sum')
      let sigmaSym = null;
      for (const s of symbols) {
        const text = (s.text || '').trim();
        if (['Σ', 'E', 'W', 'M', 'Z'].includes(text) || text.toLowerCase() === 'sum') {
          const h = (s.bbox.y1 - s.bbox.y0);
          if (h > 15) {
            sigmaSym = s;
            break;
          }
        }
      }

      if (!sigmaSym) return '';

      const sBox = sigmaSym.bbox;
      const sigmaMidX = (sBox.x0 + sBox.x1) / 2;

      let topChars = [];
      let bottomChars = [];
      let rightChars = [];

      for (const s of symbols) {
        if (s === sigmaSym) continue;
        const txt = (s.text || '').trim();
        if (!txt) continue;

        const box = s.bbox;
        const midX = (box.x0 + box.x1) / 2;

        if (box.y1 <= sBox.y0 + 15 && Math.abs(midX - sigmaMidX) < 120) {
          topChars.push({ x: box.x0, text: txt });
        } else if (box.y0 >= sBox.y1 - 15 && Math.abs(midX - sigmaMidX) < 120) {
          bottomChars.push({ x: box.x0, text: txt });
        } else if (box.x0 >= sBox.x1 - 15) {
          rightChars.push({ x: box.x0, text: txt });
        }
      }

      topChars.sort((a, b) => a.x - b.x);
      bottomChars.sort((a, b) => a.x - b.x);
      rightChars.sort((a, b) => a.x - b.x);

      let topVal = topChars.map(c => c.text).join('').replace(/[^0-9]/g, '') || '4';
      let bottomVal = bottomChars.map(c => c.text).join('').replace(/[^0-9i=]/g, '');

      if (!bottomVal.includes('i=')) {
        let numsOnly = bottomVal.replace(/[^0-9]/g, '') || '1';
        bottomVal = `i=${numsOnly}`;
      }

      let rightVal = rightChars.map(c => c.text).join('').replace(/[^0-9+\-*×÷^!√()i]/g, '') || 'i';

      return `Σ_{${bottomVal}}^{${topVal}} ${rightVal}`;
    },

    cleanOCRText(rawText) {
      if (!rawText) return '';
      let text = rawText
        .replace(/[xX*]/g, '×')
        .replace(/[:]/g, '=')
        .replace(/\/{2,}/g, '=')
        .replace(/--+/g, '=')
        .replace(/\//g, '÷')
        .replace(/[vV]/g, '√')
        .replace(/S/g, '5')
        .replace(/O/g, '0')
        .replace(/I|l|\|/g, '1')
        .replace(/Z/g, '2');

      text = text.replace(/[^0-9+\-*×÷=^!√()iΣ_{}]/g, '');
      return text;
    },

    bindControls() {
      const colors = [
        { id: 'sp-color-white', hex: '#ffffff' },
        { id: 'sp-color-yellow', hex: '#ffea00' },
        { id: 'sp-color-cyan', hex: '#00f2fe' },
        { id: 'sp-color-pink', hex: '#ff0844' },
        { id: 'sp-color-green', hex: '#00e676' },
      ];

      colors.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
          btn.addEventListener('click', () => {
            this.isEraser = false;
            this.color = item.hex;
            colors.forEach(c => {
              const b = document.getElementById(c.id);
              if (b) b.classList.remove('active');
            });
            btn.classList.add('active');
            const eraserBtn = document.getElementById('sp-btn-eraser');
            if (eraserBtn) eraserBtn.classList.remove('active');
          });
        }
      });

      const eraserBtn = document.getElementById('sp-btn-eraser');
      if (eraserBtn) {
        eraserBtn.addEventListener('click', () => {
          this.isEraser = !this.isEraser;
          eraserBtn.classList.toggle('active', this.isEraser);
          if (this.isEraser) {
            colors.forEach(c => {
              const b = document.getElementById(c.id);
              if (b) b.classList.remove('active');
            });
          } else {
            const whiteBtn = document.getElementById('sp-color-white');
            if (whiteBtn) whiteBtn.classList.add('active');
          }
        });
      }

      const clearBtn = document.getElementById('sp-btn-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          playClick();
          this.clear();
        });
      }

      // OCR Handwriting Conversion
      const ocrBtn = document.getElementById('sp-btn-ocr');
      const exprInput = document.getElementById('scratchpad-expr-input');

      if (ocrBtn && exprInput) {
        ocrBtn.addEventListener('click', async () => {
          playClick();
          if (!this.canvas) return;

          if (this.isCanvasBlank()) {
            alert('กรุณาเขียนลายมือสมการบนกระดาษทดก่อนกดแปลงลายมือ');
            return;
          }

          ocrBtn.disabled = true;
          const origText = ocrBtn.textContent;
          ocrBtn.textContent = '⏳ กำลังอ่าน...';

          try {
            if (window.Tesseract || window.SPEEDMATH_DIGIT_MODEL) {
              // getImageData/cropping uses backing-store pixels, not CSS pixels.
              // Dividing these values by DPR made Retina/mobile devices OCR only
              // the top-left portion of the writing and shifted every crop.
              const w = this.canvas.width;
              const h = this.canvas.height;
              const strokeClusters = this.segmentStrokeClusters(w, h);
              const clusters = strokeClusters.length > 0
                ? strokeClusters
                : this.segmentAndRecognizeClusters(this.ctx, w, h);

              if (clusters.length > 0) {
                let recognizedParts = [];
                for (const cl of clusters) {
                  const strokeSymbol = this.classifyStrokeSymbol(cl);
                  if (strokeSymbol) {
                    recognizedParts.push(strokeSymbol);
                    continue;
                  }

                  // Check if cluster is equals sign =
                  if (this.isEqualsSignCluster(cl, this.ctx)) {
                    recognizedParts.push('=');
                    continue;
                  }

                  const shape = this.analyzeClusterShape(cl);
                  const digitPrediction = this.predictDigit(cl);
                  const predictedDigit = this.resolveDigitFromShape(digitPrediction, shape);
                  const rasterCross = this.isRasterCrossCluster(cl);

                  // A wide single band is reliably a minus and not a digit.
                  if (cl.w / Math.max(1, cl.h) > 2.2) {
                    recognizedParts.push('-');
                    continue;
                  }

                  // The dedicated MNIST model is substantially more reliable
                  // than printed-text OCR on handwritten digits. High-confidence
                  // predictions are accepted immediately; ambiguous shapes such
                  // as +, × and parentheses continue to the symbol recognizer.
                  if (!rasterCross && digitPrediction && digitPrediction.confidence >= 0.64 && digitPrediction.margin >= 0.12) {
                    recognizedParts.push(predictedDigit);
                    continue;
                  }

                  if (!window.Tesseract) {
                    recognizedParts.push(predictedDigit || '?');
                    continue;
                  }

                  // Crop cluster & recognize individually
                  const croppedCanvas = this.cropClusterToCanvas(cl);
                  // Pick a page-segmentation mode that matches the crop shape.
                  // PSM 11 tends to duplicate isolated handwritten glyphs.
                  const isTwoDimensional = cl.h > this.canvas.height * 0.28;
                  // Horizontal segmentation already gives us one glyph per
                  // crop (2, 3, +, 4, ...), so treat it as a single character.
                  // Using an automatic text-block mode caused handwritten 2/3
                  // to be discarded as low-confidence noise.
                  const pageSegMode = isTwoDimensional ? '6' : '10';
                  const res = await window.Tesseract.recognize(croppedCanvas, 'eng', {
                    tessedit_char_whitelist: '0123456789+-*xX/÷=()!^vVΣEWMlimi_{}',
                    tessedit_pageseg_mode: pageSegMode,
                    preserve_interword_spaces: '1'
                  });

                  const spatialResult = this.parse2DSpatialOCR(res);
                  if (spatialResult) {
                    recognizedParts.push(spatialResult);
                  } else {
                    let raw = res.data.text || '';
                    let cleaned = this.cleanOCRText(raw);
                    const recognizedOperator = cleaned.replace(/[0-9]/g, '');
                    if (recognizedOperator) recognizedParts.push(recognizedOperator);
                    else if (predictedDigit) recognizedParts.push(predictedDigit);
                    else recognizedParts.push('?');
                  }
                }

                if (recognizedParts.length > 0) {
                  exprInput.value = recognizedParts.join(' ');
                } else {
                  alert('อ่านลายมือไม่ชัดเจน โปรดกดปุ่มสัญลักษณ์ด่วนด้านล่าง');
                }
              } else {
                // Fallback to full canvas
                const preprocessed = this.getPreprocessedCanvas();
                const res = await window.Tesseract.recognize(preprocessed, 'eng', {
                  tessedit_char_whitelist: '0123456789+-*xX/÷=()!^vVΣEWMlimi_{}',
                  tessedit_pageseg_mode: '11'
                });
                const spatialResult = this.parse2DSpatialOCR(res);
                exprInput.value = spatialResult || this.cleanOCRText(res.data.text || '');
              }
            } else {
              alert('ระบบกำลังโหลดตัวอ่านลายมือ โปรดลองอีกครั้งในครู่เดียว หรือใช้ปุ่มกดสัญลักษณ์ด่วน');
            }
          } catch(err) {
            console.error('OCR error:', err);
            alert('เกิดข้อผิดพลาดในการอ่านลายมือ โปรดใช้ปุ่มกดสัญลักษณ์ด่วน');
          } finally {
            ocrBtn.disabled = false;
            ocrBtn.textContent = origText;
          }
        });
      }

      // Quick Math Buttons
      const qBtns = document.querySelectorAll('.q-math-btn');
      qBtns.forEach(b => {
        b.addEventListener('click', () => {
          playClick();
          if (!exprInput) return;
          const sym = b.getAttribute('data-sym');
          if (sym) {
            exprInput.value += sym;
            exprInput.focus();
          }
        });
      });

      const clearInputBtn = document.getElementById('sp-btn-input-clear');
      if (clearInputBtn && exprInput) {
        clearInputBtn.addEventListener('click', () => {
          playClick();
          exprInput.value = '';
          exprInput.focus();
        });
      }
    }
  };

  /* ==========================================================================
     Check Answer (Evaluates Math & Validates 180 IQ Rules)
  ========================================================================== */
  function doCheckAnswer() {
    playClick();
    const exprInput = document.getElementById('scratchpad-expr-input');
    const expr = exprInput ? exprInput.value.trim() : '';

    if (!expr) {
      alert('กรุณาพิมพ์หรือกด "✨ แปลงลายมือ" เพื่อใส่สมการก่อนกดตรวจคำตอบครับ');
      if (exprInput) exprInput.focus();
      return;
    }

    // 1. Validate Digits Usage
    const digitCheck = MathEngine.validateDigitUsage(expr, state.currentDigits);

    // 2. Evaluate Expression
    const evalResult = MathEngine.evaluate(expr);

    // 3. Match with Target Value
    const isTargetMatched = evalResult.success && evalResult.result === state.targetValue;
    const isFullyCorrect = digitCheck.isValid && isTargetMatched;

    const titleEl = document.getElementById('check-result-title');
    const bodyEl = document.getElementById('check-result-body');

    if (titleEl) titleEl.textContent = isFullyCorrect ? '🎉 ผลการตรวจ: ถูกต้อง!' : '⚠️ ผลการตรวจ: ยังไม่ถูกต้อง';

    if (bodyEl) {
      let bannerHtml = isFullyCorrect ? `
        <div class="check-banner success">
          <span>🏆 ถูกต้อง 180 IQ! คำตอบตรงกับเป้าหมายและใช้ตัวเลขครบถ้วนตามกฎ</span>
        </div>
      ` : `
        <div class="check-banner error">
          <span>⚠️ มีข้อผิดพลาดในสมการของคุณ</span>
        </div>
      `;

      let detailsHtml = `
        <div class="check-details-list">
          <div class="check-detail-item">
            <span class="check-label">สมการของคุณ:</span>
            <span class="check-val" style="color:var(--accent-cyan); font-size:1.1rem;">${expr}</span>
          </div>
          <div class="check-detail-item">
            <span class="check-label">ผลลัพธ์คำนวณได้:</span>
            <span class="check-val" style="color:${isTargetMatched ? 'var(--accent-green)' : 'var(--accent-pink)'}; font-size:1.25rem;">
              ${evalResult.success ? evalResult.result : 'คำนวณไม่ได้ (' + (evalResult.error || 'ไวยากรณ์ผิด') + ')'}
            </span>
          </div>
          <div class="check-detail-item">
            <span class="check-label">เป้าหมาย (Target):</span>
            <span class="check-val" style="color:var(--accent-yellow); font-size:1.25rem;">${state.targetValue}</span>
          </div>
          <div class="check-detail-item">
            <span class="check-label">ตัวเลขโจทย์:</span>
            <span class="check-val">${state.currentDigits.join(', ')}</span>
          </div>
          <div class="check-detail-item">
            <span class="check-label">ตัวเลขที่ใช้ในสมการ:</span>
            <span class="check-val">${digitCheck.usedDigits.join(', ') || 'ไม่มี'}</span>
          </div>
      `;

      if (!digitCheck.isValid) {
        if (digitCheck.missingDigits.length > 0) {
          detailsHtml += `
            <div class="check-detail-item">
              <span class="check-label" style="color:var(--accent-pink);">❌ ใช้ตัวเลขไม่ครบ:</span>
              <span class="check-val" style="color:var(--accent-pink);">ขาดเลข ${digitCheck.missingDigits.join(', ')}</span>
            </div>
          `;
        }
        if (digitCheck.extraDigits.length > 0) {
          detailsHtml += `
            <div class="check-detail-item">
              <span class="check-label" style="color:var(--accent-pink);">❌ ใช้ตัวเลขเกินโจทย์:</span>
              <span class="check-val" style="color:var(--accent-pink);">มีเลข ${digitCheck.extraDigits.join(', ')}</span>
            </div>
          `;
        }
      }

      detailsHtml += `</div>`;
      bodyEl.innerHTML = bannerHtml + detailsHtml;
    }

    if (isFullyCorrect) playAlarm();

    const checkModal = document.getElementById('modal-check-result');
    if (checkModal) checkModal.classList.add('active');
  }

  function closeCheckModal() {
    const checkModal = document.getElementById('modal-check-result');
    if (checkModal) checkModal.classList.remove('active');
  }

  /* ==========================================================================
     Settings Modal
  ========================================================================== */
  function openModal() {
    playClick();
    if (el.selectGameMode)       el.selectGameMode.value       = state.gameMode;
    if (el.inputCompItems)       el.inputCompItems.value       = state.compTotalItems;
    if (el.selectScratchpadMode) el.selectScratchpadMode.value  = state.scratchpadMode;
    if (el.selectDigitMode)      el.selectDigitMode.value      = state.digitCount;
    if (el.selectTargetMode)     el.selectTargetMode.value     = state.targetMode;
    if (el.selectTimerMode)      el.selectTimerMode.value      = state.timerMode;
    if (el.inputCustomTarget)    el.inputCustomTarget.value    = state.customTarget;

    if (el.customTargetGroup) el.customTargetGroup.style.display = state.targetMode === 'custom' ? 'flex' : 'none';
    if (el.compItemsGroup)    el.compItemsGroup.style.display = state.gameMode === 'competition' ? 'flex' : 'none';

    // Hide digit count selector when Game24 (always 4 digits)
    const digitGroup = el.selectDigitMode ? el.selectDigitMode.closest('.form-group') : null;
    if (digitGroup) digitGroup.style.display = isGame24() ? 'none' : 'flex';

    if (el.modalSettings) el.modalSettings.classList.add('active');
  }

  function closeModal() {
    if (el.modalSettings) el.modalSettings.classList.remove('active');
  }

  function doSaveSettings() {
    playClick();
    if (el.selectGameMode)       state.gameMode       = el.selectGameMode.value;
    if (el.inputCompItems)       state.compTotalItems = Math.max(1, parseInt(el.inputCompItems.value, 10) || 30);
    if (el.selectScratchpadMode) state.scratchpadMode = el.selectScratchpadMode.value;
    if (el.selectDigitMode)      state.digitCount     = parseInt(el.selectDigitMode.value, 10) || 4;
    if (el.selectTargetMode)     state.targetMode     = el.selectTargetMode.value;
    if (el.selectTimerMode)      state.timerMode      = el.selectTimerMode.value;
    if (el.inputCustomTarget)    state.customTarget   = parseInt(el.inputCustomTarget.value, 10) || 100;

    // Game24 always locks to 4 digits
    if (isGame24()) state.digitCount = 4;

    state.compCurrentItem = 1;
    state.hasCompletedRound = false;
    updateQuestionBadge();
    updateScratchpadVisibility();

    updateAppTitle();
    closeModal();
    loadNewPuzzle();
  }

  function onGameModeChange(e) {
    const val = e.target.value;
    if (el.compItemsGroup)
      el.compItemsGroup.style.display = val === 'competition' ? 'flex' : 'none';
  }

  function onTargetModeChange(e) {
    const val = e.target.value;
    if (el.customTargetGroup)
      el.customTargetGroup.style.display = val === 'custom' ? 'flex' : 'none';
    // Hide digit count selector when Game24 selected
    const digitGroup = el.selectDigitMode ? el.selectDigitMode.closest('.form-group') : null;
    if (digitGroup) digitGroup.style.display = val === '24' ? 'none' : 'flex';
  }

  function doToggleSound() {
    try {
      if (window.soundFX) {
        const isMuted = window.soundFX.toggleMute();
        if (el.soundStatusText) el.soundStatusText.textContent = isMuted ? 'ปิดเสียง' : 'เปิดเสียง';
      }
    } catch(e) {}
  }

  /* ==========================================================================
     Background Particles
  ========================================================================== */
  function setupParticles() {
    const canvas = el.particlesCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width  = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });

    const syms = ['+','-','×','÷','^','√','!','Σ','24','180'];
    const pts = Array.from({length: 25}, () => ({
      x: Math.random() * w, y: Math.random() * h,
      s: syms[Math.floor(Math.random() * syms.length)],
      sz: Math.random() * 12 + 9,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.25 + 0.08
    }));

    (function draw() {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x = (p.x + p.vx + w) % w;
        p.y = (p.y + p.vy + h) % h;
        ctx.fillStyle = `rgba(0,242,254,${p.a})`;
        ctx.font = `${p.sz}px "Fira Code",monospace`;
        ctx.fillText(p.s, p.x, p.y);
      });
      requestAnimationFrame(draw);
    })();
  }

  // Start
  init();
});
