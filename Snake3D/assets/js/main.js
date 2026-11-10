/**
 * main.js
 * Bootstrap de la escena Three.js, bucle de render, entrada de usuario y HUD.
 */
import * as THREE from 'three';
import { SnakeGame } from './game.js';

const GRID = 20;
const HALF = GRID / 2;
const HS_KEY = 'snake3d.highscore';

// ---------- Referencias del DOM ----------
const canvas = document.getElementById('scene');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('highscore');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const overlayStats = document.getElementById('overlay-stats');
const finalScoreEl = document.getElementById('final-score');
const finalHighEl = document.getElementById('final-high');
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');

// ---------- Estado del juego ----------
const game = new SnakeGame({ gridSize: GRID, tickMs: 140 });
let uiState = 'start'; // start | playing | paused | gameover

// ---------- Three.js ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 26, 48);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
camera.position.set(0, 20, 20);
camera.lookAt(0, 0, 0);

// Luces
scene.add(new THREE.AmbientLight(0x8899ff, 0.55));
scene.add(new THREE.HemisphereLight(0x88aaff, 0x080820, 0.7));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.7);
dirLight.position.set(12, 24, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
const shadowExtent = 16;
dirLight.shadow.camera.left = -shadowExtent;
dirLight.shadow.camera.right = shadowExtent;
dirLight.shadow.camera.top = shadowExtent;
dirLight.shadow.camera.bottom = -shadowExtent;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 60;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Tablero
const board = new THREE.Mesh(
  new THREE.BoxGeometry(GRID, 0.6, GRID),
  new THREE.MeshStandardMaterial({ color: 0x121a33, roughness: 0.9, metalness: 0.1 })
);
board.position.y = -0.3;
board.receiveShadow = true;
scene.add(board);

const grid = new THREE.GridHelper(GRID, GRID, 0x2b3a66, 0x1b2547);
grid.position.y = 0.01;
scene.add(grid);

// Borde luminoso
const border = new THREE.Mesh(
  new THREE.BoxGeometry(GRID + 0.5, 0.5, GRID + 0.5),
  new THREE.MeshStandardMaterial({
    color: 0x1e2a52,
    emissive: 0x1b3a8a,
    emissiveIntensity: 0.5,
    roughness: 0.6,
  })
);
border.position.y = -0.4;
scene.add(border);

// ---------- Serpiente (pool de mallas) ----------
const segGeo = new THREE.BoxGeometry(0.86, 0.86, 0.86);
const snakeGroup = new THREE.Group();
scene.add(snakeGroup);

const segMeshes = [];
const MAX_SEG = GRID * GRID;
for (let i = 0; i < MAX_SEG; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2ee6a6,
    emissive: 0x0d5c3f,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(segGeo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.visible = false;
  snakeGroup.add(mesh);
  segMeshes.push(mesh);
}

// ---------- Comida ----------
const food = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.38, 0),
  new THREE.MeshStandardMaterial({
    color: 0xff5d73,
    emissive: 0xff2d55,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.3,
  })
);
food.castShadow = true;
scene.add(food);
food.add(new THREE.PointLight(0xff5577, 1.2, 8, 2));

// ---------- Utilidades ----------
function gridToWorld(x, z) {
  return { x: x - HALF + 0.5, z: z - HALF + 0.5 };
}

function getHigh() {
  return parseInt(localStorage.getItem(HS_KEY) || '0', 10) || 0;
}
function setHigh(v) {
  localStorage.setItem(HS_KEY, String(v));
}

function updateHud() {
  scoreEl.textContent = String(game.score);
  highEl.textContent = String(getHigh());
}

// ---------- Render de entidades ----------
function renderSnake() {
  const segs = game.getSegments();
  for (let i = 0; i < segMeshes.length; i++) {
    const mesh = segMeshes[i];
    if (i < segs.length) {
      const s = segs[i];
      const w = gridToWorld(s.x, s.z);
      mesh.visible = true;
      mesh.position.set(w.x, 0.43, w.z);

      if (i === 0) {
        mesh.material.color.setHex(0x7cffb2);
        mesh.material.emissive.setHex(0x1f8f4d);
        mesh.material.emissiveIntensity = 0.7;
        mesh.scale.setScalar(1.06);
      } else {
        const t = Math.min(i / 24, 1);
        const hue = 0.45 - t * 0.12;
        mesh.material.color.setHSL(hue, 0.75, 0.5 - t * 0.12);
        mesh.material.emissive.setHSL(hue, 0.8, 0.18);
        mesh.material.emissiveIntensity = 0.35;
        mesh.scale.setScalar(1 - Math.min(i * 0.004, 0.18));
      }
    } else {
      mesh.visible = false;
    }
  }
}

function renderFood() {
  const w = gridToWorld(game.food.x, game.food.z);
  food.position.set(w.x, 0.5, w.z);
}

// ---------- Overlay / estados ----------
function showOverlay(mode) {
  overlay.classList.remove('hidden');
  if (mode === 'start') {
    overlayText.textContent = 'Usa las flechas o WASD para moverte. Come los orbes para crecer.';
    overlayStats.classList.add('hidden');
    btnPlay.textContent = 'Jugar';
  } else if (mode === 'pause') {
    overlayText.textContent = 'Juego en pausa.';
    overlayStats.classList.add('hidden');
    btnPlay.textContent = 'Continuar';
  } else if (mode === 'gameover') {
    overlayText.textContent = game.won
      ? '¡Completaste el tablero! Increíble.'
      : '¡Chocaste! Fin del juego.';
    overlayStats.classList.remove('hidden');
    finalScoreEl.textContent = String(game.score);
    finalHighEl.textContent = String(getHigh());
    btnPlay.textContent = 'Reiniciar';
  }
}
function hideOverlay() {
  overlay.classList.add('hidden');
}

function startGame() {
  game.reset();
  game.started = true;
  game.paused = false;
  uiState = 'playing';
  hideOverlay();
  updateHud();
  renderFood();
}

function pauseGame() {
  if (uiState !== 'playing') return;
  game.paused = true;
  uiState = 'paused';
  showOverlay('pause');
}

function resumeGame() {
  if (uiState !== 'paused') return;
  game.paused = false;
  uiState = 'playing';
  hideOverlay();
}

function onGameOver() {
  uiState = 'gameover';
  if (game.score > getHigh()) setHigh(game.score);
  updateHud();
  showOverlay('gameover');
}

// ---------- Entrada: botones ----------
btnPlay.addEventListener('click', () => {
  if (uiState === 'paused') resumeGame();
  else startGame();
});

btnPause.addEventListener('click', () => {
  if (uiState === 'playing') pauseGame();
  else if (uiState === 'paused') resumeGame();
});

// ---------- Entrada: teclado ----------
const keyMap = {
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
};

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === ' ' || key.startsWith('arrow')) e.preventDefault();

  if (key === 'enter') {
    if (uiState === 'start' || uiState === 'gameover') startGame();
    return;
  }
  if (key === ' ') {
    if (uiState === 'playing') pauseGame();
    else if (uiState === 'paused') resumeGame();
    return;
  }

  const dirName = keyMap[key];
  if (dirName) {
    if (uiState === 'start') startGame();
    if (uiState === 'playing') game.setDirection(dirName);
  }
});

// ---------- Entrada: táctil (D-pad) ----------
document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dirName = btn.dataset.dir;
  const handler = (e) => {
    e.preventDefault();
    if (uiState === 'start') startGame();
    if (uiState === 'playing') game.setDirection(dirName);
  };
  btn.addEventListener('touchstart', handler, { passive: false });
  btn.addEventListener('mousedown', handler);
});

// ---------- Entrada: swipe sobre el lienzo ----------
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 24) return;

  const dirName = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up');

  if (uiState === 'start') startGame();
  if (uiState === 'playing') game.setDirection(dirName);
}, { passive: true });

// ---------- Redimensionado ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Bucle principal ----------
let last = performance.now();
let foodPulse = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(now - last, 100);
  last = now;

  const event = game.update(dt);
  if (event) {
    if (event.type === 'eat') {
      updateHud();
      foodPulse = 1;
    } else if (event.type === 'gameover') {
      onGameOver();
    }
  }

  renderSnake();
  renderFood();

  // Animación de la comida
  const t = now * 0.001;
  food.rotation.y = t * 1.5;
  food.rotation.x = t * 0.8;
  food.position.y = 0.5 + Math.sin(t * 3) * 0.08;
  foodPulse = Math.max(0, foodPulse - dt * 0.004);
  food.scale.setScalar(1 + foodPulse * 0.6);

  renderer.render(scene, camera);
}

// ---------- Arranque ----------
updateHud();
renderFood();
renderSnake();
showOverlay('start');
requestAnimationFrame(animate);
