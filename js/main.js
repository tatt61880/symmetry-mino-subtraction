'use strict';
const version = 'Version: 2022.03.20';

const debug = false;
window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let drawingFlag = false;
let width = 6;
let height = 6;
let width3;
let height3;
const blockSize = 28;

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

const Mode = {
  normal: 'normal',
  size: 'size',
  manual: 'manual',
};
let mode = Mode.normal;

let elemSizeInfo;
let elemWidth;
let elemHeight;
let elemSizeModeButton;
let elemProcessTimeInfo;
let elemSvg;
let elemUrlInfo;
let elemModeNameInfo;
let elemModeInfo;

let curX;
let curY;
let prevX;
let prevY;
let drawingState;

function analyzeUrl() {
  const res = {
    width: width, 
    height: height,
    blockStr: '',
    mode: mode
  };
  const queryStrs = location.href.split('?')[1];
  if (queryStrs == null) return res;
  for (const queryStr of queryStrs.split('&')) {
    const paramArray = queryStr.split('=');
    if (paramArray.length != 2) continue;
    const paramName = paramArray[0];
    const paramVal = paramArray[1];
    switch (paramName) {
    case 'w':
      res.width = Number(paramVal);
      break;
    case 'h':
      res.height = Number(paramVal);
      break;
    case 's':
      res.blockStr = paramVal;
      break;
    case 'm':
      res.mode = paramVal;
      break;
    }
  }
  return res;
}

function getUrlInfo() {
  return location.href.split('?')[0] + `?w=${width}&h=${height}&s=${getBlockStr()}`;
}

function updateUrlInfo() {
  if (mode == Mode.manual) {
    elemUrlInfo.innerHTML = '';
  } else {
    const url = getUrlInfo();
    elemUrlInfo.innerHTML = `↓現在の盤面のURL↓<br><a href="${url}">${url}</a>`;
  }
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
      if (isInsideCenterArea(x, y)) {
        blocks[y][x] = c == '1' ? stateA : stateNone;
      }
      x++;
    }
  }
  update(e);
}

function setSize(w, h) {
  width = w;
  height = h;
  width3 = w * 3;
  height3 = h * 3;
  elemSvg.setAttribute('width', width3 * blockSize);
  elemSvg.setAttribute('height', height3 * blockSize);
  elemWidth.value = w;
  elemHeight.value = h;
}

function changeSize(e) {
  const blockStr = getBlockStr();
  const w = Number(elemWidth.value);
  const h = Number(elemHeight.value);
  setSize(w, h);
  applyBlockStr(e, blockStr, 0, 0);
}

function updateModeInfo()
{
  switch (mode) {
  case Mode.normal:
    elemModeNameInfo.innerHTML = '通常モード';
    elemModeInfo.innerHTML = `
濃い点線枠内にポリオミノを描画してください。<br>
点対称連結ポリオミノ(水色)を足すことで、<br>
全体の図形(ピンク+水色)を<br>
点対称連結ポリオミノにできる場合、<br>
その時の中心点を示します。`;
    break;
  case Mode.size:
    elemModeNameInfo.innerHTML = 'サイズ変更モード';
    elemModeInfo.innerHTML = 'クリック位置に応じて盤面を拡大縮小するモードです。';
    break;
  case Mode.manual:
    elemModeNameInfo.innerHTML = '手動モード';
    elemModeInfo.innerHTML = 'ピンクを固定し、水色を自ら描画するモードです。';
    break;
  }

  if (mode == Mode.size) {
    elemSizeModeButton.style.backgroundColor = colorSizeMode;
    elemSizeModeButton.innerText = 'サイズ変更モードを無効にする';
  } else {
    elemSizeModeButton.style.backgroundColor = colorNormalMode;
    elemSizeModeButton.innerText = 'サイズ変更モードを有効にする';
  }

  elemSizeInfo.style.display = mode == Mode.manual ? 'none' : 'block';
}

function toggleSizeMode(e)
{
  e.preventDefault();
  switch (mode) {
  case Mode.normal:
    mode = Mode.size;
    break;
  case Mode.size:
    mode = Mode.normal;
    break;
  }
  updateModeInfo();

  draw(e);
}

function init(e) {
  document.getElementById('versionInfo').innerText = version;

  elemSizeInfo = document.getElementById('sizeInfo');
  elemWidth = document.getElementById('widthVal');
  elemHeight = document.getElementById('heightVal');
  elemSizeModeButton = document.getElementById('sizeModeButton');

  elemProcessTimeInfo = document.getElementById('processTimeInfo');
  elemSvg = document.getElementById('svgBoard');
  elemUrlInfo = document.getElementById('urlInfo');

  elemModeNameInfo = document.getElementById('modeNameInfo');
  elemModeInfo = document.getElementById('modeInfo');

  const res = analyzeUrl();
  mode = res.mode;
  setSize(res.width, res.height);
  applyBlockStr(e, res.blockStr, 0, 0);
  updateModeInfo();

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
    elemSizeModeButton.addEventListener('click', toggleSizeMode, false);
  }
}

function getCursorPos(elem, e) {
  const bcRect = elem.getBoundingClientRect();
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

function createLine(param) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', blockSize * param.x1);
  line.setAttribute('y1', blockSize * param.y1);
  line.setAttribute('x2', blockSize * param.x2);
  line.setAttribute('y2', blockSize * param.y2);
  return line;
}

function createCircle(param) {
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', blockSize * param.cx);
  circle.setAttribute('cy', blockSize * param.cy);
  circle.setAttribute('r', param.r);
  return circle;
}

function createRect(param) {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', blockSize * param.x);
  rect.setAttribute('y', blockSize * param.y);
  rect.setAttribute('width', blockSize * param.width);
  rect.setAttribute('height', blockSize * param.height);
  return rect;
}

function draw(e) {
  while (elemSvg.firstChild) {
    elemSvg.removeChild(elemSvg.firstChild);
  }
  const g = document.createElementNS(SVG_NS, 'g');

  // ポインタの位置に応じて図形Bをセットし直す。
  let selectedPos;
  let centerOfB = undefined;
  if (mode != Mode.manual) {
    removeB();
    if (mode != Mode.size && points.length != 0) {
      const cursorPos = getCursorPos(elemSvg, e);
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
      if (count(isB)) {
        centerOfB = getCenter(isB);
      }
    }
  }

  // 図形の描画
  {
    {
      const rect = createRect({x: 0, y: 0, width: width3, height: height3});
      rect.setAttribute('fill', colorNone);
      rect.setAttribute('stroke', 'none');
      g.appendChild(rect);
    }
    if (mode == Mode.size) {
      const polygon = document.createElementNS(SVG_NS, 'polygon');
      const cx = blockSize * width3 / 2;
      const cy = blockSize * height3 / 2;
      const w = blockSize * width;
      const h = blockSize * height;
      polygon.setAttribute('points', `${cx},${cy + h} ${cx + w},${cy} ${cx},${cy - h} ${cx - w},${cy}`);
      polygon.setAttribute('fill', colorSizeMode);
      polygon.setAttribute('stroke', 'black');
      polygon.setAttribute('stroke-dasharray', '2, 2');
      g.appendChild(polygon);
    }

    const isX = mode == Mode.size ? isA : isAorB;
    for (let y = 0; y < height3; ++y) {
      for (let x = 0; x < width3; ++x) {
        if (isX(blocks[y][x])) {
          const rect = createRect({x: x, y: y, width: 1, height: 1});
          rect.setAttribute('fill', blocks[y][x] == stateA ? colorA : colorB);
          rect.setAttribute('stroke', 'none');
          g.appendChild(rect);
        }
      }
    }
  }

  // 横線
  for (let y = 0; y <= height3; ++y) {
    const line = createLine({x1: 0, y1: y, x2: width3, y2: y});
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  // 縦線
  for (let x = 0; x <= width3; ++x) {
    const line = createLine({x1: x, y1: 0, x2: x, y2: height3});
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-dasharray', '1, 3');
    g.appendChild(line);
  }
  // 中央部
  if (mode != Mode.manual) {
    const rect = createRect({x: width, y: height, width: width, height: height});
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', 'black');
    rect.setAttribute('stroke-dasharray', '2, 2');
    g.appendChild(rect);
  }

  // 点
  for (const point of points) {
    const isSelected = point === selectedPos;
    const r = isSelected ? 7 : 3;
    const circle = createCircle({cx: point.x / 2.0, cy: point.y / 2.0, r: r});
    circle.setAttribute('fill', isSelected ? 'darkviolet' : 'red');
    g.appendChild(circle);
  }

  if (centerOfB !== undefined) {
    const circle = createCircle({cx: centerOfB.x / 2.0, cy: centerOfB.y / 2.0, r: 5});
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'blue');
    g.appendChild(circle);
  }

  if (mode == Mode.manual) {
    // 図形(AUB)が連結点対称
    if (count(isAorB) != 0 && isPointSymmetry(isAorB) && isConnected(isAorB)) {
      const center = getCenter(isAorB);
      const circle = createCircle({cx: center.x / 2.0, cy: center.y / 2.0, r: 7});
      circle.setAttribute('fill', 'darkviolet');
      g.appendChild(circle);
    }

    // 図形Bが連結点対称
    if (count(isB) != 0 && isPointSymmetry(isB) && isConnected(isB)) {
      const centerB = getCenter(isB);
      const centerAorB = getCenter(isAorB);
      const r = centerB.x == centerAorB.x && centerB.y == centerAorB.y ? 10 : 5;
      const circle = createCircle({cx: centerB.x / 2.0, cy: centerB.y / 2.0, r: r});
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'blue');
      g.appendChild(circle);
    }
  }

  if (mode == Mode.size) {
    // ＼
    {
      const line = createLine({x1: width, y1: height, x2: width * 2, y2: height * 2});
      line.setAttribute('stroke', 'black');
      line.setAttribute('stroke-dasharray', '2, 2');
      g.appendChild(line);
    }
    // ／
    {
      const line = createLine({x1: width * 2, y1: height, x2: width, y2: height * 2});
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

// 座標をセットする。
function setCurXY(e) {
  const cursorPos = getCursorPos(elemSvg, e);
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

  drawingFlag = false;
}

// タッチ環境において、画面端付近か否か。
function isTouchScreenNearEdge(e) {
  if (e.touches === undefined) return false;
  const x = e.touches[0].clientX;
  return x < 30 || screen.width - 30 < x;
}

function pointerdown(e) {
  if (debug) window.console.log('pointerdown');

  const touches = e.changedTouches;
  if (touches !== undefined && touches.length > 1) {
    return;
  }
  if (!isTouchScreenNearEdge(e)) e.preventDefault();

  if (mode == Mode.size) {
    const cursorPos = getCursorPos(elemSvg, e);
    const x = cursorPos.x - 0.5 * blockSize * width3;
    const y = cursorPos.y - 0.5 * blockSize * height3;
    if (Math.abs(x) / width + Math.abs(y) / height > blockSize) {
      return;
    }
    const blockStr = getBlockStr();
    let dx = 0;
    let dy = 0;
    let newWidth = width;
    let newHeight = height;
    if (Math.abs(x) / width > Math.abs(y) / height) {
      const dd = Math.abs(x) > 0.5 * blockSize * width ? 1 : -1;
      if (width != 1 || dd != -1) {
        newWidth += dd;
        if (x < 0) dx += dd;
      }
    } else {
      const dd = Math.abs(y) > 0.5 * blockSize * height ? 1 : -1;
      if (height != 1 || dd != -1) {
        newHeight += dd;
        if (y < 0) dy += dd;
      }
    }
    setSize(newWidth, newHeight);
    applyBlockStr(e, blockStr, dx, dy);
    draw(e);
    return;
  }

  setCurXY(e);
  if (mode != Mode.manual && !isInsideCenterArea(curX, curY)) {
    draw(e);
    return;
  }

  if (mode == Mode.normal) {
    drawingState = blocks[curY][curX] == stateA ? stateNone : stateA;
  } else {
    drawingState = blocks[curY][curX] == stateB ? stateNone : stateB;
  }
  drawingFlag = true;

  prevX = -1;
  prevY = -1;
  pointermove(e);
}

function pointermove(e) {
  if (debug) window.console.log('pointermove');

  if (mode == Mode.size) return;
  if (!drawingFlag) {
    draw(e);
    return;
  }

  setCurXY(e);
  if (mode != Mode.manual && !isInsideCenterArea(curX, curY)) return;
  if (!isTouchScreenNearEdge(e)) e.preventDefault();

  if (curX == prevX && curY == prevY) return;
  prevX = curX;
  prevY = curY;
  if (mode == Mode.normal) {
    blocks[curY][curX] = drawingState;
  } else {
    if (blocks[curY][curX] != stateA) {
      blocks[curY][curX] = drawingState;
    }
  }

  update(e);
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

function removeB() {
  for (let y = 0; y < height3; ++y) {
    for (let x = 0; x < width3; ++x) {
      if (blocks[y][x] == stateB) {
        blocks[y][x] = stateNone;
      }
    }
  }
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
      for (;;) {
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

  if (mode == Mode.manual) {
    updateUrlInfo();
    draw(e);
    return;
  }
  const startTime = Date.now();
  points = [];
  const centerOfA = getCenter(isA);
  const countA = count(isA);
  switch (countA) {
  case 0:
    break;
  case 1:
    for (let cy = height * 2; cy <= height * 4; ++cy) {
      for (let cx = width * 2; cx <= width * 4; ++cx) {
        if (cx == centerOfA.x || cy == centerOfA.y) {
          points.push({x: cx, y: cy});
        }
      }
    }
    break;
  default:
    for (let cy = height * 2; cy <= height * 4; ++cy) {
      for (let cx = width * 2; cx <= width * 4; ++cx) {
        const isCenterOfA = cx == centerOfA.x && cy == centerOfA.y;
        if (hasSolution(cx, cy, isCenterOfA)) {
          points.push({x: cx, y: cy});
        }
      }
    }
    break;
  }
  const endTime = Date.now();
  elemProcessTimeInfo.innerHTML = `
処理時間: ${endTime - startTime}ミリ秒<br>
解となる中心点数(濃い点線枠内): ${points.length}点<br>
<a href="${getUrlInfo()}&m=manual" target="_blank">この盤面を手動モードで開く</a> (別タブで開きます)`;
  updateUrlInfo();
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
