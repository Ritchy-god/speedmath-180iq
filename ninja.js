/**
 * Math Ninja - swipe the ball carrying the correct answer.
 * Kept independent from app.js so the classic game and OCR state cannot
 * interfere with the animation loop or pointer input.
 */
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('ninja-game-panel');
  const classicPanel = document.getElementById('classic-game-panel');
  const ninjaTab = document.getElementById('tab-math-ninja');
  const classicTab = document.getElementById('tab-speedmath');
  const brandTitle = document.querySelector('.brand-title');
  const settingsButton = document.getElementById('btn-settings');
  if (!panel || !classicPanel || !ninjaTab || !classicTab) return;

  const STORAGE_KEY = 'speedmath-math-ninja-settings-v1';
  const FANCY_UNLOCK_KEY = 'speedmath-math-ninja-fancy-unlocked';
  const FANCY_ACCESS_CODE = '24082026';
  const ALLOWED_OPERATIONS = ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt'];
  const FANCY_HEADS = [
    { file: 'face-01.jpg', x: 54, y: 27 },
    { file: 'face-02.jpg', x: 63, y: 23 },
    { file: 'face-03.jpg', x: 53, y: 23 },
    { file: 'face-04.jpg', x: 59, y: 28 },
    { file: 'face-05.jpg', x: 55, y: 22 },
    { file: 'face-06.jpg', x: 52, y: 29 },
    { file: 'face-07.jpg', x: 55, y: 23 },
    { file: 'face-08.jpg', x: 47, y: 25 },
    { file: 'face-09.jpg', x: 49, y: 26.2 },
    { file: 'face-10.jpg', x: 53, y: 24.6 },
    { file: 'face-11.jpg', x: 51, y: 21 },
    { file: 'face-12.jpg', x: 51.5, y: 26 },
    { file: 'face-13.jpg', x: 49, y: 30 },
    { file: 'face-14.jpg', x: 58, y: 26.6 }
  ].map(face => ({ ...face, src: `assets/ninja-faces/${face.file}` }));
  const SPEEDS = {
    slow:   { multiplier: 0.72, questionMs: 12000 },
    normal: { multiplier: 1,    questionMs: 10000 },
    fast:   { multiplier: 1.28, questionMs: 8000 },
    ninja:  { multiplier: 1.55, questionMs: 6500 }
  };

  const state = {
    activeTab: 'classic',
    screen: 'setup',
    settings: loadSettings(),
    running: false,
    questionIndex: 0,
    question: null,
    score: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    balls: [],
    nextBallId: 1,
    questionLocked: false,
    questionStartedAt: 0,
    frameAt: 0,
    animationFrame: null,
    nextQuestionTimer: null,
    activePointerId: null,
    lastPointer: null,
    trail: [],
    fancyMode: false,
    fancyCodeUnlocked: loadFancyCodeUnlock(),
    returnSettings: null,
    classicTitle: brandTitle ? brandTitle.textContent : 'คิดเลขเร็ว 180 IQ'
  };

  panel.innerHTML = `
    <div class="ninja-shell">
      <div id="ninja-screen-setup" class="ninja-screen ninja-setup active">
        <div class="ninja-hero">
          <div class="ninja-hero-icon" aria-hidden="true">🥷</div>
          <div>
            <h2>Math Ninja</h2>
            <p>ปัดลูกบอลที่เป็นคำตอบให้แม่น ก่อนเวลาจะหมด</p>
          </div>
        </div>

        <div class="ninja-settings-grid">
          <label class="ninja-setting-card">
            <span class="ninja-setting-title">⚡ ความเร็วลูกบอล</span>
            <select id="ninja-speed" class="ninja-select">
              <option value="slow">ช้า — ฝึกพื้นฐาน</option>
              <option value="normal">ปกติ</option>
              <option value="fast">เร็ว</option>
              <option value="ninja">Ninja — เร็วมาก</option>
            </select>
          </label>

          <label class="ninja-setting-card">
            <span class="ninja-setting-title">⚽ ลูกบอลต่อข้อ</span>
            <select id="ninja-ball-count" class="ninja-select">
              <option value="3">3 ลูก</option>
              <option value="4">4 ลูก</option>
              <option value="5">5 ลูก</option>
              <option value="6">6 ลูก</option>
              <option value="7">7 ลูก</option>
              <option value="8">8 ลูก</option>
            </select>
          </label>

          <label class="ninja-setting-card">
            <span class="ninja-setting-title">🏁 จำนวนข้อ</span>
            <select id="ninja-question-count" class="ninja-select">
              <option value="5">5 ข้อ</option>
              <option value="10">10 ข้อ</option>
              <option value="20">20 ข้อ</option>
              <option value="30">30 ข้อ</option>
            </select>
          </label>

          <fieldset class="ninja-setting-card wide">
            <legend class="ninja-setting-title">🧮 การดำเนินการ — เลือกได้หลายแบบเพื่อ Mix</legend>
            <div class="ninja-operations">
              <label class="ninja-op-check"><input type="checkbox" value="add"><span>＋ บวก</span></label>
              <label class="ninja-op-check"><input type="checkbox" value="subtract"><span>− ลบ</span></label>
              <label class="ninja-op-check"><input type="checkbox" value="multiply"><span>× คูณ</span></label>
              <label class="ninja-op-check"><input type="checkbox" value="divide"><span>÷ หาร</span></label>
              <label class="ninja-op-check"><input type="checkbox" value="power"><span>x² กำลัง</span></label>
              <label class="ninja-op-check"><input type="checkbox" value="sqrt"><span>√ ราก</span></label>
            </div>
          </fieldset>
        </div>

        <section class="ninja-fancy-access-card" aria-labelledby="ninja-fancy-access-title">
          <div class="ninja-fancy-access-copy">
            <strong id="ninja-fancy-access-title">🎭 โหมดแฟนซี</strong>
            <span id="ninja-fancy-access-status">ใส่รหัสเพื่อเข้าเล่นด่านแฟนซี 5 ข้อได้ทันที</span>
          </div>
          <form id="ninja-fancy-code-form" class="ninja-fancy-code-form">
            <label id="ninja-fancy-code-label" class="sr-only" for="ninja-fancy-code">รหัสปลดล็อกโหมดแฟนซี</label>
            <input id="ninja-fancy-code" class="ninja-fancy-code-input" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="รหัสผ่าน 8 หลัก">
            <button id="ninja-fancy-code-submit" class="ninja-fancy-code-btn" type="submit">🔓 ปลดล็อกและเล่น</button>
          </form>
          <button id="ninja-fancy-quick-start" class="ninja-fancy-start-btn" type="button" hidden>✨ เล่นโหมดแฟนซีทันที</button>
          <div id="ninja-fancy-code-error" class="ninja-fancy-code-error" role="alert"></div>
        </section>

        <div id="ninja-settings-error" class="ninja-settings-error" role="alert"></div>
        <button id="ninja-start" class="ninja-start-btn" type="button">🥷 เริ่มภารกิจ</button>
      </div>

      <div id="ninja-screen-game" class="ninja-screen ninja-game">
        <button id="ninja-exit" class="ninja-exit-btn" type="button" aria-label="ออกจากเกม Math Ninja" title="ออกจากเกม">✕</button>
        <div class="ninja-hud">
          <div class="ninja-stat">ข้อ<strong id="ninja-progress">1 / 10</strong></div>
          <div class="ninja-stat">คะแนน<strong id="ninja-score">0</strong></div>
          <div class="ninja-stat">ต่อเนื่อง<strong id="ninja-streak">0</strong></div>
        </div>
        <div class="ninja-question-wrap">
          <div id="ninja-fancy-badge" class="ninja-fancy-badge" hidden>✨ FANCY STAGE ✨</div>
          <div id="ninja-question" class="ninja-question">8 × 7 = ?</div>
          <div class="ninja-instruction">ใช้นิ้ว ปากกา หรือเมาส์ ปัดผ่านลูกบอลคำตอบ</div>
          <div class="ninja-time-track"><div id="ninja-time-bar" class="ninja-time-bar"></div></div>
        </div>
        <div id="ninja-arena" class="ninja-arena" aria-label="สนามลูกบอลคำตอบ">
          <div id="ninja-ball-layer"></div>
          <canvas id="ninja-trail" class="ninja-trail-canvas"></canvas>
          <div id="ninja-feedback" class="ninja-feedback" aria-live="polite"></div>
        </div>
      </div>

      <div id="ninja-screen-result" class="ninja-screen ninja-result">
        <div id="ninja-result-medal" class="ninja-result-medal">🏆</div>
        <h2 id="ninja-result-title">จบภารกิจ!</h2>
        <div id="ninja-result-score" class="ninja-result-score">0</div>
        <div class="ninja-result-grid">
          <div class="ninja-result-item">ถูก<strong id="ninja-result-correct">0</strong></div>
          <div class="ninja-result-item">พลาด<strong id="ninja-result-wrong">0</strong></div>
          <div class="ninja-result-item">แม่นยำ<strong id="ninja-result-accuracy">0%</strong></div>
        </div>
        <section id="ninja-fancy-unlock" class="ninja-fancy-unlock" hidden>
          <div class="ninja-fancy-sparkles" aria-hidden="true">✨ 🎉 ✨</div>
          <h3>ปลดล็อกด่านแฟนซี!</h3>
          <p>คุณผ่าน เร็วมาก · 8 ลูก · 10 ข้อ · ครบทุกการดำเนินการ ด้วยความแม่นยำ 100%</p>
          <p class="ninja-fancy-question">ต้องการเล่นด่านแฟนซีต่ออีก 5 ข้อหรือไม่?</p>
          <div class="ninja-fancy-actions">
            <button id="ninja-fancy-start" class="ninja-fancy-start-btn" type="button">🎭 เล่นโหมดแฟนซี</button>
            <button id="ninja-fancy-decline" class="ninja-secondary-btn" type="button">ไว้ครั้งหน้า</button>
          </div>
        </section>
        <div class="ninja-result-actions">
          <button id="ninja-replay" class="ninja-primary-btn" type="button">เล่นอีกครั้ง</button>
          <button id="ninja-back-settings" class="ninja-secondary-btn" type="button">ปรับการตั้งค่า</button>
        </div>
      </div>
    </div>
  `;

  const ui = {
    setup: document.getElementById('ninja-screen-setup'),
    game: document.getElementById('ninja-screen-game'),
    result: document.getElementById('ninja-screen-result'),
    speed: document.getElementById('ninja-speed'),
    ballCount: document.getElementById('ninja-ball-count'),
    questionCount: document.getElementById('ninja-question-count'),
    operationInputs: [...panel.querySelectorAll('.ninja-op-check input')],
    settingsError: document.getElementById('ninja-settings-error'),
    fancyAccessStatus: document.getElementById('ninja-fancy-access-status'),
    fancyCodeForm: document.getElementById('ninja-fancy-code-form'),
    fancyCodeLabel: document.getElementById('ninja-fancy-code-label'),
    fancyCode: document.getElementById('ninja-fancy-code'),
    fancyCodeSubmit: document.getElementById('ninja-fancy-code-submit'),
    fancyCodeError: document.getElementById('ninja-fancy-code-error'),
    fancyQuickStart: document.getElementById('ninja-fancy-quick-start'),
    start: document.getElementById('ninja-start'),
    exit: document.getElementById('ninja-exit'),
    progress: document.getElementById('ninja-progress'),
    score: document.getElementById('ninja-score'),
    streak: document.getElementById('ninja-streak'),
    fancyBadge: document.getElementById('ninja-fancy-badge'),
    question: document.getElementById('ninja-question'),
    timeBar: document.getElementById('ninja-time-bar'),
    arena: document.getElementById('ninja-arena'),
    ballLayer: document.getElementById('ninja-ball-layer'),
    trailCanvas: document.getElementById('ninja-trail'),
    feedback: document.getElementById('ninja-feedback'),
    resultMedal: document.getElementById('ninja-result-medal'),
    resultTitle: document.getElementById('ninja-result-title'),
    resultScore: document.getElementById('ninja-result-score'),
    resultCorrect: document.getElementById('ninja-result-correct'),
    resultWrong: document.getElementById('ninja-result-wrong'),
    resultAccuracy: document.getElementById('ninja-result-accuracy'),
    fancyUnlock: document.getElementById('ninja-fancy-unlock'),
    fancyStart: document.getElementById('ninja-fancy-start'),
    fancyDecline: document.getElementById('ninja-fancy-decline'),
    replay: document.getElementById('ninja-replay'),
    backSettings: document.getElementById('ninja-back-settings')
  };

  applySettingsToForm();
  bindEvents();
  refreshFancyAccess();

  function loadSettings() {
    const fallback = {
      speed: 'normal',
      ballCount: 5,
      questionCount: 10,
      operations: ['add', 'subtract', 'multiply', 'divide']
    };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      const operations = Array.isArray(saved.operations)
        ? saved.operations.filter(operation => ALLOWED_OPERATIONS.includes(operation))
        : fallback.operations;
      return {
        speed: SPEEDS[saved.speed] ? saved.speed : fallback.speed,
        ballCount: clampInt(saved.ballCount, 3, 8, fallback.ballCount),
        questionCount: [5, 10, 20, 30].includes(Number(saved.questionCount)) ? Number(saved.questionCount) : fallback.questionCount,
        operations: operations.length ? operations : fallback.operations
      };
    } catch (_) {
      return fallback;
    }
  }

  function loadFancyCodeUnlock() {
    try {
      return sessionStorage.getItem(FANCY_UNLOCK_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function clampInt(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  function applySettingsToForm() {
    ui.speed.value = state.settings.speed;
    ui.ballCount.value = String(state.settings.ballCount);
    ui.questionCount.value = String(state.settings.questionCount);
    ui.operationInputs.forEach(input => {
      input.checked = state.settings.operations.includes(input.value);
    });
  }

  function readSettingsFromForm() {
    const operations = ui.operationInputs.filter(input => input.checked).map(input => input.value);
    if (!operations.length) {
      ui.settingsError.textContent = 'เลือกการดำเนินการอย่างน้อย 1 แบบ';
      return null;
    }
    ui.settingsError.textContent = '';
    return {
      speed: SPEEDS[ui.speed.value] ? ui.speed.value : 'normal',
      ballCount: clampInt(ui.ballCount.value, 3, 8, 5),
      questionCount: clampInt(ui.questionCount.value, 5, 30, 10),
      operations
    };
  }

  function bindEvents() {
    ninjaTab.addEventListener('click', () => switchTab('ninja'));
    classicTab.addEventListener('click', () => switchTab('classic'));
    ui.start.addEventListener('click', () => {
      const settings = readSettingsFromForm();
      if (!settings) return;
      state.settings = settings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      startGame(false);
    });
    ui.replay.addEventListener('click', () => startGame(state.fancyMode));
    ui.backSettings.addEventListener('click', showSetup);
    ui.exit.addEventListener('click', exitGame);
    ui.fancyStart.addEventListener('click', startFancyGame);
    ui.fancyDecline.addEventListener('click', () => {
      ui.fancyUnlock.hidden = true;
    });
    ui.fancyQuickStart.addEventListener('click', startFancyGame);
    ui.fancyCodeForm.addEventListener('submit', event => {
      event.preventDefault();
      if (ui.fancyCode.value.trim() !== FANCY_ACCESS_CODE) {
        ui.fancyCodeError.textContent = 'รหัสไม่ถูกต้อง กรุณาลองใหม่';
        ui.fancyCode.select();
        return;
      }

      if (state.fancyCodeUnlocked) {
        state.fancyCodeUnlocked = false;
        try {
          sessionStorage.removeItem(FANCY_UNLOCK_KEY);
        } catch (_) {
          // The in-page state still locks even when storage is unavailable.
        }
        ui.fancyCode.value = '';
        ui.fancyCodeError.textContent = '';
        refreshFancyAccess();
        return;
      }

      state.fancyCodeUnlocked = true;
      try {
        sessionStorage.setItem(FANCY_UNLOCK_KEY, '1');
      } catch (_) {
        // The mode still unlocks for this page even when storage is unavailable.
      }
      ui.fancyCode.value = '';
      ui.fancyCodeError.textContent = '';
      refreshFancyAccess();
      startFancyGame();
    });

    // Capture before app.js opens the classic settings modal.
    if (settingsButton) {
      settingsButton.addEventListener('click', event => {
        if (state.activeTab !== 'ninja') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showSetup();
      }, true);
    }

    ui.arena.addEventListener('pointerdown', onPointerDown);
    ui.arena.addEventListener('pointermove', onPointerMove);
    ui.arena.addEventListener('pointerup', onPointerEnd);
    ui.arena.addEventListener('pointercancel', onPointerEnd);
    window.addEventListener('resize', resizeTrailCanvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) state.frameAt = 0;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.activeTab === 'ninja' && state.running) {
        event.preventDefault();
        exitGame();
      }
    });
  }

  function switchTab(tab) {
    if (tab === state.activeTab) return;
    safeSound('playClick');
    state.activeTab = tab;
    const ninjaActive = tab === 'ninja';
    ninjaTab.classList.toggle('active', ninjaActive);
    classicTab.classList.toggle('active', !ninjaActive);
    ninjaTab.setAttribute('aria-selected', String(ninjaActive));
    classicTab.setAttribute('aria-selected', String(!ninjaActive));
    panel.classList.toggle('active', ninjaActive);
    classicPanel.classList.toggle('active', !ninjaActive);
    panel.setAttribute('aria-hidden', String(!ninjaActive));
    classicPanel.setAttribute('aria-hidden', String(ninjaActive));

    if (ninjaActive) {
      state.classicTitle = brandTitle ? brandTitle.textContent : state.classicTitle;
      if (brandTitle) brandTitle.textContent = 'Math Ninja';
      const scratchpad = document.getElementById('scratchpad-container');
      const scratchpadToggle = document.getElementById('btn-toggle-scratchpad');
      if (scratchpad && scratchpadToggle && getComputedStyle(scratchpad).display !== 'none') {
        scratchpadToggle.click();
      }
      showSetup();
    } else {
      stopGame();
      if (brandTitle) brandTitle.textContent = state.classicTitle;
    }
  }

  function showScreen(screen) {
    state.screen = screen;
    ui.setup.classList.toggle('active', screen === 'setup');
    ui.game.classList.toggle('active', screen === 'game');
    ui.result.classList.toggle('active', screen === 'result');
  }

  function showSetup() {
    stopGame();
    if (state.returnSettings) {
      state.settings = state.returnSettings;
      state.returnSettings = null;
    }
    state.fancyMode = false;
    applySettingsToForm();
    ui.settingsError.textContent = '';
    ui.fancyCodeError.textContent = '';
    refreshFancyAccess();
    ui.fancyUnlock.hidden = true;
    showScreen('setup');
  }

  function exitGame() {
    safeSound('playClick');
    showSetup();
  }

  function setPlayingFullscreen(active) {
    const shell = panel.querySelector('.ninja-shell');
    if (shell) shell.classList.toggle('is-playing-fullscreen', active);
    document.body.classList.toggle('ninja-mode-playing', active);
  }

  function setFancyVisual(active) {
    const shell = panel.querySelector('.ninja-shell');
    if (shell) shell.classList.toggle('is-fancy-mode', active);
    ui.fancyBadge.hidden = !active;
  }

  function refreshFancyAccess() {
    const unlocked = state.fancyCodeUnlocked;
    ui.fancyCodeForm.hidden = false;
    ui.fancyCodeForm.dataset.action = unlocked ? 'lock' : 'unlock';
    ui.fancyCodeLabel.textContent = unlocked
      ? 'ใส่รหัสเพื่อปิดโหมดแฟนซี'
      : 'รหัสปลดล็อกโหมดแฟนซี';
    ui.fancyCode.placeholder = unlocked
      ? 'ใส่รหัสเพื่อปิดโหมดแฟนซี'
      : 'รหัสผ่าน 8 หลัก';
    ui.fancyCodeSubmit.textContent = unlocked
      ? '🔒 ปิดโหมดแฟนซี'
      : '🔓 ปลดล็อกและเล่น';
    ui.fancyCodeSubmit.classList.toggle('is-locking', unlocked);
    ui.fancyQuickStart.hidden = !state.fancyCodeUnlocked;
    ui.fancyAccessStatus.textContent = unlocked
      ? 'เปิดใช้งานอยู่ — ใส่รหัสเดิมเพื่อปิด หรือเข้าเล่นได้ทันที'
      : 'ใส่รหัสเพื่อเข้าเล่นด่านแฟนซี 5 ข้อได้ทันที';
  }

  function startFancyGame() {
    state.returnSettings = {
      ...state.settings,
      operations: [...state.settings.operations]
    };
    state.settings = {
      speed: 'ninja',
      ballCount: 8,
      questionCount: 5,
      operations: [...ALLOWED_OPERATIONS]
    };
    startGame(true);
  }

  function startGame(fancyMode = false) {
    stopGame();
    state.fancyMode = fancyMode === true;
    state.running = true;
    state.questionIndex = 0;
    state.score = 0;
    state.correct = 0;
    state.wrong = 0;
    state.streak = 0;
    state.bestStreak = 0;
    showScreen('game');
    setPlayingFullscreen(true);
    setFancyVisual(state.fancyMode);
    updateHud();
    requestAnimationFrame(() => {
      resizeTrailCanvas();
      startQuestion();
      state.frameAt = performance.now();
      state.animationFrame = requestAnimationFrame(animate);
    });
    safeSound('playClick');
  }

  function stopGame() {
    setPlayingFullscreen(false);
    setFancyVisual(false);
    state.running = false;
    state.questionLocked = true;
    if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
    if (state.nextQuestionTimer) clearTimeout(state.nextQuestionTimer);
    state.animationFrame = null;
    state.nextQuestionTimer = null;
    state.activePointerId = null;
    state.lastPointer = null;
    state.balls = [];
    state.trail = [];
    if (ui.ballLayer) ui.ballLayer.innerHTML = '';
    clearTrail();
  }

  function startQuestion() {
    if (!state.running) return;
    state.questionLocked = false;
    state.question = makeQuestion();
    state.questionStartedAt = performance.now();
    state.trail = [];
    ui.feedback.className = 'ninja-feedback';
    ui.feedback.textContent = '';
    ui.question.textContent = `${state.question.text} = ?`;
    ui.ballLayer.innerHTML = '';
    createBalls(state.question.answer);
    updateHud();
    clearTrail();
  }

  function makeQuestion() {
    const operation = pick(state.settings.operations);
    let a;
    let b;
    let answer;
    let text;

    if (operation === 'add') {
      a = randomInt(2, 60);
      b = randomInt(2, 60);
      answer = a + b;
      text = `${a} + ${b}`;
    } else if (operation === 'subtract') {
      a = randomInt(8, 99);
      b = randomInt(1, a);
      answer = a - b;
      text = `${a} − ${b}`;
    } else if (operation === 'multiply') {
      a = randomInt(2, 12);
      b = randomInt(2, 12);
      answer = a * b;
      text = `${a} × ${b}`;
    } else if (operation === 'divide') {
      b = randomInt(2, 12);
      answer = randomInt(2, 12);
      a = b * answer;
      text = `${a} ÷ ${b}`;
    } else if (operation === 'power') {
      a = randomInt(2, 12);
      b = 2;
      answer = a * a;
      text = `${a}²`;
    } else {
      answer = randomInt(2, 15);
      a = answer * answer;
      text = `√${a}`;
    }

    return { operation, a, b, answer, text };
  }

  function makeAnswers(answer, count) {
    const values = new Set([answer]);
    const magnitude = Math.max(4, Math.round(Math.abs(answer) * 0.16));
    const common = [
      answer + 1,
      answer - 1,
      answer + magnitude,
      answer - magnitude,
      answer + 10,
      answer - 10
    ].filter(value => value >= 0);
    shuffle(common).forEach(value => {
      if (values.size < count) values.add(value);
    });
    while (values.size < count) {
      const spread = Math.max(8, magnitude * 2);
      const candidate = Math.max(0, answer + randomInt(-spread, spread));
      values.add(candidate);
    }
    return shuffle([...values]);
  }

  function createBalls(answer) {
    const rect = ui.arena.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(330, rect.height);
    const radius = state.fancyMode ? (width <= 760 ? 56 : 64) : (width <= 760 ? 33 : 38);
    const answers = makeAnswers(answer, state.settings.ballCount);
    const fancyHeads = state.fancyMode ? shuffle([...FANCY_HEADS]).slice(0, answers.length) : [];
    const columns = Math.min(4, answers.length);
    const rows = Math.ceil(answers.length / columns);
    const speed = SPEEDS[state.settings.speed].multiplier;
    const rowHeight = Math.max(radius * 2, (height - radius * 2) / rows);

    state.balls = answers.map((value, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const itemsInRow = Math.min(columns, answers.length - row * columns);
      const slotWidth = width / itemsInRow;
      const x = slotWidth * (column + 0.5) + randomInt(-Math.min(20, slotWidth * 0.12), Math.min(20, slotWidth * 0.12));
      const y = radius + rowHeight * (row + 0.5) + randomInt(-Math.min(18, rowHeight * 0.1), Math.min(18, rowHeight * 0.1));
      const travelSpeed = randomInt(180, 260) * speed;
      const angle = randomInt(28, 62) * Math.PI / 180;
      const horizontalDirection = Math.random() < 0.5 ? -1 : 1;
      const verticalDirection = Math.random() < 0.5 ? -1 : 1;
      const element = document.createElement('div');
      const ball = {
        id: state.nextBallId++,
        value,
        correct: value === answer,
        x: clamp(x, radius, width - radius),
        y: clamp(y, radius, height - radius),
        vx: Math.cos(angle) * travelSpeed * horizontalDirection,
        vy: Math.sin(angle) * travelSpeed * verticalDirection,
        radius,
        sliced: false,
        element
      };
      element.className = `ninja-ball${state.fancyMode ? ' fancy-character' : ''}`;
      if (state.fancyMode) {
        element.style.setProperty('--limb-delay', `${-index * 0.075}s`);
        const limbNames = ['left-arm', 'right-arm', 'left-leg', 'right-leg'];
        const limbs = limbNames.map(name => {
          const limb = document.createElement('span');
          limb.className = `ninja-limb ninja-${name}`;
          limb.setAttribute('aria-hidden', 'true');
          return limb;
        });
        const headFrame = document.createElement('span');
        headFrame.className = 'ninja-face-frame';
        const head = document.createElement('img');
        head.className = 'ninja-face-head';
        head.src = fancyHeads[index].src;
        head.alt = '';
        head.draggable = false;
        centerFancyHead(head, fancyHeads[index]);
        headFrame.appendChild(head);
        const answerLabel = document.createElement('span');
        answerLabel.className = 'ninja-ball-answer';
        answerLabel.textContent = String(value);
        element.append(...limbs, headFrame, answerLabel);
      } else {
        element.textContent = String(value);
      }
      element.dataset.ballId = String(ball.id);
      ui.ballLayer.appendChild(element);
      renderBall(ball);
      return ball;
    });
  }

  function centerFancyHead(image, face) {
    const applyFocalPoint = () => {
      const imageRatio = image.naturalWidth / image.naturalHeight || 1;
      let visibleX = face.x;
      let visibleY = face.y;

      // The frame is square and object-fit: cover crops the long side. Convert
      // the focal point from source-image percentages into visible-frame space
      // before zooming, so every face lands at the exact centre of the circle.
      if (imageRatio > 1) {
        visibleX = 50 + ((face.x - 50) * imageRatio);
      } else if (imageRatio < 1) {
        visibleY = 50 + ((face.y - 50) / imageRatio);
      }

      image.style.setProperty('--face-shift-x', `${50 - visibleX}%`);
      image.style.setProperty('--face-shift-y', `${50 - visibleY}%`);
    };

    if (image.complete && image.naturalWidth) {
      applyFocalPoint();
    } else {
      image.addEventListener('load', applyFocalPoint, { once: true });
    }
  }

  function animate(timestamp) {
    if (!state.running) return;
    const dt = state.frameAt ? Math.min(0.035, (timestamp - state.frameAt) / 1000) : 0;
    state.frameAt = timestamp;
    const rect = ui.arena.getBoundingClientRect();

    for (const ball of state.balls) {
      if (ball.sliced) continue;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + ball.radius > rect.width) {
        ball.x = rect.width - ball.radius;
        ball.vx = -Math.abs(ball.vx);
      }

      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
      } else if (ball.y + ball.radius > rect.height) {
        ball.y = rect.height - ball.radius;
        ball.vy = -Math.abs(ball.vy);
      }
      renderBall(ball);
    }

    renderTrail(timestamp);
    updateQuestionTimer(timestamp);
    state.animationFrame = requestAnimationFrame(animate);
  }

  function renderBall(ball) {
    const x = Math.round(ball.x);
    const y = Math.round(ball.y);
    ball.element.style.setProperty('--nx', `${x}px`);
    ball.element.style.setProperty('--ny', `${y}px`);
    if (!ball.sliced) ball.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  function updateQuestionTimer(timestamp) {
    if (state.questionLocked) return;
    const duration = SPEEDS[state.settings.speed].questionMs;
    const remaining = Math.max(0, 1 - (timestamp - state.questionStartedAt) / duration);
    ui.timeBar.style.transform = `scaleX(${remaining})`;
    if (remaining <= 0) handleTimeout();
  }

  function onPointerDown(event) {
    if (!state.running || state.questionLocked) return;
    event.preventDefault();
    state.activePointerId = event.pointerId;
    state.lastPointer = pointInArena(event);
    if (ui.arena.setPointerCapture) ui.arena.setPointerCapture(event.pointerId);
    testSlice(state.lastPointer, state.lastPointer);
  }

  function onPointerMove(event) {
    if (event.pointerId !== state.activePointerId || !state.lastPointer || state.questionLocked) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
    for (const sample of samples) {
      const point = pointInArena(sample);
      addTrail(state.lastPointer, point);
      testSlice(state.lastPointer, point);
      state.lastPointer = point;
      if (state.questionLocked) break;
    }
  }

  function onPointerEnd(event) {
    if (event.pointerId !== state.activePointerId) return;
    state.activePointerId = null;
    state.lastPointer = null;
  }

  function pointInArena(event) {
    const rect = ui.arena.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function testSlice(from, to) {
    let closest = null;
    let closestDistance = Infinity;
    for (const ball of state.balls) {
      if (ball.sliced) continue;
      const distance = distanceToSegment(ball.x, ball.y, from.x, from.y, to.x, to.y);
      if (distance <= ball.radius + 7 && distance < closestDistance) {
        closest = ball;
        closestDistance = distance;
      }
    }
    if (closest) sliceBall(closest);
  }

  function sliceBall(ball) {
    if (ball.sliced || state.questionLocked) return;
    ball.sliced = true;
    if (ball.correct) {
      state.questionLocked = true;
      state.correct++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      const duration = SPEEDS[state.settings.speed].questionMs;
      const timeRatio = Math.max(0, 1 - (performance.now() - state.questionStartedAt) / duration);
      state.score += 100 + Math.round(timeRatio * 50) + Math.min(100, state.streak * 10);
      ball.element.classList.add('hit-correct');
      showFeedback(`ถูกต้อง! +${100 + Math.round(timeRatio * 50) + Math.min(100, state.streak * 10)}`, 'correct');
      safeSound('playCorrect');
      updateHud();
      scheduleNext(620);
    } else {
      state.wrong++;
      state.streak = 0;
      state.score = Math.max(0, state.score - 25);
      ball.element.classList.add('hit-wrong');
      showFeedback('ลูกหลอก! −25', 'wrong');
      safeSound('playWrong');
      updateHud();
      setTimeout(() => ball.element.remove(), 360);
    }
  }

  function handleTimeout() {
    if (state.questionLocked) return;
    state.questionLocked = true;
    state.wrong++;
    state.streak = 0;
    showFeedback(`หมดเวลา — คำตอบ ${state.question.answer}`, 'wrong');
    safeSound('playWrong');
    updateHud();
    scheduleNext(1050);
  }

  function scheduleNext(delay) {
    if (state.nextQuestionTimer) clearTimeout(state.nextQuestionTimer);
    state.nextQuestionTimer = setTimeout(() => {
      state.questionIndex++;
      if (state.questionIndex >= state.settings.questionCount) finishGame();
      else startQuestion();
    }, delay);
  }

  function finishGame() {
    const totalAttempts = state.correct + state.wrong;
    const accuracy = totalAttempts ? Math.round((state.correct / totalAttempts) * 100) : 0;
    const finishedFancyMode = state.fancyMode;
    const fancyUnlocked = !finishedFancyMode &&
      state.settings.speed === 'ninja' &&
      state.settings.ballCount === 8 &&
      state.settings.questionCount === 10 &&
      state.settings.operations.length === ALLOWED_OPERATIONS.length &&
      ALLOWED_OPERATIONS.every(operation => state.settings.operations.includes(operation)) &&
      accuracy === 100;
    stopGame();
    ui.resultScore.textContent = state.score.toLocaleString('th-TH');
    ui.resultCorrect.textContent = String(state.correct);
    ui.resultWrong.textContent = String(state.wrong);
    ui.resultAccuracy.textContent = `${accuracy}%`;
    ui.resultMedal.textContent = accuracy >= 90 ? '🏆' : accuracy >= 70 ? '🥇' : accuracy >= 50 ? '🥈' : '🥷';
    ui.resultTitle.textContent = finishedFancyMode ? 'จบด่านแฟนซี!' : 'จบภารกิจ!';
    ui.fancyUnlock.hidden = !fancyUnlocked;
    showScreen('result');
  }

  function updateHud() {
    ui.progress.textContent = `${Math.min(state.questionIndex + 1, state.settings.questionCount)} / ${state.settings.questionCount}`;
    ui.score.textContent = state.score.toLocaleString('th-TH');
    ui.streak.textContent = String(state.streak);
  }

  function showFeedback(message, type) {
    ui.feedback.textContent = message;
    ui.feedback.className = `ninja-feedback ${type} show`;
    setTimeout(() => {
      if (!state.questionLocked || type === 'wrong') ui.feedback.classList.remove('show');
    }, 700);
  }

  function resizeTrailCanvas() {
    if (!ui.trailCanvas || !ui.arena) return;
    const rect = ui.arena.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    ui.trailCanvas.width = Math.round(rect.width * dpr);
    ui.trailCanvas.height = Math.round(rect.height * dpr);
    const context = ui.trailCanvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addTrail(from, to) {
    state.trail.push({ from, to, createdAt: performance.now() });
    if (state.trail.length > 28) state.trail.splice(0, state.trail.length - 28);
  }

  function renderTrail(timestamp) {
    const context = ui.trailCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    context.clearRect(0, 0, ui.trailCanvas.width / dpr, ui.trailCanvas.height / dpr);
    state.trail = state.trail.filter(segment => timestamp - segment.createdAt < 240);
    context.lineCap = 'round';
    for (const segment of state.trail) {
      const alpha = Math.max(0, 1 - (timestamp - segment.createdAt) / 240);
      context.strokeStyle = `rgba(190, 255, 255, ${alpha})`;
      context.shadowColor = 'rgba(0, 242, 254, 0.9)';
      context.shadowBlur = 12;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(segment.from.x, segment.from.y);
      context.lineTo(segment.to.x, segment.to.y);
      context.stroke();
    }
    context.shadowBlur = 0;
  }

  function clearTrail() {
    if (!ui.trailCanvas) return;
    const context = ui.trailCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    context.clearRect(0, 0, ui.trailCanvas.width / dpr, ui.trailCanvas.height / dpr);
  }

  function distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function randomInt(min, max) {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(Math.random() * (high - low + 1)) + low;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [items[index], items[swap]] = [items[swap], items[index]];
    }
    return items;
  }

  function safeSound(method) {
    try {
      if (window.soundFX && typeof window.soundFX[method] === 'function') window.soundFX[method]();
    } catch (_) {}
  }
});
