// main.js

let startNode = null;
let endNode   = null;
let ROWS = 10, COLS = 10;
let mode = 'toggle-wall';
let currentWeight = 5; // Default weight for weighted nodes

class Node {
  constructor(r,c) {
    this.row = r; this.col = c;
    this.isWall = false;
    this.distance = Infinity;
    this.previous = null;
    this.weight = 1;
    this.g = Infinity; this.h = 0;
  }
}

class Grid {
  constructor(rows,cols) {
    this.rows = rows; this.cols = cols;
    this.nodes = this.createGrid();
  }
  createGrid() {
    const grid = [];
    for(let r=0;r<this.rows;r++){
      const row = [];
      for(let c=0;c<this.cols;c++){
        row.push(new Node(r,c));
      }
      grid.push(row);
    }
    return grid;
  }
  getNeighbors(n){
    const deltas = [[-1,0],[1,0],[0,-1],[0,1]];
    return deltas
      .map(([dr,dc])=>[n.row+dr, n.col+dc])
      .filter(([r,c])=>r>=0 && r<this.rows && c>=0 && c<this.cols)
      .map(([r,c])=>this.nodes[r][c]);
  }
}

class MinHeap {
  constructor(scoreFn = x=>x.distance){
    this.data=[]; this.scoreFn=scoreFn;
  }
  push(n){ this.data.push(n); this.data.sort((a,b)=>this.scoreFn(a)-this.scoreFn(b)); }
  pop(){ return this.data.shift(); }
  isEmpty(){ return this.data.length===0; }
}

class Pathfinder {
  constructor(grid,speed=100){
    this.grid=grid; this.speed=speed;
  }
  async visualize(s,e,speed=this.speed){
    const alg = document.getElementById('algorithm').value;
    if(alg==='astar') await this.runAStar(s,e,speed);
    else            await this.runDijkstra(s,e,speed);
    this.drawPath(e);
  }
  async runDijkstra(s,e,speed){
    const pq=new MinHeap();
    s.distance=0; pq.push(s);
    while(!pq.isEmpty()){
      const cur=pq.pop();
      if(cur===e) break;
      for(const n of this.grid.getNeighbors(cur)){
        if(n.isWall) continue;
        const cell = document.querySelector(`.cell[data-row="${n.row}"][data-col="${n.col}"]`);
        const weight = cell.classList.contains('weighted') ? parseInt(cell.textContent) : 1;
        const alt=cur.distance + weight;
        if(alt<n.distance){
          n.distance=alt; n.previous=cur; pq.push(n);
        }
      }
      document.querySelector(`.cell[data-row="${cur.row}"][data-col="${cur.col}"]`)
              .classList.add('visited');
      await new Promise(r=>setTimeout(r,speed));
    }
  }
  async runAStar(s,e,speed){
    const open=new MinHeap(n=>n.g+n.h);
    s.g=0; s.h=this.heuristic(s,e); open.push(s);
    while(!open.isEmpty()){
      const cur=open.pop();
      if(cur===e) break;
      for(const n of this.grid.getNeighbors(cur)){
        if(n.isWall) continue;
        const cell = document.querySelector(`.cell[data-row="${n.row}"][data-col="${n.col}"]`);
        const weight = cell.classList.contains('weighted') ? parseInt(cell.textContent) : 1;
        const tg=cur.g + weight;
        if(tg<n.g){
          n.previous=cur; n.g=tg; n.h=this.heuristic(n,e);
          open.push(n);
        }
      }
      document.querySelector(`.cell[data-row="${cur.row}"][data-col="${cur.col}"]`)
              .classList.add('visited');
      await new Promise(r=>setTimeout(r,speed));
    }
  }
  drawPath(e){
    let c=e.previous;
    while(c){
      document.querySelector(`.cell[data-row="${c.row}"][data-col="${c.col}"]`)
              .classList.add('path');
      c=c.previous;
    }
  }
  heuristic(a,b){
    return Math.abs(a.row-b.row)+Math.abs(a.col-b.col);
  }
}

// Add this function to calculate cell size
function calculateCellSize(rows, cols) {
  const maxGridWidth = 800; // Maximum grid width in pixels
  const maxGridHeight = 600; // Maximum grid height in pixels
  
  const cellWidth = Math.floor(maxGridWidth / cols);
  const cellHeight = Math.floor(maxGridHeight / rows);
  
  // Use the smaller of the two to maintain square cells
  return Math.min(cellWidth, cellHeight);
}

// build or rebuild the grid DOM
function buildGrid(rows,cols){
  const gc=document.getElementById('grid-container');
  gc.innerHTML='';
  
  const cellSize = calculateCellSize(rows, cols);
  gc.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  gc.style.gridTemplateRows    = `repeat(${rows}, ${cellSize}px)`;
  
  // Update CSS variable for cell size
  document.documentElement.style.setProperty('--cell-size', cellSize + 'px');
  
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cell=document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row=r; cell.dataset.col=c;
      gc.appendChild(cell);
    }
  }
}

// Helpers for saving/loading
function getGridState() {
  const walls = [];
  const weights = [];
  document.querySelectorAll('.cell.wall').forEach(cell => {
    walls.push({ r: +cell.dataset.row, c: +cell.dataset.col });
  });
  document.querySelectorAll('.cell.weighted').forEach(cell => {
    weights.push({ 
      r: +cell.dataset.row, 
      c: +cell.dataset.col,
      weight: parseInt(cell.textContent)
    });
  });
  return {
    rows: ROWS,
    cols: COLS,
    walls,
    weights,
    start: startNode,
    end: endNode,
    timestamp: Date.now()
  };
}

function applyGridState(state) {
  ROWS = state.rows;
  COLS = state.cols;
  startNode = null;
  endNode = null;
  buildGrid(ROWS, COLS);

  state.walls.forEach(({r,c}) => {
    const sel = `.cell[data-row="${r}"][data-col="${c}"]`;
    document.querySelector(sel).classList.add('wall');
  });

  state.weights?.forEach(({r,c,weight}) => {
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    cell.classList.add('weighted');
    cell.textContent = weight;
  });

  if (state.start) {
    const {row, col} = state.start;
    document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`)
            .classList.add('start');
    startNode = state.start;
  }
  if (state.end) {
    const {row, col} = state.end;
    document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`)
            .classList.add('end');
    endNode = state.end;
  }
}

// Randomizer functions
function clearGrid() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.className = 'cell';
    cell.textContent = '';
  });
  startNode = null;
  endNode = null;
}

function getRandomCell() {
  const r = Math.floor(Math.random() * ROWS);
  const c = Math.floor(Math.random() * COLS);
  return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

function randomizeWalls() {
  // Clear only non-weighted cells
  document.querySelectorAll('.cell:not(.weighted)').forEach(cell => {
    cell.className = 'cell';
    if (!cell.classList.contains('weighted')) {
      cell.textContent = '';
    }
  });
  startNode = null;
  endNode = null;

  const wallDensity = 0.3; // 30% of cells will be walls
  const totalWalls = Math.floor(ROWS * COLS * wallDensity);
  
  for(let i = 0; i < totalWalls; i++) {
    const cell = getRandomCell();
    if (!cell.classList.contains('wall') && !cell.classList.contains('weighted')) {
      cell.classList.add('wall');
    }
  }
}

function randomizeWeights() {
  // Clear only non-wall cells
  document.querySelectorAll('.cell:not(.wall)').forEach(cell => {
    if (!cell.classList.contains('wall')) {
      cell.className = 'cell';
      cell.textContent = '';
    }
  });
  startNode = null;
  endNode = null;

  const weightDensity = 0.2; // 20% of cells will be weighted
  const totalWeighted = Math.floor(ROWS * COLS * weightDensity);
  
  for(let i = 0; i < totalWeighted; i++) {
    const cell = getRandomCell();
    if (!cell.classList.contains('weighted') && !cell.classList.contains('wall')) {
      cell.classList.add('weighted');
      const randomWeight = Math.floor(Math.random() * 9) + 1; // Random weight between 1-9
      cell.textContent = randomWeight;
    }
  }
}

function randomizeStartEnd() {
  // Clear only start and end nodes
  document.querySelectorAll('.cell.start, .cell.end').forEach(cell => {
    cell.classList.remove('start', 'end');
  });
  startNode = null;
  endNode = null;

  // Set random start node
  let startCell;
  do {
    startCell = getRandomCell();
  } while (startCell.classList.contains('wall') || startCell.classList.contains('weighted'));
  
  const startRow = parseInt(startCell.dataset.row);
  const startCol = parseInt(startCell.dataset.col);
  startCell.classList.add('start');
  startNode = { row: startRow, col: startCol };

  // Set random end node
  let endCell;
  do {
    endCell = getRandomCell();
  } while (endCell.classList.contains('wall') || endCell.classList.contains('weighted') || endCell.classList.contains('start'));
  
  const endRow = parseInt(endCell.dataset.row);
  const endCol = parseInt(endCell.dataset.col);
  endCell.classList.add('end');
  endNode = { row: endRow, col: endCol };
}

// Grid Management Functions
function getAllSavedGrids() {
  const savedGrids = localStorage.getItem('pathfinder_grids');
  return savedGrids ? JSON.parse(savedGrids) : {};
}

function saveGrid(name, state) {
  const grids = getAllSavedGrids();
  grids[name] = state;
  localStorage.setItem('pathfinder_grids', JSON.stringify(grids));
}

function deleteGrid(name) {
  const grids = getAllSavedGrids();
  delete grids[name];
  localStorage.setItem('pathfinder_grids', JSON.stringify(grids));
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function updateGridsList() {
  const gridsContainer = document.getElementById('saved-grids-list');
  const grids = getAllSavedGrids();
  
  if (Object.keys(grids).length === 0) {
    gridsContainer.innerHTML = '<div class="no-grids-message">No saved grids yet</div>';
    return;
  }

  gridsContainer.innerHTML = Object.entries(grids)
    .sort(([,a], [,b]) => b.timestamp - a.timestamp)
    .map(([name, grid]) => `
      <div class="grid-item">
        <div class="grid-info">
          <div class="grid-name">${name}</div>
          <div class="grid-meta">${grid.rows}×${grid.cols} • ${formatDate(grid.timestamp)}</div>
        </div>
        <div class="grid-actions">
          <button class="load-grid-btn" onclick="loadSpecificGrid('${name}')">Load</button>
          <button class="delete-grid-btn" onclick="deleteSpecificGrid('${name}')">Delete</button>
        </div>
      </div>
    `).join('');
}

// Modal Management
function showGridModal() {
  updateGridsList();
  document.getElementById('grid-modal').style.display = 'flex';
}

function hideGridModal() {
  document.getElementById('grid-modal').style.display = 'none';
}

function showSaveDialog() {
  document.getElementById('save-grid-dialog').style.display = 'block';
  document.getElementById('grid-name-input').focus();
}

function hideSaveDialog() {
  document.getElementById('save-grid-dialog').style.display = 'none';
  document.getElementById('grid-name-input').value = '';
}

// Grid Operations
function loadSpecificGrid(name) {
  const grids = getAllSavedGrids();
  if (grids[name]) {
    applyGridState(grids[name]);
    hideGridModal();
  }
}

function deleteSpecificGrid(name) {
  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    deleteGrid(name);
    updateGridsList();
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  buildGrid(ROWS,COLS);

  // Add randomizer event listeners
  document.getElementById('random-walls').onclick = randomizeWalls;
  document.getElementById('random-weights').onclick = randomizeWeights;
  document.getElementById('random-start-end').onclick = randomizeStartEnd;

  document.getElementById('weight-input').addEventListener('change', (e) => {
    currentWeight = Math.max(1, Math.min(99, parseInt(e.target.value) || 5));
    e.target.value = currentWeight;
    // Update legend example
    document.getElementById('legend-weight-example').textContent = currentWeight;
  });

  document.getElementById('grid-container').addEventListener('click', e => {
    if (!e.target.classList.contains('cell')) return;
    const r=+e.target.dataset.row, c=+e.target.dataset.col;
    if (mode==='set-start') {
      e.target.classList.remove('end','wall','weighted');
      e.target.classList.add('start');
      startNode={row:r,col:c};
    } else if (mode==='set-end') {
      e.target.classList.remove('start','wall','weighted');
      e.target.classList.add('end');
      endNode={row:r,col:c};
    } else if (mode === 'set-weight') {
      if (!e.target.classList.contains('start') && !e.target.classList.contains('end')) {
        e.target.classList.remove('wall');
        e.target.classList.toggle('weighted');
        if (e.target.classList.contains('weighted')) {
          e.target.textContent = currentWeight;
        } else {
          e.target.textContent = '';
        }
      }
    } else {
      if (e.target.classList.contains('weighted')) {
        e.target.classList.remove('weighted');
        e.target.textContent = '';
      }
      e.target.classList.toggle('wall');
    }
  });

  // mode buttons
  document.getElementById('set-start').onclick   = ()=>mode='set-start';
  document.getElementById('set-end').onclick     = ()=>mode='set-end';
  document.getElementById('toggle-wall').onclick = ()=>mode='toggle-wall';
  document.getElementById('set-weight').onclick  = ()=>mode='set-weight';
  document.getElementById('reset-grid').onclick = ()=> {
    document.querySelectorAll('.cell').forEach(c => {
      c.classList.remove('start','end','wall','visited','path','weighted');
      c.textContent = '';
    });
    startNode = endNode = null;
  };

  // resize
  document.getElementById('resize-grid').onclick = ()=> {
    const r = +document.getElementById('input-rows').value;
    const c = +document.getElementById('input-cols').value;
    if (r>=5 && r<=50 && c>=5 && c<=50) {
      ROWS = r; COLS = c;
      startNode = endNode = null;
      buildGrid(ROWS, COLS);
    } else {
      alert('Rows & Cols must be between 5 and 50.');
    }
  };

  // Modal close button
  document.querySelector('.close-modal').onclick = hideGridModal;

  // Close modal when clicking outside
  document.getElementById('grid-modal').onclick = (e) => {
    if (e.target.id === 'grid-modal') hideGridModal();
  };

  // Save/Load buttons
  document.getElementById('save-grid').onclick = showSaveDialog;
  document.getElementById('load-grid').onclick = showGridModal;

  // Save dialog buttons
  document.getElementById('cancel-save').onclick = hideSaveDialog;
  document.getElementById('confirm-save').onclick = () => {
    const name = document.getElementById('grid-name-input').value.trim();
    if (name) {
      const state = getGridState();
      saveGrid(name, state);
      hideSaveDialog();
      alert('Grid saved successfully!');
    } else {
      alert('Please enter a name for your grid.');
    }
  };

  // Save on Enter key in name input
  document.getElementById('grid-name-input').onkeyup = (e) => {
    if (e.key === 'Enter') document.getElementById('confirm-save').click();
    else if (e.key === 'Escape') hideSaveDialog();
  };

  // find-path with speed control
  document.getElementById('find-path').onclick = async ()=> {
    if (!startNode || !endNode) {
      return alert('Please set both start & end.');
    }
    const gridObj = new Grid(ROWS, COLS);
    document.querySelectorAll('.cell.wall').forEach(cell => {
      const rr=+cell.dataset.row, cc=+cell.dataset.col;
      gridObj.nodes[rr][cc].isWall = true;
    });
    const speed = parseInt(document.getElementById('speed-select').value, 10);
    const pf = new Pathfinder(gridObj, speed);
    await pf.visualize(
      gridObj.nodes[startNode.row][startNode.col],
      gridObj.nodes[endNode.row][endNode.col]
    );
  };
});
