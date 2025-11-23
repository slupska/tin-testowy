// --- Stałe gry ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;

const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");
ctx.scale(BLOCK_SIZE, BLOCK_SIZE); // rysujemy w jednostkach siatki

const scoreEl = document.getElementById("score");

// Kształty (tetromino)
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
    O: [
        [1, 1],
        [1, 1],
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
};

const COLORS = {
    I: "#22d3ee",
    J: "#3b82f6",
    L: "#f97316",
    O: "#eab308",
    S: "#22c55e",
    T: "#a855f7",
    Z: "#ef4444",
};

// --- Stan gry ---
let board = createEmptyBoard();
let currentPiece = null;
let score = 0;
let dropInterval = 600; // ms
let lastTime = 0;
let dropCounter = 0;
let isPaused = false;
let gameOver = false;

function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
    const types = Object.keys(SHAPES);
    const randType = types[(types.length * Math.random()) | 0];
    return {
        type: randType,
        shape: SHAPES[randType].map((row) => [...row]),
        color: COLORS[randType],
        x: 3,
        y: 0,
    };
}

function rotate(matrix) {
    const N = matrix.length;
    const result = matrix.map(() => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            result[x][N - 1 - y] = matrix[y][x];
        }
    }
    return result;
}

function isValidMove(piece, offsetX, offsetY, testShape = piece.shape) {
    for (let y = 0; y < testShape.length; y++) {
        for (let x = 0; x < testShape[y].length; x++) {
            if (!testShape[y][x]) continue;
            const newX = piece.x + x + offsetX;
            const newY = piece.y + y + offsetY;

            if (newX < 0 || newX >= COLS || newY >= ROWS) return false;
            if (newY < 0) continue; // nad planszą może być

            if (board[newY][newX]) return false;
        }
    }
    return true;
}

function merge(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = piece.type;
                }
            }
        }
    }
}

function clearLines() {
    let lines = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) {
                continue outer;
            }
        }
        // pełna linia
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        lines++;
        y++; // sprawdź ponownie ten sam indeks
    }

    if (lines > 0) {
        const lineScores = [0, 40, 100, 300, 1200]; // klasyczne wartości
        score += lineScores[lines];
        scoreEl.textContent = score;
    }
}

function drawCell(x, y, type) {
    ctx.fillStyle = type ? COLORS[type] : "#020617";
    ctx.fillRect(x, y, 1, 1);

    if (type) {
        ctx.strokeStyle = "rgba(15,23,42,0.6)";
        ctx.lineWidth = 0.05;
        ctx.strokeRect(x + 0.03, y + 0.03, 0.94, 0.94);
    }
}

function drawBoard() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            drawCell(x, y, board[y][x]);
        }
    }
}

function drawPiece(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const drawX = piece.x + x;
                const drawY = piece.y + y;
                if (drawY >= 0) {
                    drawCell(drawX, drawY, piece.type);
                }
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    if (currentPiece) drawPiece(currentPiece);
}

function drop() {
    if (!currentPiece) return;
    if (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
    } else {
        merge(currentPiece);
        clearLines();
        currentPiece = randomPiece();

        if (!isValidMove(currentPiece, 0, 0)) {
            gameOver = true;
            alert("Koniec gry! Wynik: " + score);
            resetGame();
            return;
        }
    }
}

function hardDrop() {
    if (!currentPiece) return;
    while (isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
    }
    drop(); // merge + nowa figura
}

function resetGame() {
    board = createEmptyBoard();
    currentPiece = randomPiece();
    score = 0;
    scoreEl.textContent = score;
    dropInterval = 600;
    gameOver = false;
    isPaused = false;
}

// --- Pętla gry ---
function update(time = 0) {
    if (!currentPiece) currentPiece = randomPiece();
    if (!isPaused && !gameOver) {
        const delta = time - lastTime;
        lastTime = time;
        dropCounter += delta;
        if (dropCounter > dropInterval) {
            drop();
            dropCounter = 0;
        }
        draw();
    }
    requestAnimationFrame(update);
}

// --- Sterowanie klawiaturą (desktop) ---
document.addEventListener("keydown", (e) => {
    if (!currentPiece || gameOver) return;

    switch (e.code) {
        case "ArrowLeft":
            if (isValidMove(currentPiece, -1, 0)) currentPiece.x--;
            break;
        case "ArrowRight":
            if (isValidMove(currentPiece, 1, 0)) currentPiece.x++;
            break;
        case "ArrowDown":
            if (isValidMove(currentPiece, 0, 1)) currentPiece.y++;
            break;
        case "ArrowUp": {
            const rotatedShape = rotate(currentPiece.shape);
            if (isValidMove(currentPiece, 0, 0, rotatedShape)) {
                currentPiece.shape = rotatedShape;
            }
            break;
        }
        case "Space":
            e.preventDefault();
            hardDrop();
            break;
        case "KeyP":
            isPaused = !isPaused;
            break;
    }
    draw();
});

// --- Sterowanie mobilne (przyciski) ---
document.getElementById("leftBtn").addEventListener("click", () => {
    if (currentPiece && isValidMove(currentPiece, -1, 0)) {
        currentPiece.x--;
        draw();
    }
});

document.getElementById("rightBtn").addEventListener("click", () => {
    if (currentPiece && isValidMove(currentPiece, 1, 0)) {
        currentPiece.x++;
        draw();
    }
});

document.getElementById("downBtn").addEventListener("click", () => {
    if (currentPiece && isValidMove(currentPiece, 0, 1)) {
        currentPiece.y++;
        draw();
    }
});

document.getElementById("rotateBtn").addEventListener("click", () => {
    if (!currentPiece) return;
    const rotatedShape = rotate(currentPiece.shape);
    if (isValidMove(currentPiece, 0, 0, rotatedShape)) {
        currentPiece.shape = rotatedShape;
        draw();
    }
});

// Start gry
resetGame();
update();
