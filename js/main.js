window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let pressFlag = false;
let centerNumX = 5;
let centerNumY = 7;
let blockNumX;
let blockNumY;
let blockInitStr = '';
const blockSize = 25;

const stateNone = 0;
const stateA = 1;
const stateB = 2;

let blocks = [];
let points = [];
let svg;

function analyzeUrl() {
  let paravalsStr = location.href.split('?')[1];
  if (paravalsStr == null) paravalsStr = '';
  analyzeParavals(paravalsStr);
}

function analyzeParavals(paravalsStr) {
  let paravalsArray = paravalsStr.split('&');
  if (!paravalsArray.length) return;

  for (let i = 0; i < paravalsArray.length; ++i) {
    let paraval = paravalsArray[i].split('=');
    if (paraval.length == 2) {
      if (paraval[0] == 'w') {
        centerNumX = clamp(Number(paraval[1]), 3, 10);
      } else if (paraval[0] == 'h') {
        centerNumY = clamp(Number(paraval[1]), 3, 10);
      } else if (paraval[0] == 's') {
        blockInitStr = paraval[1];
      } else {
        continue;
      }
    }
  }
}

function initSvg() {
  svg = document.getElementById('svgBoard');
  svg.addEventListener('mousedown', pressOn, false);
  svg.addEventListener('touchstart', pressOn, false);
  svg.addEventListener('mousemove', cursorMoved, false);
  svg.addEventListener('touchmove', cursorMoved, false);
  svg.addEventListener('mouseup', pressOff, false);
  svg.addEventListener('touchend', pressOff, false);
}

function init(e) {
  analyzeUrl();
  blockNumX = centerNumX * 3;
  blockNumY = centerNumY * 3;
  for (let y = 0; y < blockNumY; ++y) {
    blocks[y] = [];
    for (let x = 0; x < blockNumX; ++x) {
      blocks[y][x] = 0;
    }
  }
  {
    let y = centerNumY;
    let x = centerNumX;
    for (const c of blockInitStr) {
      if (c == '-') {
        y++;
        x = centerNumX;
      } else {
        blocks[y][x] = parseInt(c);
        x++;
      }
    }
  }
  initSvg();
  update(e);
}

function draw(e) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
  let g = document.createElementNS(SVG_NS, 'g');

  removeB();
  let selectedX;
  let selectedY;
  if (points.length != 0) {
    let bcRect = svg.getBoundingClientRect();
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

  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (blocks[y][x]) {
        let rect = document.createElementNS(SVG_NS, 'rect');
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

  for (const point of points) {
    let circle = document.createElementNS(SVG_NS, 'circle');
    const isSelected = point.y == selectedY && point.x == selectedX;
    circle.setAttribute('cy', blockSize * point.y / 2.0);
    circle.setAttribute('cx', blockSize * point.x / 2.0);
    circle.setAttribute('r', isSelected ? 3.0 : 2.0);
    circle.setAttribute('fill', isSelected ? 'black' : 'red');
    g.appendChild(circle);
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

function preventDefault(e) {
  e.preventDefault(); // iOSで連続でボタンを押しているとダブルクリック判定されて画面が移動してしまったりするので。
}

function pressOff(e) {
  preventDefault(e);
  pressFlag = false;
}

function removeB() {
  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (blocks[y][x] == stateB) {
        blocks[y][x] = stateNone;
      }
    }
  }
}

function isAorB(x)
{
  if (x == stateA) return true;
  if (x == stateB) return true;
  return false;
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
  let minX = blockNumX;
  let maxX = 0;
  let minY = blockNumY;
  let maxY = 0;
  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (f(blocks[y][x])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (f(blocks[y][x]) && !f(blocks[maxY - (y - minY)][maxX - (x - minX)])) {
        return false;
      }
    }
  }
  return true;
}

function isConnected(f) {
  let count = 0;
  let b = [];
  for (let y = 0; y < blockNumY; ++y) {
    b[y] = [];
    for (let x = 0; x < blockNumX; ++x) {
      b[y][x] = blocks[y][x];
      if (f(b[y][x])) count++;
    }
  }
  let x0;
  let y0;
  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (f(b[y][x])) {
        x0 = x;
        y0 = y;
        break;
      }
    }
  }

  let st = new Stack();
  st.push([x0, y0]);
  b[y0][x0] = 0;
  let cnt = 0;
  while (!st.empty()) {
    cnt++;
    let xy = st.pop();
    const dy = [1, 0, -1, 0];
    const dx = [0, 1, 0, -1];
    for (let i = 0; i < 4; i++) {
      let xx = xy[0] + dx[i];
      let yy = xy[1] + dy[i];
      if (xx < 0) continue;
      if (yy < 0) continue;
      if (xx >= blockNumX) continue;
      if (yy >= blockNumY) continue;
      if (f(b[yy][xx])) {
        b[yy][xx] = 0;
        st.push([xx, yy]);
      }
    }
  }
  return cnt == count;
}

// 図形(AUB)を点Cに点対称になるようにしたとき元の図形と重なっていない部分を図形Bとする。
function symmetrySub(cx, cy) {
  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (blocks[y][x] != stateNone) {
        const ax = 2 * x + 1;
        const ay = 2 * y + 1;
        const bx = (2 * cx - ax - 1) / 2;
        const by = (2 * cy - ay - 1) / 2;
        // 処理速度等の都合から、あらかじめ用意したエリア外にはみでる場合は不適切とします。
        if (bx < 0) return false;
        if (by < 0) return false;
        if (bx >= blockNumX) return false;
        if (by >= blockNumY) return false;

        if (blocks[by][bx] == stateNone) {
          blocks[by][bx] = stateB;
        }
      }
    }
  }
  return true;
}

// 図形Bを((minX + maxX) / 2, (minY + maxY) / 2)で点対称になるようにしたとき元の図形と重なっていない部分を図形Bとする。
function symmetrySub2(minX, maxX, minY, maxY) {
  for (let y = minY; y <= maxY; ++y) {
    for (let x = minX; x <= maxX; ++x) {
      if (blocks[maxY - (y - minY)][maxX - (x - minX)] == stateB) {
        switch (blocks[y][x]) {
        case stateNone:
          blocks[y][x] = stateB;
          break;
        case stateB:
          break;
        default:
          return false;
        }
      }
    }
  }
  return true;
}

function countB() {
  let count = 0;
  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (blocks[y][x] == stateB) count++;
    }
  }
  return count;
}

function isSymmetrySub(cx, cy) {
  removeB();
  symmetrySub(cx, cy);
  if (countB() == 0) return false;

  for (let minY = 0; minY < 2 * centerNumY; ++minY) {
    for (let maxY = Math.max(minY, centerNumY); maxY < blockNumY; ++maxY) {
      for (let minX = 0; minX < 2 * centerNumX; ++minX) {
        for (let maxX = Math.max(minY, centerNumX); maxX < blockNumX; ++maxX) {
          removeB();
          if (!symmetrySub(cx, cy)) continue;
          if (!symmetrySub2(minX, maxX, minY, maxY)) continue;
          if (!symmetrySub(cx, cy)) continue;
          if (!symmetrySub2(minX, maxX, minY, maxY)) continue;
          if (!symmetrySub(cx, cy)) continue;
          if (!symmetrySub2(minX, maxX, minY, maxY)) continue;

          // Is A and B connected?
          if (!isConnected(isAorB)) continue;
          // Is B connected?
          if (!isConnected(isB)) continue;
          // Is B symmetry?
          if (!isSymmetry(isB)) continue;
          // Is A and B symmetry?
          if (!isSymmetry(isAorB)) continue;
          return true;
        }
      }
    }
  }
}

function update(e) {
  points = [];
  if (isConnected(isA)) {
    for (let cy = centerNumY * 2; cy <= centerNumY * 4; ++cy) {
      for (let cx = centerNumX * 2; cx <= centerNumX * 4; ++cx) {
        if (isSymmetrySub(cx, cy)) {
          points.push({y: cy, x: cx});
        }
      }
    }
  }
  draw(e);
}

function cursorMoved(e) {
  if (!pressFlag) {
    draw(e);
    return;
  }

  calcXY(e);
  if (x < centerNumX) return;
  if (2 * centerNumX <= x) return;
  if (y < centerNumY) return;
  if (2 * centerNumY <= y) return;

  if (x == prevX && y == prevY) return;
  prevX = x;
  prevY = y;
  blocks[y][x] = state;

  update(e);
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
