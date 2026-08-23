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

    isSolutionsOpen: false,
    solutionsLocked: true,
    solutionsSearchComplete: false,
    solutionsSearchInProgress: false,
    solutionsTruncated: false,
    solutionsVisibleCount: 25,
    solutionRevision: 0
  };

  const SOLUTION_PREVIEW_LIMIT = 25;
  const SOLUTION_ALL_LIMIT = 500;
  const SOLUTION_PAGE_SIZE = 50;

  /* ==========================================================================
     DOM Elements
  ========================================================================== */
  const el = {
    digitsContainer:      document.getElementById('digits-container'),
    targetBox:            document.getElementById('target-box'),
    timerValue:           document.getElementById('timer-value'),
    timerProgress:        document.getElementById('timer-progress'),
    solutionsHeader:      document.getElementById('solutions-header'),
    solutionsTitleText:   document.getElementById('solutions-title-text'),
    solutionsBadge:       document.getElementById('solutions-badge'),
    solutionsContent:     document.getElementById('solutions-content'),
    solutionsToggle:      document.getElementById('solutions-toggle-icon'),
    btnRollDigits:        document.getElementById('btn-roll-digits'),
    btnRollTarget:        document.getElementById('btn-roll-target'),
    btnCheckAnswer:       document.getElementById('btn-check-answer'),
    btnToggleScratchpad:  document.getElementById('btn-toggle-scratchpad'),
    scratchpadToggleText: document.getElementById('scratchpad-toggle-text'),
    btnCloseScratchpad:   document.getElementById('sp-btn-close'),
    btnExpandScratchpad:  document.getElementById('sp-btn-expand'),
    btnSound:             document.getElementById('btn-sound'),
    soundStatusText:      document.getElementById('sound-status-text'),
    btnFullscreen:        document.getElementById('btn-fullscreen'),
    fullscreenIcon:       document.getElementById('fullscreen-icon'),
    fullscreenStatusText: document.getElementById('fullscreen-status-text'),
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
    on(el.btnToggleScratchpad,  'click', doToggleScratchpad);
    on(el.btnCloseScratchpad,   'click', closeScratchpad);
    on(el.btnExpandScratchpad,  'click', () => scratchpad.toggleExpanded());
    on(el.btnCloseCheckModal,   'click', closeCheckModal);
    on(el.btnConfirmCheckModal, 'click', closeCheckModal);
    on(el.btnSound,             'click', doToggleSound);
    on(el.btnFullscreen,        'click', doToggleFullscreen);
    on(el.btnSettings,          'click', () => openModal());
    on(el.btnCloseModal,        'click', () => closeModal());
    on(el.btnSaveSettings,      'click', doSaveSettings);
    on(el.solutionsHeader,      'click', toggleSolutions);
    on(el.solutionsHeader,      'keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleSolutions();
      }
    });
    on(el.selectTargetMode,     'change', onTargetModeChange);
    on(el.selectGameMode,       'change', onGameModeChange);
    on(el.modalSettings,        'click', (e) => { if (e.target === el.modalSettings) closeModal(); });
    on(el.modalCheckResult,     'click', (e) => { if (e.target === el.modalCheckResult) closeCheckModal(); });
    on(document,                'fullscreenchange', updateFullscreenButton);
    on(document,                'webkitfullscreenchange', updateFullscreenButton);
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
    setPreviewSolutions(puzzle.solutions);
  }

  function pickNewTargetFromDigits() {
    const { tMode } = getCountAndMode();
    const puzzle = MathSolver.generateSolvablePuzzleFromDigits(state.currentDigits, tMode);
    state.targetValue = puzzle.target;
    setPreviewSolutions(puzzle.solutions);
  }

  function setPreviewSolutions(solutions) {
    state.solutions = solutions || [];
    state.solutionsSearchComplete = false;
    state.solutionsSearchInProgress = false;
    state.solutionsTruncated = false;
    state.solutionsVisibleCount = SOLUTION_PREVIEW_LIMIT;
    state.solutionRevision++;
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

    if (el.btnCheckAnswer) {
      el.btnCheckAnswer.style.display = state.timerMode === 'countup' ? 'inline-flex' : 'none';
    }
    playClick();
    stopTimer();
    setSolutionsLocked(true);
    rollNewDigits();
    if (scratchpad) scratchpad.clear();

    state.isDigitsRevealed = true;

    if (isGame24()) {
      state.targetValue = 24;
      setPreviewSolutions(MathSolver.solve(state.currentDigits, 24, { maxSolutions: SOLUTION_PREVIEW_LIMIT }));
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
      setBadge('🔒 ล็อก');
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

    if (el.btnCheckAnswer) {
      el.btnCheckAnswer.style.display = state.timerMode === 'countup' ? 'inline-flex' : 'none';
    }
    playClick();

    if (isGame24()) {
      if (!state.isDigitsRevealed || state.currentDigits.length === 0) {
        rollNewDigits();
        state.isDigitsRevealed = true;
        state.targetValue = 24;
        setPreviewSolutions(MathSolver.solve(state.currentDigits, 24, { maxSolutions: SOLUTION_PREVIEW_LIMIT }));
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
    setSolutionsLocked(true);
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
    setBadge('🔒 ล็อก');
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
    if (state.solutionsLocked) {
      setBadge('🔒 ล็อก');
      setSolutionsPlaceholder('🔒 เฉลยจะพร้อมให้ดูเมื่อหมดเวลา');
      return;
    }

    const list = state.solutions || [];
    const badgeSuffix = state.solutionsSearchComplete && state.solutionsTruncated ? '+' : '';
    setBadge(`${list.length}${badgeSuffix} คำตอบ`);
    if (!el.solutionsContent) return;
    el.solutionsContent.innerHTML = '';

    if (list.length === 0) {
      setSolutionsPlaceholder('ไม่พบเฉลยจากตัวเลขชุดนี้');
      return;
    }

    const frag = document.createDocumentFragment();
    const tasks = [];

    list.slice(0, state.solutionsVisibleCount).forEach(sol => {
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

    const actions = document.createElement('div');
    actions.className = 'solutions-actions';

    if (state.solutionsSearchInProgress) {
      const status = document.createElement('div');
      status.className = 'solutions-search-status';
      status.textContent = '⏳ กำลังค้นหาคำตอบเพิ่มเติม...';
      actions.appendChild(status);
    } else if (!state.solutionsSearchComplete) {
      const searchButton = document.createElement('button');
      searchButton.type = 'button';
      searchButton.className = 'solutions-action-btn';
      searchButton.textContent = `🔎 ค้นหาคำตอบทั้งหมด (สูงสุด ${SOLUTION_ALL_LIMIT})`;
      searchButton.addEventListener('click', (event) => {
        event.stopPropagation();
        searchAllSolutions();
      });
      actions.appendChild(searchButton);
    } else {
      if (state.solutionsVisibleCount < list.length) {
        const moreButton = document.createElement('button');
        moreButton.type = 'button';
        moreButton.className = 'solutions-action-btn';
        moreButton.textContent = `แสดงเพิ่ม ${Math.min(SOLUTION_PAGE_SIZE, list.length - state.solutionsVisibleCount)} คำตอบ`;
        moreButton.addEventListener('click', (event) => {
          event.stopPropagation();
          state.solutionsVisibleCount += SOLUTION_PAGE_SIZE;
          renderSolutions();
        });
        actions.appendChild(moreButton);
      }

      const status = document.createElement('div');
      status.className = `solutions-search-status${state.solutionsTruncated ? ' warning' : ''}`;
      status.textContent = state.solutionsTruncated
        ? `พบมากกว่า ${SOLUTION_ALL_LIMIT} คำตอบ — จำกัดการแสดงเพื่อป้องกันเครื่องค้าง`
        : `ค้นหาครบ ${list.length} คำตอบที่แตกต่างกันภายใต้กติกาของ Solver`;
      actions.appendChild(status);
    }

    el.solutionsContent.appendChild(actions);

    // Render KaTeX asynchronously
    setTimeout(() => {
      tasks.forEach(t => {
        if (!window.katex) return;
        try { window.katex.render(t.latex, t.span, { throwOnError: false }); }
        catch(e) { t.span.textContent = t.raw; }
      });
    }, 20);
  }

  function searchAllSolutions() {
    if (
      state.solutionsLocked || state.solutionsSearchComplete ||
      state.solutionsSearchInProgress || !state.currentDigits.length
    ) return;

    state.solutionsSearchInProgress = true;
    const revision = state.solutionRevision;
    const digits = [...state.currentDigits];
    const target = state.targetValue;
    renderSolutions();

    // Yield once so the loading state paints before the CPU-heavy search.
    setTimeout(() => {
      const allSolutions = MathSolver.solve(digits, target, {
        maxSolutions: SOLUTION_ALL_LIMIT,
        exhaustive: true
      });
      if (revision !== state.solutionRevision) return;

      state.solutions = allSolutions;
      state.solutionsTruncated = Boolean(allSolutions.truncated);
      state.solutionsSearchComplete = true;
      state.solutionsSearchInProgress = false;
      state.solutionsVisibleCount = SOLUTION_PAGE_SIZE;
      renderSolutions();
    }, 40);
  }

  function setBadge(text) {
    if (el.solutionsBadge) el.solutionsBadge.textContent = text;
  }

  function setSolutionsPlaceholder(msg) {
    if (!el.solutionsContent) return;
    el.solutionsContent.innerHTML = `<div style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:1rem;">${msg}</div>`;
  }

  function toggleSolutions() {
    if (state.solutionsLocked) {
      playWarning();
      return;
    }
    state.isSolutionsOpen = !state.isSolutionsOpen;
    if (el.solutionsContent) el.solutionsContent.classList.toggle('open', state.isSolutionsOpen);
    if (el.solutionsToggle) el.solutionsToggle.style.transform = state.isSolutionsOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    if (el.solutionsHeader) el.solutionsHeader.setAttribute('aria-expanded', String(state.isSolutionsOpen));
    if (state.isSolutionsOpen && !state.solutionsSearchComplete) searchAllSolutions();
  }

  function setSolutionsLocked(locked) {
    state.solutionsLocked = locked;
    if (el.solutionsHeader) {
      el.solutionsHeader.classList.toggle('locked', locked);
      el.solutionsHeader.setAttribute('aria-disabled', String(locked));
      el.solutionsHeader.title = locked ? 'เฉลยจะเปิดเมื่อหมดเวลา' : 'กดเพื่อแสดงหรือซ่อนเฉลย';
    }
    if (el.solutionsTitleText) {
      el.solutionsTitleText.textContent = locked
        ? '🔒 เฉลยจะเปิดเมื่อหมดเวลา'
        : '💡 คำตอบที่ค้นพบทั้งหมด (LaTeX Format)';
    }

    if (locked) {
      state.isSolutionsOpen = false;
      if (el.solutionsContent) {
        el.solutionsContent.classList.remove('open');
        setSolutionsPlaceholder('🔒 เฉลยจะพร้อมให้ดูเมื่อหมดเวลา');
      }
      if (el.solutionsToggle) {
        el.solutionsToggle.textContent = '🔒';
        el.solutionsToggle.style.transform = 'rotate(0deg)';
      }
      if (el.solutionsHeader) el.solutionsHeader.setAttribute('aria-expanded', 'false');
      setBadge('🔒 ล็อก');
      return;
    }

    if (el.solutionsToggle) el.solutionsToggle.textContent = '▼';
    renderSolutions();
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
    if (el.timerValue) el.timerValue.textContent = state.timerMode === 'none' ? '∞' : secs;
    updateCheckAnswerButtonVisibility();
    if (el.timerProgress) {
      el.timerProgress.style.strokeDashoffset = 0;
      el.timerProgress.classList.remove('warning', 'danger');
    }
  }

  function startTimer() {
    stopTimer();
    updateCheckAnswerButtonVisibility();

    const m = state.timerMode;
    if (m === 'none') {
      setSolutionsLocked(false);
      if (el.timerValue) el.timerValue.textContent = '∞';
      return;
    }

    setSolutionsLocked(true);

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
        updateTimerDisplay();
      } else {
        state.timerSeconds--;
        updateTimerDisplay();
        if (state.timerSeconds <= 5 && state.timerSeconds > 0) playWarning();
        if (state.timerSeconds <= 0) {
          stopTimer();
          playAlarm();
          state.hasCompletedRound = true;
          setSolutionsLocked(false);
          updateCheckAnswerButtonVisibility();
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
    const isVisible = state.scratchpadMode === 'show';
    if (isVisible) {
      el.scratchpadContainer.style.display = 'flex';
      scratchpad.resizeCanvas();
    } else {
      el.scratchpadContainer.style.display = 'none';
    }
    if (el.btnToggleScratchpad) {
      el.btnToggleScratchpad.classList.toggle('active', isVisible);
      el.btnToggleScratchpad.setAttribute('aria-expanded', String(isVisible));
    }
    if (el.scratchpadToggleText) {
      el.scratchpadToggleText.textContent = isVisible ? 'ซ่อนกระดาษทด' : 'แสดงกระดาษทด';
    }
  }

  function updateCheckAnswerButtonVisibility() {
    if (!el.btnCheckAnswer) return;
    const shouldShow = state.timerMode === 'countup' || state.hasCompletedRound;
    el.btnCheckAnswer.style.display = shouldShow ? 'inline-flex' : 'none';
  }

  function doToggleScratchpad() {
    playClick();
    state.scratchpadMode = state.scratchpadMode === 'show' ? 'hide' : 'show';
    if (state.scratchpadMode === 'hide') scratchpad.setExpanded(false);
    updateScratchpadVisibility();
  }

  function closeScratchpad() {
    playClick();
    state.scratchpadMode = 'hide';
    scratchpad.setExpanded(false);
    updateScratchpadVisibility();
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
    recognitionRevision: 0,
    recognitionAbortController: null,
    myScriptUsage: null,
    isExpanded: false,
    resizeSnapshot: null,
    resizeSnapshotDpr: 1,
    resizeObserver: null,
    resizeFrame: null,

    getMyScriptProxyUrl() {
      const configured = window.SPEEDMATH_MYSCRIPT_PROXY_URL ||
        'https://speedmath-myscript-proxy.sonic125ster.workers.dev';
      return String(configured).trim().replace(/\/$/, '');
    },

    updateMyScriptUsage(usage) {
      if (!usage || !Number.isFinite(Number(usage.limit))) return;
      this.myScriptUsage = {
        used: Math.max(0, Number(usage.used) || 0),
        limit: Math.max(1, Number(usage.limit) || 2000),
        remaining: Math.max(0, Number(usage.remaining) || 0),
        limitReached: Boolean(usage.limitReached)
      };

      const badge = document.getElementById('myscript-usage');
      const button = document.getElementById('sp-btn-myscript');
      if (badge) {
        const { used, limit, remaining, limitReached } = this.myScriptUsage;
        badge.textContent = limitReached
          ? `MyScript: ครบลิมิต ${limit.toLocaleString('th-TH')} ครั้งแล้ว`
          : `MyScript คงเหลือ ${remaining.toLocaleString('th-TH')} / ${limit.toLocaleString('th-TH')} ครั้ง · นับจากวันที่เปิดตัวนับ`;
        badge.classList.toggle('warning', !limitReached && remaining <= Math.max(100, limit * 0.1));
        badge.classList.toggle('exhausted', limitReached);
      }
      if (button) {
        button.dataset.limitReached = String(this.myScriptUsage.limitReached);
        button.disabled = this.myScriptUsage.limitReached;
        if (this.myScriptUsage.limitReached) button.textContent = '⛔ ครบลิมิตแล้ว';
      }
    },

    async loadMyScriptUsage() {
      const proxyUrl = this.getMyScriptProxyUrl();
      if (!proxyUrl) return;
      const badge = document.getElementById('myscript-usage');
      try {
        const response = await fetch(`${proxyUrl}/usage`, { method: 'GET', cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.usage) throw new Error(result.error || 'Usage unavailable');
        this.updateMyScriptUsage(result.usage);
      } catch (error) {
        console.warn('MyScript usage unavailable:', error);
        if (badge) badge.textContent = 'MyScript: ไม่สามารถโหลดเครดิตได้';
      }
    },

    buildMyScriptRequest() {
      if (!this.strokes.length) {
        throw new Error('ไม่พบข้อมูลเส้นปากกา กรุณากดล้างแล้วเขียนสมการใหม่');
      }
      const sourceStrokes = this.strokeTrackingValid
        ? this.strokes
        : this.getVisibleStrokeSegments();
      const strokes = sourceStrokes
        .filter(stroke => Array.isArray(stroke) && stroke.length >= 1)
        .map((stroke, index) => ({
          id: `stroke-${index + 1}`,
          pointerType: 'PEN',
          x: (stroke.length === 1 ? [stroke[0], stroke[0]] : stroke).map(point => Number(point.x.toFixed(2))),
          y: (stroke.length === 1 ? [stroke[0], stroke[0]] : stroke).map(point => Number(point.y.toFixed(2)))
        }));
      if (!strokes.length) throw new Error('ไม่เหลือเส้นสมการให้อ่าน กรุณาเขียนสมการใหม่');
      const rect = this.canvas.getBoundingClientRect();
      return {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        strokes
      };
    },

    getVisibleStrokeSegments() {
      if (!this.canvas || !this.ctx) return [];
      let imageData;
      try {
        imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      } catch (error) {
        console.warn('Cannot inspect erased strokes:', error);
        return [];
      }

      const dpr = window.devicePixelRatio || 1;
      const radius = Math.max(1, Math.ceil(this.lineWidth * dpr * 0.7));
      const hasInk = point => {
        const centreX = Math.round(point.x * dpr);
        const centreY = Math.round(point.y * dpr);
        for (let y = Math.max(0, centreY - radius); y <= Math.min(imageData.height - 1, centreY + radius); y++) {
          for (let x = Math.max(0, centreX - radius); x <= Math.min(imageData.width - 1, centreX + radius); x++) {
            if (imageData.data[(y * imageData.width + x) * 4 + 3] > 20) return true;
          }
        }
        return false;
      };

      const segments = [];
      this.strokes.forEach(stroke => {
        if (!Array.isArray(stroke) || !stroke.length) return;
        const samples = [];
        for (let index = 0; index < stroke.length; index++) {
          const point = stroke[index];
          if (index === 0) {
            samples.push(point);
            continue;
          }
          const previous = stroke[index - 1];
          const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
          const steps = Math.max(1, Math.ceil(distance / 1.5));
          for (let step = 1; step <= steps; step++) {
            const ratio = step / steps;
            samples.push({
              x: previous.x + (point.x - previous.x) * ratio,
              y: previous.y + (point.y - previous.y) * ratio
            });
          }
        }

        let visible = [];
        const flush = () => {
          if (visible.length === 1) visible.push({ ...visible[0] });
          if (visible.length >= 2) segments.push(visible);
          visible = [];
        };
        samples.forEach(point => {
          if (hasInk(point)) visible.push(point);
          else flush();
        });
        flush();
      });
      return segments;
    },

    normalizeMyScriptLatex(latex) {
      let text = String(latex || '').trim();
      if (!text) return '';
      text = text.replace(/\\left|\\right/g, '').replace(/\\(?:,|;|!|quad|qquad)/g, ' ');
      const summations = [];
      text = text.replace(
        /\\sum\s*_\s*\{\s*i\s*=\s*([^{}]+?)\s*\}\s*\^\s*\{\s*([^{}]+?)\s*\}/g,
        (_, lower, upper) => {
          const index = summations.push({
            lower: lower.replace(/\s+/g, ''),
            upper: upper.replace(/\s+/g, '')
          }) - 1;
          return ` SPEEDMATHSIGMA${index} `;
        }
      );
      const replaceGroups = (pattern, replacer) => {
        let previous;
        do {
          previous = text;
          text = text.replace(pattern, replacer);
        } while (text !== previous);
      };
      replaceGroups(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
      replaceGroups(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
      text = text
        .replace(/\\times|\\cdot/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '+')
        .replace(/\^\s*\{([^{}]+)\}/g, '^($1)')
        .replace(/[{}]/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/(\d)\s+(?=\d)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      text = text.replace(/SPEEDMATHSIGMA(\d+)/g, (_, index) => {
        const sigma = summations[Number(index)];
        return sigma ? `Σ_{i=${sigma.lower}}^{${sigma.upper}}` : '';
      });
      return text;
    },

    async recognizeWithMyScript(exprInput, button) {
      const proxyUrl = this.getMyScriptProxyUrl();
      if (!proxyUrl) {
        alert('ยังไม่ได้เชื่อมต่อ MyScript proxy กรุณาตั้งค่า Worker URL ก่อน');
        return;
      }
      if (this.myScriptUsage?.limitReached) {
        alert('MyScript ใช้ครบลิมิต 2,000 ครั้งแล้ว กรุณาใช้ปุ่มแปลงลายมือภายในเครื่อง');
        return;
      }
      const original = button.textContent;
      if (this.recognitionAbortController) this.recognitionAbortController.abort();
      const controller = new AbortController();
      const requestRevision = this.recognitionRevision;
      this.recognitionAbortController = controller;
      button.disabled = true;
      button.textContent = '⏳ MyScript...';
      try {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.buildMyScriptRequest()),
          signal: controller.signal
        });
        const result = await response.json().catch(() => ({}));
        if (result.usage) this.updateMyScriptUsage(result.usage);
        if (!response.ok) throw new Error(result.error || `MyScript HTTP ${response.status}`);
        const expression = this.normalizeMyScriptLatex(result.latex);
        if (!expression) throw new Error('MyScript returned no equation.');
        if (requestRevision !== this.recognitionRevision) return;
        exprInput.value = expression;
        exprInput.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('MyScript fallback error:', error);
        alert(`MyScript อ่านไม่สำเร็จ: ${error.message}`);
      } finally {
        if (this.recognitionAbortController === controller) {
          this.recognitionAbortController = null;
          if (button.dataset.limitReached !== 'true') {
            button.disabled = false;
            button.textContent = original;
          }
        }
      }
    },

    isRecognitionUncertain(expression) {
      const text = String(expression || '').trim();
      if (!text || text.includes('?') || !window.MathEngine) return true;
      const equality = splitTopLevelEquality(text);
      const sides = equality.right ? [equality.left, equality.right] : [equality.left];
      return sides.some(side => !side || !window.MathEngine.evaluate(side).success);
    },

    async useRecognizedExpression(expression, exprInput, button, expectedRevision = this.recognitionRevision) {
      if (expectedRevision !== this.recognitionRevision) return;
      const text = String(expression || '').trim();
      if (text) {
        exprInput.value = text;
        exprInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (this.getMyScriptProxyUrl() && this.strokeTrackingValid && this.isRecognitionUncertain(text)) {
        await this.recognizeWithMyScript(exprInput, button);
      }
    },

    toDisplayLatex(expression) {
      let latex = String(expression || '').trim();
      if (!latex) return '';

      latex = latex.replace(/Σ_\{([^{}]+)\}\^\{([^{}]+)\}/g, '\\sum_{$1}^{$2}');

      let previous;
      do {
        previous = latex;
        latex = latex
          .replace(/√\(([^()]*)\)/g, '\\sqrt{$1}')
          .replace(/\(([^()]*)\)\s*\/\s*\(([^()]*)\)/g, '\\frac{$1}{$2}')
          .replace(/\^\(([^()]*)\)/g, '^{$1}');
      } while (latex !== previous);

      latex = latex
        .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, '\\frac{$1}{$2}')
        .replace(/[×*]/g, '\\times ')
        .replace(/÷/g, '\\div ')
        .replace(/√\s*([\dA-Za-z]+)/g, '\\sqrt{$1}');

      return latex;
    },

    bindExpressionPreview(exprInput) {
      const field = document.getElementById('scratchpad-math-field');
      const preview = document.getElementById('scratchpad-latex-preview');
      if (!field || !preview || !exprInput) return;

      const render = () => {
        const expression = exprInput.value.trim();
        preview.classList.toggle('is-empty', !expression);
        if (!expression) {
          preview.textContent = exprInput.placeholder;
          return;
        }
        if (!window.katex) {
          preview.textContent = expression;
          return;
        }
        window.katex.render(this.toDisplayLatex(expression), preview, {
          throwOnError: false,
          strict: false,
          displayMode: false
        });
      };

      const startEditing = () => {
        field.classList.add('is-editing');
        requestAnimationFrame(() => {
          exprInput.focus();
          exprInput.setSelectionRange(exprInput.value.length, exprInput.value.length);
        });
      };

      field.classList.add('is-enhanced');
      preview.addEventListener('click', startEditing);
      preview.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          startEditing();
        }
      });
      exprInput.addEventListener('focus', () => field.classList.add('is-editing'));
      exprInput.addEventListener('blur', () => {
        render();
        field.classList.remove('is-editing');
      });
      exprInput.addEventListener('input', render);
      render();
    },

    init() {
      this.canvas = document.getElementById('scratchpad-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      const wrapper = this.canvas.parentElement;
      if (wrapper && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
          this.resizeFrame = requestAnimationFrame(() => {
            this.resizeFrame = null;
            this.resizeCanvas();
          });
        });
        this.resizeObserver.observe(wrapper);
      }

      this.bindEvents();
      this.bindControls();
    },

    setExpanded(expanded) {
      const container = el.scratchpadContainer;
      if (!container) return;
      this.isExpanded = Boolean(expanded);
      container.classList.toggle('is-expanded', this.isExpanded);
      if (el.btnExpandScratchpad) {
        el.btnExpandScratchpad.classList.toggle('active', this.isExpanded);
        el.btnExpandScratchpad.setAttribute('aria-pressed', String(this.isExpanded));
        el.btnExpandScratchpad.textContent = this.isExpanded ? '🗗 ย่อ' : '⛶ ขยาย';
        el.btnExpandScratchpad.title = this.isExpanded ? 'ย่อกระดาษทด' : 'ขยายกระดาษทด';
      }
      requestAnimationFrame(() => this.resizeCanvas());
    },

    toggleExpanded() {
      playClick();
      this.setExpanded(!this.isExpanded);
    },

    resizeCanvas() {
      if (!this.canvas) return;
      const wrapper = this.canvas.parentElement;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      const oldWidth = this.canvas.width;
      const oldHeight = this.canvas.height;

      if (oldWidth === nextWidth && oldHeight === nextHeight) return;

      // Keep a backing snapshot at the largest size reached. Shrinking the
      // panel therefore hides the outer area instead of deleting it, so the
      // writing reappears when the scratchpad is expanded again.
      if (!this.resizeSnapshot || this.resizeSnapshotDpr !== dpr) {
        this.resizeSnapshot = document.createElement('canvas');
        this.resizeSnapshot.width = Math.max(oldWidth, nextWidth);
        this.resizeSnapshot.height = Math.max(oldHeight, nextHeight);
        this.resizeSnapshotDpr = dpr;
      } else if (this.resizeSnapshot.width < nextWidth || this.resizeSnapshot.height < nextHeight) {
        const grown = document.createElement('canvas');
        grown.width = Math.max(this.resizeSnapshot.width, nextWidth);
        grown.height = Math.max(this.resizeSnapshot.height, nextHeight);
        const grownCtx = grown.getContext('2d');
        if (grownCtx) grownCtx.drawImage(this.resizeSnapshot, 0, 0);
        this.resizeSnapshot = grown;
      }

      const snapshotCtx = this.resizeSnapshot.getContext('2d');
      if (snapshotCtx && oldWidth > 0 && oldHeight > 0) {
        snapshotCtx.clearRect(0, 0, oldWidth, oldHeight);
        snapshotCtx.drawImage(this.canvas, 0, 0);
      }

      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (this.resizeSnapshot.width > 0 && this.resizeSnapshot.height > 0) {
        this.ctx.drawImage(
          this.resizeSnapshot,
          0,
          0,
          this.resizeSnapshot.width / dpr,
          this.resizeSnapshot.height / dpr
        );
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
      this.recognitionRevision++;
      this.lastX = pos.x;
      this.lastY = pos.y;
      if (this.isEraser) {
        this.currentStroke = null;
        this.strokeTrackingValid = false;
      } else {
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
        if (this.currentStroke && e && (e.clientX !== undefined || (e.changedTouches && e.changedTouches[0]))) {
          const finalPoint = this.getPos(e.changedTouches ? e.changedTouches[0] : e);
          const previous = this.currentStroke[this.currentStroke.length - 1];
          if (!previous || finalPoint.x !== previous.x || finalPoint.y !== previous.y) {
            this.currentStroke.push(finalPoint);
          }
        }
        this.isDrawing = false;
        this.currentStroke = null;
        this.ctx.beginPath();
      }
    },

    clear() {
      if (!this.canvas || !this.ctx) return;
      const dpr = window.devicePixelRatio || 1;
      this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
      if (this.resizeSnapshot) {
        const snapshotCtx = this.resizeSnapshot.getContext('2d');
        if (snapshotCtx) snapshotCtx.clearRect(0, 0, this.resizeSnapshot.width, this.resizeSnapshot.height);
      }
      if (this.recognitionAbortController) {
        this.recognitionAbortController.abort();
        this.recognitionAbortController = null;
      }
      this.recognitionRevision++;
      this.strokes = [];
      this.currentStroke = null;
      this.strokeTrackingValid = true;
      this.isDrawing = false;
      this.isEraser = false;
      this.ctx.globalCompositeOperation = 'source-over';

      const eraserBtn = document.getElementById('sp-btn-eraser');
      if (eraserBtn) eraserBtn.classList.remove('active');
      document.querySelectorAll('.color-btn').forEach(button => button.classList.remove('active'));
      const whiteBtn = document.getElementById('sp-color-white');
      if (whiteBtn) whiteBtn.classList.add('active');
      this.color = '#ffffff';

      const myScriptBtn = document.getElementById('sp-btn-myscript');
      if (myScriptBtn && myScriptBtn.dataset.limitReached !== 'true') {
        myScriptBtn.disabled = false;
        myScriptBtn.textContent = '☁️ อ่านแบบแม่นยำ';
      }

      const input = document.getElementById('scratchpad-expr-input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.blur();
      }
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

    getInkComponents(w, h, excludedBands = []) {
      if (!this.ctx || w <= 0 || h <= 0) return [];
      try {
        const pixels = this.ctx.getImageData(0, 0, w, h).data;
        const visited = new Uint8Array(w * h);
        const excluded = excludedBands.length > 0 ? new Uint8Array(w * h) : null;
        for (const band of excludedBands) {
          const x0 = Math.max(0, Math.floor(band.x0));
          const x1 = Math.min(w - 1, Math.ceil(band.x1));
          const y0 = Math.max(0, Math.floor(band.y0));
          const y1 = Math.min(h - 1, Math.ceil(band.y1));
          for (let y = y0; y <= y1; y++) {
            const row = y * w;
            for (let x = x0; x <= x1; x++) excluded[row + x] = 1;
          }
        }
        const components = [];
        const dpr = window.devicePixelRatio || 1;
        const minArea = Math.max(3, Math.round(dpr * dpr * 2));

        for (let start = 0; start < w * h; start++) {
          if (visited[start] || (excluded && excluded[start]) || pixels[start * 4 + 3] <= 20) continue;
          const queue = [start];
          visited[start] = 1;
          let area = 0;
          let x0 = w, y0 = h, x1 = 0, y1 = 0;
          for (let q = 0; q < queue.length; q++) {
            const index = queue[q];
            const x = index % w;
            const y = Math.floor(index / w);
            area++;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x);
            y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const next = ny * w + nx;
                if (!visited[next] && (!excluded || !excluded[next]) && pixels[next * 4 + 3] > 20) {
                  visited[next] = 1;
                  queue.push(next);
                }
              }
            }
          }
          if (area >= minArea) {
            components.push({
              id: components.length,
              area, x0, y0, x1, y1,
              w: x1 - x0 + 1, h: y1 - y0 + 1,
              cx: (x0 + x1) / 2, cy: (y0 + y1) / 2
            });
          }
        }
        return components;
      } catch(e) {
        return [];
      }
    },

    componentsToClusters(components, w, h) {
      if (!components || components.length === 0) return [];
      const parent = components.map((_, i) => i);
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
      for (let i = 0; i < components.length; i++) {
        for (let j = i + 1; j < components.length; j++) {
          const overlapX = Math.min(components[i].x1, components[j].x1) - Math.max(components[i].x0, components[j].x0);
          if (overlapX >= 0) unite(i, j);
        }
      }
      const groups = new Map();
      components.forEach((component, i) => {
        const root = find(i);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(component);
      });
      const padding = Math.max(2, Math.round((window.devicePixelRatio || 1) * 3));
      return Array.from(groups.values()).map(group => {
        const x0 = Math.max(0, Math.min(...group.map(c => c.x0)) - padding);
        const y0 = Math.max(0, Math.min(...group.map(c => c.y0)) - padding);
        const x1 = Math.min(w - 1, Math.max(...group.map(c => c.x1)) + padding);
        const y1 = Math.min(h - 1, Math.max(...group.map(c => c.y1)) + padding);
        return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      }).sort((a, b) => a.x0 - b.x0);
    },

    findHorizontalInkBands(w, h) {
      if (!this.ctx || w <= 0 || h <= 0) return [];
      try {
        const pixels = this.ctx.getImageData(0, 0, w, h).data;
        const dpr = window.devicePixelRatio || 1;
        const minRun = Math.max(Math.round(10 * dpr), Math.round(w * 0.025));
        const runs = [];
        let previousRow = [];
        const parent = [];
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

        for (let y = 0; y < h; y++) {
          const rowRuns = [];
          let start = -1;
          for (let x = 0; x <= w; x++) {
            const ink = x < w && pixels[(y * w + x) * 4 + 3] > 20;
            if (ink && start < 0) start = x;
            if ((!ink || x === w) && start >= 0) {
              const end = x - 1;
              if (end - start + 1 >= minRun) {
                const run = { id: runs.length, y, x0: start, x1: end, w: end - start + 1 };
                parent.push(run.id);
                runs.push(run);
                rowRuns.push(run);
                for (const previous of previousRow) {
                  const overlap = Math.min(run.x1, previous.x1) - Math.max(run.x0, previous.x0) + 1;
                  if (overlap >= Math.min(run.w, previous.w) * 0.35) unite(run.id, previous.id);
                }
              }
              start = -1;
            }
          }
          previousRow = rowRuns;
        }

        const grouped = new Map();
        for (const run of runs) {
          const root = find(run.id);
          if (!grouped.has(root)) grouped.set(root, []);
          grouped.get(root).push(run);
        }
        const minLineWidth = Math.max(Math.round(16 * dpr), Math.round(w * 0.035));
        return Array.from(grouped.values()).map((items, id) => {
          const peak = items.reduce((best, item) => item.w > best.w ? item : best, items[0]);
          const x0 = Math.min(...items.map(item => item.x0));
          const x1 = Math.max(...items.map(item => item.x1));
          const y0 = Math.min(...items.map(item => item.y));
          const y1 = Math.max(...items.map(item => item.y));
          return {
            id, x0, x1, y0, y1,
            w: x1 - x0 + 1,
            h: y1 - y0 + 1,
            cx: (x0 + x1) / 2,
            cy: (y0 + y1) / 2,
            peakWidth: peak.w
          };
        }).filter(band =>
          band.w >= minLineWidth &&
          band.h <= Math.max(Math.round(10 * dpr), band.w * 0.30)
        ).sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);
      } catch(e) {
        return [];
      }
    },

    estimateInkGlyphHeight(components) {
      const dpr = window.devicePixelRatio || 1;
      const candidates = (components || []).filter(component =>
        component.h >= 8 * dpr &&
        component.w / Math.max(1, component.h) < 2.6
      );
      if (candidates.length === 0) return Math.max(24 * dpr, this.canvas ? this.canvas.height * 0.16 : 24);
      const maxHeight = Math.max(...candidates.map(component => component.h));
      const heights = candidates
        .filter(component => component.h >= maxHeight * 0.42)
        .map(component => component.h)
        .sort((a, b) => a - b);
      return heights[Math.floor(heights.length / 2)] || maxHeight;
    },

    findFractionLayouts(w, h, components, bands) {
      if (!this.ctx || !components.length || !bands.length) return [];
      const dpr = window.devicePixelRatio || 1;
      const glyphHeight = this.estimateInkGlyphHeight(components);
      const pixels = this.ctx.getImageData(0, 0, w, h).data;
      const equalsBands = new Set();

      for (let i = 0; i < bands.length; i++) {
        for (let j = i + 1; j < bands.length; j++) {
          const a = bands[i], b = bands[j];
          const overlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1;
          const minWidth = Math.min(a.w, b.w);
          const gap = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) - 1);
          const widthRatio = minWidth / Math.max(a.w, b.w);
          if (overlap >= minWidth * 0.70 && widthRatio >= 0.65 &&
              gap >= Math.max(1, dpr) && gap <= glyphHeight * 0.35) {
            equalsBands.add(a.id);
            equalsBands.add(b.id);
          }
        }
      }

      const hasImmediateVerticalBridge = (band) => {
        const reach = Math.max(3, Math.round(glyphHeight * 0.08));
        for (let x = band.x0; x <= band.x1; x++) {
          let above = false, below = false;
          for (let dx = -1; dx <= 1 && !(above && below); dx++) {
            const px = x + dx;
            if (px < 0 || px >= w) continue;
            for (let y = Math.max(0, band.y0 - reach); y < band.y0; y++) {
              if (pixels[(y * w + px) * 4 + 3] > 20) { above = true; break; }
            }
            for (let y = band.y1 + 1; y <= Math.min(h - 1, band.y1 + reach); y++) {
              if (pixels[(y * w + px) * 4 + 3] > 20) { below = true; break; }
            }
          }
          if (above && below) return true;
        }
        return false;
      };

      const candidates = [];
      const minFractionWidth = Math.max(16 * dpr, glyphHeight * 0.48);
      for (const band of bands) {
        if (equalsBands.has(band.id) || band.w < minFractionWidth) continue;
        const verticalBridge = hasImmediateVerticalBridge(band);
        const hostComponents = components.filter(component =>
          component.y0 <= band.cy && component.y1 >= band.cy &&
          Math.min(component.x1, band.x1) - Math.max(component.x0, band.x0) + 1 >= band.w * 0.45
        );
        if (hostComponents.length > 0) {
          const narrowestHost = Math.min(...hostComponents.map(component => component.w));
          if (band.w / Math.max(1, narrowestHost) < 0.70) continue;
        }
        const cutPadding = Math.max(1, Math.round(1.5 * dpr));
        const cut = {
          x0: band.x0 - cutPadding,
          x1: band.x1 + cutPadding,
          y0: band.y0 - cutPadding,
          y1: band.y1 + cutPadding
        };
        const splitComponents = this.getInkComponents(w, h, [cut]);
        const xTolerance = Math.max(4 * dpr, band.w * 0.20);
        const maxDistance = Math.max(glyphHeight * 1.35, band.w * 1.70);
        const inHorizontalRange = component =>
          component.cx >= band.x0 - xTolerance && component.cx <= band.x1 + xTolerance;
        const numerator = splitComponents.filter(component =>
          inHorizontalRange(component) && component.y1 < cut.y0 && cut.y0 - component.y1 <= maxDistance
        );
        const denominator = splitComponents.filter(component =>
          inHorizontalRange(component) && component.y0 > cut.y1 && component.y0 - cut.y1 <= maxDistance
        );
        const substantive = component =>
          component.h >= Math.max(5 * dpr, glyphHeight * 0.18) &&
          component.w / Math.max(1, component.h) < 4;
        if (!numerator.some(substantive) || !denominator.some(substantive)) continue;

        const denominatorGap = Math.min(...denominator.map(component => component.y0)) - band.y1;
        if (denominatorGap < Math.max(2, Math.round(dpr))) continue;
        const all = [...numerator, ...denominator];
        const x0 = Math.min(band.x0, ...all.map(component => component.x0));
        const x1 = Math.max(band.x1, ...all.map(component => component.x1));
        const y0 = Math.min(...numerator.map(component => component.y0));
        const y1 = Math.max(...denominator.map(component => component.y1));
        if (verticalBridge && denominatorGap <= Math.max(3 * dpr, band.h * 0.50)) continue;
        if (y1 - y0 + 1 < band.w * 1.25) continue;
        candidates.push({
          band, numerator, denominator, x0, x1, y0, y1,
          w: x1 - x0 + 1,
          h: y1 - y0 + 1,
          score: band.w + numerator.reduce((sum, component) => sum + component.area, 0) +
            denominator.reduce((sum, component) => sum + component.area, 0)
        });
      }

      const selected = [];
      for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
        const duplicate = selected.some(existing => {
          const overlapX = Math.max(0, Math.min(candidate.x1, existing.x1) - Math.max(candidate.x0, existing.x0) + 1);
          const overlapY = Math.max(0, Math.min(candidate.y1, existing.y1) - Math.max(candidate.y0, existing.y0) + 1);
          const overlapArea = overlapX * overlapY;
          return overlapArea > Math.min(candidate.w * candidate.h, existing.w * existing.h) * 0.35;
        });
        if (!duplicate) selected.push(candidate);
      }
      return selected.sort((a, b) => a.x0 - b.x0);
    },

    findRadicalLayouts(w, h, components, bands) {
      if (!components.length || !bands.length) return [];
      const dpr = window.devicePixelRatio || 1;
      const glyphHeight = this.estimateInkGlyphHeight(components);
      const minimumBarWidth = Math.max(18 * dpr, glyphHeight * 0.80);
      const candidates = [];

      for (const band of bands) {
        if (band.w < minimumBarWidth) continue;
        const hosts = components.filter(component => {
          const overlap = Math.min(component.x1, band.x1) - Math.max(component.x0, band.x0) + 1;
          const leftExtension = band.x0 - component.x0;
          return component.y0 <= band.cy && component.y1 >= band.cy &&
            overlap >= band.w * 0.65 &&
            component.h >= glyphHeight * 0.75 &&
            leftExtension >= glyphHeight * 0.12 &&
            component.y1 >= band.y1 + glyphHeight * 0.55 &&
            band.cy <= component.y0 + component.h * 0.28;
        }).sort((a, b) =>
          (band.x0 - b.x0) + (b.y1 - band.y1) -
          ((band.x0 - a.x0) + (a.y1 - band.y1))
        );
        if (hosts.length === 0) continue;

        const host = hosts[0];
        const xTolerance = Math.max(3 * dpr, glyphHeight * 0.08);
        const maximumBottom = Math.max(host.y1 + glyphHeight * 0.25, band.y1 + glyphHeight * 1.65);
        const radicand = components.filter(component =>
          component.id !== host.id &&
          component.cx >= band.x0 - xTolerance && component.cx <= band.x1 + xTolerance &&
          component.y0 >= band.y1 + Math.max(2 * dpr, glyphHeight * 0.08) &&
          component.y1 <= maximumBottom &&
          component.h >= Math.max(6 * dpr, glyphHeight * 0.20) &&
          component.w / Math.max(1, component.h) < 2.6
        );
        if (radicand.length === 0) continue;

        candidates.push({
          band, host, radicand,
          x0: host.x0,
          x1: Math.max(band.x1, ...radicand.map(component => component.x1)),
          y0: Math.min(host.y0, band.y0),
          y1: Math.max(host.y1, ...radicand.map(component => component.y1)),
          score: band.w + radicand.reduce((sum, component) => sum + component.area, 0)
        });
      }

      const selected = [];
      for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
        if (!selected.some(existing => existing.host.id === candidate.host.id)) selected.push(candidate);
      }
      return selected.sort((a, b) => a.x0 - b.x0);
    },

    segmentStrokeClusters(w, h, strokeIndexes = null) {
      if (!this.strokeTrackingValid || this.strokes.length === 0) return [];
      const dpr = window.devicePixelRatio || 1;
      const selectedStrokes = strokeIndexes
        ? strokeIndexes.map(index => this.strokes[index])
        : this.strokes;
      const boxes = selectedStrokes.map(points => {
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
      // Leave room for equals signs whose two strokes are spaced unusually
      // far apart; the two-band checks below still reject tall digits.
      if (!cl || cl.w < 8 || cl.w / Math.max(1, cl.h) < 0.90) return false;
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
        let blankRun = 0, longestBlankRun = 0;
        for (let y = bands[0].y1 + 1; y < bands[1].y0; y++) {
          if (rowCounts[y] === 0) {
            blankRun++;
            longestBlankRun = Math.max(longestBlankRun, blankRun);
          } else {
            blankRun = 0;
          }
        }
        // The strokes of '=' are genuinely disconnected, leaving at least
        // one completely blank row. A wide handwritten 2 can also have two
        // strong horizontal bands, but its diagonal keeps every middle row
        // connected with ink.
        return gap > 0 && longestBlankRun > 0 &&
          firstHeight < cl.h * 0.45 && secondHeight < cl.h * 0.45;
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
      // Handwritten dots are often small circles rather than taps, so allow a
      // footprint up to twice the minimum line length.
      const dots = candidates.filter(s => s.w < minLength * 2 && s.h < minLength * 2);

      if (vertical.length === 1 && dots.length === 1 && candidates.length === 2) {
        return dots[0].cy < vertical[0].y0 ? 'i' : '!';
      }
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
        let inkCount = 0;
        for (let y = 0; y < cl.h; y++) {
          for (let x = 0; x < cl.w; x++) {
            if (data[(y * cl.w + x) * 4 + 3] > 20) {
              rows[y]++;
              cols[x]++;
              inkCount++;
            }
          }
        }
        let rowIndex = 0, colIndex = 0;
        for (let y = 1; y < rows.length; y++) if (rows[y] > rows[rowIndex]) rowIndex = y;
        for (let x = 1; x < cols.length; x++) if (cols[x] > cols[colIndex]) colIndex = x;
        const centralRow = rowIndex / cl.h > 0.18 && rowIndex / cl.h < 0.82;
        const centralCol = colIndex / cl.w > 0.18 && colIndex / cl.w < 0.82;
        const axisRadius = Math.max(1, Math.round(Math.min(cl.w, cl.h) * 0.07));
        let upperLeftOffAxisInk = 0;
        for (let y = 0; y < rowIndex - axisRadius; y++) {
          for (let x = 0; x < colIndex - axisRadius; x++) {
            if (data[(y * cl.w + x) * 4 + 3] > 20) upperLeftOffAxisInk++;
          }
        }
        // A handwritten 4 can have the same dominant row and column as '+',
        // but its long diagonal leaves substantial ink above-left of both axes.
        const hasFourLikeDiagonalArm = inkCount > 0 && upperLeftOffAxisInk / inkCount > 0.16;
        return centralRow && centralCol && !hasFourLikeDiagonalArm &&
          rows[rowIndex] / cl.w > 0.62 && cols[colIndex] / cl.h > 0.62;
      } catch(e) {
        return false;
      }
    },

    isRasterMultiplicationCluster(cl) {
      if (!cl || !this.ctx) return false;
      const metric = this.getClusterInkMetrics(cl);
      const aspect = metric.w / Math.max(1, metric.h);
      if (metric.area < 12 || aspect < 0.65 || aspect > 1.55) return false;
      const shape = this.analyzeClusterShape(cl);
      if (shape.holes.length > 0) return false;
      try {
        const data = this.ctx.getImageData(metric.x0, metric.y0, metric.w, metric.h).data;
        let ink = 0, diagonalInk = 0;
        for (let y = 0; y < metric.h; y++) {
          for (let x = 0; x < metric.w; x++) {
            if (data[(y * metric.w + x) * 4 + 3] <= 20) continue;
            ink++;
            const nx = x / Math.max(1, metric.w - 1);
            const ny = y / Math.max(1, metric.h - 1);
            if (Math.min(Math.abs(nx - ny), Math.abs(nx + ny - 1)) <= 0.14) diagonalInk++;
          }
        }
        return ink > 0 && diagonalInk / ink >= 0.57;
      } catch(e) {
        return false;
      }
    },

    hasFourLikeUpperArms(cl) {
      if (!cl || !this.ctx || cl.w < 4 || cl.h < 8) return false;
      try {
        const data = this.ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h).data;
        const rows = new Int32Array(cl.h);
        for (let y = 0; y < cl.h; y++) {
          for (let x = 0; x < cl.w; x++) {
            if (data[(y * cl.w + x) * 4 + 3] > 20) rows[y]++;
          }
        }
        let rowIndex = 0;
        for (let y = 1; y < rows.length; y++) if (rows[y] > rows[rowIndex]) rowIndex = y;
        const denseCutoff = cl.w * 0.62;
        let bandStart = rowIndex;
        while (bandStart > 0 && rows[bandStart - 1] > denseCutoff) bandStart--;

        const dpr = window.devicePixelRatio || 1;
        const minRunWidth = Math.max(1, Math.round(1.5 * dpr));
        const minGap = Math.max(2, Math.round(2 * dpr));
        let upperInkRows = 0, splitUpperRows = 0;
        for (let y = 0; y < bandStart; y++) {
          const runs = [];
          let x = 0;
          while (x < cl.w) {
            while (x < cl.w && data[(y * cl.w + x) * 4 + 3] <= 20) x++;
            const start = x;
            while (x < cl.w && data[(y * cl.w + x) * 4 + 3] > 20) x++;
            if (x - start >= minRunWidth) runs.push({ start, end: x - 1 });
          }
          if (runs.length === 0) continue;
          upperInkRows++;
          if (runs.some((run, index) =>
            index > 0 && run.start - runs[index - 1].end - 1 >= minGap
          )) splitUpperRows++;
        }
        return upperInkRows >= Math.max(6, Math.round(6 * dpr)) &&
          splitUpperRows >= Math.max(4, Math.round(4 * dpr)) &&
          splitUpperRows / upperInkRows >= 0.35;
      } catch(e) {
        return false;
      }
    },

    analyzeClusterShape(cl) {
      if (!cl || !this.ctx || cl.w < 1 || cl.h < 1) {
        return { narrowOne: false, holes: [], bottomEdgeWidthRatio: 0, lowerInkWidthRatio: 0, inkAspectRatio: 0 };
      }
      try {
        const src = this.ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h).data;
        const pw = cl.w + 2;
        const ph = cl.h + 2;
        const ink = new Uint8Array(pw * ph);
        const rowCounts = new Int32Array(cl.h);
        let minInkX = cl.w, maxInkX = -1, minInkY = cl.h, maxInkY = -1;
        for (let y = 0; y < cl.h; y++) {
          for (let x = 0; x < cl.w; x++) {
            if (src[(y * cl.w + x) * 4 + 3] > 20) {
              ink[(y + 1) * pw + x + 1] = 1;
              rowCounts[y]++;
              minInkX = Math.min(minInkX, x); maxInkX = Math.max(maxInkX, x);
              minInkY = Math.min(minInkY, y); maxInkY = Math.max(maxInkY, y);
            }
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

        const inkWidth = Math.max(1, maxInkX - minInkX + 1);
        const inkHeight = Math.max(1, maxInkY - minInkY + 1);
        const bottomRows = Math.max(1, Math.ceil(inkHeight * 0.12));
        let bottomEdgeWidth = 0;
        for (let y = Math.max(minInkY, maxInkY - bottomRows + 1); y <= maxInkY; y++) {
          bottomEdgeWidth = Math.max(bottomEdgeWidth, rowCounts[y] || 0);
        }
        let lowerMinX = cl.w, lowerMaxX = -1;
        const lowerStartY = minInkY + Math.floor(inkHeight * 0.60);
        for (let y = lowerStartY; y <= maxInkY; y++) {
          for (let x = minInkX; x <= maxInkX; x++) {
            if (ink[(y + 1) * pw + x + 1]) {
              lowerMinX = Math.min(lowerMinX, x);
              lowerMaxX = Math.max(lowerMaxX, x);
            }
          }
        }
        const lowerInkWidth = lowerMaxX >= lowerMinX ? lowerMaxX - lowerMinX + 1 : 0;

        return {
          // Keep this deliberately strict: a handwritten 2 can also have a
          // narrow column footprint when its strokes do not overlap perfectly.
          narrowOne: cl.w / Math.max(1, cl.h) < 0.18 && holes.length === 0,
          holes: holes.sort((a, b) => b.area - a.area),
          bottomEdgeWidthRatio: bottomEdgeWidth / inkWidth,
          lowerInkWidthRatio: lowerInkWidth / inkWidth,
          inkAspectRatio: inkWidth / inkHeight
        };
      } catch(e) {
        return { narrowOne: false, holes: [], bottomEdgeWidthRatio: 0, lowerInkWidthRatio: 0, inkAspectRatio: 0 };
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
      // A flat, full-width final stroke is categorical evidence for an open 2,
      // while an 8 needs at least one enclosed loop. This also handles small
      // superscript 2s that are out-of-distribution for the digit model.
      if (prediction.digit === '8' && shape.holes.length === 0 && shape.bottomEdgeWidthRatio >= 0.62) {
        return '2';
      }
      // A closed lower bowl distinguishes a looped 6 from an open 5. Keep the
      // model for every other 5/6 shape so this rule cannot rewrite open glyphs.
      if (prediction.digit === '5' && shape.holes.some(hole => hole.centerY >= 0.45)) {
        return '6';
      }
      // An open 5 sometimes lands near 9 in the model when canvas antialiasing
      // thins its middle stroke. A 9 has an upper loop and ends in a narrow
      // tail; only choose 5 when there is no loop and the glyph has a broad
      // lower finishing stroke.
      if (prediction.digit === '9' && shape.holes.length === 0 &&
          shape.lowerInkWidthRatio >= 0.70 && shape.inkAspectRatio <= 0.75) {
        return '5';
      }
      return prediction.digit;
    },

    formatRecognizedTokens(tokens) {
      const cleanTokens = (tokens || []).map(token => String(token || '').trim()).filter(Boolean);
      let expression = '';
      let previous = '';
      for (const token of cleanTokens) {
        const previousIsDigits = /^\d+$/.test(previous);
        const tokenIsDigits = /^\d+$/.test(token);
        const previousIsNumericFragment = /^(?:\d+(?:\.\d*)?|\.\d+|\.)$/.test(previous);
        const tokenStartsDecimal = /^\.\d+$/.test(token);
        const joinsPreviousNumber =
          (previousIsNumericFragment && tokenIsDigits) ||
          (previousIsDigits && (token === '.' || tokenStartsDecimal));
        expression += expression && !joinsPreviousNumber ? ` ${token}` : token;
        previous = token;
      }
      return expression;
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

      let rightVal = rightChars.map(c => c.text).join('').replace(/[^0-9.+\-*×÷^!√()i]/g, '') || 'i';

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

      text = text.replace(/[^0-9.+\-*×÷=^!√()iΣ_{}]/g, '');
      return text;
    },

    getClusterInkMetrics(cl) {
      if (!cl) {
        return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0, cx: 0, cy: 0, area: 0, fillRatio: 0 };
      }
      const empty = {
        x0: cl.x0, y0: cl.y0, x1: cl.x1, y1: cl.y1,
        w: cl.w, h: cl.h, cx: (cl.x0 + cl.x1) / 2,
        cy: (cl.y0 + cl.y1) / 2, area: 0, fillRatio: 0
      };
      if (!this.ctx || cl.w < 1 || cl.h < 1) return empty;
      try {
        const pixels = this.ctx.getImageData(cl.x0, cl.y0, cl.w, cl.h).data;
        let x0 = cl.w, y0 = cl.h, x1 = -1, y1 = -1, area = 0;
        for (let y = 0; y < cl.h; y++) {
          for (let x = 0; x < cl.w; x++) {
            if (pixels[(y * cl.w + x) * 4 + 3] <= 20) continue;
            area++;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x);
            y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          }
        }
        if (area === 0) return empty;
        const w = x1 - x0 + 1;
        const h = y1 - y0 + 1;
        const globalX0 = cl.x0 + x0;
        const globalY0 = cl.y0 + y0;
        const globalX1 = cl.x0 + x1;
        const globalY1 = cl.y0 + y1;
        return {
          x0: globalX0, y0: globalY0, x1: globalX1, y1: globalY1,
          w, h, cx: (globalX0 + globalX1) / 2, cy: (globalY0 + globalY1) / 2,
          area, fillRatio: area / Math.max(1, w * h)
        };
      } catch(e) {
        return empty;
      }
    },

    analyzeRecognitionLayout(clusters) {
      const metrics = (clusters || []).map(cluster => this.getClusterInkMetrics(cluster));
      const compactDotIndexes = new Set();
      if (metrics.length < 3) return { metrics, compactDotIndexes, glyphHeight: 0, baselineY: 0 };

      const dpr = window.devicePixelRatio || 1;
      const usable = metrics.filter(metric =>
        metric.area > 0 && metric.h >= Math.max(5, 6 * dpr)
      );
      if (usable.length < 2) return { metrics, compactDotIndexes, glyphHeight: 0, baselineY: 0 };

      const maxHeight = Math.max(...usable.map(metric => metric.h));
      const primary = usable.filter(metric => metric.h >= maxHeight * 0.55);
      const heights = primary.map(metric => metric.h).sort((a, b) => a - b);
      const glyphHeight = heights[Math.floor(heights.length / 2)] || maxHeight;
      const baselineGlyphs = usable.filter(metric => metric.h >= glyphHeight * 0.65);
      const bottoms = baselineGlyphs.map(metric => metric.y1).sort((a, b) => a - b);
      const baselineY = bottoms[Math.floor(bottoms.length / 2)] || 0;
      const areas = baselineGlyphs.map(metric => metric.area).sort((a, b) => a - b);
      const medianArea = areas[Math.floor(areas.length / 2)] || glyphHeight * glyphHeight;
      const maximumDotSize = Math.max(12 * dpr, glyphHeight * 0.30);
      const minimumDotSize = Math.max(2 * dpr, glyphHeight * 0.06);
      const maximumDotArea = Math.max(medianArea * 0.18, glyphHeight * glyphHeight * 0.045);

      metrics.forEach((metric, index) => {
        const aspect = metric.w / Math.max(1, metric.h);
        if (metric.area > 0 &&
            metric.w >= minimumDotSize && metric.h >= minimumDotSize &&
            metric.w <= maximumDotSize && metric.h <= maximumDotSize &&
            metric.area <= maximumDotArea && metric.fillRatio >= 0.12 &&
            aspect >= 0.40 && aspect <= 2.40) {
          compactDotIndexes.add(index);
        }
      });
      return { metrics, compactDotIndexes, glyphHeight, baselineY };
    },

    async recognizeClusters(clusters, preparedLayout = null) {
      const recognizedParts = new Array(clusters.length).fill('');
      const layout = preparedLayout || this.analyzeRecognitionLayout(clusters);
      for (let index = 0; index < clusters.length; index++) {
        const cl = clusters[index];
        if (layout.compactDotIndexes.has(index)) {
          // Preserve a positively identified composite stroke such as i, ! or
          // ÷ before applying contextual decimal-point geometry.
          recognizedParts[index] = this.classifyStrokeSymbol(cl);
          continue;
        }
        const rasterEquals = this.isEqualsSignCluster(cl, this.ctx);
        const strokeSymbol = this.classifyStrokeSymbol(cl);
        // A multi-stroke 2 can contain two nearly horizontal pen strokes. Do
        // not let that loose stroke heuristic bypass the digit model: '=' must
        // also have two visibly disconnected raster bands.
        if (strokeSymbol && strokeSymbol !== '+' &&
            (strokeSymbol !== '=' || rasterEquals)) {
          recognizedParts[index] = strokeSymbol;
          continue;
        }
        if (rasterEquals) {
          recognizedParts[index] = '=';
          continue;
        }

        const shape = this.analyzeClusterShape(cl);
        const digitPrediction = this.predictDigit(cl);
        const predictedDigit = this.resolveDigitFromShape(digitPrediction, shape);
        // Looped digits can have dense central rows and columns, but a plus or
        // multiplication cross cannot enclose a hole.
        const rasterCross = shape.holes.length === 0 && this.isRasterCrossCluster(cl);
        const topologyCorrected = digitPrediction && predictedDigit !== digitPrediction.digit;
        // A handwritten 4 may look like a cross both in its raster and in the
        // original stroke list.  Strong digit evidence plus two separated
        // upper arms is specific to 4, while real plus signs have one upper arm.
        const strongFourEvidence = digitPrediction && predictedDigit === '4' &&
          digitPrediction.confidence >= 0.64 && digitPrediction.margin >= 0.12 &&
          this.hasFourLikeUpperArms(cl);

        if ((strokeSymbol === '+' || rasterCross) && !strongFourEvidence) {
          recognizedParts[index] = '+';
          continue;
        }
        if (cl.w / Math.max(1, cl.h) > 2.2) {
          recognizedParts[index] = '-';
          continue;
        }
        if (digitPrediction &&
            (topologyCorrected || (digitPrediction.confidence >= 0.64 && digitPrediction.margin >= 0.12))) {
          recognizedParts[index] = predictedDigit;
          continue;
        }
        if (!window.Tesseract) {
          recognizedParts[index] = predictedDigit || '?';
          continue;
        }

        const croppedCanvas = this.cropClusterToCanvas(cl);
        const isTwoDimensional = cl.h > this.canvas.height * 0.28;
        const res = await window.Tesseract.recognize(croppedCanvas, 'eng', {
          tessedit_char_whitelist: '0123456789.+-*xX/÷=()!^vVΣEWMlimi_{}',
          tessedit_pageseg_mode: isTwoDimensional ? '6' : '10',
          preserve_interword_spaces: '1'
        });
        const spatialResult = this.parse2DSpatialOCR(res);
        if (spatialResult) {
          recognizedParts[index] = spatialResult;
          continue;
        }
        const cleaned = this.cleanOCRText(res.data.text || '');
        const recognizedDecimal = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned);
        const recognizedOperator = cleaned.replace(/[0-9.]/g, '');
        const onlyParentheses = /^[()]+$/.test(recognizedOperator);
        const broadOrLoopedDigit = cl.w / Math.max(1, cl.h) >= 0.55 || shape.holes.length > 0;
        if (recognizedDecimal) {
          recognizedParts[index] = cleaned;
        }
        else if (recognizedOperator && !(onlyParentheses && predictedDigit && broadOrLoopedDigit)) {
          recognizedParts[index] = recognizedOperator;
        }
        else if (predictedDigit) recognizedParts[index] = predictedDigit;
        else recognizedParts[index] = '?';
      }

      const numericToken = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
      for (const index of layout.compactDotIndexes) {
        if (recognizedParts[index]) continue;
        const metric = layout.metrics[index];
        const left = layout.metrics
          .map((item, itemIndex) => ({ item, itemIndex }))
          .filter(entry => entry.itemIndex !== index && entry.item.x1 < metric.x0)
          .sort((a, b) => b.item.x1 - a.item.x1)[0];
        const right = layout.metrics
          .map((item, itemIndex) => ({ item, itemIndex }))
          .filter(entry => entry.itemIndex !== index && entry.item.x0 > metric.x1)
          .sort((a, b) => a.item.x0 - b.item.x0)[0];
        if (!left || !right ||
            !numericToken.test(recognizedParts[left.itemIndex]) ||
            !numericToken.test(recognizedParts[right.itemIndex])) {
          recognizedParts[index] = '?';
          continue;
        }

        const localHeight = (left.item.h + right.item.h) / 2;
        const localBaseline = (left.item.y1 + right.item.y1) / 2;
        const leftGap = metric.x0 - left.item.x1 - 1;
        const rightGap = right.item.x0 - metric.x1 - 1;
        const neighboursAreFullSize =
          left.item.h >= layout.glyphHeight * 0.65 &&
          right.item.h >= layout.glyphHeight * 0.65;
        const neighboursShareBaseline = Math.abs(left.item.y1 - right.item.y1) <= localHeight * 0.35;
        const closeToNeighbours =
          leftGap >= 0 && rightGap >= 0 &&
          leftGap <= localHeight * 0.75 && rightGap <= localHeight * 0.75;
        const decimalPosition =
          metric.cy >= localBaseline - localHeight * 0.30 &&
          metric.cy <= localBaseline + localHeight * 0.18 &&
          metric.y1 >= localBaseline - localHeight * 0.20;
        const multiplicationPosition =
          metric.cy >= localBaseline - localHeight * 0.68 &&
          metric.cy <= localBaseline - localHeight * 0.38;

        if (neighboursAreFullSize && neighboursShareBaseline && closeToNeighbours && decimalPosition) {
          recognizedParts[index] = '.';
        } else if (neighboursAreFullSize && neighboursShareBaseline && closeToNeighbours && multiplicationPosition) {
          recognizedParts[index] = '×';
        } else {
          // Never let an ambiguous compact mark fall through to the digit
          // model, where a dot is easily normalized into an 8 and then a 2.
          recognizedParts[index] = '?';
        }
      }
      return recognizedParts;
    },

    async tryRecognizeStructuredMath(w, h) {
      const components = this.getInkComponents(w, h);
      if (components.length < 2) return '';
      const bands = this.findHorizontalInkBands(w, h);
      const fractions = this.findFractionLayouts(w, h, components, bands);
      const radicals = this.findRadicalLayouts(w, h, components, bands);
      const usedComponentIds = new Set();

      for (const radical of radicals) {
        usedComponentIds.add(radical.host.id);
        radical.radicand.forEach(component => usedComponentIds.add(component.id));
      }

      for (const fraction of fractions) {
        const xPadding = Math.max(2, fraction.w * 0.08);
        for (const component of components) {
          const insideX = component.cx >= fraction.x0 - xPadding && component.cx <= fraction.x1 + xPadding;
          const overlapsY = component.y1 >= fraction.y0 && component.y0 <= fraction.y1;
          if (insideX && overlapsY) usedComponentIds.add(component.id);
        }
      }

      const remaining = components.filter(component => !usedComponentIds.has(component.id));
      const dpr = window.devicePixelRatio || 1;
      const glyphHeight = this.estimateInkGlyphHeight(remaining.length ? remaining : components);
      const glyphLike = remaining.filter(component =>
        component.h >= Math.max(7 * dpr, glyphHeight * 0.25) &&
        component.w / Math.max(1, component.h) < 2.6
      );
      const tallGlyphs = glyphLike.filter(component => component.h >= glyphHeight * 0.72);
      const baselineY = tallGlyphs.length > 0
        ? tallGlyphs.map(component => component.y1).sort((a, b) => a - b)[Math.floor(tallGlyphs.length / 2)]
        : 0;
      const exponentIds = new Set();
      const exponentAttachments = [];

      if (baselineY > 0) {
        const exponentCandidates = glyphLike.filter(component =>
          component.h <= glyphHeight * 0.72 &&
          component.y1 < baselineY - glyphHeight * 0.25
        );
        for (const exponent of exponentCandidates) {
          const bases = tallGlyphs.filter(base =>
            base.id !== exponent.id &&
            exponent.cx > base.cx &&
            exponent.x0 <= base.x1 + glyphHeight * 0.65 &&
            exponent.x1 >= base.cx &&
            // Superscripts often overlap the upper quarter of a rounded base
            // such as 8, but must still start above the base and finish close
            // to its top edge. Ordinary adjacent digits fail both constraints.
            exponent.y0 < base.y0 &&
            exponent.y1 <= base.y0 + glyphHeight * 0.18
          ).sort((a, b) => Math.abs(exponent.x0 - a.x1) - Math.abs(exponent.x0 - b.x1));
          if (bases.length === 0) continue;
          exponentIds.add(exponent.id);
          exponentAttachments.push({ base: bases[0], exponent });
        }
      }

      const mainComponents = remaining.filter(component => !exponentIds.has(component.id));
      const mainClusters = this.componentsToClusters(mainComponents, w, h);
      const mainLayout = this.analyzeRecognitionLayout(mainClusters);
      if (fractions.length === 0 && radicals.length === 0 && exponentAttachments.length === 0 &&
          mainLayout.compactDotIndexes.size === 0) return '';

      const nodes = [];
      for (const radical of radicals) {
        const radicandClusters = this.componentsToClusters(radical.radicand, w, h);
        const radicandTokens = await this.recognizeClusters(radicandClusters);
        for (let index = 1; index < radicandTokens.length - 1; index++) {
          if (/^[0-9]+$/.test(radicandTokens[index - 1] || '') &&
              /^[0-9]+$/.test(radicandTokens[index + 1] || '') &&
              this.isRasterMultiplicationCluster(radicandClusters[index])) {
            radicandTokens[index] = '×';
          }
        }
        const radicand = radicandTokens.join('').replace(/\?/g, '');
        if (!radicand) continue;
        const simpleRadicand = /^[0-9i.]+$/.test(radicand);
        nodes.push({
          x0: radical.x0,
          x1: radical.x1,
          text: `√${simpleRadicand ? radicand : `(${radicand})`}`
        });
      }
      for (const fraction of fractions) {
        const numeratorTokens = await this.recognizeClusters(this.componentsToClusters(fraction.numerator, w, h));
        const denominatorTokens = await this.recognizeClusters(this.componentsToClusters(fraction.denominator, w, h));
        const numerator = numeratorTokens.join('').replace(/\?/g, '');
        const denominator = denominatorTokens.join('').replace(/\?/g, '');
        if (!numerator || !denominator) continue;
        const simpleNumerator = /^[0-9i.]+$/.test(numerator);
        const simpleDenominator = /^[0-9i.]+$/.test(denominator);
        const text = `${simpleNumerator ? numerator : `(${numerator})`}/${simpleDenominator ? denominator : `(${denominator})`}`;
        nodes.push({ x0: fraction.x0, x1: fraction.x1, text });
      }

      const mainTokens = await this.recognizeClusters(mainClusters, mainLayout);
      for (let clusterIndex = 0; clusterIndex < mainClusters.length; clusterIndex++) {
        const cluster = mainClusters[clusterIndex];
        let text = mainTokens[clusterIndex] || '';
        const attached = exponentAttachments
          .filter(item => item.base.cx >= cluster.x0 && item.base.cx <= cluster.x1)
          .map(item => item.exponent)
          .sort((a, b) => a.x0 - b.x0);
        if (attached.length > 0) {
          const exponentTokens = [];
          for (const exponentCluster of this.componentsToClusters(attached, w, h)) {
            const exponentShape = this.analyzeClusterShape(exponentCluster);
            const exponentPrediction = this.predictDigit(exponentCluster);
            // A tiny handwritten 2 can close its upper hook into a small loop.
            // Limit this override to the superscript role so an ordinary 8 can
            // never be rewritten merely because its lower loop is open.
            if (exponentPrediction && ['2', '8', '9'].includes(exponentPrediction.digit) &&
                exponentShape.bottomEdgeWidthRatio >= 0.62 &&
                exponentShape.holes.every(hole => hole.centerY < 0.45)) {
              exponentTokens.push('2');
            } else {
              exponentTokens.push(...await this.recognizeClusters([exponentCluster]));
            }
          }
          const exponent = exponentTokens.join('').replace(/[^0-9]/g, '');
          if (exponent) text += exponent.length === 1 ? `^${exponent}` : `^(${exponent})`;
        }
        if (text) nodes.push({ x0: cluster.x0, x1: cluster.x1, text });
      }

      return this.formatRecognizedTokens(nodes.sort((a, b) => a.x0 - b.x0).map(node => node.text));
    },

    async tryRecognizeRasterSigma(w, h) {
      const components = this.getInkComponents(w, h);
      if (components.length < 5) return '';
      const dpr = window.devicePixelRatio || 1;

      // Merge only components that are genuinely close in both dimensions.
      // This can rebuild a multi-stroke Sigma but cannot merge vertically
      // separated upper/lower limits as the old x-overlap grouping did.
      const parent = components.map((_, i) => i);
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
      const tolerance = Math.max(2, Math.round(3 * dpr));
      for (let i = 0; i < components.length; i++) {
        for (let j = i + 1; j < components.length; j++) {
          const gapX = Math.max(0, Math.max(components[i].x0, components[j].x0) - Math.min(components[i].x1, components[j].x1));
          const gapY = Math.max(0, Math.max(components[i].y0, components[j].y0) - Math.min(components[i].y1, components[j].y1));
          if (gapX <= tolerance && gapY <= tolerance) unite(i, j);
        }
      }
      const grouped = new Map();
      components.forEach((component, i) => {
        const root = find(i);
        if (!grouped.has(root)) grouped.set(root, []);
        grouped.get(root).push(component);
      });
      const groups = Array.from(grouped.values()).map(items => {
        const x0 = Math.min(...items.map(c => c.x0));
        const x1 = Math.max(...items.map(c => c.x1));
        const y0 = Math.min(...items.map(c => c.y0));
        const y1 = Math.max(...items.map(c => c.y1));
        return {
          componentIds: items.map(c => c.id),
          area: items.reduce((sum, c) => sum + c.area, 0),
          x0, x1, y0, y1,
          w: x1 - x0 + 1, h: y1 - y0 + 1,
          cx: (x0 + x1) / 2, cy: (y0 + y1) / 2
        };
      });

      const candidates = groups.filter(group => {
        const aspect = group.w / Math.max(1, group.h);
        return group.cx < w * 0.55 &&
          group.w > Math.max(28 * dpr, w * 0.09) &&
          group.h > Math.max(22 * dpr, h * 0.075) &&
          aspect > 0.82 && aspect < 2.7;
      }).sort((a, b) => b.w * b.h - a.w * a.h);

      for (const sigma of candidates) {
        const sigmaIds = new Set(sigma.componentIds);
        const top = [], bottom = [], right = [];
        for (const component of components) {
          if (sigmaIds.has(component.id)) continue;
          const nearTopX = component.cx > sigma.x0 - sigma.w * 0.15 && component.cx < sigma.x1 + sigma.w * 0.2;
          const nearBottomX = component.cx > sigma.x0 - sigma.w * 0.25 && component.cx < sigma.x1 + sigma.w * 0.5;
          if (nearTopX && component.y1 <= sigma.y0 - sigma.h * 0.08) {
            top.push(component);
          } else if (nearBottomX &&
                     component.y0 >= sigma.y1 + sigma.h * 0.10 &&
                     component.cy <= sigma.y1 + sigma.h * 1.3) {
            bottom.push(component);
          } else if (component.cx >= sigma.x1 + sigma.w * 0.10 &&
                     component.cy >= sigma.y0 - sigma.h * 0.28 &&
                     component.cy <= sigma.y1 + sigma.h * 0.22) {
            right.push(component);
          }
        }
        // Requiring independent ink both above and below is what prevents an
        // ordinary one-line 5+3=8 from ever becoming a summation layout.
        if (top.length === 0 || bottom.length === 0 || right.length === 0) continue;

        const topTokens = await this.recognizeClusters(this.componentsToClusters(top, w, h));
        const bottomTokens = await this.recognizeClusters(this.componentsToClusters(bottom, w, h));
        const rightTokens = await this.recognizeClusters(this.componentsToClusters(right, w, h));
        const upper = topTokens.join('').replace(/[^0-9]/g, '');
        const bottomText = bottomTokens.join('');
        const lowerMatch = bottomText.match(/(?:i|1)?=?([0-9]+)/);
        let rightText = rightTokens.join('').replace(/[^0-9.+\-×÷=^!√()i]/g, '');
        if (/^1=/.test(rightText)) rightText = `i${rightText.slice(1)}`;
        return `Σ_{i=${lowerMatch ? lowerMatch[1] : '?'}}^{${upper || '?'}} ${rightText || '?'}`;
      }
      return '';
    },

    async tryRecognizeSpatialSigma(w, h) {
      if (!this.strokeTrackingValid || this.strokes.length < 4) return '';
      const dpr = window.devicePixelRatio || 1;
      const strokeBoxes = this.strokes.map((points, index) => {
        if (!points || points.length === 0) return null;
        const xs = points.map(p => p.x * dpr);
        const ys = points.map(p => p.y * dpr);
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const y0 = Math.min(...ys), y1 = Math.max(...ys);
        return { index, x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
      }).filter(Boolean);
      if (strokeBoxes.length < 4) return '';

      // Build local 2-D glyph groups. Unlike normal left-to-right grouping,
      // vertically separated upper/lower bounds must remain independent.
      const parent = strokeBoxes.map((_, i) => i);
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
      const tolerance = 2 * dpr;
      for (let i = 0; i < strokeBoxes.length; i++) {
        for (let j = i + 1; j < strokeBoxes.length; j++) {
          const overlapX = Math.min(strokeBoxes[i].x1, strokeBoxes[j].x1) - Math.max(strokeBoxes[i].x0, strokeBoxes[j].x0);
          const overlapY = Math.min(strokeBoxes[i].y1, strokeBoxes[j].y1) - Math.max(strokeBoxes[i].y0, strokeBoxes[j].y0);
          if (overlapX >= -tolerance && overlapY >= -tolerance) unite(i, j);
        }
      }

      const grouped = new Map();
      strokeBoxes.forEach((box, i) => {
        const root = find(i);
        if (!grouped.has(root)) grouped.set(root, []);
        grouped.get(root).push(box);
      });
      const groups = Array.from(grouped.values()).map(items => {
        const x0 = Math.min(...items.map(b => b.x0));
        const x1 = Math.max(...items.map(b => b.x1));
        const y0 = Math.min(...items.map(b => b.y0));
        const y1 = Math.max(...items.map(b => b.y1));
        return {
          indexes: items.map(b => b.index),
          x0, x1, y0, y1,
          w: x1 - x0, h: y1 - y0,
          cx: (x0 + x1) / 2,
          cy: (y0 + y1) / 2
        };
      });

      const candidates = groups.filter(group => {
        const aspect = group.w / Math.max(1, group.h);
        return group.cx < w * 0.55 &&
          group.w > Math.max(30 * dpr, w * 0.08) &&
          group.h > Math.max(24 * dpr, h * 0.075) &&
          aspect > 0.82 && aspect < 2.6;
      }).sort((a, b) => b.w * b.h - a.w * a.h);

      for (const sigma of candidates) {
        const top = [], bottom = [], right = [];
        for (const group of groups) {
          if (group === sigma) continue;
          const nearTopX = group.cx > sigma.x0 - sigma.w * 0.15 && group.cx < sigma.x1 + sigma.w * 0.2;
          const nearBottomX = group.cx > sigma.x0 - sigma.w * 0.25 && group.cx < sigma.x1 + sigma.w * 0.5;
          if (nearTopX && group.y1 <= sigma.y0 - sigma.h * 0.08) {
            top.push(...group.indexes);
          } else if (nearBottomX &&
                     group.y0 >= sigma.y1 + sigma.h * 0.12 &&
                     group.cy <= sigma.y1 + sigma.h * 1.25) {
            bottom.push(...group.indexes);
          } else if (group.cx >= sigma.x1 + sigma.w * 0.12 &&
                     group.cy >= sigma.y0 - sigma.h * 0.25 &&
                     group.cy <= sigma.y1 + sigma.h * 0.18) {
            right.push(...group.indexes);
          }
        }
        if (top.length === 0 || bottom.length === 0 || right.length === 0) continue;

        const topTokens = await this.recognizeClusters(this.segmentStrokeClusters(w, h, top));
        const bottomTokens = await this.recognizeClusters(this.segmentStrokeClusters(w, h, bottom));
        const rightTokens = await this.recognizeClusters(this.segmentStrokeClusters(w, h, right));
        const upper = topTokens.join('').replace(/[^0-9]/g, '');
        const bottomText = bottomTokens.join('');
        const lowerMatch = bottomText.match(/(?:i)?=?([0-9]+)/);
        let rightText = rightTokens.join('').replace(/[^0-9.+\-×÷=^!√()i]/g, '');
        if (/^1=/.test(rightText)) rightText = `i${rightText.slice(1)}`;
        // The spatial layout itself is strong evidence. Preserve every region
        // and mark an uncertain token instead of falling through to a bogus
        // one-line result that scrambles upper/lower bounds.
        return `Σ_{i=${lowerMatch ? lowerMatch[1] : '?'}}^{${upper || '?'}} ${rightText || '?'}`;
      }
      return '';
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
      this.bindExpressionPreview(exprInput);

      if (ocrBtn && exprInput && !document.getElementById('sp-btn-myscript')) {
        const myScriptBtn = document.createElement('button');
        myScriptBtn.type = 'button';
        myScriptBtn.id = 'sp-btn-myscript';
        myScriptBtn.className = ocrBtn.className;
        myScriptBtn.textContent = '☁️ อ่านแบบแม่นยำ';
        myScriptBtn.hidden = !this.getMyScriptProxyUrl();
        myScriptBtn.addEventListener('click', () => {
          playClick();
          if (this.isCanvasBlank()) {
            alert('กรุณาเขียนสมการก่อน');
            return;
          }
          this.recognizeWithMyScript(exprInput, myScriptBtn);
        });
        ocrBtn.insertAdjacentElement('afterend', myScriptBtn);
        const usageBadge = document.createElement('div');
        usageBadge.id = 'myscript-usage';
        usageBadge.className = 'myscript-usage';
        usageBadge.setAttribute('aria-live', 'polite');
        usageBadge.textContent = 'MyScript: กำลังโหลดเครดิต...';
        myScriptBtn.insertAdjacentElement('afterend', usageBadge);
        this.loadMyScriptUsage();
      }

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
            const requestRevision = this.recognitionRevision;
            if (window.Tesseract || window.SPEEDMATH_DIGIT_MODEL) {
              // getImageData/cropping uses backing-store pixels, not CSS pixels.
              // Dividing these values by DPR made Retina/mobile devices OCR only
              // the top-left portion of the writing and shifted every crop.
              const w = this.canvas.width;
              const h = this.canvas.height;
              const spatialSigma = await this.tryRecognizeRasterSigma(w, h);
              if (spatialSigma) {
                await this.useRecognizedExpression(spatialSigma, exprInput, ocrBtn, requestRevision);
                return;
              }
              const structuredMath = await this.tryRecognizeStructuredMath(w, h);
              if (structuredMath) {
                await this.useRecognizedExpression(structuredMath, exprInput, ocrBtn, requestRevision);
                return;
              }
              const strokeClusters = this.segmentStrokeClusters(w, h);
              const clusters = strokeClusters.length > 0
                ? strokeClusters
                : this.segmentAndRecognizeClusters(this.ctx, w, h);

              if (clusters.length > 0) {
                const recognizedParts = await this.recognizeClusters(clusters);

                if (recognizedParts.length > 0) {
                  await this.useRecognizedExpression(this.formatRecognizedTokens(recognizedParts), exprInput, ocrBtn, requestRevision);
                } else {
                  if (this.getMyScriptProxyUrl() && this.strokeTrackingValid) {
                    await this.recognizeWithMyScript(exprInput, ocrBtn);
                  } else {
                    alert('อ่านลายมือไม่ชัดเจน โปรดกดปุ่มสัญลักษณ์ด่วนด้านล่าง');
                  }
                }
              } else {
                // Fallback to full canvas
                const preprocessed = this.getPreprocessedCanvas();
                const res = await window.Tesseract.recognize(preprocessed, 'eng', {
                  tessedit_char_whitelist: '0123456789.+-*xX/÷=()!^vVΣEWMlimi_{}',
                  tessedit_pageseg_mode: '11'
                });
                const spatialResult = this.parse2DSpatialOCR(res);
                await this.useRecognizedExpression(
                  spatialResult || this.cleanOCRText(res.data.text || ''),
                  exprInput,
                  ocrBtn,
                  requestRevision
                );
              }
            } else {
              if (this.getMyScriptProxyUrl() && this.strokeTrackingValid) {
                await this.recognizeWithMyScript(exprInput, ocrBtn);
              } else {
                alert('ระบบกำลังโหลดตัวอ่านลายมือ โปรดลองอีกครั้งในครู่เดียว หรือใช้ปุ่มกดสัญลักษณ์ด่วน');
              }
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
            exprInput.dispatchEvent(new Event('input', { bubbles: true }));
            exprInput.focus();
          }
        });
      });

      const clearInputBtn = document.getElementById('sp-btn-input-clear');
      if (clearInputBtn && exprInput) {
        clearInputBtn.addEventListener('click', () => {
          playClick();
          exprInput.value = '';
          exprInput.dispatchEvent(new Event('input', { bubbles: true }));
          exprInput.focus();
        });
      }
    }
  };

  /* ==========================================================================
     Check Answer (Evaluates Math & Validates 180 IQ Rules)
  ========================================================================== */
  function splitTopLevelEquality(expr) {
    let roundDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      if (char === '(') roundDepth++;
      else if (char === ')') roundDepth = Math.max(0, roundDepth - 1);
      else if (char === '{') braceDepth++;
      else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (char === '=' && roundDepth === 0 && braceDepth === 0) {
        return {
          left: expr.slice(0, i).trim(),
          right: expr.slice(i + 1).trim()
        };
      }
    }
    return { left: expr.trim(), right: '' };
  }

  function doCheckAnswer() {
    playClick();
    if (state.timerMode === 'countup') {
      stopTimer();
      setSolutionsLocked(false);
    }
    const exprInput = document.getElementById('scratchpad-expr-input');
    const expr = exprInput ? exprInput.value.trim() : '';

    if (!expr) {
      alert('กรุณาพิมพ์หรือกด "✨ แปลงลายมือ" เพื่อใส่สมการก่อนกดตรวจคำตอบครับ');
      if (exprInput) exprInput.focus();
      return;
    }

    const equation = splitTopLevelEquality(expr);

    // 1. Validate only the expression side. Digits in an asserted result such
    // as "2+3=5" are not game pieces and must not be counted a second time.
    const digitCheck = MathEngine.validateDigitUsage(equation.left, state.currentDigits);

    // 2. Evaluate Expression
    const evalResult = MathEngine.evaluate(equation.left);
    const assertedResult = equation.right ? MathEngine.evaluate(equation.right) : null;
    const numbersMatch = (a, b) =>
      Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    const equationMatches = !assertedResult ||
      (evalResult.success && assertedResult.success && numbersMatch(evalResult.result, assertedResult.result));

    // 3. Match with Target Value
    const isTargetMatched = evalResult.success && equationMatches && numbersMatch(evalResult.result, state.targetValue);
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

      if (!equationMatches) {
        detailsHtml += `
          <div class="check-detail-item">
            <span class="check-label" style="color:var(--accent-pink);">❌ ฝั่งซ้ายและขวาไม่เท่ากัน:</span>
            <span class="check-val" style="color:var(--accent-pink);">${equation.left} ≠ ${equation.right}</span>
          </div>
        `;
      }

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

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullscreenButton() {
    const isFullscreen = Boolean(getFullscreenElement());
    document.body.classList.toggle('is-fullscreen', isFullscreen);
    if (el.btnFullscreen) {
      el.btnFullscreen.setAttribute('aria-pressed', String(isFullscreen));
      el.btnFullscreen.title = isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงผลเต็มจอ';
    }
    if (el.fullscreenIcon) el.fullscreenIcon.textContent = isFullscreen ? '↙' : '⛶';
    if (el.fullscreenStatusText) {
      el.fullscreenStatusText.textContent = isFullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ';
    }
    requestAnimationFrame(() => {
      if (scratchpad && scratchpad.resizeCanvas) scratchpad.resizeCanvas();
      window.dispatchEvent(new Event('resize'));
    });
  }

  async function doToggleFullscreen() {
    playClick();
    try {
      if (getFullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
        return;
      }

      const root = document.documentElement;
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!request) {
        alert('เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ กรุณาใช้เมนูเต็มจอของเบราว์เซอร์');
        return;
      }
      await request.call(root);
    } catch (error) {
      console.error('Fullscreen error:', error);
      alert('ไม่สามารถเปิดโหมดเต็มจอได้ กรุณาลองกดปุ่มอีกครั้ง');
    }
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
