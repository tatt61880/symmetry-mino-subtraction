window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let pressFlag = false;
const centerNumX = 5;
const centerNumY = 7;
const blockNumX = centerNumX * 3;
const blockNumY = centerNumY * 3;
const blockSize = 25;

const stateNone = 0;
const stateA = 1;
const stateB = 2;

let blocks = [];
let points = [];
let svg;

function init(e) {
  svg = document.getElementById('svgBoard');
  svg.addEventListener('mousedown', pressOn, false);
  svg.addEventListener('touchstart', pressOn, false);
  svg.addEventListener('mousemove', cursorMoved, false);
  svg.addEventListener('touchmove', cursorMoved, false);
  svg.addEventListener('mouseup', pressOff, false);
  svg.addEventListener('touchend', pressOff, false);

  for (let y = 0; y < blockNumY; ++y) {
    blocks[y] = [];
    for (let x = 0; x < blockNumX; ++x) {
      blocks[y][x] = 0;
    }
  }
  draw(e);
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

    let minDist = Infinity;
    for (const point of points) {
      let dist = (cursorX - point.x * blockSize / 2.0) ** 2 + (cursorY - point.y * blockSize / 2.0) ** 2;
      if (dist < minDist) {
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

function isSymmetrySub(cx, cy) {
  removeB();
  let countB = 0;
  for (let y = 0; y < blockNumY; ++y) {
    for (let x = 0; x < blockNumX; ++x) {
      if (blocks[y][x] == stateA) {
        const ax = 2 * x + 1;
        const ay = 2 * y + 1;
        const bx = (2 * cx - ax - 1) / 2;
        const by = (2 * cy - ay - 1) / 2;
        if (blocks[by][bx] == stateNone) {
          countB++;
          blocks[by][bx] = stateB;
        }
      }
    }
  }
  if (countB == 0) return false;

  // Is a and b connected?
  {
    let count = 0;
    let b = [];
    for (let y = 0; y < blockNumY; ++y) {
      b[y] = [];
      for (let x = 0; x < blockNumX; ++x) {
        b[y][x] = blocks[y][x];
        if (b[y][x]) count++;
      }
    }
    let x0;
    let y0;
    for (let y = 0; y < blockNumY; ++y) {
      for (let x = 0; x < blockNumX; ++x) {
        if (b[y][x]) {
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
        if (b[yy][xx]) {
          b[yy][xx] = 0;
          st.push([xx, yy]);
        }
      }
    }
    if (cnt != count) return false;
  }

  // Is b connected?
  {
    let b = [];
    for (let y = 0; y < blockNumY; ++y) {
      b[y] = [];
      for (let x = 0; x < blockNumX; ++x) {
        b[y][x] = blocks[y][x];
      }
    }
    let x0;
    let y0;
    for (let y = 0; y < blockNumY; ++y) {
      for (let x = 0; x < blockNumX; ++x) {
        if (b[y][x] == stateB) {
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
        if (b[yy][xx] == stateB) {
          b[yy][xx] = 0;
          st.push([xx, yy]);
        }
      }
    }
    if (cnt != countB) return false;
  }

  // Is b symmetry?
  {
    let minX = blockNumX;
    let maxX = 0;
    let minY = blockNumY;
    let maxY = 0;
    for (let y = 0; y < blockNumY; ++y) {
      for (let x = 0; x < blockNumX; ++x) {
        if (blocks[y][x] == stateB) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    for (let y = 0; y < blockNumY; ++y) {
      for (let x = 0; x < blockNumX; ++x) {
        if (blocks[y][x] == stateB) {
          if (blocks[maxY - (y - minY)][maxX - (x - minX)] != stateB) {
            return false;
          }
        }
      }
    }
  }
  return true;
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

  points = [];
  for (let cy = centerNumY * 2; cy <= centerNumY * 4; ++cy) {
    for (let cx = centerNumX * 2; cx <= centerNumX * 4; ++cx) {
      if (isSymmetrySub(cx, cy)) {
        points.push({y: cy, x: cx});
      }
    }
  }

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
