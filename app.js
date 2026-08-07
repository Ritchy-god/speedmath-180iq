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
    on(el.btnRollDigits,   'click', doRollDigits);
    on(el.btnRollTarget,   'click', doRollTarget);
    on(el.btnSound,        'click', doToggleSound);
    on(el.btnSettings,     'click', () => openModal());
    on(el.btnCloseModal,   'click', () => closeModal());
    on(el.btnSaveSettings, 'click', doSaveSettings);
    on(el.solutionsHeader, 'click', toggleSolutions);
    on(el.selectTargetMode,'change', onTargetModeChange);
    on(el.selectGameMode,  'change', onGameModeChange);
    on(el.modalSettings,   'click', (e) => { if (e.target === el.modalSettings) closeModal(); });
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
    }
  };

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
