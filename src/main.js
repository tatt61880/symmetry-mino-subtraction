(function () {
  'use strict';
  const version = 'Version: 2022.12.25';

  window.addEventListener('load', init, false);

  const SVG_NS = 'http://www.w3.org/2000/svg';

  let prev = { x: -1, y: -1 };
  let drawingState;
  let drawingFlag = false;
  let width = 6;
  let height = 6;
  let width2;
  let height2;
  let width3;
  let height3;
  let width4;
  let height4;

  const stateNone = 0;
  const stateA = 1;
  const stateB = 2;

  const color = {
    // マス
    none: 'white',
    stateA: 'pink',
    stateB: 'aqua',

    // モード
    normalMode: 'white',
    sizeMode: '#ffffaa',

    // 線
    line: '#333',

    // 点
    normal: 'red',
    selected: 'darkviolet',
    centerB: 'blue',
  };

  const size = {
    // マス
    block: 28,

    // 点
    normal: 3,
    selected: 6,
    centerB: 6,
  };

  const dys = [1, 0, -1, 0];
  const dxs = [0, 1, 0, -1];

  const states = [];
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

  function analyzeUrl() {
    const res = {
      width,
      height,
      blockStr: '',
      mode,
    };
    const queryStrs = location.href.split('?')[1];
    if (queryStrs === undefined) return res;
    for (const queryStr of queryStrs.split('&')) {
      const paramArray = queryStr.split('=');
      if (paramArray.length !== 2) continue;
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
    if (mode === Mode.manual) {
      elemUrlInfo.innerHTML = '';
    } else {
      const url = getUrlInfo();
      elemUrlInfo.innerHTML = `<a href="${url}">現在の盤面のURL</a>`;
    }
  }

  function getBlockStr() {
    let res = '';
    for (let y = 0; y < height; ++y) {
      let line = '';
      for (let x = 0; x < width; ++x) {
        line += isA(states[height + y][width + x]) ? '1' : '0';
      }
      res += line.replace(/0+$/, '');
      res += '-';
    }
    return res.replace(/-+$/, '');
  }

  function applyBlockStr(e, str, dx, dy) {
    for (let y = 0; y < height3; ++y) {
      states[y] = [];
      for (let x = 0; x < width3; ++x) {
        states[y][x] = stateNone;
      }
    }
    let y = height + dy;
    let x = width + dx;
    for (const c of str) {
      if (c === '-') {
        y++;
        if (y === height2) break;
        x = width + dx;
      } else {
        if (isInsideCenterArea(x, y)) {
          states[y][x] = c === '1' ? stateA : stateNone;
        }
        x++;
      }
    }
    update(e);
  }

  function setSize(w, h) {
    width = w;
    width2 = w * 2;
    width3 = w * 3;
    width4 = w * 4;
    height = h;
    height2 = h * 2;
    height3 = h * 3;
    height4 = h * 4;
    elemSvg.setAttribute('width', size.block * width3);
    elemSvg.setAttribute('height', size.block * height3);
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

  function updateModeInfo() {
    switch (mode) {
    case Mode.normal:
      elemModeNameInfo.innerHTML = '通常モード';
      elemModeInfo.innerHTML = `
濃い点線枠内にポリオミノを描画してください。<br>
点対称連結ポリオミノ(<span class="aqua">水色</span>)を足すことで、<br>
全体の図形(<span class="pink">ピンク</span>+<span class="aqua">水色</span>)を<br>
点対称連結ポリオミノにできる場合、<br>
その時の中心点を示します。<br>
<br>
探索手法の概要は<a href="https://github.com/tatt61880/symmetry-mino-subtraction#readme">GitHubのreadme</a>をご覧ください。`;
      break;
    case Mode.size:
      elemModeNameInfo.innerHTML = 'サイズ変更モード';
      elemModeInfo.innerHTML = 'クリック位置に応じて盤面を拡大縮小するモードです。';
      break;
    case Mode.manual:
      elemModeNameInfo.innerHTML = '手動モード';
      elemModeInfo.innerHTML = `
<span class="pink">ピンク</span>を固定し、<span class="aqua">水色</span>を自ら描画するモードです。<br>
<a href="${getUrlInfo()}">通常モードに戻す</a>`;
      break;
    }

    if (mode === Mode.size) {
      elemSizeModeButton.style.backgroundColor = color.sizeMode;
      elemSizeModeButton.innerText = 'サイズ変更モードを無効にする';
    } else {
      elemSizeModeButton.style.backgroundColor = color.normalMode;
      elemSizeModeButton.innerText = 'サイズ変更モードを有効にする';
    }

    elemSizeInfo.style.display = mode === Mode.manual ? 'none' : 'block';
  }

  function toggleSizeMode(e) {
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

  // デバッグ, 解析用
  let targetElem;
  /* eslint-disable-next-line no-unused-vars */
  function debugDraw(states, ps) {
    const br = document.createElement('br');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', `${size.block * width3}`);
    svg.setAttribute('height', `${size.block * height3}`);
    const g = document.createElementNS(SVG_NS, 'g');
    for (let y = 0; y < height3; ++y) {
      for (let x = 0; x < width3; ++x) {
        if (states[y][x] !== stateNone) {
          const rect = createRect({ x, y, width: 1, height: 1 });
          rect.setAttribute('fill', states[y][x] === stateA ? color.stateA : color.stateB);
          rect.setAttribute('stroke', 'none');
          g.appendChild(rect);
        }
      }
    }
    drawFrame(g);
    for (const p of ps) {
      const circle = createCircle({ cx: p.x / 2, cy: p.y / 2, r: p.r });
      circle.setAttribute('fill', p.fill);
      circle.setAttribute('stroke', p.stroke);
      g.appendChild(circle);
    }
    svg.appendChild(g);
    if (targetElem === undefined) targetElem = elemSvg;
    targetElem.insertAdjacentElement('afterend', svg);
    targetElem.insertAdjacentElement('afterend', br);
    targetElem = svg;
  }

  function init(e) {
    document.getElementById('version-info').innerText = version;

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
    return { x: cursorX, y: cursorY };
  }

  function createLine(param) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', size.block * param.x1);
    line.setAttribute('y1', size.block * param.y1);
    line.setAttribute('x2', size.block * param.x2);
    line.setAttribute('y2', size.block * param.y2);
    return line;
  }

  function createCircle(param) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', size.block * param.cx);
    circle.setAttribute('cy', size.block * param.cy);
    circle.setAttribute('r', param.r);
    return circle;
  }

  function createRect(param) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', size.block * param.x);
    rect.setAttribute('y', size.block * param.y);
    rect.setAttribute('width', size.block * param.width);
    rect.setAttribute('height', size.block * param.height);
    return rect;
  }

  function createText(param) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', size.block * param.x);
    text.setAttribute('y', size.block * param.y);
    text.setAttribute('font-size', `${Math.floor(size.block * 0.4)}px`);
    text.textContent = param.text;
    return text;
  }

  function drawFrame(g) {
    // 横線
    for (let y = 0; y <= height3; ++y) {
      const line = createLine({ x1: 0, y1: y, x2: width3, y2: y });
      line.setAttribute('stroke', color.line);
      line.setAttribute('stroke-dasharray', '1, 3');
      g.appendChild(line);
    }
    // 縦線
    for (let x = 0; x <= width3; ++x) {
      const line = createLine({ x1: x, y1: 0, x2: x, y2: height3 });
      line.setAttribute('stroke', color.line);
      line.setAttribute('stroke-dasharray', '1, 3');
      g.appendChild(line);
    }
    // 中央部
    if (mode !== Mode.manual) {
      const rect = createRect({ x: width, y: height, width, height });
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', color.line);
      rect.setAttribute('stroke-dasharray', '2, 2');
      g.appendChild(rect);
    }
  }

  let step = 0;
  function draw(e) {
    while (elemSvg.firstChild) {
      elemSvg.removeChild(elemSvg.firstChild);
    }
    const g = document.createElementNS(SVG_NS, 'g');

    // ポインタの位置に応じて図形Bをセットし直す。
    let selectedPoint;
    let centerB = undefined;
    const counterId = Math.floor(step / 10); // 適当に決めた値。
    step = (step + 1) % Number.MAX_SAFE_INTEGER;
    if (mode !== Mode.manual) {
      removeB();
      if (mode !== Mode.size && points.length !== 0) {
        const cursorPos = getCursorPos(elemSvg, e);
        let minDist = -1;
        for (const point of points) {
          const dist = (cursorPos.x - size.block * point[0].cx / 2) ** 2 + (cursorPos.y - size.block * point[0].cy / 2) ** 2;
          if (minDist === -1 || dist < minDist) {
            minDist = dist;
            selectedPoint = point[counterId % point.length];
          }
        }
        if (!(selectedPoint.cx === selectedPoint.cbx && selectedPoint.cy === selectedPoint.cby)) {
          const firstB = [];
          pointSymmetryA(firstB, selectedPoint.cx, selectedPoint.cy);
          searchSolutionSub(selectedPoint.cx, selectedPoint.cy, selectedPoint.cbx, selectedPoint.cby, firstB);
          if (count(isB)) {
            centerB = getCenter(isB);
          }
        }
      }
    }

    // 図形の描画
    {
      // 背景
      {
        const rect = createRect({ x: 0, y: 0, width: width3, height: height3 });
        rect.setAttribute('fill', color.none);
        rect.setAttribute('stroke', 'none');
        g.appendChild(rect);
      }

      // サイズ変更モード
      if (mode === Mode.size) {
        const polygon = document.createElementNS(SVG_NS, 'polygon');
        const cx = size.block * width3 / 2;
        const cy = size.block * height3 / 2;
        const w = size.block * width;
        const h = size.block * height;
        polygon.setAttribute('points', `${cx},${cy + h} ${cx + w},${cy} ${cx},${cy - h} ${cx - w},${cy}`);
        polygon.setAttribute('fill', color.sizeMode);
        polygon.setAttribute('stroke', color.line);
        polygon.setAttribute('stroke-dasharray', '2, 2');
        g.appendChild(polygon);
      }

      // 図形
      const isX = mode === Mode.size ? isA : isAorB;
      for (let y = 0; y < height3; ++y) {
        for (let x = 0; x < width3; ++x) {
          if (isX(states[y][x])) {
            const rect = createRect({ x, y, width: 1, height: 1 });
            rect.setAttribute('fill', states[y][x] === stateA ? color.stateA : color.stateB);
            rect.setAttribute('stroke', 'none');
            g.appendChild(rect);
          }
        }
      }
    }

    drawFrame(g);

    // 点
    for (const point of points) {
      const isSelected = point[counterId % point.length] === selectedPoint;
      const pointColor = isSelected ? color.selected : color.normal;
      if (point[0].cx === point[0].cbx && point[0].cy === point[0].cby) {
        const len = 0.35;
        {
          const line = createLine({ x1: point[0].cx / 2.0 - len, y1: point[0].cy / 2.0, x2: point[0].cx / 2.0 + len, y2: point[0].cy / 2.0 });
          line.setAttribute('stroke', pointColor);
          line.setAttribute('stroke-width', 2.0);
          g.appendChild(line);
        }
        {
          const line = createLine({ x1: point[0].cx / 2.0, y1: point[0].cy / 2.0 - len, x2: point[0].cx / 2.0, y2: point[0].cy / 2.0 + len });
          line.setAttribute('stroke', pointColor);
          line.setAttribute('stroke-width', 2.0);
          g.appendChild(line);
        }
      }
      {
        const r = isSelected ? size.selected : size.normal;
        const circle = createCircle({ cx: point[0].cx / 2, cy: point[0].cy / 2, r });
        circle.setAttribute('fill', pointColor);
        if (point.length !== 1) {
          circle.setAttribute('stroke-width', isSelected ? '6' : '5');
          circle.setAttribute('stroke-dasharray', '1, 1');
          circle.setAttribute('stroke', pointColor);
        }
        g.appendChild(circle);
        if (point.length !== 1) {
          const text = createText({ x: point[0].cx / 2 + 0.1, y: point[0].cy / 2 - 0.1, text: point.length });
          g.appendChild(text);
        }
      }
    }

    if (centerB !== undefined) {
      const circle = createCircle({ cx: centerB.x / 2, cy: centerB.y / 2, r: size.centerB });
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', color.centerB);
      g.appendChild(circle);
    }

    if (mode === Mode.manual) {
      let flag = false;

      // 図形(AUB)が連結点対称
      if (count(isAorB) !== 0 && isPointSymmetry(isAorB) && isConnected(isAorB)) {
        const centerAorB = getCenter(isAorB);
        const circle = createCircle({ cx: centerAorB.x / 2, cy: centerAorB.y / 2, r: size.selected });
        circle.setAttribute('fill', color.selected);
        g.appendChild(circle);
        flag = true;
      }

      // 図形Bが連結点対称
      if (count(isB) !== 0 && isPointSymmetry(isB) && isConnected(isB)) {
        centerB = getCenter(isB);
        const centerAorB = getCenter(isAorB);
        let r = size.selected;
        if (flag && centerB.x === centerAorB.x && centerB.y === centerAorB.y) {
          r += 5;
        }
        const circle = createCircle({ cx: centerB.x / 2, cy: centerB.y / 2, r });
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', color.centerB);
        g.appendChild(circle);
      }
    }

    if (mode === Mode.size) {
      // ＼
      {
        const line = createLine({ x1: width, y1: height, x2: width2, y2: height2 });
        line.setAttribute('stroke', color.line);
        line.setAttribute('stroke-dasharray', '2, 2');
        g.appendChild(line);
      }
      // ／
      {
        const line = createLine({ x1: width2, y1: height, x2: width, y2: height2 });
        line.setAttribute('stroke', color.line);
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

  // カーソル位置の座標を得る
  function getCurXY(e) {
    const cursorPos = getCursorPos(elemSvg, e);
    const x = clamp(Math.floor(cursorPos.x / size.block), 0, width3 - 1);
    const y = clamp(Math.floor(cursorPos.y / size.block), 0, height3 - 1);
    return { x, y };
  }

  // 中心付近の枠内およびその周上か否か。
  function isInsideCenterArea(x, y) {
    if (x < width || 2 * width <= x) return false;
    if (y < height || 2 * height <= y) return false;
    return true;
  }

  function pointerup() {
    drawingFlag = false;
  }

  // タッチ環境において、画面端付近か否か。
  function isTouchScreenNearEdge(e) {
    if (e.touches === undefined) return false;
    const x = e.touches[0].clientX;
    return x < 30; // 画面の左端付近ならtrue
  }

  function pointerdown(e) {
    const touches = e.changedTouches;
    if (touches !== undefined && touches.length > 1) {
      return;
    }
    if (isTouchScreenNearEdge(e)) {
      draw(e);
      return;
    }

    if (mode === Mode.size) {
      const cursorPos = getCursorPos(elemSvg, e);
      const x = cursorPos.x - size.block * width3 / 2;
      const y = cursorPos.y - size.block * height3 / 2;
      if (Math.abs(x) / width + Math.abs(y) / height > size.block) {
        return;
      }
      e.preventDefault();
      const blockStr = getBlockStr();
      let dx = 0;
      let dy = 0;
      let newWidth = width;
      let newHeight = height;
      if (Math.abs(x) / width > Math.abs(y) / height) {
        const dd = Math.abs(x) > size.block * width / 2 ? 1 : -1;
        if (width !== 1 || dd !== -1) {
          newWidth += dd;
          if (x < 0) dx += dd;
        }
      } else {
        const dd = Math.abs(y) > size.block * height / 2 ? 1 : -1;
        if (height !== 1 || dd !== -1) {
          newHeight += dd;
          if (y < 0) dy += dd;
        }
      }
      setSize(newWidth, newHeight);
      applyBlockStr(e, blockStr, dx, dy);
      draw(e);
      return;
    }
    e.preventDefault();

    const cur = getCurXY(e);
    if (mode !== Mode.manual && !isInsideCenterArea(cur.x, cur.y)) {
      draw(e);
      return;
    }

    const targetState = mode === Mode.normal ? stateA : stateB;
    drawingState = states[cur.y][cur.x] === targetState ? stateNone : targetState;
    drawingFlag = true;

    prev = { x: -1, y: -1 };
    pointermove(e);
  }

  function pointermove(e) {
    if (mode === Mode.size) return;
    if (!drawingFlag) {
      draw(e);
      return;
    }

    const cur = getCurXY(e);
    if (mode !== Mode.manual && !isInsideCenterArea(cur.x, cur.y)) return;
    e.preventDefault();

    if (cur.x === prev.x && cur.y === prev.y) return;
    prev.x = cur.x;
    prev.y = cur.y;
    if (mode === Mode.normal || states[cur.y][cur.x] !== stateA) {
      states[cur.y][cur.x] = drawingState;
    }

    update(e);
  }

  function isAorB(x) {
    return x !== stateNone;
  }

  function isA(x) {
    return x === stateA;
  }

  function isB(x) {
    return x === stateB;
  }

  // 図形が点対称か否か。
  function isPointSymmetry(isX) {
    let minX = width3;
    let maxX = 0;
    let minY = height3;
    let maxY = 0;
    for (let y = 0; y < height3; ++y) {
      for (let x = 0; x < width3; ++x) {
        if (isX(states[y][x])) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    for (let y = minY; y <= maxY; ++y) {
      for (let x = minX; x <= maxX; ++x) {
        if (isX(states[y][x]) && !isX(states[minY + maxY - y][minX + maxX - x])) {
          return false;
        }
      }
    }
    return true;
  }

  // 図形が連結か否か。
  function isConnected(isX) {
    const statesTemp = new Array(height3);
    for (let y = 0; y < height3; ++y) {
      statesTemp[y] = states[y].slice();
    }
    let x0;
    let y0;
    loop: for (let y = 0; y < height3; ++y) {
      for (let x = 0; x < width3; ++x) {
        if (isX(statesTemp[y][x])) {
          x0 = x;
          y0 = y;
          break loop;
        }
      }
    }

    const st = new Stack();
    st.push([x0, y0]);
    statesTemp[y0][x0] = stateNone;
    while (!st.empty()) {
      const xy = st.pop();
      for (let i = 0; i < 4; i++) {
        const xx = xy[0] + dxs[i];
        const yy = xy[1] + dys[i];
        if (xx === -1) continue;
        if (yy === -1) continue;
        if (xx === width3) continue;
        if (yy === height3) continue;
        if (isX(statesTemp[yy][xx])) {
          statesTemp[yy][xx] = stateNone;
          st.push([xx, yy]);
        }
      }
    }

    for (let y = 0; y < height3; ++y) {
      for (let x = 0; x < width3; ++x) {
        if (isX(statesTemp[y][x])) return false;
      }
    }
    return true;
  }

  // 図形Aを点(cx, cy)で点対称になるようにしたとき 元の図形と重なっていない部分を図形Bとする。
  function pointSymmetryA(firstB, cx, cy) {
    for (let y = height; y < height2; ++y) {
      for (let x = width; x < width2; ++x) {
        if (states[y][x] === stateA) {
          // 点(x, y)を点(cx, cy)に対して点対称操作した位置にある点(bx, by)
          const bx = cx - x - 1;
          const by = cy - y - 1;
          // 点(x, y)と点(cx, cy)は中央付近の枠内にある前提。⇒点(bx, by)はあらかじめ用意したエリア外にはみ出ない。
          if (states[by][bx] === stateNone) {
            states[by][bx] = stateB;
            firstB.push({ x: bx, y: by });
          }
        }
      }
    }
  }

  // 図形Bに最後に追加された点の配列newBを点(cx, cy)で点対称になるようにしたとき  元の図形と重なっていない部分を図形Bとする。
  function pointSymmetry(newB, cx, cy, checkFlag) {
    const nextB = [];
    for (const p of newB) {
      // 点pを点(cx, cy)に対して点対称操作した位置にある点(bx, by)
      const bx = cx - p.x - 1;
      const by = cy - p.y - 1;

      // 処理速度等の都合から、点(bx, by)があらかじめ用意したエリア外にはみ出る場合は不適切とします。
      if (bx < 0) return undefined;
      if (by < 0) return undefined;
      if (bx >= width3) return undefined;
      if (by >= height3) return undefined;

      switch (states[by][bx]) {
      case stateNone:
        states[by][bx] = stateB;
        nextB.push({ x: bx, y: by });
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
        if (states[y][x] === stateB) {
          states[y][x] = stateNone;
        }
      }
    }
  }

  function addB(arrB) {
    for (const p of arrB) {
      states[p.y][p.x] = stateB;
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

  function searchSolutionSub(cx, cy, cbx, cby, firstB) {
    removeB();
    addB(firstB);
    let newB = firstB;
    for (;;) {
      newB = pointSymmetry(newB, cbx, cby, true);
      if (newB === undefined) return false;
      if (newB.length === 0) break;

      newB = pointSymmetry(newB, cx, cy, false);
      if (newB === undefined) return false;
      if (newB.length === 0) break;
    }
    return isOk();
  }

  function addPoint(cx, cy, cbx, cby) {
    if (points.length !== 0 && cx === points[points.length - 1][0].cx && cy === points[points.length - 1][0].cy) {
      points[points.length - 1].push({ cx, cy, cbx, cby });
      return;
    }
    points.push([{ cx, cy, cbx, cby }]);
  }

  // 点(cx, cy)を図形(AUB)の点対称中心とする解が存在するか否か。
  function searchSolution(cx, cy, isCenterA) {
    removeB();
    const firstB = [];
    pointSymmetryA(firstB, cx, cy);
    if (isCenterA) {
      if (firstB.length === 0) {
        if (isPointSymmetry(isA)) {
          addPoint(cx, cy, cx, cy);
          return true;
        }
      }
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
        if (searchSolutionSub(cx, cy, cbx, cby, firstB)) {
          addPoint(cx, cy, cbx, cby);
        }
        /*
        debugDraw(states,
          [{x: cx, y: cy, r: size.selected, fill: color.selected, stroke: 'none'},
           {x: cbx, y: cby, r: size.centerB, fill: 'none', stroke: color.centerB}]);
        */
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
        if (isX(states[y][x])) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    return { x: minX + maxX + 1, y: minY + maxY + 1 };
  }

  function count(isX) {
    let cnt = 0;
    for (let y = 0; y < height3; ++y) {
      for (let x = 0; x < width3; ++x) {
        if (isX(states[y][x])) cnt++;
      }
    }
    return cnt;
  }

  function update(e) {
    if (mode === Mode.manual) {
      updateUrlInfo();
      draw(e);
      return;
    }
    const startTime = Date.now();
    points = [];
    const centerA = getCenter(isA);
    const countA = count(isA);
    switch (countA) {
    case 0:
      break;
    case 1:
      addPoint(centerA.x, centerA.y, centerA.x, centerA.y);
      for (let cx = width2; cx <= width4; ++cx) {
        if (cx === centerA.x) continue;
        const dx = cx < centerA.x ? -1 : 1;
        addPoint(cx, centerA.y, cx + dx, centerA.y);
      }
      for (let cy = height2; cy <= height4; ++cy) {
        if (cy === centerA.y) continue;
        const dy = cy < centerA.y ? -1 : 1;
        addPoint(centerA.x, cy, centerA.x, cy + dy);
      }
      break;
    default:
      for (let cy = height2; cy <= height4; ++cy) {
        for (let cx = width2; cx <= width4; ++cx) {
          const isCenterA = cx === centerA.x && cy === centerA.y;
          searchSolution(cx, cy, isCenterA);
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

  class Stack {
    constructor() {
      this.data = [];
    }
    push(val) {
      this.data.push(val);
      return val;
    }
    pop() {
      return this.data.pop();
    }
    top() {
      return this.data[this.data.length - 1];
    }
    size() {
      return this.data.length;
    }
    empty() {
      return this.data.length === 0;
    }
  }
})();
