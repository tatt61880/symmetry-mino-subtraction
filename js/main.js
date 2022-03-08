'use strict';
const version = 'Version: 2022.03.08';

const debug = false;
window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let pressFlag = false;
let width = 6;
let height = 6;
let width3;
let height3;
let initialBlockStr = '';
const blockSize = 28;
const maxReflection = 100; // 各中心点で点対称操作を行う回数の上限。

const stateNone = 0;
const stateA = 1;
const stateB = 2;

const colorNone = 'white';
const colorA = 'pink';
const colorB = 'aqua';
const colorNormalMode = 'white';
const colorSizeMode = '#ffffaa';

const dy = [1, 0, -1, 0];
const dx = [0, 1, 0, -1];

let blocks = [];
let points = [];

let sizeMode = false;

let elemSvg;
let elemWidth;
let elemHeight;
let elemSizeMode;
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

function applyBlockStr(e, str, dx, dy)
{
  for (let y = 0; y < height3; ++y) {
    blocks[y] = [];
    for (let x = 0; x < width3; ++x) {
      blocks[y][x] = stateNone;
    }
  }
  let y = height + dy;
  let x = width + dx;
  for (const c of str) {
    if (c == '-') {
      y++;
      if (y == height * 2) break;
      x = width + dx;
    } else {
      if (isInsideCenterArea(x, y)) blocks[y][x] = c == '1' ? stateA : stateNone;
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
  elemWidth.value = width;
  elemHeight.value = height;
}

function changeSize(e) {
  const blockStr = getBlockStr();
  width = Number(elemWidth.value);
  height = Number(elemHeight.value);
  setSize(width, height);
  applyBlockStr(e, blockStr, 0, 0);
}

function updateSizeModeButton()
{
  if (sizeMode) {
    elemSizeMode.style.backgroundColor = colorSizeMode;
    elemSizeMode.innerText = 'サイズ変更モードを無効にする';
  } else {
    elemSizeMode.style.backgroundColor = colorNormalMode;
    elemSizeMode.innerText = 'サイズ変更モードを有効にする';
  }
}

function toggleSizeMode(e)
{
  e.preventDefault();
  sizeMode = !sizeMode;
  updateSizeModeButton();

  draw(e);
}

function init(e) {
  elemSvg = document.getElementById('svgBoard');
  elemWidth = document.getElementById('width');
  elemHeight = document.getElementById('height');
  elemSizeMode = document.getElementById('sizeMode');
  elemText = document.getElementById('text');
  elemUrl = document.getElementById('url');
  document.getElementById('version').innerText = version;

  analyzeUrl();
  setSize(width, height);
  applyBlockStr(e, initialBlockStr, 0, 0);

  {
    if (window.ontouchstart === undefined) {
      elemSvg.addEventListener('mousedown', pointerdown, false);
    } else {
      elemSvg.addEventListener('touchstart', pointerdown, false);
    }
    if (window.ontouchmove === undefined) {
      elemSvg.addEventListener('mousemove', pointermove, false);
    } else {
      elemSvg.addEventListener('touchmove', pointermove, false);
    }
    if (window.ontouchend === undefined) {
      elemSvg.addEventListener('mouseup', pointerup, false);
      document.addEventListener('mouseup', pointerup, false);
    } else {
      elemSvg.addEventListener('touchend', pointerup, false);
      document.addEventListener('touchend', pointerup, false);
    }

    elemWidth.addEventListener('change', changeSize, false);
    elemHeight.addEventListener('change', changeSize, false);
    elemSizeMode.addEventListener('click', toggleSizeMode, false);
    updateSizeModeButton();
  }
}

function getCursorPos(e) {
  const bcRect = elemSvg.getBoundingClientRect();
  let cursorX;
  let cursorY;
  if (e.touches !== undefined) {
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

  // ポインタの位置に応じて図形Bをセットし直す。
  removeB();
  let selectedPos;
  if (!sizeMode && points.length != 0) {
    const cursorPos = getCursorPos(e);
    let minDist = -1;
    for (const point of points) {
      let dist = (cursorPos.x - point.x * blockSize / 2.0) ** 2 + (cursorPos.y - point.y * blockSize / 2.0) ** 2;
      if (minDist == -1 || dist < minDist) {
        minDist = dist;
        selectedPos = point;
      }
    }
    const centerOfA = getCenter(isA);
    const isCenterOfA = selectedPos.x == centerOfA.x && selectedPos.y == centerOfA.y;
    hasSolution(selectedPos.x, selectedPos.y, isCenterOfA);
  }

  // 図形の描画
  {
    {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', blockSize * width3);
      rect.setAttribute('height', blockSize * height3);
      rect.setAttribute('fill', colorNone);
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);
    }
    if (sizeMode) {
      const polygon = document.createElementNS(SVG_NS, 'polygon');
      const cx = 3 * blockSize * width / 2;
      const cy = 3 * blockSize * height / 2;
      polygon.setAttribute('points', `${cx},${cy + blockSize * height} ${cx + blockSize * width},${cy} ${cx},${cy - blockSize * height} ${cx - blockSize * width},${cy}`);
      polygon.setAttribute('fill', colorSizeMode);
      polygon.setAttribute('stroke', 'black');
      polygon.setAttribute('stroke-dasharray', '2, 2');
      g.appendChild(polygon);
    }

    const isX = sizeMode ? isA : isAorB;
    for (let y = 0; y < height3; ++y) {
      for (let x = 0; x < width3; ++x) {
        if (isX(blocks[y][x])) {
          const rect = document.createElementNS(SVG_NS, 'rect');
          rect.setAttribute('x', blockSize * x);
          rect.setAttribute('y', blockSize * y);
          rect.setAttribute('width', blockSize);
          rect.setAttribute('height', blockSize);
          rect.setAttribute('fill', blocks[y][x] == stateA ? colorA : colorB);
          rect.setAttribute('stroke', 'none');
          g.appendChild(rect);
        }
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

  // 点
  for (const point of points) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    const isSelected = point === selectedPos;
    circle.setAttribute('cy', blockSize * point.y / 2.0);
    circle.setAttribute('cx', blockSize * point.x / 2.0);
    circle.setAttribute('r', isSelected ? 5.0 : 2.5);
    circle.setAttribute('fill', isSelected ? 'black' : 'red');
    g.appendChild(circle);
  }

  if (sizeMode) {
    // ＼
    {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', blockSize * width);
      line.setAttribute('x2', blockSize * width * 2);
      line.setAttribute('y1', blockSize * height);
      line.setAttribute('y2', blockSize * height * 2);
      line.setAttribute('stroke', 'black');
      line.setAttribute('stroke-dasharray', '2, 2');
      g.appendChild(line);
    }
    // ／
    {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', blockSize * width * 2);
      line.setAttribute('x2', blockSize * width);
      line.setAttribute('y1', blockSize * height);
      line.setAttribute('y2', blockSize * height * 2);
      line.setAttribute('stroke', 'black');
      line.setAttribute('stroke-dasharray', '2, 2');
      g.appendChild(line);
    }
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
// 座標をセットする。
function setCurXY(e) {
  const cursorPos = getCursorPos(e);
  curX = clamp(Math.floor(cursorPos.x / blockSize), 0, width3 - 1);
  curY = clamp(Math.floor(cursorPos.y / blockSize), 0, height3 - 1);
}

// 中心付近の枠内およびその周上か否か。
function isInsideCenterArea(x, y)
{
  if (x < width) return false;
  if (2 * width <= x) return false;
  if (y < height) return false;
  if (2 * height <= y) return false;
  return true;
}

function pointerup() {
  if (debug) window.console.log('pointerup');

  pressFlag = false;
}

function pointerdown(e) {
  if (debug) window.console.log('pointerdown');

  const touches = e.changedTouches;
  if (touches !== undefined && touches.length > 1) {
    return;
  }
  e.preventDefault();

  if (sizeMode) { // サイズ変更モード
    const cursorPos = getCursorPos(e);
    const x = cursorPos.x - 0.5 * blockSize * width3;
    const y = cursorPos.y - 0.5 * blockSize * height3;
    if (Math.abs(x) / width + Math.abs(y) / height > blockSize) {
      return;
    }
    const blockStr = getBlockStr();
    let dx = 0;
    let dy = 0;
    if (Math.abs(x) / width > Math.abs(y) / height) {
      const dd = Math.abs(x) > 0.5 * blockSize * width ? 1 : -1;
      if (width != 1 || dd != -1) {
        width += dd;
        if (x < 0) dx += dd;
      }
    } else {
      const dd = Math.abs(y) > 0.5 * blockSize * height ? 1 : -1;
      if (height != 1 || dd != -1) {
        height += dd;
        if (y < 0) dy += dd;
      }
    }
    e.preventDefault();
    setSize(width, height);
    applyBlockStr(e, blockStr, dx, dy);
    draw(e);
    return;
  }

  setCurXY(e);
  if (!isInsideCenterArea(curX, curY)) {
    draw(e);
    return;
  }

  drawingState = blocks[curY][curX] == stateA ? stateNone : stateA;

  pressFlag = true;
  prevX = -1;
  prevY = -1;
  pointermove(e);
}

function pointermove(e) {
  if (debug) window.console.log('pointermove');

  if (sizeMode) return;
  if (!pressFlag) {
    draw(e);
    return;
  }

  setCurXY(e);
  if (!isInsideCenterArea(curX, curY)) return;
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
  b[y0][x0] = stateNone;
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
        b[yy][xx] = stateNone;
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
function pointSymmetry(newB, cx, cy, checkFlag) {
  const nextB = [];
  for (const p of newB) {
    const bx = cx - p.x - 1;
    const by = cy - p.y - 1;

    // 処理速度等の都合から、あらかじめ用意したエリア外にはみでる場合は不適切とします。
    if (bx < 0) return undefined;
    if (by < 0) return undefined;
    if (bx >= width3) return undefined;
    if (by >= height3) return undefined;

    switch (blocks[by][bx]) {
      case stateNone:
        blocks[by][bx] = stateB;
        nextB.push({x: bx, y: by});
        break;
      case stateA:
        if (checkFlag) return undefined;
        break;
    }
  }
  return nextB;
}

function addB(arrB) {
  for (const p of arrB) {
    blocks[p.y][p.x] = stateB;
  }
}

// 解として正しいか。
function isOk() {
  if (!isConnected(isB)) return false;
  if (!isPointSymmetry(isB)) return false;
  if (!isConnected(isAorB)) return false;
  if (!isPointSymmetry(isAorB)) return false;
  return true;
}

// 点(cx, cy)を図形(AUB)の点対称中心とする解が存在するか否か。
function hasSolution(cx, cy, isCenterOfA) {
  removeB();
  const firstB = [];
  if (!pointSymmetryA(firstB, cx, cy)) return false;
  if (isCenterOfA) {
    if (firstB.length == 0) {
      if (isPointSymmetry(isA)) return true;
    } else {
      if (isOk()) return true;
    }
  } else {
    if (firstB.length == 0) return false;
  }

  let bMinX = width3;
  let bMaxX = 0;
  let bMinY = height3;
  let bMaxY = 0;
  for (const p of firstB) {
    bMinX = Math.min(bMinX, p.x);
    bMaxX = Math.max(bMaxX, p.x);
    bMinY = Math.min(bMinY, p.y);
    bMaxY = Math.max(bMaxY, p.y);
  }

  for (let cby = bMaxY + 1; cby <= bMinY + height3; ++cby) {
    for (let cbx = bMaxX + 1; cbx <= bMinX + width3; ++cbx) {
      removeB();
      addB(firstB);
      let newB = firstB;
      let flag = true;
      for (let i = 0; i < maxReflection; i++) {
        newB = pointSymmetry(newB, cbx, cby, true);
        if (newB === undefined) {
          flag = false;
          break;
        }
        if (newB.length == 0) break;

        newB = pointSymmetry(newB, cx, cy, false);
        if (newB === undefined) {
          flag = false;
          break;
        }
        if (newB.length == 0) break;
      }
      if (!flag) continue;
      if (!isOk()) continue;
      return true;
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
  const centerOfA = getCenter(isA);
  const countA = count(isA);
  if (countA == 1) {
    for (let cy = height * 2; cy <= height * 4; ++cy) {
      for (let cx = width * 2; cx <= width * 4; ++cx) {
        if (cx == centerOfA.x || cy == centerOfA.y) {
          points.push({x: cx, y: cy});
        }
      }
    }
  } else if (countA != 0) {
    for (let cy = height * 2; cy <= height * 4; ++cy) {
      for (let cx = width * 2; cx <= width * 4; ++cx) {
        const isCenterOfA = cx == centerOfA.x && cy == centerOfA.y;
        if (hasSolution(cx, cy, isCenterOfA)) {
          points.push({x: cx, y: cy});
        }
      }
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
