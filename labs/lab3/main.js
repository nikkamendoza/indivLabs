// main.js
let startNode = null;
let endNode   = null;

class Node {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.isWall   = false;
    this.distance = Infinity;
    this.previous = null;
    this.weight   = 1;
    this.g        = Infinity;
    this.h        = 0;
  }
}

class Grid {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.nodes = this.createGrid();
  }
  createGrid() {
    const grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(new Node(r, c));
      }
      grid.push(row);
    }
    return grid;
  }
  getNeighbors(node) {
    const deltas = [
      [-1, 0], [1, 0],
      [0, -1], [0, 1]
    ];
    const neighbors = [];
    for (const [dr, dc] of deltas) {
      const nr = node.row + dr;
      const nc = node.col + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        neighbors.push(this.nodes[nr][nc]);
      }
    }
    return neighbors;
  }
}

class MinHeap {
  constructor(scoreFn = node => node.distance) {
    this.data = [];
    this.scoreFn = scoreFn;
  }
  push(node) {
    this.data.push(node);
    this.data.sort((a, b) => this.scoreFn(a) - this.scoreFn(b));
  }
  pop() {
    return this.data.shift();
  }
  isEmpty() {
    return this.data.length === 0;
  }
}

class Pathfinder {
  constructor(grid, speed = 100) {
    this.grid = grid;
    this.speed = speed;
    this.algorithm = 'dijkstra';
  }

  async visualize(startNode, endNode, speed = this.speed) {
    this.algorithm = document.getElementById('algorithm').value;
    if (this.algorithm === 'dijkstra') {
      await this.runDijkstra(startNode, endNode, speed);
    } else {
      await this.runAStar(startNode, endNode, speed);
    }
    this.drawPath(endNode);
  }

  async runDijkstra(startNode, endNode, speed) {
    const pq = new MinHeap();
    startNode.distance = 0;
    pq.push(startNode);

    while (!pq.isEmpty()) {
      const current = pq.pop();
      if (current === endNode) break;

      for (const neighbor of this.grid.getNeighbors(current)) {
        if (neighbor.isWall) continue;
        const alt = current.distance + neighbor.weight;
        if (alt < neighbor.distance) {
          neighbor.distance = alt;
          neighbor.previous = current;
          pq.push(neighbor);
        }
      }

      document
        .querySelector(`.cell[data-row="${current.row}"][data-col="${current.col}"]`)
        .classList.add('visited');
      await new Promise(r => setTimeout(r, speed));
    }
  }

  async runAStar(startNode, endNode, speed) {
    const openSet = new MinHeap(n => n.g + n.h);
    startNode.g = 0;
    startNode.h = this.heuristic(startNode, endNode);
    openSet.push(startNode);

    while (!openSet.isEmpty()) {
      const current = openSet.pop();
      if (current === endNode) break;

      for (const neighbor of this.grid.getNeighbors(current)) {
        if (neighbor.isWall) continue;
        const tentativeG = current.g + neighbor.weight;
        if (tentativeG < neighbor.g) {
          neighbor.previous = current;
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, endNode);
          openSet.push(neighbor);
        }
      }

      document
        .querySelector(`.cell[data-row="${current.row}"][data-col="${current.col}"]`)
        .classList.add('visited');
      await new Promise(r => setTimeout(r, speed));
    }
  }

  drawPath(endNode) {
    let curr = endNode.previous;
    while (curr) {
      document
        .querySelector(`.cell[data-row="${curr.row}"][data-col="${curr.col}"]`)
        .classList.add('path');
      curr = curr.previous;
    }
  }

  heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('grid-container');
  gridContainer.innerHTML = '';

  const ROWS = 10, COLS = 10;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridContainer.appendChild(cell);
    }
  }

  let mode = 'toggle-wall';
  document.getElementById('set-start').onclick    = () => mode = 'set-start';
  document.getElementById('set-end').onclick      = () => mode = 'set-end';
  document.getElementById('toggle-wall').onclick  = () => mode = 'toggle-wall';

  gridContainer.addEventListener('click', e => {
    if (!e.target.classList.contains('cell')) return;
    const row = +e.target.dataset.row;
    const col = +e.target.dataset.col;
    switch (mode) {
      case 'set-start':
        e.target.classList.remove('end', 'wall');
        e.target.classList.add('start');
        startNode = { row, col };
        break;
      case 'set-end':
        e.target.classList.remove('start', 'wall');
        e.target.classList.add('end');
        endNode = { row, col };
        break;
      case 'toggle-wall':
        e.target.classList.toggle('wall');
        break;
    }
  });

  document
    .getElementById('find-path')
    .addEventListener('click', async () => {
      if (!startNode || !endNode) {
        return alert('Please set both a start (green) and end (red) cell first.');
      }

      const gridObj = new Grid(ROWS, COLS);
      document.querySelectorAll('.cell.wall').forEach(cell => {
        const r = +cell.dataset.row, c = +cell.dataset.col;
        gridObj.nodes[r][c].isWall = true;
      });

      const pathfinder = new Pathfinder(gridObj, 50);
      await pathfinder.visualize(
        gridObj.nodes[startNode.row][startNode.col],
        gridObj.nodes[endNode.row][endNode.col]
      );
    });
});
