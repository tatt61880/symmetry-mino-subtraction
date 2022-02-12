window.addEventListener('load', init, false);

const SVG_NS = 'http://www.w3.org/2000/svg';
let pressFlag = false;
const centerNumX = 5;
const centerNumY = 7;
const blockNumX = centerNumX * 3;
const blockNumY = centerNumY * 3;
const blockSize = 30;

const state_none = 0;
const state_a = 1;
const state_b = 2;

let blocks = [];
let points = [];
let svg;

function init() {
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
        rect.setAttribute('fill', blocks[y][x] == state_a ? 'pink' : 'aqua');
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
    circle.setAttribute('cy', blockSize * point[0] / 2.0);
    circle.setAttribute('cx', blockSize * point[1] / 2.0);
    circle.setAttribute('r', 2.0);
    circle.setAttribute('fill', 'red');
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

  if (blocks[y][x] == state_a) {
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

  points = [];
  for (let cy = centerNumY * 2; cy <= centerNumY * 4; ++cy) {
    for (let cx = centerNumX * 2; cx <= centerNumX * 4; ++cx) {
      let f = false;
      /*
      for (let dy = 0; dy <= 1 - cy % 2; ++dy) {
        for (let dx = 0; dx <= 1 - cx % 2; ++dx) {
          if (blocks[Math.floor(cy / 2) - dy][Math.floor(cx / 2) - dx] == state_a) {
            f = true;
            break;
          }
        }
      }
      if (!f) continue;
      */
      f = true;

      for (let y = 0; y < blockNumY; ++y) {
        for (let x = 0; x < blockNumX; ++x) {
          if (blocks[y][x] == state_b) {
            blocks[y][x] = state_none;
          }
        }
      }
      let count_b = 0;
      for (let y = 0; y < blockNumY; ++y) {
        for (let x = 0; x < blockNumX; ++x) {
          if (blocks[y][x] == state_a) {
            const ax = 2 * x + 1;
            const ay = 2 * y + 1;
            const bx = (2 * cx - ax - 1) / 2;
            const by = (2 * cy - ay - 1) / 2;
            if (blocks[by][bx] == state_none) {
              count_b++;
              blocks[by][bx] = state_b;
            }
          }
        }
      }
      if (count_b == 0) continue;

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
        if (cnt != count) f = false;
      }

      // Is b connected?
      if (f) {
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
            if (b[y][x] == state_b) {
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
            if (b[yy][xx] == state_b) {
              b[yy][xx] = 0;
              st.push([xx, yy]);
            }
          }
        }
        if (cnt != count_b) f = false;
      }

      // Is b symmetry?
      if (f) {
        let minX = blockNumX;
        let maxX = 0;
        let minY = blockNumY;
        let maxY = 0;
        for (let y = 0; y < blockNumY; ++y) {
          for (let x = 0; x < blockNumX; ++x) {
            if (blocks[y][x] == state_b) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        for (let y = 0; y < blockNumY; ++y) {
          for (let x = 0; x < blockNumX; ++x) {
            if (blocks[y][x] == state_b) {
              if (blocks[maxY - (y - minY)][maxX - (x - minX)] != state_b) {
                f = false;
                x = blockNumX;
                y = blockNumY;
              }
            }
          }
        }
      }

      if (f) {
        points.push([cy, cx]);
        cy = centerNumY * 4 + 1;
        cx = centerNumX * 4 + 1;
      } else {
        for (let y = 0; y < blockNumY; ++y) {
          for (let x = 0; x < blockNumX; ++x) {
            if (blocks[y][x] == state_b) {
              blocks[y][x] = state_none;
            }
          }
        }
      }
    }
  }

  draw();
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
