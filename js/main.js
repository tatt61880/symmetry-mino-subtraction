'use strict';
const version = 'Version: 2022.02.23';
window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let pressFlag = false;
let width = 5;
let height = 5;
let width3;
let height3;
let initialBlockStr = '';
const blockSize = 25;
const maxReflection = 100; // 各中心点で点対称操作を行う回数の上限。

const stateNone = 0;
const stateA = 1;
const stateB = 2;

const dy = [1, 0, -1, 0];
const dx = [0, 1, 0, -1];

let blocks = [];
let points = [];

let elemSvg;
let elemWidth;
let elemHeight;
let elemText;
let elemUrl;

function analyzeUrl() {
  let paravalsStr = location.href.split('?')[1];
  if (paravalsStr == null) paravalsStr = '';
  analyzeParavals(paravalsStr);
}

function analyzeParavals(paravalsStr) {
  const paravalsArray = paravalsStr.split('&');
  if (!paravalsArray.length) return;

  for (let i = 0; i < paravalsArray.length; ++i) {
    let paraval = paravalsArray[i].split('=');
    if (paraval.length == 2) {
      if (paraval[0] == 'w') {
        width = Number(paraval[1]);
      } else if (paraval[0] == 'h') {
        height = Number(paraval[1]);
      } else if (paraval[0] == 's') {
        initialBlockStr = paraval[1];
      } else {
        continue;
      }
    }
  }
}

function writeUrlInfo() {
  const url = location.href.split('?')[0] + `?w=${width}&h=${height}&s=${getBlockStr()}`;
  elemUrl.innerHTML = `↓現在の盤面のURL↓<br><a href="${url}">${url}</a>`;
}

function getBlockStr()
{
  let res = '';
  for (let y = 0; y < height; ++y) {
    let line = '';
    for (let x = 0; x < width; ++x) {
      line += isA(blocks[height + y][width + x]) ? '1' : '0';
    }
    res += line.replace(/0+$/, '');
    res += '-';
  }
  return res.replace(/-+$/, '');
}

function applyBlockStr(e, str)
{
  for (let y = 0; y < height3; ++y) {
    blocks[y] = [];
    for (let x = 0; x < width3; ++x) {
      blocks[y][x] = 0;
    }
  }
  let y = height;
  let x = width;
  for (const c of str) {
    if (c == '-') {
      y++;
      if (y == height * 2) break;
      x = width;
    } else {
      if (x < width * 2) blocks[y][x] = parseInt(c);
      x++;
    }
  }
  update(e);
}

function setText(str)
{
  elemText.innerText = str;
}

function setSize(w, h)
{
  width3 = w * 3;
  height3 = h * 3;
  elemSvg.setAttribute('width', width3 * blockSize);
  elemSvg.setAttribute('height', height3 * blockSize);
}

function changeSize(e)
{
  const blockStr = getBlockStr();
  width = Number(elemWidth.value);
  height = Number(elemHeight.value);
  setSize(width, height);
  applyBlockStr(e, blockStr);
}

function init(e) {
  elemSvg = document.getElementById('svgBoard');
  elemWidth = document.getElementById('width');
  elemHeight = document.getElementById('height');
  elemText = document.getElementById('text');
  elemUrl = document.getElementById('url');
  document.getElementById('version').innerText = version;

  analyzeUrl();
  setSize(width, height);
  applyBlockStr(e, initialBlockStr);

  {
    elemSvg.addEventListener('mousedown', pressOn, false);
    elemSvg.addEventListener('mousemove', cursorMoved, false);
    elemSvg.addEventListener('mouseup', pressOff, false);

    elemWidth.value = width;
    elemHeight.value = height;
    elemWidth.addEventListener('change', changeSize, false);
    elemHeight.addEventListener('change', changeSize, false);
  }
}

function draw(e) {
  while (elemSvg.firstChild) {
    elemSvg.removeChild(elemSvg.firstChild);
  }
  const g = document.createElementNS(SVG_NS, 'g');

  removeB();
  let selectedX;
  let selectedY;
  if (points.length != 0) {
    const bcRect = elemSvg.getBoundingClientRect();
    let cursorX;
    let cursorY;
    if (typeof e.touches !== 'undefined') {
      cursorX = e.touches[0].clientX - bcRect.left;
      cursorY = e.touches[0].clientY - bcRect.top;
    } else {
      cursorX = e.clientX - bcRect.left;
      cursorY = e.clientY - bcRect.top;
    }

    let minDist = -1;
    for (const point of points) {
      let dist = (cursorX - point.x * blockSize / 2.0) ** 2 + (cursorY - point.y * blockSize / 2.0) ** 2;
      if (minDist == -1 || dist < minDist) {
        minDist = dist;
        selectedX = point.x;
        selectedY = point.y;
      }
    }
    isSymmetrySub(selectedX, selectedY);
  }

  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (blocks[y][x]) {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', blockSize * x);
        rect.setAttribute('y', blockSize * y);
        rect.setAttribute('width', blockSize);
        rect.setAttribute('height', blockSize);
        rect.setAttribute('fill', blocks[y][x] == stateA ? 'pink' : 'aqua');
        rect.setAttribute('stroke', 'none');
        g.appendChild(rect);
      }
    }
  }

  for (let y = 0; y <= height3; ++y) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('x2', blockSize * width3);
    line.setAttribute('y1', blockSize * y);
    line.setAttribute('y2', blockSize * y);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  for (let x = 0; x <= width3; ++x) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * x);
    line.setAttribute('x2', blockSize * x);
    line.setAttribute('y1', 0);
    line.setAttribute('y2', blockSize * height3);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  for (let y = 1; y <= 2; ++y) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * width);
    line.setAttribute('x2', blockSize * width * 2);
    line.setAttribute('y1', blockSize * height * y);
    line.setAttribute('y2', blockSize * height * y);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '2, 2');
    g.appendChild(line);
  }
  for (let x = 1; x <= 2; ++x) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * width * x);
    line.setAttribute('x2', blockSize * width * x);
    line.setAttribute('y1', blockSize * height);
    line.setAttribute('y2', blockSize * height * 2);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '2, 2');
    g.appendChild(line);
  }

  for (const point of points) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    const isSelected = point.y == selectedY && point.x == selectedX;
    circle.setAttribute('cy', blockSize * point.y / 2.0);
    circle.setAttribute('cx', blockSize * point.x / 2.0);
    circle.setAttribute('r', isSelected ? 5.0 : 2.5);
    circle.setAttribute('fill', isSelected ? 'black' : 'red');
    g.appendChild(circle);
  }
  elemSvg.appendChild(g);
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
  const bcRect = elemSvg.getBoundingClientRect();
  if (typeof e.touches !== 'undefined') {
    x = e.touches[0].clientX - bcRect.left;
    y = e.touches[0].clientY - bcRect.top;
  } else {
    x = e.clientX - bcRect.left;
    y = e.clientY - bcRect.top;
  }
  x = clamp(Math.floor(x / blockSize), 0, width3 - 1);
  y = clamp(Math.floor(y / blockSize), 0, height3 - 1);
}

function pressOff() {
  pressFlag = false;
}

function pressOn(e) {
  calcXY(e);
  if (x < width) return;
  if (2 * width <= x) return;
  if (y < height) return;
  if (2 * height <= y) return;

  if (blocks[y][x] == stateA) {
    state = stateNone;
  } else {
    state = stateA;
  }

  pressFlag = true;
  prevX = -1;
  prevY = -1;
  cursorMoved(e);
}

function cursorMoved(e) {
  if (!pressFlag) {
    draw(e);
    return;
  }

  calcXY(e);
  if (x < width) return;
  if (2 * width <= x) return;
  if (y < height) return;
  if (2 * height <= y) return;

  if (x == prevX && y == prevY) return;
  prevX = x;
  prevY = y;
  blocks[y][x] = state;

  update(e);
}

function removeB() {
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (blocks[y][x] == stateB) {
        blocks[y][x] = stateNone;
      }
    }
  }
}

function isAorB(x)
{
  return x != stateNone;
}

function isA(x)
{
  return x == stateA;
}

function isB(x)
{
  return x == stateB;
}

function isSymmetry(f) {
  let minX = width3;
  let maxX = 0;
  let minY = height3;
  let maxY = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (f(blocks[y][x])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (f(blocks[y][x]) && !f(blocks[maxY - (y - minY)][maxX - (x - minX)])) {
        return false;
      }
    }
  }
  return true;
}

function isConnected(f) {
  const b = new Array(height3);
  for (let y = 0; y < height3; ++y) {
    b[y] = blocks[y].slice();
  }
  let x0;
  let y0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (f(b[y][x])) {
        x0 = x;
        y0 = y;
        break;
      }
    }
  }

  const st = new Stack();
  st.push([x0, y0]);
  b[y0][x0] = 0;
  while (!st.empty()) {
    const xy = st.pop();
    for (let i = 0; i < 4; i++) {
      const xx = xy[0] + dx[i];
      const yy = xy[1] + dy[i];
      if (xx == -1) continue;
      if (yy == -1) continue;
      if (xx == width3) continue;
      if (yy == height3) continue;
      if (f(b[yy][xx])) {
        b[yy][xx] = 0;
        st.push([xx, yy]);
      }
    }
  }

  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (f(b[y][x])) return false;
    }
  }
  return true;
}

// 図形(AUB)を点Cで点対称になるようにしたとき 元の図形と重なっていない部分を図形Bとする。
function symmetrySub(cx, cy) {
  let res = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (blocks[y][x] != stateNone) {
        const ax = 2 * x + 1;
        const ay = 2 * y + 1;
        const bx = (2 * cx - ax - 1) / 2;
        const by = (2 * cy - ay - 1) / 2;
        // 処理速度等の都合から、あらかじめ用意したエリア外にはみでる場合は不適切とします。
        if (bx < 0) return -1;
        if (by < 0) return -1;
        if (bx >= width3) return -1;
        if (by >= height3) return -1;

        if (blocks[by][bx] == stateNone) {
          blocks[by][bx] = stateB;
          res++;
        }
      }
    }
  }
  return res;
}

// 図形Bを点((minX + maxX) / 2, (minY + maxY) / 2)で点対称になるようにしたとき 元の図形と重なっていない部分を図形Bとする。
function symmetrySub2(minX, maxX, minY, maxY) {
  let res = 0;
  for (let y = minY; y <= maxY; ++y) {
    for (let x = minX; x <= maxX; ++x) {
      if (blocks[maxY - (y - minY)][maxX - (x - minX)] == stateB) {
        switch (blocks[y][x]) {
        case stateNone:
          blocks[y][x] = stateB;
          res++;
          break;
        case stateA:
          return -1;
        }
      }
    }
  }
  return res;
}

function count(f) {
  let cnt = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (f(blocks[y][x])) cnt++;
    }
  }
  return cnt;
}

function isSymmetrySub(cx, cy) {
  removeB();
  if (symmetrySub(cx, cy) <= 0) return false;

  let bMinY = height3;
  let bMaxY = 0;
  let bMinX = width3;
  let bMaxX = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (blocks[y][x] == stateB) {
        bMinY = Math.min(bMinY, y);
        bMaxY = Math.max(bMaxY, y);
        bMinX = Math.min(bMinX, x);
        bMaxX = Math.max(bMaxX, x);
      }
    }
  }

  for (let minY = 0; minY <= bMinY; ++minY) {
    for (let maxY = height3 - 1; maxY >= Math.max(minY, bMaxY); --maxY) {
      if (minY != 0 && maxY != height3 - 1) break;
      for (let minX = 0; minX <= bMinX; ++minX) {
        for (let maxX = width3 - 1; maxX >= Math.max(minX, bMaxX); --maxX) {
          if (minX != 0 && maxX != width3 - 1) break;

          removeB();
          let flag = true;
          for (let i = 0; i < maxReflection; i++) {
            const ret = symmetrySub(cx, cy);
            if (ret == -1) {
              flag = false;
              break;
            }
            if (ret == 0) break;
            const ret2 = symmetrySub2(minX, maxX, minY, maxY);
            if (ret2 == -1) {
              flag = false;
              break;
            }
            if (ret2 == 0) break;
          }
          if (!flag) continue;

          if (!isConnected(isB)) continue;
          if (!isSymmetry(isB)) continue;
          if (!isConnected(isAorB)) continue;
          if (!isSymmetry(isAorB)) continue;
          return true;
        }
      }
    }
  }
}

function getCenter(f)
{
  let minX = width3;
  let maxX = 0;
  let minY = height3;
  let maxY = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (f(blocks[y][x])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {x: minX + maxX + 1, y: minY + maxY + 1};
}

function update(e) {
  const startTime = Date.now();
  points = [];
  const countA = count(isA);
  if (countA == 1) {
    const cp = getCenter(isA);
    for (let cy = height * 2; cy <= height * 4; ++cy) {
      for (let cx = width * 2; cx <= width * 4; ++cx) {
        if (cp.x == cx || cp.y == cy) {
          points.push({y: cy, x: cx});
        }
      }
    }
  } else if (countA != 0) {
    for (let cy = height * 2; cy <= height * 4; ++cy) {
      for (let cx = width * 2; cx <= width * 4; ++cx) {
        if (isSymmetrySub(cx, cy)) {
          points.push({x: cx, y: cy});
        }
      }
    }
    if (isSymmetry(isA)) {
      points.push(getCenter(isA));
    }
  }
  const endTime = Date.now();
  setText(`処理時間: ${endTime - startTime}ms`);
  writeUrlInfo();
  draw(e);
}

// {{{ Stack
function Stack() {
  this.data = [];
}
Stack.prototype.push = function(val) {
  this.data.push(val);
  return val;
};
Stack.prototype.pop = function() {
  return this.data.pop();
};
Stack.prototype.top = function() {
  return this.data[this.data.length - 1];
};
Stack.prototype.size = function() {
  return this.data.length;
};
Stack.prototype.empty = function() {
  return this.data.length == 0;
};
// }}}
