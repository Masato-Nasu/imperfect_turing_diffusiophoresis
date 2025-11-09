
// ===== Reaction–Diffusion (Gray–Scott) — CPU with click seeding =====
let N = 512;
let U, V, U2, V2;
let Du = 0.16, Dv = 0.08, F = 0.038, k = 0.061, dt = 1.0;
let stepsPerFrame = 2;
let running = true;
let canvas, ctx;
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

function initField(size = N) {
  N = size|0;
  U = new Float32Array(N*N);
  V = new Float32Array(N*N);
  U2 = new Float32Array(N*N);
  V2 = new Float32Array(N*N);
  U.fill(1.0); V.fill(0.0);
  for (let i=0; i<N*N; i+=7){
    U[i] = 1.0 - Math.random()*0.01;
    V[i] = Math.random()*0.01;
  }
}

function index(x,y){ return y*N + x; }
function clamp01(x){ return x<0?0 : x>1?1 : x; }

function lap(arr, x, y){
  const c = arr[index(x,y)];
  const up = arr[index(x, y>0?y-1:y)];
  const dn = arr[index(x, y<N-1?y+1:y)];
  const lf = arr[index(x>0?x-1:x, y)];
  const rt = arr[index(x<N-1?x+1:x, y)];
  return (up + dn + lf + rt - 4*c);
}

function step(){
  for (let y=0;y<N;y++){
    for (let x=0;x<N;x++){
      const i = index(x,y);
      const u = U[i], v = V[i];
      const lu = lap(U,x,y);
      const lv = lap(V,x,y);
      const uvv = u*v*v;
      const du = Du*lu - uvv + F*(1-u);
      const dv = Dv*lv + uvv - (F + k)*v;
      U2[i] = clamp01(u + du*dt);
      V2[i] = clamp01(v + dv*dt);
    }
  }
  [U,U2] = [U2,U];
  [V,V2] = [V2,V];
}

function render(){
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0,0,w,h);
  const data = img.data;
  for (let py=0; py<h; py++){
    const gy = Math.floor(py * N / h);
    for (let px=0; px<w; px++){
      const gx = Math.floor(px * N / w);
      const v = V[gy*N + gx];
      const c = Math.floor(20 + 225 * v);
      const idx = (py*w + px)*4;
      data[idx+0] = 180 - (c*0.45|0);
      data[idx+1] = 200 - (c*0.35|0);
      data[idx+2] = 220 - (c*0.15|0);
      data[idx+3] = 255;
    }
  }
  ctx.putImageData(img,0,0);
}

// Seeding
const SEED_AMOUNT = 0.50;
const SEED_RADIUS = 6;

function paintDisk(arr, cx, cy, r, delta, min=0, max=1){
  for (let y=-r; y<=r; y++){
    const yy = cy + y;
    if (yy<0 || yy>=N) continue;
    const y2 = y*y;
    for (let x=-r; x<=r; x++){
      if (x*x + y2 > r*r) continue;
      const xx = cx + x;
      if (xx<0 || xx>=N) continue;
      const i = yy*N + xx;
      const v = arr[i] + delta;
      arr[i] = v<min?min : v>max?max : v;
    }
  }
}

function seedAtClientPos(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((clientX - rect.left) * (N / rect.width));
  const gy = Math.floor((clientY - rect.top)  * (N / rect.height));
  paintDisk(V, gx, gy, SEED_RADIUS, +SEED_AMOUNT);
  paintDisk(U, gx, gy, SEED_RADIUS, -SEED_AMOUNT*0.35);
}

function enableSeeding(){
  let down = false;
  canvas.addEventListener('pointerdown', (e)=>{
    down = true; canvas.setPointerCapture(e.pointerId);
    seedAtClientPos(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e)=>{
    if (!down) return;
    seedAtClientPos(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', ()=>{ down=false; });
}

function fitCanvas(){
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width, rect.height) * Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
  canvas.width = size;
  canvas.height = size;
}

function savePNG(){
  const a = document.createElement('a');
  a.download = `rd_${Date.now()}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

function tick(){
  if (running){
    for (let i=0;i<stepsPerFrame;i++) step();
    render();
  }
  requestAnimationFrame(tick);
}

function bindUI(){
  const $ = (id)=>document.getElementById(id);
  const res = $('res'), speed=$('speed');
  const f=$('f'), k_=$('k'), du=$('du'), dv=$('dv'), dt_=$('dt');
  const fVal=$('fVal'), kVal=$('kVal'), duVal=$('duVal'), dvVal=$('dvVal'), dtVal=$('dtVal');
  const reset=$('reset'), seed=$('seed'), save=$('save');

  const updateOut = ()=>{
    fVal.textContent = (+F).toFixed(3);
    kVal.textContent = (+k).toFixed(3);
    duVal.textContent = (+Du).toFixed(3);
    dvVal.textContent = (+Dv).toFixed(3);
    dtVal.textContent = (+dt).toFixed(2);
  };

  res.addEventListener('change', ()=>{ initField(+res.value); });
  speed.addEventListener('input', ()=>{ stepsPerFrame = +speed.value; });
  f.addEventListener('input', ()=>{ F = +f.value; updateOut(); });
  k_.addEventListener('input', ()=>{ k = +k_.value; updateOut(); });
  du.addEventListener('input', ()=>{ Du = +du.value; updateOut(); });
  dv.addEventListener('input', ()=>{ Dv = +dv.value; updateOut(); });
  dt_.addEventListener('input', ()=>{ dt = +dt_.value; updateOut(); });
  reset.addEventListener('click', ()=>{ initField(N); });
  seed.addEventListener('click', ()=>{ paintDisk(V, (N/2)|0, (N/2)|0, Math.max(8, (N/32)|0), +SEED_AMOUNT); });
  save.addEventListener('click', savePNG);
  updateOut();
}

function start(){
  canvas = document.getElementById('rd');
  ctx = canvas.getContext('2d', { willReadFrequently:true });
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  initField(512);
  bindUI();
  enableSeeding();
  tick();
}
window.addEventListener('DOMContentLoaded', start);
