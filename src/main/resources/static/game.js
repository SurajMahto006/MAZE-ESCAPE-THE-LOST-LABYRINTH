/**
 * Maze Escape: The Lost Labyrinth
 * High-performance, lightweight Canvas renderer and game controller.
 * Fully responsive across Mobile, Tablets, and Desktop/Laptops.
 */

(function () {
  "use strict";

  // --- DOM Element References ---
  const $ = (id) => document.getElementById(id);
  const canvas = $("maze");
  const ctx = canvas.getContext("2d");
  const mazeWrap = $("mazeWrap");

  // Telemetry elements
  const scoreEl = $("score");
  const bestScoreEl = $("bestScore");
  const movesEl = $("moves");
  const timerValEl = $("timerVal");
  const livesEl = $("lives");
  const keyStatusEl = $("keyStatus");
  const keyTextEl = $("keyText");
  const difficultyEl = $("difficulty");
  const diffPillEl = $("diffPill");
  const gridDimensionTextEl = $("gridDimensionText");
  const messageBanner = $("message");
  const messageTextEl = $("messageText");
  const sessionStatusEl = $("sessionStatus");

  // Overlay elements
  const overlay = $("overlay");
  const overlayIconWrap = $("overlayIconWrap");
  const resultIcon = $("resultIcon");
  const resultTitle = $("resultTitle");
  const resultText = $("resultText");
  const overlayStats = $("overlayStats");
  const summaryScore = $("summaryScore");
  const summaryTime = $("summaryTime");
  const summaryMoves = $("summaryMoves");
  const summaryDiff = $("summaryDiff");
  const playAgainBtn = $("playAgain");
  const overlayNewMazeBtn = $("overlayNewMaze");
  const resumeBtn = $("resumeBtn");

  // Actions & Controls
  const newGameBtn = $("newGameBtn");
  const pauseBtn = $("pauseBtn");
  const resetSessionBtn = $("resetSessionBtn");
  const helpBtn = $("helpBtn");
  const helpDialog = $("helpDialog");
  const closeHelpBtn = $("closeHelpBtn");
  const confirmHelpBtn = $("confirmHelpBtn");
  const soundToggle = $("soundToggle");
  const soundIconOn = $("soundIconOn");
  const soundIconOff = $("soundIconOff");

  // --- Game State Variables ---
  let game = null;
  let isBusy = false;
  let isPaused = false;
  let cellSize = 24;
  let dpr = window.devicePixelRatio || 1;
  let lastPlayerPos = { x: 1, y: 1 };
  let renderPlayerPos = { x: 1, y: 1 };
  let animFrameId = null;

  // Timer Variables
  let timerInterval = null;
  let elapsedSeconds = 0;
  let timerStarted = false;

  // Sound Engine (Web Audio API Synthesizer - 0 external files)
  let audioCtx = null;
  let soundEnabled = localStorage.getItem("maze_sound_enabled") !== "false";

  function updateSoundIcon() {
    if (soundEnabled) {
      soundIconOn.style.display = "block";
      soundIconOff.style.display = "none";
      soundToggle.setAttribute("aria-label", "Mute sound effects");
    } else {
      soundIconOn.style.display = "none";
      soundIconOff.style.display = "block";
      soundToggle.setAttribute("aria-label", "Enable sound effects");
    }
  }
  updateSoundIcon();

  function playSynth(type) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "step") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === "wall") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(90, now);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === "key") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === "trap") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.22);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "win") {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const noteOsc = audioCtx.createOscillator();
          const noteGain = audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(audioCtx.destination);
          noteOsc.type = "triangle";
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.09);
          noteGain.gain.setValueAtTime(0.14, now + idx * 0.09);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.2);
          noteOsc.start(now + idx * 0.09);
          noteOsc.stop(now + idx * 0.09 + 0.2);
        });
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (_) {
      // AudioContext failure gracefully handled
    }
  }

  // Best Score Management via LocalStorage
  function getBestScore(diff) {
    return parseInt(localStorage.getItem(`maze_best_${diff}`) || "0", 10);
  }

  function setBestScore(diff, score) {
    const cur = getBestScore(diff);
    if (score > cur) {
      localStorage.setItem(`maze_best_${diff}`, score.toString());
      return true;
    }
    return false;
  }

  function updateBestScoreDisplay() {
    const diff = difficultyEl.value;
    const best = getBestScore(diff);
    bestScoreEl.textContent = String(best).padStart(4, "0");
  }

  // --- Timer Methods ---
  function startTimer() {
    if (timerStarted) return;
    timerStarted = true;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isPaused && game && !game.won && game.lives > 0) {
        elapsedSeconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerStarted = false;
  }

  function resetTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    timerValEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // --- Backend API Integration ---
  async function api(path, body) {
    const res = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status} Error`);
    }
    return data;
  }

  // --- UI Toast & Status Notifications ---
  function showStatus(text, type = "normal") {
    messageTextEl.textContent = text;
    messageBanner.className = "status-banner";
    if (type === "warning") messageBanner.classList.add("alert-warning");
    else if (type === "danger") messageBanner.classList.add("alert-danger");
    else if (type === "success") messageBanner.classList.add("alert-success");
  }

  // --- Game Lifecycle ---
  async function startNewGame() {
    if (isBusy) return;
    isBusy = true;
    isPaused = false;
    showStatus("Generating ancient labyrinth sector…");
    sessionStatusEl.textContent = "GENERATING...";
    resetTimer();

    try {
      const difficulty = difficultyEl.value;
      diffPillEl.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      updateBestScoreDisplay();

      game = await api("/api/new", { difficulty: difficulty });

      lastPlayerPos = { x: game.player[0], y: game.player[1] };
      renderPlayerPos = { x: game.player[0], y: game.player[1] };

      overlay.classList.add("hidden");
      resumeBtn.style.display = "none";
      playAgainBtn.style.display = "block";
      overlayNewMazeBtn.style.display = "block";
      overlayStats.style.display = "grid";

      sessionStatusEl.textContent = "SECTOR ACTIVE";
      gridDimensionTextEl.textContent = `Grid ${game.size} × ${game.size}`;

      resizeCanvas();
      updateStats();
      showStatus("Labyrinth initialized. Locate the relic key and escape!", "normal");
      canvas.focus();
    } catch (err) {
      showStatus(`Failed to generate labyrinth: ${err.message}`, "danger");
      sessionStatusEl.textContent = "OFFLINE";
    } finally {
      isBusy = false;
    }
  }

  function pauseGame() {
    if (!game || game.won || game.lives <= 0) return;
    isPaused = !isPaused;

    if (isPaused) {
      overlayIconWrap.className = "overlay-icon-wrap overlay-icon-pause";
      resultIcon.textContent = "❚❚";
      resultTitle.textContent = "Exploration Paused";
      resultText.textContent = "Timer halted. Click resume or press P to continue.";
      overlayStats.style.display = "none";
      playAgainBtn.style.display = "none";
      overlayNewMazeBtn.style.display = "block";
      resumeBtn.style.display = "block";
      overlay.classList.remove("hidden");
      pauseBtn.querySelector("span").textContent = "Resume";
      sessionStatusEl.textContent = "PAUSED";
      showStatus("Game paused.");
    } else {
      resumeGame();
    }
  }

  function resumeGame() {
    isPaused = false;
    overlay.classList.add("hidden");
    pauseBtn.querySelector("span").textContent = "Pause";
    sessionStatusEl.textContent = "SECTOR ACTIVE";
    showStatus("Exploration resumed.", "normal");
    canvas.focus();
  }

  // --- Responsive Canvas Resizing & HiDPI Sharpness ---
  function resizeCanvas() {
    if (!game) return;
    const n = game.size;

    // Available width and height inside wrapper
    const wrapWidth = mazeWrap.clientWidth - 24; // account for padding
    const maxAvailableWidth = Math.min(wrapWidth, 540);
    
    // Maintain square aspect ratio
    cellSize = Math.floor(maxAvailableWidth / n);
    if (cellSize < 10) cellSize = 10;
    const cssSize = cellSize * n;

    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    render();
  }

  // --- Rendering Routine ---
  function render() {
    if (!game) return;
    const n = game.size;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Draw Maze Floor
    ctx.fillStyle = "#0A0D14";
    ctx.fillRect(0, 0, n * cellSize, n * cellSize);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, n * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(n * cellSize, i * cellSize);
      ctx.stroke();
    }

    // 2. Draw Walls with depth & highlights
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (game.grid[y][x] === 1) {
          drawWallTile(x, y, cellSize);
        }
      }
    }

    // 3. Draw Exit Portal
    drawExitPortal(game.exit[0], game.exit[1], cellSize, game.hasKey);

    // 4. Draw Relic Key (if not yet acquired)
    if (!game.hasKey) {
      drawRelicKey(game.key[0], game.key[1], cellSize);
    }

    // 5. Draw Spike Traps
    if (game.traps && game.traps.length > 0) {
      game.traps.forEach((t) => drawTrap(t[0], t[1], cellSize));
    }

    // 6. Draw Player Explorer
    drawPlayer(renderPlayerPos.x, renderPlayerPos.y, cellSize);

    ctx.restore();
  }

  // Tile Drawing Helpers
  function drawWallTile(x, y, size) {
    const px = x * size;
    const py = y * size;
    const r = Math.max(2, size * 0.15);

    // Wall base
    ctx.fillStyle = "#161D2A";
    ctx.beginPath();
    ctx.roundRect(px + 0.6, py + 0.6, size - 1.2, size - 1.2, r);
    ctx.fill();

    // Top highlight bevel
    ctx.fillStyle = "#222D40";
    ctx.beginPath();
    ctx.roundRect(px + 1.2, py + 1.2, size - 2.4, (size - 2.4) * 0.45, [r, r, 0, 0]);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = "#2B384F";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  function drawExitPortal(x, y, size, unlocked) {
    const cx = x * size + size / 2;
    const cy = y * size + size / 2;
    const color = unlocked ? "#44D18A" : "#7C5CFC";

    ctx.save();
    // Portal energy aura
    const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.45);
    gradient.addColorStop(0, unlocked ? "rgba(68, 209, 138, 0.4)" : "rgba(124, 92, 252, 0.35)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Outer runic ring
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    // Center vortex / seal
    ctx.fillStyle = unlocked ? "#E4FFF1" : "#1B172E";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawRelicKey(x, y, size) {
    const cx = x * size + size / 2;
    const cy = y * size + size / 2;
    const color = "#F4B860";

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.45;
    ctx.fillStyle = color;

    // Key bow (head)
    ctx.beginPath();
    ctx.arc(cx - size * 0.1, cy - size * 0.1, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Key bow hole
    ctx.fillStyle = "#0A0D14";
    ctx.beginPath();
    ctx.arc(cx - size * 0.1, cy - size * 0.1, size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Key shaft & teeth
    ctx.fillStyle = color;
    ctx.fillRect(cx - size * 0.02, cy - size * 0.04, size * 0.28, size * 0.08);
    ctx.fillRect(cx + size * 0.16, cy + size * 0.03, size * 0.07, size * 0.11);
    ctx.fillRect(cx + size * 0.06, cy + size * 0.03, size * 0.06, size * 0.07);

    ctx.restore();
  }

  function drawTrap(x, y, size) {
    const cx = x * size + size / 2;
    const cy = y * size + size / 2;
    const color = "#FF647C";

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.25;

    // Warning spike hazard glyph
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.26);
    ctx.lineTo(cx + size * 0.24, cy + size * 0.22);
    ctx.lineTo(cx - size * 0.24, cy + size * 0.22);
    ctx.closePath();
    ctx.fill();

    // Dark core
    ctx.fillStyle = "#15090C";
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.04, size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPlayer(x, y, size) {
    const cx = x * size + size / 2;
    const cy = y * size + size / 2;
    const color = "#36D6C3";

    ctx.save();
    // Ambient player glow
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.55;

    // Outer beacon circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Inner explorer core
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0D2A28";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Center compass pip
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Telemetry & Dashboard Stats Updates ---
  function updateStats() {
    if (!game) return;

    scoreEl.textContent = String(game.score).padStart(4, "0");
    movesEl.textContent = game.moves;

    // Update Lives Indicator with glowing hearts
    const hearts = livesEl.querySelectorAll(".heart-pip");
    hearts.forEach((heart, index) => {
      if (index < game.lives) {
        heart.classList.remove("lost");
      } else {
        heart.classList.add("lost");
      }
    });
    livesEl.setAttribute("aria-label", `${game.lives} lives remaining`);

    // Key Status
    if (game.hasKey) {
      keyStatusEl.classList.add("acquired");
      keyTextEl.textContent = "ACQUIRED";
    } else {
      keyStatusEl.classList.remove("acquired");
      keyTextEl.textContent = "LOCKED";
    }

    // Win / Loss Condition Handling
    if (game.won) {
      handleVictory();
    } else if (game.lives <= 0) {
      handleGameOver();
    }
  }

  function handleVictory() {
    stopTimer();
    playSynth("win");
    sessionStatusEl.textContent = "MISSION COMPLETE";

    overlayIconWrap.className = "overlay-icon-wrap overlay-icon-win";
    resultIcon.textContent = "✦";
    resultTitle.textContent = "Labyrinth Conquered!";
    resultText.textContent = "Dimensional portal stabilized. Sector successfully secured.";

    // Update overlay telemetry
    summaryScore.textContent = game.score;
    summaryTime.textContent = timerValEl.textContent;
    summaryMoves.textContent = game.moves;
    summaryDiff.textContent = difficultyEl.value.toUpperCase();

    // Check Best Score
    const diff = difficultyEl.value;
    const isNewBest = setBestScore(diff, game.score);
    if (isNewBest) {
      updateBestScoreDisplay();
      showStatus(`Phenomenal! New best score record of ${game.score} achieved!`, "success");
    } else {
      showStatus("Labyrinth conquered! Claim your victory or start a new challenge.", "success");
    }

    overlay.classList.remove("hidden");
  }

  function handleGameOver() {
    stopTimer();
    playSynth("gameover");
    sessionStatusEl.textContent = "SYSTEM CRITICAL";

    overlayIconWrap.className = "overlay-icon-wrap overlay-icon-loss";
    resultIcon.textContent = "×";
    resultTitle.textContent = "Explorer Depleted";
    resultText.textContent = "Your energy shields failed. The labyrinth claimed another explorer.";

    summaryScore.textContent = game.score;
    summaryTime.textContent = timerValEl.textContent;
    summaryMoves.textContent = game.moves;
    summaryDiff.textContent = difficultyEl.value.toUpperCase();

    showStatus("Shields collapsed from spike damage. Try a different path!", "danger");
    overlay.classList.remove("hidden");
  }

  // --- Player Movement Action ---
  async function makeMove(dir) {
    if (!game || isBusy || isPaused || game.won || game.lives <= 0) return;
    isBusy = true;

    // Start timer on first move
    startTimer();

    try {
      const prevX = game.player[0];
      const prevY = game.player[1];
      const prevLives = game.lives;
      const prevHasKey = game.hasKey;

      const nextState = await api(`/api/move/${game.id}`, { direction: dir });
      game = nextState;

      const currX = game.player[0];
      const currY = game.player[1];

      // Smooth step interpolation animation
      animatePlayerStep(prevX, prevY, currX, currY);

      // Sound and status feedback
      if (currX === prevX && currY === prevY) {
        playSynth("wall");
        showStatus("Impassable wall blocks your path.", "normal");
      } else {
        if (game.lives < prevLives) {
          playSynth("trap");
          showStatus("Spike trap triggered! Lost 1 shield life and 25 score.", "danger");
          if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
        } else if (!prevHasKey && game.hasKey) {
          playSynth("key");
          showStatus("Ancient relic key acquired! The dimensional portal is unlocked.", "success");
        } else if (!game.won) {
          playSynth("step");
        }
      }

      updateStats();
    } catch (err) {
      showStatus(`Action failed: ${err.message}`, "danger");
    } finally {
      isBusy = false;
    }
  }

  // Smooth interpolation helper (60fps lerp over 90ms)
  function animatePlayerStep(fromX, fromY, toX, toY) {
    if (fromX === toX && fromY === toY) {
      renderPlayerPos = { x: toX, y: toY };
      render();
      return;
    }

    if (animFrameId) cancelAnimationFrame(animFrameId);
    const startTime = performance.now();
    const duration = 90; // milliseconds

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const ease = 1 - (1 - progress) * (1 - progress);

      renderPlayerPos.x = fromX + (toX - fromX) * ease;
      renderPlayerPos.y = fromY + (toY - fromY) * ease;
      render();

      if (progress < 1) {
        animFrameId = requestAnimationFrame(step);
      } else {
        renderPlayerPos = { x: toX, y: toY };
        render();
      }
    }

    animFrameId = requestAnimationFrame(step);
  }

  // --- Input Handlers (Keyboard, Touch D-Pad, Touch Swipe) ---
  const keyDirectionMap = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
  };

  document.addEventListener("keydown", (e) => {
    // If typing in a form or dialog is open, do not intercept
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (helpDialog.hasAttribute("open")) return;

    const key = e.key.toLowerCase();

    // Pause shortcut
    if (key === "p" || (key === " " && !isBusy)) {
      e.preventDefault();
      pauseGame();
      return;
    }

    // Restart shortcut
    if (key === "r") {
      e.preventDefault();
      startNewGame();
      return;
    }

    if (keyDirectionMap[key]) {
      e.preventDefault();
      makeMove(keyDirectionMap[key]);
    }
  });

  // Mobile Touch D-Pad Buttons
  document.querySelectorAll("[data-dir]").forEach((btn) => {
    const dir = btn.dataset.dir;
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      makeMove(dir);
    }, { passive: false });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      makeMove(dir);
    });
  });

  // Mobile Swipe Gesture on Canvas
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    if (e.changedTouches.length > 0) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (Math.max(absX, absY) > 24) { // Minimum swipe threshold
        if (absX > absY) {
          makeMove(deltaX > 0 ? "right" : "left");
        } else {
          makeMove(deltaY > 0 ? "down" : "up");
        }
      }
    }
  }, { passive: true });

  // --- Button Listeners & Modals ---
  newGameBtn.addEventListener("click", startNewGame);
  pauseBtn.addEventListener("click", pauseGame);
  resumeBtn.addEventListener("click", resumeGame);
  resetSessionBtn.addEventListener("click", startNewGame);
  playAgainBtn.addEventListener("click", startNewGame);
  overlayNewMazeBtn.addEventListener("click", startNewGame);

  difficultyEl.addEventListener("change", () => {
    updateBestScoreDisplay();
    startNewGame();
  });

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("maze_sound_enabled", soundEnabled ? "true" : "false");
    updateSoundIcon();
  });

  helpBtn.addEventListener("click", () => {
    if (typeof helpDialog.showModal === "function") {
      helpDialog.showModal();
    }
  });

  closeHelpBtn.addEventListener("click", () => helpDialog.close());
  confirmHelpBtn.addEventListener("click", () => helpDialog.close());

  // Window Resize Listener with Debounce
  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
    }, 100);
  });

  // Initialize best score and launch first game session
  updateBestScoreDisplay();
  startNewGame();
})();
