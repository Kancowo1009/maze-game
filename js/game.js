import { db } from './config.js';
import { ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { MazeEngine } from './maze.js';

let roomId, playerRole, mazeData, engine;
let tileSize = 20;
let myPos = { x: 1, y: 1 };
let aiTimer = null;

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
        ai: { x: size - 2, y: 1 } // AI 從右上角出發
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
        draw(data);
        
        // 如果是房主且遊戲開始，啟動 AI
        if (playerRole === 'player1' && data.status === 'playing' && !aiTimer) {
            startAI();
        }
    });
}

function startAI() {
    aiTimer = setInterval(async () => {
        // AI 抓最近的玩家
        onValue(ref(db, `rooms/${roomId}`), (snap) => {
            const data = snap.val();
            if (!data || data.status !== 'playing') return;
            const p1 = data.players.player1;
            const path = engine.findPath(data.ai, p1);
            if (path.length > 0) {
                update(ref(db, `rooms/${roomId}/ai`), { x: path[0].x, y: path[0].y });
            }
        }, { onlyOnce: true });
    }, 800); // AI 每 0.8 秒動一次
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

function draw(data) {
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
    for (let id in data.players) {
        const p = data.players[id];
        mCtx.fillStyle = id === 'player1' ? '#58a6ff' : '#f85149';
        mCtx.fillRect(p.x*tileSize+2, p.y*tileSize+2, tileSize-4, tileSize-4);
    }
    // 畫 AI (紫色)
    if(data.ai) {
        mCtx.fillStyle = '#a371f7';
        mCtx.fillRect(data.ai.x*tileSize+2, data.ai.y*tileSize+2, tileSize-4, tileSize-4);
    }
}

window.onkeydown = (e) => {
    let { x, y } = myPos;
    if (e.key === 'ArrowUp' || e.key === 'w') y--;
    else if (e.key === 'ArrowDown' || e.key === 's') y++;
    else if (e.key === 'ArrowLeft' || e.key === 'a') x--;
    else if (e.key === 'ArrowRight' || e.key === 'd') x++;

    if (mazeData && mazeData[y] && mazeData[y][x] === 0) {
        myPos = { x, y };
        revealFog(x, y);
        update(ref(db, `rooms/${roomId}/players/${playerRole}`), myPos);
    }
};