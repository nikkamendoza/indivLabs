// main.js

let startNode = null;
let endNode   = null;
let ROWS = 10, COLS = 10;
let mode = 'toggle-wall';

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
        const alt=cur.distance+n.weight;
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
        const tg=cur.g+n.weight;
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

// build or rebuild the grid DOM
function buildGrid(rows,cols){
  const gc=document.getElementById('grid-container');
  gc.innerHTML='';
  gc.style.gridTemplateColumns = `repeat(${cols}, 50px)`;
  gc.style.gridTemplateRows    = `repeat(${rows}, 50px)`;
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
  document.querySelectorAll('.cell.wall').forEach(cell => {
    walls.push({ r: +cell.dataset.row, c: +cell.dataset.col });
  });
  return {
    rows: ROWS,
    cols: COLS,
    walls,
    start: startNode,
    end: endNode
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

document.addEventListener('DOMContentLoaded',()=>{
  buildGrid(ROWS,COLS);

  document.getElementById('grid-container').addEventListener('click', e => {
    if (!e.target.classList.contains('cell')) return;
    const r=+e.target.dataset.row, c=+e.target.dataset.col;
    if (mode==='set-start') {
      e.target.classList.remove('end','wall');
      e.target.classList.add('start');
      startNode={row:r,col:c};
    } else if (mode==='set-end') {
      e.target.classList.remove('start','wall');
      e.target.classList.add('end');
      endNode={row:r,col:c};
    } else {
      e.target.classList.toggle('wall');
    }
  });

  // mode buttons
  document.getElementById('set-start').onclick   = ()=>mode='set-start';
  document.getElementById('set-end').onclick     = ()=>mode='set-end';
  document.getElementById('toggle-wall').onclick = ()=>mode='toggle-wall';
  document.getElementById('reset-grid').onclick = ()=> {
    document.querySelectorAll('.cell').forEach(c =>
      c.classList.remove('start','end','wall','visited','path')
    );
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

  // save/load
  document.getElementById('save-grid').onclick = ()=> {
    localStorage.setItem('savedGrid', JSON.stringify(getGridState()));
    alert('Grid saved!');
  };
  document.getElementById('load-grid').onclick = ()=> {
    const json = localStorage.getItem('savedGrid');
    if (!json) return alert('No saved grid found.');
    applyGridState(JSON.parse(json));
    alert('Grid loaded!');
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
