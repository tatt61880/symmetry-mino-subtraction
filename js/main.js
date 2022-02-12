window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let pressFlag = false;
const centerNumX = 4;
const centerNumY = 6;
const blockNumX = centerNumX * 3;
const blockNumY = centerNumY * 3;
const blockSize = 30;

const state_none = 0;
const state_a = 1;
const state_b = 2;

let blocks = [];
let svg;

function init() {
  console.log('init');
  svg = document.getElementById('svgBoard');
  svg.addEventListener('mousedown', pressOn, false);
  svg.addEventListener('touchstart', pressOn, false);
  svg.addEventListener('mousemove', clickEvent, false);
  svg.addEventListener('touchmove', clickEvent, false);
  svg.addEventListener('mouseup', pressOff, false);
  svg.addEventListener('touchend', pressOff, false);

  for (let y = 0; y < blockNumY; ++y) {
    blocks[y] = [];
    for (let x = 0; x < blockNumX; ++x) {
      blocks[y][x] = 0;
    }
  }
  draw();
}

function draw() {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
  let g = document.createElementNS(SVG_NS, 'g');

  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (blocks[y][x]) {
        let rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', blockSize * x);
        rect.setAttribute('y', blockSize * y);
        rect.setAttribute('width', blockSize);
        rect.setAttribute('height', blockSize);
        rect.setAttribute('fill', 'pink');
        rect.setAttribute('stroke', 'none');
        g.appendChild(rect);
      }
    }
  }

  for (let y = 0; y <= blockNumY; ++y) {
    let line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('x2', blockSize * blockNumX);
    line.setAttribute('y1', blockSize * y);
    line.setAttribute('y2', blockSize * y);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  for (let x = 0; x <= blockNumX; ++x) {
    let line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * x);
    line.setAttribute('x2', blockSize * x);
    line.setAttribute('y1', 0);
    line.setAttribute('y2', blockSize * blockNumY);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  for (let y = 1; y <= 2; ++y) {
    let line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * centerNumX);
    line.setAttribute('x2', blockSize * centerNumX * 2);
    line.setAttribute('y1', blockSize * centerNumY * y);
    line.setAttribute('y2', blockSize * centerNumY * y);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '2, 2');
    g.appendChild(line);
  }
  for (let x = 1; x <= 2; ++x) {
    let line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * centerNumX * x);
    line.setAttribute('x2', blockSize * centerNumX * x);
    line.setAttribute('y1', blockSize * centerNumY);
    line.setAttribute('y2', blockSize * centerNumY * 2);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '2, 2');
    g.appendChild(line);
  }
  svg.appendChild(g);
}

function clamp(x, min, max) {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

let x;
let y;
let prevX;
let prevY;
let state;
function calcXY(e) {
  {
    let bcRect = svg.getBoundingClientRect();
    if (typeof e.touches !== 'undefined') {
      x = e.touches[0].clientX - bcRect.left;
      y = e.touches[0].clientY - bcRect.top;
    } else {
      x = e.clientX - bcRect.left;
      y = e.clientY - bcRect.top;
    }
    x = clamp(Math.floor(x / blockSize), 0, blockNumX - 1);
    y = clamp(Math.floor(y / blockSize), 0, blockNumY - 1);
  }
}

function pressOn(e) {
  calcXY(e);
  if (x < centerNumX) return;
  if (2 * centerNumX <= x) return;
  if (y < centerNumY) return;
  if (2 * centerNumY <= y) return;

  if (blocks[y][x]) {
    state = state_none;
  } else {
    state = state_a;
  }

  pressFlag = true;
  prevX = -1;
  prevY = -1;
  clickEvent(e);
}

function preventDefault(e) {
  e.preventDefault(); // iOSで連続でボタンを押しているとダブルクリック判定されて画面が移動してしまったりするので。
}

function pressOff(e) {
  preventDefault(e);
  pressFlag = false;
}

function clickEvent(e) {
  if (!pressFlag) return;

  calcXY(e);
  if (x < centerNumX) return;
  if (2 * centerNumX <= x) return;
  if (y < centerNumY) return;
  if (2 * centerNumY <= y) return;

  if (x == prevX && y == prevY) return;
  prevX = x;
  prevY = y;
  blocks[y][x] = state;
  draw();
}
