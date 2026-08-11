/* ============================================================
   GRIDFALL — falling blocks build a persistent landscape
   ============================================================ */

const COLS = 10, ROWS = 18, CELL = 26;
const boardCv = document.getElementById('board');
const bctx = boardCv.getContext('2d');
const nextCv = document.getElementById('next');
const nctx = nextCv.getContext('2d');
const worldCv = document.getElementById('world');
const wctx = worldCv.getContext('2d');

const PIECES = {
  I:{m:[[1,1,1,1]],            c:'#5ec8f2'},
  O:{m:[[1,1],[1,1]],          c:'#f5b83d'},
  T:{m:[[0,1,0],[1,1,1]],      c:'#c9a1f0'},
  S:{m:[[0,1,1],[1,1,0]],      c:'#81c784'},
  Z:{m:[[1,1,0],[0,1,1]],      c:'#e57373'},
  J:{m:[[1,0,0],[1,1,1]],      c:'#7986cb'},
  L:{m:[[0,0,1],[1,1,1]],      c:'#f2955e'},
};
const KEYS = Object.keys(PIECES);

/* ---------- game state ---------- */
let grid, piece, next, score, runLines, level;
let dropTimer = 0, dropInterval = 800;
let playing = false, paused = false, gameOver = false;
let flashRows = [], flashUntil = 0;
let lastTime = 0;

/* ---------- persistent world state ---------- */
const WORLD_COLS = 90;
let world = {
  totalLines: 0,
  bestScore: 0,
  heights: new Array(WORLD_COLS).fill(0),   // sediment target heights
  features: []                               // {x, type}
};
let drawnHeights = new Array(WORLD_COLS).fill(0); // animated toward heights
let storageOK = true;

async function loadWorld(){
  try{
    const res = await window.storage.get('gridfall:world');
    if(res && res.value){
      const w = JSON.parse(res.value);
      if(Array.isArray(w.heights) && w.heights.length === WORLD_COLS){
        world = w;
        drawnHeights = world.heights.slice();
      }
    }
  }catch(e){
    /* key missing or storage unavailable — start fresh */
    if(!window.storage) storageOK = false;
  }
  updateHUD();
  drawWorld();
}
async function saveWorld(){
  if(!storageOK) return;
  try{ await window.storage.set('gridfall:world', JSON.stringify(world)); }
  catch(e){ storageOK = false; }
}

/* ---------- terrain growth ---------- */
function addSediment(linesCleared){
  const units = linesCleared * 26;             // sediment per line
  for(let i=0;i<units;i++){
    const x = Math.floor(Math.random()*WORLD_COLS);
    world.heights[x] += 1.5;
  }
  // smooth so it looks like hills, not noise
  for(let pass=0; pass<3; pass++){
    const h = world.heights;
    const s = h.slice();
    for(let x=0;x<WORLD_COLS;x++){
      const a = s[Math.max(0,x-1)], b = s[x], c = s[Math.min(WORLD_COLS-1,x+1)];
      h[x] = (a + b*2 + c)/4;
    }
  }
  const before = world.totalLines;
  world.totalLines += linesCleared;
  spawnFeatures(before, world.totalLines);
  saveWorld();
  document.getElementById('worldAge').textContent = world.totalLines + ' lines of sediment';
}

const MILESTONES = [
  {at:3,  type:'grass', msg:'Grass takes root in your world'},
  {at:6,  type:'tree',  msg:'A tree has grown'},
  {at:10, type:'flowers', msg:'Flowers bloom'},
  {at:15, type:'tree',  msg:'The forest spreads'},
  {at:20, type:'cabin', msg:'Someone built a cabin'},
  {at:28, type:'tree',  msg:'More trees rise'},
  {at:36, type:'tree',  msg:'The woods deepen'},
  {at:45, type:'campfire', msg:'A campfire flickers'},
  {at:60, type:'tree',  msg:'Old growth now'},
  {at:80, type:'tower', msg:'A watchtower stands'},
  {at:100,type:'moon',  msg:'The moon has risen over your world'},
];

function spawnFeatures(before, after){
  for(const m of MILESTONES){
    if(before < m.at && after >= m.at){
      const x = 6 + Math.floor(Math.random()*(WORLD_COLS-12));
      world.features.push({x, type:m.type});
      showFlash(m.msg);
    }
  }
}

function showFlash(msg){
  const el = document.getElementById('flash');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2600);
}

/* ---------- world rendering ---------- */
function drawWorld(){
  const W = worldCv.width, H = worldCv.height;
  const colW = W / WORLD_COLS;
  const progress = Math.min(world.totalLines/100, 1);

  // sky: deep night → dawn as world ages
  const skyTop = lerpColor('#0d0f18', '#1d2a45', progress);
  const skyBot = lerpColor('#151827', '#3a4a6b', progress);
  const g = wctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, skyTop); g.addColorStop(1, skyBot);
  wctx.fillStyle = g; wctx.fillRect(0,0,W,H);

  // stars fade slightly as dawn approaches
  wctx.fillStyle = 'rgba(232,234,242,' + (0.5 - progress*0.3) + ')';
  for(let i=0;i<40;i++){
    const sx = (i*97 % W), sy = (i*53 % Math.floor(H*0.5));
    wctx.fillRect(sx, sy, 1.5, 1.5);
  }
  // moon feature
  if(world.features.some(f=>f.type==='moon')){
    wctx.fillStyle = '#e8eaf2';
    wctx.beginPath(); wctx.arc(W-60, 34, 14, 0, Math.PI*2); wctx.fill();
    wctx.fillStyle = skyTop;
    wctx.beginPath(); wctx.arc(W-66, 30, 12, 0, Math.PI*2); wctx.fill();
  }

  // animate heights toward targets
  let animating = false;
  for(let x=0;x<WORLD_COLS;x++){
    const d = world.heights[x] - drawnHeights[x];
    if(Math.abs(d) > 0.05){ drawnHeights[x] += d*0.08; animating = true; }
    else drawnHeights[x] = world.heights[x];
  }

  // terrain: layered rock → dirt → grass cap
  const base = H - 8;
  for(let x=0;x<WORLD_COLS;x++){
    const h = Math.min(drawnHeights[x], H-30);
    if(h <= 0) continue;
    const px = x*colW, top = base - h;
    // rock body
    const tg = wctx.createLinearGradient(0, top, 0, base);
    tg.addColorStop(0, '#4a4258');
    tg.addColorStop(0.5, '#3a3448');
    tg.addColorStop(1, '#2a2638');
    wctx.fillStyle = tg;
    wctx.fillRect(px, top, colW+0.5, h+8);
    // grass cap once world is alive
    if(world.totalLines >= 3){
      wctx.fillStyle = '#81c784';
      wctx.fillRect(px, top, colW+0.5, 3);
    }
  }
  // bedrock line
  wctx.fillStyle = '#1c1f2b';
  wctx.fillRect(0, base+6, W, 2);

  // features sit on terrain
  for(const f of world.features){
    if(f.type==='moon') continue;
    const px = f.x*colW;
    const top = base - Math.min(drawnHeights[f.x]||0, H-30);
    drawFeature(f.type, px, top);
  }

  if(animating) requestAnimationFrame(drawWorld);
}

function drawFeature(type, x, y){
  wctx.save();
  wctx.translate(x, y);
  switch(type){
    case 'grass':
      wctx.strokeStyle = '#81c784'; wctx.lineWidth = 1.5;
      for(let i=-4;i<=4;i+=4){
        wctx.beginPath(); wctx.moveTo(i,0); wctx.lineTo(i-1,-6); wctx.stroke();
      }
      break;
    case 'flowers':
      for(let i=-6;i<=6;i+=6){
        wctx.fillStyle = i===0 ? '#f06292' : '#f5b83d';
        wctx.beginPath(); wctx.arc(i,-5,2.5,0,Math.PI*2); wctx.fill();
        wctx.strokeStyle = '#81c784'; wctx.lineWidth=1;
        wctx.beginPath(); wctx.moveTo(i,-3); wctx.lineTo(i,0); wctx.stroke();
      }
      break;
    case 'tree':
      wctx.fillStyle = '#6d5a48'; wctx.fillRect(-2,-14,4,14);
      wctx.fillStyle = '#4f9e5f';
      wctx.beginPath(); wctx.moveTo(0,-38); wctx.lineTo(11,-12); wctx.lineTo(-11,-12); wctx.fill();
      wctx.beginPath(); wctx.moveTo(0,-30); wctx.lineTo(9,-8); wctx.lineTo(-9,-8); wctx.fill();
      break;
    case 'cabin':
      wctx.fillStyle = '#8a6d4f'; wctx.fillRect(-12,-14,24,14);
      wctx.fillStyle = '#5d4634';
      wctx.beginPath(); wctx.moveTo(-14,-14); wctx.lineTo(0,-24); wctx.lineTo(14,-14); wctx.fill();
      wctx.fillStyle = '#f5b83d'; wctx.fillRect(3,-10,5,6);   // lit window
      break;
    case 'campfire':
      wctx.strokeStyle = '#6d5a48'; wctx.lineWidth=2;
      wctx.beginPath(); wctx.moveTo(-6,0); wctx.lineTo(6,-4); wctx.moveTo(6,0); wctx.lineTo(-6,-4); wctx.stroke();
      wctx.fillStyle = '#f2955e';
      wctx.beginPath(); wctx.moveTo(0,-12); wctx.quadraticCurveTo(5,-5,0,-2); wctx.quadraticCurveTo(-5,-5,0,-12); wctx.fill();
      break;
    case 'tower':
      wctx.fillStyle = '#585068'; wctx.fillRect(-5,-34,10,34);
      wctx.fillStyle = '#6a6280'; wctx.fillRect(-8,-40,16,7);
      wctx.fillStyle = '#f5b83d'; wctx.fillRect(-2,-38,4,4);
      break;
  }
  wctx.restore();
}

function lerpColor(a,b,t){
  const pa = [1,3,5].map(i=>parseInt(a.substr(i,2),16));
  const pb = [1,3,5].map(i=>parseInt(b.substr(i,2),16));
  const p = pa.map((v,i)=>Math.round(v+(pb[i]-v)*t));
  return 'rgb('+p.join(',')+')';
}

/* ---------- tetris core ---------- */
function newGrid(){ return Array.from({length:ROWS},()=>new Array(COLS).fill(null)); }

function randomPiece(){
  const k = KEYS[Math.floor(Math.random()*KEYS.length)];
  const p = PIECES[k];
  return { m:p.m.map(r=>r.slice()), c:p.c, x:Math.floor((COLS-p.m[0].length)/2), y:0 };
}

function rotate(m){
  return m[0].map((_,i)=>m.map(r=>r[i]).reverse());
}

function collides(p, g, dx=0, dy=0, m=null){
  const mat = m || p.m;
  for(let y=0;y<mat.length;y++)for(let x=0;x<mat[y].length;x++){
    if(!mat[y][x]) continue;
    const nx = p.x+x+dx, ny = p.y+y+dy;
    if(nx<0||nx>=COLS||ny>=ROWS) return true;
    if(ny>=0 && g[ny][nx]) return true;
  }
  return false;
}

function merge(){
  for(let y=0;y<piece.m.length;y++)for(let x=0;x<piece.m[y].length;x++){
    if(piece.m[y][x] && piece.y+y>=0) grid[piece.y+y][piece.x+x] = piece.c;
  }
}

function clearLines(){
  const full = [];
  for(let y=0;y<ROWS;y++) if(grid[y].every(c=>c)) full.push(y);
  if(!full.length) return;

  flashRows = full.slice();
  flashUntil = performance.now() + 220;

  setTimeout(()=>{
    for(const y of full){
      grid.splice(y,1);
      grid.unshift(new Array(COLS).fill(null));
    }
    flashRows = [];
    const n = full.length;
    runLines += n;
    score += [0,100,300,500,800][n] * level;
    level = 1 + Math.floor(runLines/8);
    dropInterval = Math.max(120, 800 - (level-1)*70);
    if(score > world.bestScore){ world.bestScore = score; }
    addSediment(n);
    updateHUD();
    requestAnimationFrame(drawWorld);
  }, 220);
}

function spawn(){
  piece = next || randomPiece();
  next = randomPiece();
  drawNext();
  if(collides(piece, grid)){
    endGame();
  }
}

function endGame(){
  playing = false; gameOver = true;
  saveWorld();
  const ov = document.getElementById('overlay');
  document.getElementById('ovTitle').textContent = 'GAME OVER';
  document.getElementById('ovText').textContent =
    'Score ' + score + ' · ' + runLines + ' lines added to your world. The land remains.';
  document.getElementById('startBtn').textContent = 'PLAY AGAIN';
  ov.classList.add('show');
}

function hardDrop(){
  if(!playing||paused) return;
  let d=0;
  while(!collides(piece,grid,0,d+1)) d++;
  piece.y += d;
  score += d*2;
  lockPiece();
}

function lockPiece(){
  merge();
  clearLines();
  spawn();
  updateHUD();
}

function move(dx){ if(playing&&!paused&&!collides(piece,grid,dx,0)) piece.x+=dx; }
function softDrop(){
  if(!playing||paused) return;
  if(!collides(piece,grid,0,1)){ piece.y++; score+=1; }
  else lockPiece();
  dropTimer = 0;
}
function tryRotate(){
  if(!playing||paused) return;
  const r = rotate(piece.m);
  for(const kick of [0,-1,1,-2,2]){
    if(!collides(piece,grid,kick,0,r)){ piece.m = r; piece.x += kick; return; }
  }
}

/* ---------- board rendering ---------- */
function drawCell(ctx,x,y,size,color){
  ctx.fillStyle = color;
  ctx.fillRect(x,y,size,size);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x,y,size,3);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(x,y+size-3,size,3);
}

function drawBoard(){
  bctx.clearRect(0,0,boardCv.width,boardCv.height);
  // grid dots
  bctx.fillStyle = '#1b1e2e';
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)
    bctx.fillRect(x*CELL+CELL/2, y*CELL+CELL/2, 1.5, 1.5);

  const now = performance.now();
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(grid[y][x]){
      if(flashRows.includes(y) && now < flashUntil){
        drawCell(bctx, x*CELL+1, y*CELL+1, CELL-2, '#e8eaf2');
      } else {
        drawCell(bctx, x*CELL+1, y*CELL+1, CELL-2, grid[y][x]);
      }
    }
  }

  if(piece && playing){
    // ghost
    let d=0; while(!collides(piece,grid,0,d+1)) d++;
    bctx.globalAlpha = .18;
    for(let y=0;y<piece.m.length;y++)for(let x=0;x<piece.m[y].length;x++)
      if(piece.m[y][x]) drawCell(bctx,(piece.x+x)*CELL+1,(piece.y+y+d)*CELL+1,CELL-2,piece.c);
    bctx.globalAlpha = 1;
    // piece
    for(let y=0;y<piece.m.length;y++)for(let x=0;x<piece.m[y].length;x++)
      if(piece.m[y][x] && piece.y+y>=0) drawCell(bctx,(piece.x+x)*CELL+1,(piece.y+y)*CELL+1,CELL-2,piece.c);
  }

  if(paused && playing){
    bctx.fillStyle='rgba(16,18,32,.7)';
    bctx.fillRect(0,0,boardCv.width,boardCv.height);
    bctx.fillStyle='#e8eaf2';
    bctx.font='16px "Bungee"';
    bctx.textAlign='center';
    bctx.fillText('PAUSED', boardCv.width/2, boardCv.height/2);
  }
}

function drawNext(){
  nctx.clearRect(0,0,nextCv.width,nextCv.height);
  if(!next) return;
  const s = 16;
  const w = next.m[0].length*s, h = next.m.length*s;
  const ox = (nextCv.width-w)/2, oy = (nextCv.height-h)/2;
  for(let y=0;y<next.m.length;y++)for(let x=0;x<next.m[y].length;x++)
    if(next.m[y][x]) drawCell(nctx, ox+x*s, oy+y*s, s-2, next.c);
}

/* ---------- HUD ---------- */
function updateHUD(){
  document.getElementById('score').textContent = score ?? 0;
  document.getElementById('lines').textContent = runLines ?? 0;
  document.getElementById('level').textContent = level ?? 1;
  document.getElementById('best').textContent = world.bestScore;
  document.getElementById('worldAge').textContent = world.totalLines + ' lines of sediment';
}

/* ---------- loop ---------- */
function loop(t){
  const dt = t - lastTime; lastTime = t;
  if(playing && !paused){
    dropTimer += dt;
    if(dropTimer >= dropInterval){
      dropTimer = 0;
      if(!collides(piece,grid,0,1)) piece.y++;
      else lockPiece();
    }
  }
  drawBoard();
  requestAnimationFrame(loop);
}

function startGame(){
  grid = newGrid();
  score = 0; runLines = 0; level = 1;
  dropInterval = 800; dropTimer = 0;
  gameOver = false; paused = false;
  next = null;
  spawn();
  playing = true;
  document.getElementById('overlay').classList.remove('show');
  updateHUD();
}

/* ---------- input ---------- */
document.addEventListener('keydown', e=>{
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key)) e.preventDefault();
  switch(e.key){
    case 'ArrowLeft': move(-1); break;
    case 'ArrowRight': move(1); break;
    case 'ArrowDown': softDrop(); break;
    case 'ArrowUp': case 'z': case 'Z': tryRotate(); break;
    case ' ': hardDrop(); break;
    case 'p': case 'P': if(playing) paused = !paused; break;
  }
});
document.getElementById('startBtn').addEventListener('click', startGame);
const hold = (id, fn)=>{
  const el = document.getElementById(id);
  el.addEventListener('touchstart', e=>{ e.preventDefault(); fn(); }, {passive:false});
  el.addEventListener('click', fn);
};
hold('tLeft', ()=>move(-1));
hold('tRight', ()=>move(1));
hold('tDown', softDrop);
hold('tRot', tryRotate);
hold('tDrop', hardDrop);

/* ---------- boot ---------- */
grid = newGrid();   // board must exist before the render loop's first frame
loadWorld();
requestAnimationFrame(t=>{ lastTime=t; requestAnimationFrame(loop); });
