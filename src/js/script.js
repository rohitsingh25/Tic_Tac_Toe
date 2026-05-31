// Web Audio API Sound Engine
const GameAudio = {
  ctx: null,
  masterVolume: 0.15,

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  },

  async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn("Failed to resume AudioContext:", err);
      }
    }
  },

  playTone(freqs, durations, type = 'sine', slideTo = null, filterFreq = null) {
    this.resume().catch(() => {});
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Create nodes
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    let lastNode = osc;

    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      lastNode.connect(filter);
      lastNode = filter;
    }

    lastNode.connect(gain);
    gain.connect(this.ctx.destination);

    // Set oscillator properties
    osc.type = type;
    osc.frequency.setValueAtTime(freqs[0], now);

    // Frequency slide
    if (slideTo && slideTo.length > 0) {
      slideTo.forEach(s => {
        osc.frequency.exponentialRampToValueAtTime(s.value, now + s.time);
      });
    }

    // Gain envelope
    gain.gain.setValueAtTime(0, now);
    let cumulativeTime = 0;
    durations.forEach((d) => {
      const start = now + cumulativeTime;
      const attack = 0.005;
      
      gain.gain.linearRampToValueAtTime(this.masterVolume, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + d);
      
      cumulativeTime += d;
    });

    // Start & Stop
    osc.start(now);
    osc.stop(now + cumulativeTime);
  },

  playUserMove() {
    this.playTone([600], [0.08], 'sine', [{ value: 900, time: 0.08 }], 1500);
  },

  playBotMove() {
    this.playTone([350], [0.12], 'triangle', [{ value: 200, time: 0.12 }], 800);
  },

  playHint() {
    this.resume().catch(() => {});
    if (!this.ctx) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const delay = 0.07;
    const duration = 0.25;
    
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone([freq], [duration], 'sine', null, 1200);
      }, idx * delay * 1000);
    });
  },

  playWin() {
    this.resume().catch(() => {});
    if (!this.ctx) return;

    const melody = [
      { freq: 659.25, delay: 0, dur: 0.12 },
      { freq: 783.99, delay: 0.12, dur: 0.12 },
      { freq: 1318.51, delay: 0.24, dur: 0.18 },
      { freq: 1046.50, delay: 0.42, dur: 0.18 },
      { freq: 1174.66, delay: 0.60, dur: 0.18 },
      { freq: 1567.98, delay: 0.78, dur: 0.45 }
    ];

    melody.forEach(note => {
      setTimeout(() => {
        this.playTone([note.freq], [note.dur], 'triangle', null, 2500);
      }, note.delay * 1000);
    });
  },

  playLoss() {
    this.resume().catch(() => {});
    if (!this.ctx) return;

    const melody = [
      { freq: 233.08, delay: 0, dur: 0.22 },
      { freq: 207.65, delay: 0.22, dur: 0.22 },
      { freq: 185.00, delay: 0.44, dur: 0.22 },
      { freq: 174.61, delay: 0.66, dur: 0.55, slideTo: 110 }
    ];

    melody.forEach(note => {
      setTimeout(() => {
        const slide = note.slideTo ? [{ value: note.slideTo, time: note.dur }] : null;
        this.playTone([note.freq], [note.dur], 'sawtooth', slide, 800);
      }, note.delay * 1000);
    });
  },

  playDraw() {
    this.resume().catch(() => {});
    if (!this.ctx) return;

    setTimeout(() => {
      this.playTone([392.00], [0.15], 'sine', null, 1000);
    }, 0);
    setTimeout(() => {
      this.playTone([293.66], [0.3], 'sine', null, 1000);
    }, 150);
  }
};

// Game State Configurations
const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

let board = Array(9).fill(null);
let botMode = 'normal'; // 'normal' or 'master'
let currentPlayer = 'X'; // 'X' is User, 'O' is Bot
let firstPlayer = 'user'; // 'user' or 'bot'
let gameActive = true;
let botTimeoutId = null;
let hintTimeoutId = null;

// Probability Memoization Cache
const probabilityCache = {};
const optimalCache = {};

// DOM Elements
const cells = document.querySelectorAll('.cell');
const statusMessage = document.getElementById('status-message');
const statusCard = document.getElementById('status-card');
const firstPlayerBadge = document.getElementById('first-player-badge');
const btnModeNormal = document.getElementById('btn-mode-normal');
const btnModeMaster = document.getElementById('btn-mode-master');
const btnHint = document.getElementById('btn-hint');
const btnRestart = document.getElementById('btn-restart');

// Probability Text and Bars
const txtProbWin = document.getElementById('txt-prob-win');
const txtProbDraw = document.getElementById('txt-prob-draw');
const txtProbLoss = document.getElementById('txt-prob-loss');
const barProbWin = document.getElementById('bar-prob-win');
const barProbDraw = document.getElementById('bar-prob-draw');
const barProbLoss = document.getElementById('bar-prob-loss');

/* --- WINNER & GAME OVER CHECKS --- */

function checkWinner(currentBoard) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
      return currentBoard[a]; // 'X' or 'O'
    }
  }
  if (currentBoard.every(cell => cell !== null)) {
    return 'draw';
  }
  return null; // Active
}

/* --- RECURSIVE PROBABILITY SOLVER --- */

/**
 * Gets a unique cache key for the board state
 */
function getCacheKey(currentBoard, isUserTurn) {
  return currentBoard.map(c => c === null ? '.' : c).join('') + '|' + isUserTurn;
}

/**
 * Solves the game tree recursively to determine exact probabilities of user winning, drawing, or losing.
 * Assumes BOTH players (User and Bot) play randomly from this state onwards.
 */
function solveProbabilities(currentBoard, isUserTurn) {
  const key = getCacheKey(currentBoard, isUserTurn);
  
  if (probabilityCache[key] !== undefined) {
    return probabilityCache[key];
  }

  const winner = checkWinner(currentBoard);
  if (winner === 'X') {
    return { win: 1, draw: 0, loss: 0 };
  }
  if (winner === 'O') {
    return { win: 0, draw: 0, loss: 1 };
  }
  if (winner === 'draw') {
    return { win: 0, draw: 1, loss: 0 };
  }

  const emptyIndices = [];
  for (let i = 0; i < 9; i++) {
    if (currentBoard[i] === null) emptyIndices.push(i);
  }

  let sumWin = 0;
  let sumDraw = 0;
  let sumLoss = 0;
  const nextMark = isUserTurn ? 'X' : 'O';

  for (const idx of emptyIndices) {
    const nextBoard = [...currentBoard];
    nextBoard[idx] = nextMark;
    const probs = solveProbabilities(nextBoard, !isUserTurn);
    sumWin += probs.win;
    sumDraw += probs.draw;
    sumLoss += probs.loss;
  }

  const totalCount = emptyIndices.length;
  const avgProbs = {
    win: sumWin / totalCount,
    draw: sumDraw / totalCount,
    loss: sumLoss / totalCount
  };

  probabilityCache[key] = avgProbs;
  return avgProbs;
}

/**
 * Gets a unique cache key for the optimal solver
 */
function getOptimalCacheKey(currentBoard, isUserTurn, mode, depth) {
  return currentBoard.map(c => c === null ? '.' : c).join('') + '|' + isUserTurn + '|' + mode + '|' + depth;
}

const EPSILON = 1e-9;

function isProbsBetterForUser(p1, p2) {
  if (Math.abs(p1.win - p2.win) > EPSILON) {
    return p1.win > p2.win;
  }
  return p1.draw > p2.draw;
}

function isProbsWorseForUser(p1, p2) {
  if (Math.abs(p1.win - p2.win) > EPSILON) {
    return p1.win < p2.win;
  }
  return p1.draw < p2.draw;
}

function isProbsEqual(p1, p2) {
  return Math.abs(p1.win - p2.win) < EPSILON && Math.abs(p1.draw - p2.draw) < EPSILON;
}

/**
 * Solves the game tree recursively assuming the user plays optimally,
 * and the bot plays randomly in Normal mode, or optimally in Master mode.
 * Integrates depth-discounting to favor faster wins and delay unavoidable losses.
 */
function solveOptimal(currentBoard, isUserTurn, mode, depth = 0) {
  const key = getOptimalCacheKey(currentBoard, isUserTurn, mode, depth);
  
  if (optimalCache[key] !== undefined) {
    return optimalCache[key];
  }

  const winner = checkWinner(currentBoard);
  if (winner === 'X') {
    return { win: 1.0 - 0.01 * depth, draw: 0, loss: 0.01 * depth };
  }
  if (winner === 'O') {
    return { win: 0, draw: 0.01 * depth, loss: 1.0 - 0.01 * depth };
  }
  if (winner === 'draw') {
    return { win: 0, draw: 1, loss: 0 };
  }

  const emptyIndices = [];
  for (let i = 0; i < 9; i++) {
    if (currentBoard[i] === null) emptyIndices.push(i);
  }

  if (isUserTurn) {
    // User plays optimally: maximizes user utility (Win first, then Draw)
    let bestProbs = { win: -1, draw: -1, loss: 2 };

    for (const idx of emptyIndices) {
      const nextBoard = [...currentBoard];
      nextBoard[idx] = 'X';
      const probs = solveOptimal(nextBoard, false, mode, depth + 1);
      
      if (isProbsBetterForUser(probs, bestProbs)) {
        bestProbs = probs;
      }
    }

    optimalCache[key] = bestProbs;
    return bestProbs;
  } else {
    // Bot's Turn
    if (mode === 'master') {
      // Master Bot: plays optimally to minimize User utility (maximize Bot win, then Bot draw)
      let worstProbs = { win: 2, draw: 2, loss: -1 };

      for (const idx of emptyIndices) {
        const nextBoard = [...currentBoard];
        nextBoard[idx] = 'O';
        const probs = solveOptimal(nextBoard, true, mode, depth + 1);
        
        if (isProbsWorseForUser(probs, worstProbs)) {
          worstProbs = probs;
        }
      }

      optimalCache[key] = worstProbs;
      return worstProbs;
    } else {
      // Normal Bot: plays randomly among empty squares
      let sumWin = 0;
      let sumDraw = 0;
      let sumLoss = 0;

      for (const idx of emptyIndices) {
        const nextBoard = [...currentBoard];
        nextBoard[idx] = 'O';
        const probs = solveOptimal(nextBoard, true, mode, depth + 1);
        sumWin += probs.win;
        sumDraw += probs.draw;
        sumLoss += probs.loss;
      }

      const totalCount = emptyIndices.length;
      const avgProbs = {
        win: sumWin / totalCount,
        draw: sumDraw / totalCount,
        loss: sumLoss / totalCount
      };

      optimalCache[key] = avgProbs;
      return avgProbs;
    }
  }
}

/**
 * Updates the user probability metrics dashboard with visual transitions
 */
function updateProbabilityDashboard() {
  const isUserTurn = (currentPlayer === 'X');
  const probs = solveProbabilities(board, isUserTurn);
  
  // Format percentage
  const winPercent = Math.round(probs.win * 100);
  const drawPercent = Math.round(probs.draw * 100);
  const lossPercent = Math.round(probs.loss * 100);

  // Update UI values
  txtProbWin.textContent = `${winPercent}%`;
  txtProbDraw.textContent = `${drawPercent}%`;
  txtProbLoss.textContent = `${lossPercent}%`;

  // Update bar lengths
  barProbWin.style.width = `${winPercent}%`;
  barProbDraw.style.width = `${drawPercent}%`;
  barProbLoss.style.width = `${lossPercent}%`;
}

/* --- GAME STATE & UI UPDATES --- */

function createMarkSvg(type) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "mark-svg");
  svg.setAttribute("viewBox", "0 0 100 100");

  if (type === 'X') {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "mark-x");
    
    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", "20");
    line1.setAttribute("y1", "20");
    line1.setAttribute("x2", "80");
    line1.setAttribute("y2", "80");
    
    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "80");
    line2.setAttribute("y1", "20");
    line2.setAttribute("x2", "20");
    line2.setAttribute("y2", "80");
    
    g.appendChild(line1);
    g.appendChild(line2);
    svg.appendChild(g);
  } else {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "mark-o");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "28");
    
    svg.appendChild(circle);
  }
  return svg;
}

function clearHintGlow() {
  cells.forEach(cell => cell.classList.remove('hint-glow'));
  if (hintTimeoutId) {
    clearTimeout(hintTimeoutId);
    hintTimeoutId = null;
  }
}

function updateStatusMessage() {
  statusCard.className = 'status-card glass-card'; // reset classes
  
  const winner = checkWinner(board);
  if (winner) {
    const wasActive = gameActive;
    gameActive = false;
    clearHintGlow();
    btnHint.disabled = true;
    
    if (winner === 'X') {
      statusMessage.innerHTML = '🎉 <span style="color: var(--color-green)">You Won!</span> Excellent play.';
      statusCard.classList.add('user-win');
      if (wasActive) GameAudio.playWin();
    } else if (winner === 'O') {
      statusMessage.innerHTML = '🤖 <span style="color: var(--color-magenta)">Bot Won!</span> Try again.';
      statusCard.classList.add('bot-win');
      if (wasActive) GameAudio.playLoss();
    } else {
      statusMessage.innerHTML = '🤝 <span style="color: var(--color-orange)">It\'s a Draw!</span> Good game.';
      statusCard.classList.add('draw-game');
      if (wasActive) GameAudio.playDraw();
    }
    return;
  }

  if (currentPlayer === 'X') {
    statusMessage.innerHTML = '👤 <span>Your Turn</span> &bull; Select a square';
    firstPlayerBadge.textContent = firstPlayer === 'user' ? 'You Went First' : 'Bot Went First';
  } else {
    statusMessage.innerHTML = '🤖 <span>Bot is thinking...</span>';
    firstPlayerBadge.textContent = firstPlayer === 'user' ? 'You Went First' : 'Bot Went First';
  }
}

/**
 * Evaluates the board state using Minimax to find the best move for Master Bot.
 * Returns a score: positive if O wins, negative if X wins, 0 for draw.
 */
function getMinimaxScore(currentBoard, depth, isBotTurn) {
  const winner = checkWinner(currentBoard);
  if (winner === 'O') return 10 - depth; // Bot wins (prefer faster wins)
  if (winner === 'X') return depth - 10; // User wins (prefer slower losses)
  if (winner === 'draw') return 0;

  const emptyIndices = [];
  for (let i = 0; i < 9; i++) {
    if (currentBoard[i] === null) emptyIndices.push(i);
  }

  if (isBotTurn) {
    let bestVal = -Infinity;
    for (const idx of emptyIndices) {
      const nextBoard = [...currentBoard];
      nextBoard[idx] = 'O';
      const val = getMinimaxScore(nextBoard, depth + 1, false);
      bestVal = Math.max(bestVal, val);
    }
    return bestVal;
  } else {
    let bestVal = Infinity;
    for (const idx of emptyIndices) {
      const nextBoard = [...currentBoard];
      nextBoard[idx] = 'X';
      const val = getMinimaxScore(nextBoard, depth + 1, true);
      bestVal = Math.min(bestVal, val);
    }
    return bestVal;
  }
}

/* --- BOT MOVE GENERATION --- */

function makeBotMove() {
  if (!gameActive) return;

  const emptyIndices = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) emptyIndices.push(i);
  }

  if (emptyIndices.length === 0) return;

  let targetIndex;

  if (botMode === 'master') {
    // Master Mode: Play Minimax-optimal move.
    let bestVal = -Infinity;
    let bestMoves = [];

    for (const idx of emptyIndices) {
      const nextBoard = [...board];
      nextBoard[idx] = 'O';
      
      const val = getMinimaxScore(nextBoard, 0, false);
      
      if (val > bestVal) {
        bestVal = val;
        bestMoves = [idx];
      } else if (val === bestVal) {
        bestMoves.push(idx);
      }
    }
    
    // Choose randomly among equally optimal moves
    targetIndex = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  } else {
    // Normal Mode: Play random move.
    targetIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  // Execute Move
  board[targetIndex] = 'O';
  const cell = document.querySelector(`.cell[data-index="${targetIndex}"]`);
  cell.appendChild(createMarkSvg('O'));
  cell.disabled = true;
  cell.setAttribute('aria-label', `Square ${targetIndex + 1}, Played O`);

  // Play Bot Move sound
  GameAudio.playBotMove();

  // Switch Turn
  currentPlayer = 'X';
  updateStatusMessage();
  updateProbabilityDashboard();
}

/* --- CELL CLICK HANDLER --- */

function handleCellClick(e) {
  const cell = e.target.closest('.cell');
  if (!cell || !gameActive || currentPlayer !== 'X') return;

  const index = parseInt(cell.getAttribute('data-index'));
  if (board[index] !== null) return;

  // Clear any existing hint glows
  clearHintGlow();

  // User plays X
  board[index] = 'X';
  cell.appendChild(createMarkSvg('X'));
  cell.disabled = true;
  cell.setAttribute('aria-label', `Square ${index + 1}, Played X`);

  // Play User Move sound
  GameAudio.playUserMove();

  // Check Game State
  const winner = checkWinner(board);
  if (winner) {
    updateStatusMessage();
    updateProbabilityDashboard();
    return;
  }

  // Switch to Bot
  currentPlayer = 'O';
  updateStatusMessage();
  updateProbabilityDashboard();

  // Schedule Bot Move with animation delay
  botTimeoutId = setTimeout(() => {
    makeBotMove();
  }, 600);
}

/* --- HINT GENERATION --- */

function triggerHint() {
  if (!gameActive || currentPlayer !== 'X') return;

  // Clear existing glows
  clearHintGlow();

  // Play Hint sound
  GameAudio.playHint();

  const emptyIndices = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) emptyIndices.push(i);
  }

  if (emptyIndices.length === 0) return;

  let bestMoves = [];
  let bestProbs = { win: -1, draw: -1, loss: 2 };

  for (const idx of emptyIndices) {
    const nextBoard = [...board];
    nextBoard[idx] = 'X';
    
    // Solve with next turn as Bot's turn under optimal user play assumption
    // Set depth to 1 because user has made 1 move (at idx)
    const probs = solveOptimal(nextBoard, false, botMode, 1);
    
    // Compare lexicographically: first by win probability, then by draw probability
    if (isProbsBetterForUser(probs, bestProbs)) {
      bestProbs = probs;
      bestMoves = [idx];
    } else if (isProbsEqual(probs, bestProbs)) {
      bestMoves.push(idx);
    }
  }

  // Highlight the best move square (pick one randomly among the equally best moves)
  if (bestMoves.length > 0) {
    const targetIdx = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    const cell = document.querySelector(`.cell[data-index="${targetIdx}"]`);
    if (cell) {
      cell.classList.add('hint-glow');
    }
  }

  // Automatically clear hint glow after 3 seconds
  hintTimeoutId = setTimeout(() => {
    clearHintGlow();
  }, 3000);
}

/* --- GAME INITIATION / RESET --- */

function initGame() {
  // Clear Timers
  if (botTimeoutId) {
    clearTimeout(botTimeoutId);
    botTimeoutId = null;
  }

  // Clear memoization caches to ensure a fresh evaluation slate
  for (const key in probabilityCache) delete probabilityCache[key];
  for (const key in optimalCache) delete optimalCache[key];

  // Reset Game States
  board = Array(9).fill(null);
  gameActive = true;
  btnHint.disabled = false;
  clearHintGlow();

  // Reset Board Cells UI
  cells.forEach(cell => {
    cell.innerHTML = '';
    cell.disabled = false;
    const idx = cell.getAttribute('data-index');
    cell.setAttribute('aria-label', `Square ${parseInt(idx) + 1}, Empty`);
  });

  // Randomly select First Player
  firstPlayer = Math.random() < 0.5 ? 'user' : 'bot';
  
  if (firstPlayer === 'user') {
    currentPlayer = 'X';
    updateStatusMessage();
    updateProbabilityDashboard();
  } else {
    currentPlayer = 'O';
    updateStatusMessage();
    updateProbabilityDashboard();
    
    // Schedule bot first move
    botTimeoutId = setTimeout(() => {
      makeBotMove();
    }, 600);
  }
}

/* --- CONFIGURATION CONTROLS --- */

function setGameMode(mode) {
  if (botMode === mode) return;
  
  botMode = mode;
  
  if (mode === 'normal') {
    btnModeNormal.classList.add('active');
    btnModeNormal.setAttribute('aria-pressed', 'true');
    btnModeMaster.classList.remove('active');
    btnModeMaster.setAttribute('aria-pressed', 'false');
  } else {
    btnModeMaster.classList.add('active');
    btnModeMaster.setAttribute('aria-pressed', 'true');
    btnModeNormal.classList.remove('active');
    btnModeNormal.setAttribute('aria-pressed', 'false');
  }

  // Automatically restart the game when switching modes
  initGame();
}

/* --- EVENT LISTENERS --- */

cells.forEach(cell => {
  cell.addEventListener('click', (e) => {
    GameAudio.resume();
    handleCellClick(e);
  });
});

btnModeNormal.addEventListener('click', () => {
  GameAudio.resume();
  setGameMode('normal');
});
btnModeMaster.addEventListener('click', () => {
  GameAudio.resume();
  setGameMode('master');
});
btnHint.addEventListener('click', () => {
  GameAudio.resume();
  triggerHint();
});
btnRestart.addEventListener('click', () => {
  GameAudio.resume();
  initGame();
});

// Run initialization on load
window.addEventListener('DOMContentLoaded', () => {
  initGame();
});
