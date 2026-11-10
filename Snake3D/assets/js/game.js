/**
 * game.js
 * Lógica pura del juego Snake 3D (sin dependencias de render).
 * El tablero es una grilla cuadrada sobre el plano XZ; la serpiente se mueve
 * celda a celda. El render 3D se encarga en main.js.
 */

export const DIRECTIONS = {
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};

export class SnakeGame {
  /**
   * @param {{gridSize?: number, tickMs?: number}} options
   */
  constructor({ gridSize = 20, tickMs = 140 } = {}) {
    this.gridSize = gridSize;
    this.tickMs = tickMs;
    this.reset();
  }

  /** Reinicia el estado a una partida nueva. */
  reset() {
    const mid = Math.floor(this.gridSize / 2);
    this.snake = [
      { x: mid, z: mid },
      { x: mid - 1, z: mid },
      { x: mid - 2, z: mid },
    ];
    this.prevSnake = this.snake.map((s) => ({ ...s }));
    this.direction = { ...DIRECTIONS.right };
    this.pendingDirection = { ...DIRECTIONS.right };
    this.food = this.spawnFood();
    this.score = 0;
    this.gameOver = false;
    this.won = false;
    this.paused = false;
    this.started = false;
    // Cuando es true, la serpiente espera la primera pulsación de dirección.
    this.awaitingStart = false;
    this.accumulator = 0;
    this.tickProgress = 0;
  }

  /** Devuelve una celda libre aleatoria para la comida. */
  spawnFood() {
    const occupied = new Set(this.snake.map((s) => `${s.x},${s.z}`));
    const free = [];
    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        if (!occupied.has(`${x},${z}`)) free.push({ x, z });
      }
    }
    if (free.length === 0) {
      // No quedan celdas libres: el jugador completó el tablero.
      this.won = true;
      this.gameOver = true;
      return { ...this.snake[0] };
    }
    return free[Math.floor(Math.random() * free.length)];
  }

  /**
   * Cambia la dirección de la serpiente evitando giros de 180°.
   * @param {'up'|'down'|'left'|'right'} name
   */
  setDirection(name) {
    const d = DIRECTIONS[name];
    if (!d) return;
    const p = this.pendingDirection;
    const isReverse = d.x === -p.x && d.z === -p.z;
    const isSame = d.x === p.x && d.z === p.z;

    // Antes de empezar, cualquier dirección válida (no reversa) arranca el juego.
    if (this.awaitingStart) {
      if (!isReverse) {
        this.pendingDirection = { ...d };
        this.awaitingStart = false;
      }
      return;
    }

    // Ignora reversa (opuesto) y repetición.
    if (isReverse || isSame) return;
    this.pendingDirection = { ...d };
  }

  /** Avanza un paso de simulación. Devuelve un evento o null. */
  step() {
    this.prevSnake = this.snake.map((s) => ({ ...s }));
    this.direction = { ...this.pendingDirection };

    const head = this.snake[0];
    const newHead = { x: head.x + this.direction.x, z: head.z + this.direction.z };

    // Colisión con las paredes.
    if (
      newHead.x < 0 || newHead.x >= this.gridSize ||
      newHead.z < 0 || newHead.z >= this.gridSize
    ) {
      this.gameOver = true;
      return { type: 'gameover' };
    }

    const willGrow = this.food && newHead.x === this.food.x && newHead.z === this.food.z;
    // Si no crece, la cola se libera y no cuenta como colisión.
    const body = willGrow ? this.snake : this.snake.slice(0, -1);
    if (body.some((s) => s.x === newHead.x && s.z === newHead.z)) {
      this.gameOver = true;
      return { type: 'gameover' };
    }

    this.snake.unshift(newHead);

    if (willGrow) {
      this.score += 1;
      this.food = this.spawnFood();
      if (this.won) return { type: 'gameover' };
      return { type: 'eat' };
    }

    this.snake.pop();
    return { type: 'move' };
  }

  /**
   * Actualiza la simulación según el tiempo transcurrido.
   * @param {number} dtMs milisegundos desde el último frame
   * @returns {{type: string}|null}
   */
  update(dtMs) {
    if (!this.started || this.paused || this.gameOver || this.awaitingStart) return null;

    this.accumulator += dtMs;
    let event = null;

    while (this.accumulator >= this.tickMs) {
      this.accumulator -= this.tickMs;
      const e = this.step();
      if (e) event = e;
      if (this.gameOver) {
        this.accumulator = 0;
        break;
      }
    }

    this.tickProgress = this.gameOver ? 1 : this.accumulator / this.tickMs;
    return event;
  }

  /**
   * Posiciones interpoladas de los segmentos para un render suave.
   * @param {number} [alpha] factor 0..1 entre el estado previo y el actual
   * @returns {Array<{x:number, z:number, isHead:boolean}>}
   */
  getSegments(alpha = this.tickProgress) {
    const segs = [];
    for (let i = 0; i < this.snake.length; i++) {
      const cur = this.snake[i];
      const prev = this.prevSnake[i] || cur;
      segs.push({
        x: prev.x + (cur.x - prev.x) * alpha,
        z: prev.z + (cur.z - prev.z) * alpha,
        isHead: i === 0,
      });
    }
    return segs;
  }
}
