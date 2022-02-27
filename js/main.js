'use strict';
const version = 'Version: 2022.02.27';

const debug = false;
window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let pressFlag = false;
let width = 6;
let height = 6;
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
      }
    }
  }
}

function writeUrlInfo() {
  const url = location.href.split('?')[0] + `?w=${width}&h=${height}&s=${getBlockStr()}`;
  elemUrl.innerHTML = `↓現在の盤面のURL↓<br><a href="${url}">${url}</a>`;
}

function getBlockStr() {
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

function setText(str) {
  elemText.innerText = str;
}

function setSize(w, h) {
  width3 = w * 3;
  height3 = h * 3;
  elemSvg.setAttribute('width', width3 * blockSize);
  elemSvg.setAttribute('height', height3 * blockSize);
}

function changeSize(e) {
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
    if (typeof window.ontouchstart === 'undefined') {
      elemSvg.addEventListener('mousedown', pointerdown, false);
    } else {
      elemSvg.addEventListener('touchstart', pointerdown, false);
    }
    if (typeof window.ontouchmove === 'undefined') {
      elemSvg.addEventListener('mousemove', pointermove, false);
    } else {
      elemSvg.addEventListener('touchmove', pointermove, false);
    }
    if (typeof window.ontouchend === 'undefined') {
      elemSvg.addEventListener('mouseup', pointerup, false);
      document.addEventListener('mouseup', pointerup, false);
    } else {
      elemSvg.addEventListener('touchend', pointerup, false);
      document.addEventListener('touchend', pointerup, false);
    }

    elemWidth.value = width;
    elemHeight.value = height;
    elemWidth.addEventListener('change', changeSize, false);
    elemHeight.addEventListener('change', changeSize, false);
  }
}

function getCursorPos(e) {
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
  return {x: cursorX, y: cursorY};
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
    const cursorPos = getCursorPos(e);
    let minDist = -1;
    for (const point of points) {
      let dist = (cursorPos.x - point.x * blockSize / 2.0) ** 2 + (cursorPos.y - point.y * blockSize / 2.0) ** 2;
      if (minDist == -1 || dist < minDist) {
        minDist = dist;
        selectedX = point.x;
        selectedY = point.y;
      }
    }
    hasSolution(selectedX, selectedY);
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

  // 横線
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
  // 縦線
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
  // 中央部
  {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', blockSize * width);
    rect.setAttribute('y', blockSize * height);
    rect.setAttribute('width', blockSize * width);
    rect.setAttribute('height', blockSize * height);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', 'black');
    rect.setAttribute('stroke-dasharray', '2, 2');
    g.appendChild(rect);
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

function clamp(val, min, max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

let curX;
let curY;
let prevX;
let prevY;
let drawingState;
// 座標をセットする。戻り値は中心付近の枠内か否か。
function setCurXY(e) {
  const cursorPos = getCursorPos(e);
  curX = clamp(Math.floor(cursorPos.x / blockSize), 0, width3 - 1);
  curY = clamp(Math.floor(cursorPos.y / blockSize), 0, height3 - 1);
  if (curX < width) return false;
  if (2 * width <= curX) return false;
  if (curY < height) return false;
  if (2 * height <= curY) return false;
  return true;
}

function pointerup() {
  if (debug) window.console.log('pointerup');
  pressFlag = false;
}

function pointerdown(e) {
  const touches = e.changedTouches;
  if (touches !== undefined && touches.length > 1) {
    return;
  }
  if (debug) window.console.log('pointerdown');
  if (!setCurXY(e)) {
    update(e);
    return;
  }
  e.preventDefault();

  drawingState = blocks[curY][curX] == stateA ? stateNone : stateA;

  pressFlag = true;
  prevX = -1;
  prevY = -1;
  pointermove(e);
}

function pointermove(e) {
  if (debug) window.console.log('pointermove');
  if (!pressFlag) {
    draw(e);
    return;
  }

  if (!setCurXY(e)) return;
  e.preventDefault();

  if (curX == prevX && curY == prevY) return;
  prevX = curX;
  prevY = curY;
  blocks[curY][curX] = drawingState;

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

function isAorB(x) {
  return x != stateNone;
}

function isA(x) {
  return x == stateA;
}

function isB(x) {
  return x == stateB;
}

// 図形が点対称か否か。
function isPointSymmetry(isX) {
  let minX = width3;
  let maxX = 0;
  let minY = height3;
  let maxY = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (isX(blocks[y][x])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  for (let y = minY; y <= maxY; ++y) {
    for (let x = minX; x <= maxX; ++x) {
      if (isX(blocks[y][x]) && !isX(blocks[minY + maxY - y][minX + maxX - x])) {
        return false;
      }
    }
  }
  return true;
}

// 図形が連結か否か。
function isConnected(isX) {
  const b = new Array(height3);
  for (let y = 0; y < height3; ++y) {
    b[y] = blocks[y].slice();
  }
  let x0;
  let y0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (isX(b[y][x])) {
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
      if (isX(b[yy][xx])) {
        b[yy][xx] = 0;
        st.push([xx, yy]);
      }
    }
  }

  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (isX(b[y][x])) return false;
    }
  }
  return true;
}

// 図形Aを点(cx, cy)で点対称になるようにしたとき 元の図形と重なっていない部分を図形Bとする。
function pointSymmetryA(firstB, cx, cy) {
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (blocks[y][x] == stateA) {
        const bx = cx - x - 1;
        const by = cy - y - 1;

        // 処理速度等の都合から、あらかじめ用意したエリア外にはみでる場合は不適切とします。
        if (bx < 0) return false;
        if (by < 0) return false;
        if (bx >= width3) return false;
        if (by >= height3) return false;

        if (blocks[by][bx] == stateNone) {
          blocks[by][bx] = stateB;
          firstB.push({x: bx, y: by});
        }
      }
    }
  }
  return true;
}

// 図形Bに最後に追加された点の配列newBを点(cx, cy)で点対称になるようにしたとき  元の図形と重なっていない部分を図形Bとする。
function pointSymmetry(newB, cx, cy) {
  const nextB = [];
  for (const p of newB) {
    const bx = cx - p.x - 1;
    const by = cy - p.y - 1;

    // 処理速度等の都合から、あらかじめ用意したエリア外にはみでる場合は不適切とします。
    if (bx < 0) return undefined;
    if (by < 0) return undefined;
    if (bx >= width3) return undefined;
    if (by >= height3) return undefined;

    if (blocks[by][bx] == stateNone) {
      blocks[by][bx] = stateB;
      nextB.push({x: bx, y: by});
    }
  }
  return nextB;
}

function addB(arrB) {
  for (const p of arrB) {
    blocks[p.y][p.x] = stateB;
  }
}

// 点(cx, cy)を図形(AUB)の点対称中心とする解が存在するか否か。
function hasSolution(cx, cy) {
  removeB();
  const firstB = [];
  if (!pointSymmetryA(firstB, cx, cy)) return false;
  if (firstB.length == 0) return false;

  let bMinY = height3;
  let bMaxY = 0;
  let bMinX = width3;
  let bMaxX = 0;
  for (const p of firstB) {
    bMinX = Math.min(bMinX, p.x);
    bMaxX = Math.max(bMaxX, p.x);
    bMinY = Math.min(bMinY, p.y);
    bMaxY = Math.max(bMaxY, p.y);
  }

  for (let minY = 0; minY <= bMinY; ++minY) {
    for (let maxY = height3 - 1; maxY >= bMaxY; --maxY) {
      if (minY != 0 && maxY != height3 - 1) break;
      for (let minX = 0; minX <= bMinX; ++minX) {
        for (let maxX = width3 - 1; maxX >= bMaxX; --maxX) {
          if (minX != 0 && maxX != width3 - 1) break;
          const cbx = minX + maxX + 1;
          const cby = minY + maxY + 1;

          removeB();
          addB(firstB);
          let newB = firstB;
          let flag = true;
          for (let i = 0; i < maxReflection; i++) {
            newB = pointSymmetry(newB, cbx, cby);
            if (newB === undefined) {
              flag = false;
              break;
            }
            if (newB.length == 0) break;

            newB = pointSymmetry(newB, cx, cy);
            if (newB === undefined) {
              flag = false;
              break;
            }
            if (newB.length == 0) break;
          }
          if (!flag) continue;

          if (!isConnected(isB)) continue;
          if (!isPointSymmetry(isB)) continue;
          if (!isConnected(isAorB)) continue;
          if (!isPointSymmetry(isAorB)) continue;
          return true;
        }
      }
    }
  }
}

function getCenter(isX) {
  let minX = width3;
  let maxX = 0;
  let minY = height3;
  let maxY = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (isX(blocks[y][x])) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {x: minX + maxX + 1, y: minY + maxY + 1};
}

function count(isX) {
  let cnt = 0;
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (isX(blocks[y][x])) cnt++;
    }
  }
  return cnt;
}

function update(e) {
  if (debug) window.console.log('update');
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
        if (hasSolution(cx, cy)) {
          points.push({x: cx, y: cy});
        }
      }
    }
    if (isPointSymmetry(isA)) {
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
