import { db } from './config.js';
import { ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { MazeEngine } from './maze.js';

let roomId, playerRole, mazeData, engine;
let tileSize = 20;
let myPos = { x: 1, y: 1 };
let aiTimer = null;

// 動畫狀態
let visualPos = {};  // { id: {x, y} } 目前渲染位置（像素）
let anims = {};      // { id: {fromX, fromY, toX, toY, startTime} }
let latestData = null;
let animFrameId = null;
const ANIM_MS = 120; // 每格動畫時長（毫秒）

const mCanvas = document.getElementById('mazeCanvas');
const fCanvas = document.getElementById('fogCanvas');
const mCtx = mCanvas.getContext('2d');
const fCtx = fCanvas.getContext('2d');

// --- 按鈕事件綁定 ---
document.getElementById('btn20').onclick = () => startGame(21);
document.getElementById('btn40').onclick = () => startGame(41);
document.getElementById('btnJoin').onclick = () => joinRoom();

async function startGame(size) {
    roomId = Math.random().toString(36).substring(7);
    playerRole = 'player1';
    engine = new MazeEngine(size);
    mazeData = engine.generate(1, 1);

    await set(ref(db, `rooms/${roomId}`), {
        status: 'waiting',
        maze: mazeData,
        size: size,
        goal: { x: size - 2, y: size - 2 },
        players: { player1: { x: 1, y: 1 } },
        ai: { x: size - 2, y: 1 }
    });
    initGameListener();
}

function joinRoom() {
    roomId = document.getElementById('roomInput').value;
    if(!roomId) return alert("請輸入 ID");
    playerRole = 'player2';
    update(ref(db, `rooms/${roomId}`), { status: 'playing' });
    update(ref(db, `rooms/${roomId}/players/player2`), { x: 1, y: 1 });
    initGameListener();
}

// 移動某個角色到指定格子，若已有視覺位置則播放動畫
function moveTo(id, gridX, gridY) {
    const toX = gridX * tileSize;
    const toY = gridY * tileSize;
    if (!visualPos[id]) {
        // 第一次出現，直接放置不動畫
        visualPos[id] = { x: toX, y: toY };
        return;
    }
    anims[id] = {
        fromX: visualPos[id].x,
        fromY: visualPos[id].y,
        toX, toY,
        startTime: performance.now()
    };
}

function initGameListener() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('displayId').innerText = roomId;
    document.getElementById('displayRole').innerText = playerRole;

    onValue(ref(db, `rooms/${roomId}`), (snap) => {
        const data = snap.val();
        if (!data) return;
        mazeData = data.maze;
        engine = new MazeEngine(data.size);
        engine.grid = mazeData;
        tileSize = data.size === 21 ? 25 : 15;

        if (fCanvas.width === 0) initFog(data.size);

        // 遠端玩家更新動畫；本地玩家初次出現時設定初始位置
        for (const id in data.players) {
            if (id !== playerRole) {
                moveTo(id, data.players[id].x, data.players[id].y);
            } else if (!visualPos[id]) {
                visualPos[id] = { x: data.players[id].x * tileSize, y: data.players[id].y * tileSize };
            }
        }
        if (data.ai) {
            moveTo('ai', data.ai.x, data.ai.y);
        }
        latestData = data;

        if (!animFrameId) startAnimLoop();

        if (playerRole === 'player1' && data.status === 'playing' && !aiTimer) {
            startAI();
        }
    });
}

function startAI() {
    aiTimer = setInterval(() => {
        onValue(ref(db, `rooms/${roomId}`), (snap) => {
            const data = snap.val();
            if (!data || data.status !== 'playing') return;
            const p1 = data.players.player1;
            const path = engine.findPath(data.ai, p1);
            if (path.length > 0) {
                update(ref(db, `rooms/${roomId}/ai`), { x: path[0].x, y: path[0].y });
            }
        }, { onlyOnce: true });
    }, 800);
}

function startAnimLoop() {
    function loop() {
        animFrameId = requestAnimationFrame(loop);
        if (!latestData || !mazeData) return;

        // 時間驅動 tween：每個進行中的動畫依經過時間插值
        const now = performance.now();
        for (const id of Object.keys(anims)) {
            const a = anims[id];
            const t = Math.min(1, (now - a.startTime) / ANIM_MS);
            const ease = 1 - Math.pow(1 - t, 2); // ease-out quadratic
            visualPos[id] = {
                x: a.fromX + (a.toX - a.fromX) * ease,
                y: a.fromY + (a.toY - a.fromY) * ease
            };
            if (t >= 1) delete anims[id];
        }

        drawAnimated(latestData);
    }
    animFrameId = requestAnimationFrame(loop);
}

function drawAnimated(data) {
    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
    // 畫迷宮
    mazeData.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === 1) { mCtx.fillStyle = '#30363d'; mCtx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize); }
        });
    });
    // 畫終點
    mCtx.fillStyle = '#f1e05a';
    mCtx.fillRect(data.goal.x*tileSize, data.goal.y*tileSize, tileSize, tileSize);
    // 畫玩家
    for (const id in data.players) {
        const vp = visualPos[id];
        if (!vp) continue;
        mCtx.fillStyle = id === 'player1' ? '#58a6ff' : '#f85149';
        mCtx.fillRect(vp.x + 2, vp.y + 2, tileSize - 4, tileSize - 4);
    }
    // 畫 AI
    if (data.ai && visualPos['ai']) {
        const vp = visualPos['ai'];
        mCtx.fillStyle = '#a371f7';
        mCtx.fillRect(vp.x + 2, vp.y + 2, tileSize - 4, tileSize - 4);
    }
}

function initFog(size) {
    fCanvas.width = mCanvas.width = size * tileSize;
    fCanvas.height = mCanvas.height = size * tileSize;
    fCtx.fillStyle = 'black';
    fCtx.fillRect(0, 0, fCanvas.width, fCanvas.height);
    revealFog(1, 1);
}

function revealFog(x, y) {
    fCtx.globalCompositeOperation = 'destination-out';
    fCtx.beginPath();
    fCtx.arc(x * tileSize + tileSize/2, y * tileSize + tileSize/2, tileSize * 2, 0, Math.PI*2);
    fCtx.fill();
}

window.onkeydown = (e) => {
    let { x, y } = myPos;
    if (e.key === 'ArrowUp' || e.key === 'w') y--;
    else if (e.key === 'ArrowDown' || e.key === 's') y++;
    else if (e.key === 'ArrowLeft' || e.key === 'a') x--;
    else if (e.key === 'ArrowRight' || e.key === 'd') x++;
    else return;

    if (mazeData && mazeData[y] && mazeData[y][x] === 0) {
        myPos = { x, y };
        moveTo(playerRole, x, y); // 立刻開始動畫，不等 Firebase
        revealFog(x, y);
        update(ref(db, `rooms/${roomId}/players/${playerRole}`), myPos);
    }
};
