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
      const pos = this.getPos(e);
      this.lastX = pos.x;
      this.lastY = pos.y;
    },

    draw(e) {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = this.getPos(e);

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
    },

    stopDrawing(e) {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.ctx.beginPath();
      }
    },

    clear() {
      if (!this.canvas || !this.ctx) return;
      const dpr = window.devicePixelRatio || 1;
      this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    },

    bindEvents() {
      const c = this.canvas;
      if (!c) return;

      c.addEventListener('pointerdown', (e) => this.startDrawing(e));
      c.addEventListener('pointermove', (e) => this.draw(e));
      c.addEventListener('pointerup', (e) => this.stopDrawing(e));
      c.addEventListener('pointercancel', (e) => this.stopDrawing(e));
      c.addEventListener('pointerleave', (e) => this.stopDrawing(e));

      c.addEventListener('touchstart', (e) => this.startDrawing(e), { passive: false });
      c.addEventListener('touchmove', (e) => this.draw(e), { passive: false });
      c.addEventListener('touchend', (e) => this.stopDrawing(e));
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

      // Preserve equals sign =, numbers, and math operators
      text = text.replace(/[^0-9+\-*×÷=^!√()]/g, '');
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
            if (window.Tesseract) {
              const preprocessed = this.getPreprocessedCanvas();
              const res = await window.Tesseract.recognize(preprocessed, 'eng', {
                tessedit_char_whitelist: '0123456789+-*xX/÷=()!^vV',
                tessedit_pageseg_mode: '6'
              });
              let raw = res.data.text || '';
              let cleaned = this.cleanOCRText(raw);
              if (cleaned) {
                exprInput.value = cleaned;
              } else {
                alert('อ่านลายมือไม่ชัดเจน โปรดลองเขียนใหม่ หรือพิมพ์สมการลงในช่อง');
              }
            } else {
              alert('ระบบกำลังโหลดตัวอ่านลายมือ โปรดลองอีกครั้งในครู่เดียว หรือพิมพ์สมการในช่อง');
            }
          } catch(err) {
            console.error('OCR error:', err);
            alert('เกิดข้อผิดพลาดในการอ่านลายมือ โปรดพิมพ์สมการลงในช่อง');
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
