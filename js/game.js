/**
 * Campo Minado — lógica e renderização 100% no front-end.
 */
(function () {
  const LEVELS = {
    veryEasy: { rows: 9, cols: 9, mines: 10, noLose: true },
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 },
  };

  const FACES = {
    normal: "🐱",
    suspense: "😺",
    win: "😻",
    lose: "😿",
  };

  const boardEl = document.getElementById("board");
  const minesCounterEl = document.getElementById("mines-counter");
  const timerCounterEl = document.getElementById("timer-counter");
  const faceBtn = document.getElementById("face-btn");
  const levelButtons = document.querySelectorAll(".level-btn");
  const overlayEl = document.getElementById("overlay");
  const overlayIconEl = document.getElementById("overlay-icon");
  const overlayTextEl = document.getElementById("overlay-text");
  const restartBtn = document.getElementById("restart-btn");

  let currentLevel = "beginner";
  let rows, cols, minesTotal;
  let board = []; // matriz de células { isMine, isRevealed, isFlagged, adjacent, exploded }
  let cellEls = []; // matriz paralela de elementos DOM
  let firstClickDone = false;
  let gameOver = false;
  let flagsPlaced = 0;
  let revealedCount = 0;
  let timerInterval = null;
  let secondsElapsed = 0;
  let cascadeEnabled = true;
  let noLoseMode = false;

  function pad3(n) {
    return String(Math.max(0, Math.min(999, n))).padStart(3, "0");
  }

  function setFace(face) {
    faceBtn.textContent = FACES[face] || FACES.normal;
  }

  function updateMinesCounter() {
    minesCounterEl.textContent = pad3(minesTotal - flagsPlaced);
  }

  function updateTimer() {
    timerCounterEl.textContent = pad3(secondsElapsed);
  }

  function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    updateTimer();
    timerInterval = setInterval(() => {
      secondsElapsed++;
      updateTimer();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function hideOverlay() {
    overlayEl.classList.add("hidden");
  }

  function showOverlay(won) {
    overlayIconEl.textContent = won ? "😻" : "😿";
    overlayTextEl.textContent = won
      ? "Você venceu! Parabéns! 🎉"
      : "Você perdeu! O gatinho explodiu. 💥";
    overlayEl.classList.remove("hidden");
  }

  function inBounds(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }

  function forEachNeighbor(r, c, cb) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) cb(nr, nc);
      }
    }
  }

  function buildEmptyBoard() {
    board = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacent: 0,
          exploded: false,
          defused: false,
        });
      }
      board.push(row);
    }
  }

  function placeMines(excludeR, excludeC) {
    const forbidden = new Set();
    forEachNeighbor(excludeR, excludeC, (r, c) => forbidden.add(`${r},${c}`));
    forbidden.add(`${excludeR},${excludeC}`);

    let placed = 0;
    while (placed < minesTotal) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      const key = `${r},${c}`;
      if (forbidden.has(key) || board[r][c].isMine) continue;
      board[r][c].isMine = true;
      placed++;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].isMine) continue;
        let count = 0;
        forEachNeighbor(r, c, (nr, nc) => {
          if (board[nr][nc].isMine) count++;
        });
        board[r][c].adjacent = count;
      }
    }
  }

  function buildBoardDOM() {
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    cellEls = [];

    for (let r = 0; r < rows; r++) {
      const rowEls = [];
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;

        cell.addEventListener("click", () => onCellLeftClick(r, c));
        cell.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          onCellRightClick(r, c);
        });
        cell.addEventListener("mousedown", (e) => {
          if (gameOver) return;
          if (e.button === 0) setFace("suspense");
        });
        cell.addEventListener("mouseup", () => {
          if (!gameOver) setFace("normal");
        });
        cell.addEventListener("mouseleave", () => {
          if (!gameOver) setFace("normal");
        });

        // Suporte a toque (celular/tablet): toque rápido revela a célula,
        // toque e segure (long press) marca/desmarca bandeira — já que não
        // existe clique direito em telas touch.
        let touchTimer = null;
        let longPressFired = false;
        let touchMoved = false;

        cell.addEventListener(
          "touchstart",
          () => {
            if (gameOver) return;
            touchMoved = false;
            longPressFired = false;
            touchTimer = setTimeout(() => {
              longPressFired = true;
              onCellRightClick(r, c);
              if (navigator.vibrate) navigator.vibrate(20);
            }, 450);
          },
          { passive: true }
        );

        cell.addEventListener(
          "touchmove",
          () => {
            touchMoved = true;
            clearTimeout(touchTimer);
          },
          { passive: true }
        );

        cell.addEventListener("touchend", (e) => {
          clearTimeout(touchTimer);
          if (longPressFired || touchMoved) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          onCellLeftClick(r, c);
        });

        boardEl.appendChild(cell);
        rowEls.push(cell);
      }
      cellEls.push(rowEls);
    }
  }

  function renderCell(r, c) {
    const cellData = board[r][c];
    const el = cellEls[r][c];

    el.classList.toggle("revealed", cellData.isRevealed);
    el.classList.toggle("flagged", cellData.isFlagged);
    el.classList.toggle("mine", cellData.isMine && cellData.isRevealed);
    el.classList.toggle("exploded", cellData.exploded);
    el.classList.toggle("defused", cellData.defused);

    if (cellData.isFlagged && !cellData.isRevealed) {
      el.textContent = "🚩";
      delete el.dataset.count;
      return;
    }

    if (!cellData.isRevealed) {
      el.textContent = "";
      delete el.dataset.count;
      return;
    }

    if (cellData.isMine) {
      el.textContent = cellData.exploded ? "💥" : cellData.defused ? "🐾" : "💣";
      delete el.dataset.count;
      return;
    }

    if (cellData.adjacent > 0) {
      el.textContent = String(cellData.adjacent);
      el.dataset.count = String(cellData.adjacent);
    } else {
      el.textContent = "";
      delete el.dataset.count;
    }
  }

  function revealCell(r, c) {
    const cellData = board[r][c];
    if (cellData.isRevealed || cellData.isFlagged) return;

    cellData.isRevealed = true;
    revealedCount++;
    renderCell(r, c);

    if (cascadeEnabled && cellData.adjacent === 0 && !cellData.isMine) {
      forEachNeighbor(r, c, (nr, nc) => {
        if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) {
          revealCell(nr, nc);
        }
      });
    }
  }

  function revealAllMines(explodedR, explodedC) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellData = board[r][c];
        if (cellData.isMine) {
          cellData.isRevealed = true;
          cellData.exploded = r === explodedR && c === explodedC;
          renderCell(r, c);
        } else if (cellData.isFlagged && !cellData.isMine) {
          // bandeira errada: mostra marcação visual mantendo a bandeira
          renderCell(r, c);
        }
      }
    }
  }

  function countFlaggedNeighbors(r, c) {
    let count = 0;
    forEachNeighbor(r, c, (nr, nc) => {
      if (board[nr][nc].isFlagged) count++;
    });
    return count;
  }

  function chordReveal(r, c) {
    const cellData = board[r][c];
    if (!cellData.isRevealed || cellData.adjacent === 0) return;
    if (countFlaggedNeighbors(r, c) !== cellData.adjacent) return;

    forEachNeighbor(r, c, (nr, nc) => {
      if (gameOver) return;
      const neighbor = board[nr][nc];
      if (!neighbor.isFlagged && !neighbor.isRevealed) {
        if (neighbor.isMine) {
          if (noLoseMode) {
            defuseMine(nr, nc);
          } else {
            triggerLoss(nr, nc);
          }
        } else {
          revealCell(nr, nc);
        }
      }
    });
  }

  function onCellLeftClick(r, c) {
    if (gameOver) return;
    const cellData = board[r][c];

    if (!firstClickDone) {
      placeMines(r, c);
      firstClickDone = true;
      startTimer();
    }

    if (cellData.isFlagged) return;

    if (cellData.isRevealed) {
      chordReveal(r, c);
    } else if (cellData.isMine) {
      if (noLoseMode) {
        defuseMine(r, c);
      } else {
        triggerLoss(r, c);
      }
    } else {
      revealCell(r, c);
      spawnHitConfetti(r, c);
    }

    setFace("normal");
    checkWinCondition();
  }

  function onCellRightClick(r, c) {
    if (gameOver) return;
    const cellData = board[r][c];
    if (cellData.isRevealed) return;

    if (!cellData.isFlagged && flagsPlaced >= minesTotal) return;

    cellData.isFlagged = !cellData.isFlagged;
    flagsPlaced += cellData.isFlagged ? 1 : -1;
    updateMinesCounter();
    renderCell(r, c);
  }

  function spawnHitConfetti(r, c) {
    const el = cellEls[r][c];
    const rect = el.getBoundingClientRect();
    window.Confetti.burst({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      count: 14,
    });
  }

  function defuseMine(r, c) {
    const cellData = board[r][c];
    if (cellData.isRevealed) return;
    cellData.isRevealed = true;
    cellData.defused = true;
    renderCell(r, c);
  }

  function triggerLoss(explodedR, explodedC) {
    if (gameOver) return;
    gameOver = true;
    stopTimer();
    board[explodedR][explodedC].exploded = true;
    revealAllMines(explodedR, explodedC);
    setFace("lose");
    showOverlay(false);
  }

  function triggerWin() {
    gameOver = true;
    stopTimer();

    // marca todas as minas restantes com bandeira automaticamente
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].isMine && !board[r][c].isFlagged && !board[r][c].isRevealed) {
          board[r][c].isFlagged = true;
          flagsPlaced++;
          renderCell(r, c);
        }
      }
    }
    updateMinesCounter();

    setFace("win");
    showOverlay(true);
    window.Confetti.launch({ durationMs: 3500, particleCount: 220 });
  }

  function checkWinCondition() {
    const totalCells = rows * cols;
    const safeCells = totalCells - minesTotal;
    if (revealedCount >= safeCells) {
      triggerWin();
    }
  }

  function startNewGame(level) {
    currentLevel = level || currentLevel;
    const config = LEVELS[currentLevel];
    rows = config.rows;
    cols = config.cols;
    minesTotal = config.mines;
    cascadeEnabled = config.cascade !== false;
    noLoseMode = !!config.noLose;

    firstClickDone = false;
    gameOver = false;
    flagsPlaced = 0;
    revealedCount = 0;
    secondsElapsed = 0;

    stopTimer();
    updateTimer();
    updateMinesCounter();
    setFace("normal");
    hideOverlay();

    buildEmptyBoard();
    buildBoardDOM();

    levelButtons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.level === currentLevel)
    );
  }

  // Eventos globais
  faceBtn.addEventListener("click", () => startNewGame());
  restartBtn.addEventListener("click", () => startNewGame());

  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => startNewGame(btn.dataset.level));
  });

  // Evita que o clique direito abra o menu de contexto do navegador
  boardEl.addEventListener("contextmenu", (e) => e.preventDefault());

  // Inicializa o jogo
  startNewGame("beginner");
})();
