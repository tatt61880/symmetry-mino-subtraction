(function () {
  'use strict';
  const version = 'Version: 2026.11.05';

  window.addEventListener('load', init, false);

  const SVG_NS = 'http://www.w3.org/2000/svg';

  let prev;
  let drawingState;
  let drawingPointer;
  const maxBoardArea = 1024;
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
  const solverCells = [];
  let points = [];

  const Mode = {
    normal: 'normal',
    size: 'size',
    inspect: 'inspect',
    manual: 'manual',
  };
  let mode = Mode.normal;

  let elemSizeInfo;
  let elemSizeWarning;
  let elemWidth;
  let elemHeight;
  let elemSizeModeButton;
  let elemInspectButton;
  let inspectGroup;
  let inspectIndex = 0;
  let elemProcessTimeInfo;
  let elemSvg;
  let elemUrlInfo;
  let elemModeNameInfo;
  let elemModeInfo;

  function validDimension(value) {
    return Number.isInteger(value) && value >= 1 && value <= maxBoardArea;
  }

  function validSize(w, h) {
    return validDimension(w) && validDimension(h) && w * h <= maxBoardArea;
  }

  function showSizeWarning() {
    elemSizeWarning.textContent = `縦・横は正の整数、描画枠は合計${maxBoardArea}マスまでです。現在のサイズは${width}×${height}です。`;
  }

  function getUrlInfo() {
    const url = new URL(location.href);
    url.hash = '';
    url.search = new URLSearchParams({ w: width, h: height, s: getBlockStr() });
    return url.href;
  }

  function updateUrlInfo() {
    elemUrlInfo.hidden = mode === Mode.manual;
    elemUrlInfo.href = getUrlInfo();
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
    solverCells.length = 0;
    states.length = height3;
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
    elemSvg.setAttribute('viewBox', `0 0 ${size.block * width3} ${size.block * height3}`);
    elemSvg.setAttribute('width', size.block * width3);
    elemSvg.setAttribute('height', size.block * height3);
    elemSizeWarning.textContent = '';
    elemWidth.max = Math.floor(maxBoardArea / h);
    elemHeight.max = Math.floor(maxBoardArea / w);
    elemWidth.value = w;
    elemHeight.value = h;
  }

  function changeSize(e) {
    const w = elemWidth.valueAsNumber;
    const h = elemHeight.valueAsNumber;
    if (!validSize(w, h)) {
      showSizeWarning();
      elemWidth.value = width;
      elemHeight.value = height;
      return;
    }
    const blockStr = getBlockStr();
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
「解の確認」では、盤面の点を押して解を選べます。<br>
<br>
探索手法の概要は<a href="https://github.com/tatt61880/symmetry-mino-subtraction#readme">GitHubのreadme</a>をご覧ください。`;
        break;
      case Mode.size:
        elemModeNameInfo.innerHTML = 'サイズ変更モード';
        elemModeInfo.innerHTML = 'クリック位置に応じて盤面を拡大縮小するモードです。';
        break;
      case Mode.inspect:
        elemModeNameInfo.textContent = '解の確認';
        elemModeInfo.textContent = '見たい中心点を押してください。数字付きの点を繰り返し押すと、同じ中心の別の解に切り替わります。';
        break;
      case Mode.manual:
        elemModeNameInfo.innerHTML = '手動モード';
        elemModeInfo.innerHTML = `
<span class="pink">ピンク</span>を固定し、<span class="aqua">水色</span>を自ら描画するモードです。<br>
<a href="${getUrlInfo()}">通常モードに戻す</a>`;
        break;
    }

    elemSizeModeButton.textContent = mode === Mode.size ? 'サイズ変更を終了' : 'サイズ変更';
    elemSizeModeButton.setAttribute('aria-pressed', mode === Mode.size);
    updateInspectButton();
    elemSizeInfo.hidden = mode === Mode.manual;
  }

  function updateInspectButton() {
    elemInspectButton.textContent = mode === Mode.inspect ? '描画に戻る' : '解の確認';
    elemInspectButton.setAttribute('aria-pressed', mode === Mode.inspect);
    elemInspectButton.disabled = !points.length && mode !== Mode.inspect;
  }

  function toggleMode(e, target) {
    if (drawingPointer !== undefined && elemSvg.hasPointerCapture(drawingPointer)) {
      elemSvg.releasePointerCapture(drawingPointer);
    }
    drawingPointer = undefined;
    prev = undefined;
    inspectGroup = undefined;
    mode = mode === target ? Mode.normal : target;
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

    elemSizeInfo = document.getElementById('size-info');
    elemSizeWarning = document.getElementById('size-warning');
    elemWidth = document.getElementById('width-val');
    elemHeight = document.getElementById('height-val');
    elemSizeModeButton = document.getElementById('size-mode-button');
    elemInspectButton = document.getElementById('inspect-button');

    elemProcessTimeInfo = document.getElementById('process-time-info');
    elemSvg = document.getElementById('svg-board');
    elemUrlInfo = document.getElementById('url-info');

    elemModeNameInfo = document.getElementById('mode-name-info');
    elemModeInfo = document.getElementById('mode-info');

    const params = new URLSearchParams(location.search);
    const w = params.has('w') ? Number(params.get('w')) : width;
    const h = params.has('h') ? Number(params.get('h')) : height;
    const newWidth = validDimension(w) ? w : width;
    const newHeight = validDimension(h) ? h : height;
    const urlMode = params.get('m');
    if (Object.values(Mode).includes(urlMode)) mode = urlMode;
    if (validSize(newWidth, newHeight)) {
      setSize(newWidth, newHeight);
    } else {
      setSize(width, height);
    }
    if (!validSize(w, h)) showSizeWarning();
    applyBlockStr(e, params.get('s') || '', 0, 0);
    updateModeInfo();

    elemSvg.addEventListener('pointerdown', pointerdown);
    elemSvg.addEventListener('pointermove', pointermove);
    elemSvg.addEventListener('pointerup', pointerup);
    elemSvg.addEventListener('pointercancel', pointerup);
    elemSvg.addEventListener('lostpointercapture', pointerup);
    elemWidth.addEventListener('change', changeSize);
    elemHeight.addEventListener('change', changeSize);
    elemSizeModeButton.addEventListener('click', (e) => toggleMode(e, Mode.size));
    elemInspectButton.addEventListener('click', (e) => toggleMode(e, Mode.inspect));
  }

  function getCursorPos(elem, e) {
    const rect = elem.getBoundingClientRect();
    if (!Number.isFinite(e.clientX)) {
      return { x: size.block * width3 / 2, y: size.block * height3 / 2 };
    }
    return {
      x: (e.clientX - rect.left) * size.block * width3 / rect.width,
      y: (e.clientY - rect.top) * size.block * height3 / rect.height,
    };
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

  function nearestGroup(e) {
    const pos = getCursorPos(elemSvg, e);
    let nearest;
    let minDist = Infinity;
    for (const group of points) {
      const dist = (pos.x - size.block * group[0].cx / 2) ** 2 + (pos.y - size.block * group[0].cy / 2) ** 2;
      if (dist < minDist) {
        nearest = group;
        minDist = dist;
      }
    }
    return nearest;
  }

  let step = 0;
  function draw(e) {
    while (elemSvg.firstChild) {
      elemSvg.removeChild(elemSvg.firstChild);
    }
    const g = document.createElementNS(SVG_NS, 'g');

    // ポインタの位置に応じて図形Bをセットし直す。
    let selectedPoint;
    let centerB;
    const counterId = Math.floor(step / 10); // 適当に決めた値。
    step = (step + 1) % Number.MAX_SAFE_INTEGER;
    if (mode !== Mode.manual) {
      removeB();
      if (mode === Mode.inspect && inspectGroup) {
        selectedPoint = inspectGroup[inspectIndex];
      } else if (mode === Mode.normal && points.length) {
        const group = nearestGroup(e);
        selectedPoint = group[counterId % group.length];
      }
      if (selectedPoint) {
        if (selectedPoint.cells) {
          addB(selectedPoint.cells);
          centerB = { x: selectedPoint.cx, y: selectedPoint.cy };
        } else if (!(selectedPoint.cx === selectedPoint.cbx && selectedPoint.cy === selectedPoint.cby)) {
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
      const isSelected = point.includes(selectedPoint);
      const pointColor = isSelected ? color.selected : color.normal;
      if (!point[0].cells && point[0].cx === point[0].cbx && point[0].cy === point[0].cby) {
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
      const radius = selectedPoint.cells ? size.centerB + 5 : size.centerB;
      const circle = createCircle({ cx: centerB.x / 2, cy: centerB.y / 2, r: radius });
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

  function getCurXY(e) {
    const pos = getCursorPos(elemSvg, e);
    return { x: Math.floor(pos.x / size.block), y: Math.floor(pos.y / size.block) };
  }

  // 中心付近の枠内およびその周上か否か。
  function isInsideCenterArea(x, y) {
    if (x < width || 2 * width <= x) return false;
    if (y < height || 2 * height <= y) return false;
    return true;
  }

  function pointerup(e) {
    if (e.pointerId === drawingPointer) {
      if (e.type === 'pointerup') pointermove(e);
      drawingPointer = undefined;
      prev = undefined;
    }
  }

  function pointerdown(e) {
    if (!e.isPrimary || e.button !== 0 || drawingPointer !== undefined) return;
    if (mode === Mode.inspect) {
      const group = nearestGroup(e);
      if (!group) return;
      inspectIndex = group === inspectGroup ? (inspectIndex + 1) % group.length : 0;
      inspectGroup = group;
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
      if (!validSize(newWidth, newHeight)) {
        showSizeWarning();
        return;
      }
      setSize(newWidth, newHeight);
      applyBlockStr(e, blockStr, dx, dy);
      return;
    }
    e.preventDefault();

    const cur = getCurXY(e);
    if (!canDrawAt(cur)) {
      draw(e);
      return;
    }

    const targetState = mode === Mode.normal ? stateA : stateB;
    drawingState = states[cur.y][cur.x] === targetState ? stateNone : targetState;
    drawingPointer = e.pointerId;
    elemSvg.setPointerCapture(e.pointerId);
    prev = undefined;
    pointermove(e);
  }

  function canDrawAt({ x, y }) {
    if (mode === Mode.normal) return isInsideCenterArea(x, y);
    return x >= 0 && y >= 0 && x < width3 && y < height3;
  }

  function pointermove(e) {
    if (!e.isPrimary || mode === Mode.size || mode === Mode.inspect) return;
    if (drawingPointer === undefined) {
      draw(e);
      return;
    }
    if (e.pointerId !== drawingPointer) return;
    const cur = getCurXY(e);
    const from = prev || cur;
    const steps = Math.max(Math.abs(cur.x - from.x), Math.abs(cur.y - from.y), 1);
    let changed = false;
    // イベントの間に通過したマスを、1回の探索でまとめて塗る。
    for (let i = 1; i <= steps; ++i) {
      const x = from.x + Math.round((cur.x - from.x) * i / steps);
      const y = from.y + Math.round((cur.y - from.y) * i / steps);
      if (!canDrawAt({ x, y })) continue;
      const state = states[y][x];
      if (state === drawingState || (mode === Mode.manual && isA(state))) continue;
      states[y][x] = drawingState;
      changed = true;
    }
    prev = cur;
    if (changed) update(e);
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

    if (y0 === undefined) return false;
    const st = [];
    st.push([x0, y0]);
    statesTemp[y0][x0] = stateNone;
    while (st.length > 0) {
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
          nextB.push(markB({ x: bx, y: by }));
          break;
        case stateA:
          if (checkFlag) return undefined;
          break;
      }
    }
    return nextB;
  }

  function removeB() {
    for (const p of solverCells) {
      if (isB(states[p.y][p.x])) states[p.y][p.x] = stateNone;
    }
    solverCells.length = 0;
  }

  function markB(cell) {
    states[cell.y][cell.x] = stateB;
    solverCells.push(cell);
    return cell;
  }

  function addB(cells) {
    for (const cell of cells) markB(cell);
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

  function addPoint(cx, cy, cbx, cby, cells) {
    const point = { cx, cy, cbx, cby, cells };
    const last = points[points.length - 1];
    if (last && cx === last[0].cx && cy === last[0].cy) {
      last.push(point);
    } else {
      points.push([point]);
    }
  }

  // 同心の解では、B は A の補集合のうち、点対称な連結成分ひとつに収まる。
  // その成分全体を採用しても対称性・連結性は保たれる。
  function findCenteredAddition(cx, cy, minX, minY, maxX, maxY) {
    const seen = new Set();
    for (let y = minY; y <= maxY; ++y) {
      for (let x = minX; x <= maxX; ++x) {
        if (isA(states[y][x]) || seen.has(y * width3 + x)) continue;
        const cells = [{ x, y }];
        seen.add(y * width3 + x);
        for (let i = 0; i < cells.length; ++i) {
          for (let dir = 0; dir < 4; ++dir) {
            const xx = cells[i].x + dxs[dir];
            const yy = cells[i].y + dys[dir];
            if (xx < minX || xx > maxX || yy < minY || yy > maxY) continue;
            const key = yy * width3 + xx;
            if (isA(states[yy][xx]) || seen.has(key)) continue;
            seen.add(key);
            cells.push({ x: xx, y: yy });
          }
        }
        addB(cells);
        // 対称移動は連結成分を連結成分に写すので、代表1マスで判定できる。
        const valid = isB(states[cy - y - 1][cx - x - 1]) && isConnected(isAorB);
        removeB();
        if (valid) return cells;
      }
    }
  }

  function searchSolution(cx, cy, shape) {
    removeB();
    const firstB = [];
    pointSymmetryA(firstB, cx, cy);
    if (firstB.length === 0) {
      if (isConnected(isA)) {
        addPoint(cx, cy, cx, cy);
      } else {
        // まず A の外接長方形内で探し、見つからなければ盤面内の対称な範囲まで広げる。
        const minX = Math.max(0, cx - width3);
        const minY = Math.max(0, cy - height3);
        const cells = findCenteredAddition(cx, cy, shape.minX, shape.minY, cx - shape.minX - 1, cy - shape.minY - 1)
          || findCenteredAddition(cx, cy, minX, minY, cx - minX - 1, cy - minY - 1);
        if (cells) addPoint(cx, cy, cx, cy, cells);
      }
      return;
    }

    // 点対称な図形の重心は対称中心。各マスの中心は2倍座標で数える。
    // |B| * (cbx - cx) = |A| * cx - sumX（y も同様）。
    const dx = shape.count * cx - shape.sumX;
    const dy = shape.count * cy - shape.sumY;
    const limit = Math.min(width3 * height3 - shape.count, Math.max(Math.abs(dx), Math.abs(dy)));
    for (let n = firstB.length; n <= limit; ++n) {
      if (dx % n !== 0 || dy % n !== 0) continue;
      const cbx = cx + dx / n;
      const cby = cy + dy / n;
      if (cbx < 1 || cbx >= width3 * 2 || cby < 1 || cby >= height3 * 2) continue;
      if (searchSolutionSub(cx, cy, cbx, cby, firstB)) addPoint(cx, cy, cbx, cby);
    }
  }

  function getShapeInfo() {
    const shape = { count: 0, sumX: 0, sumY: 0, minX: width2, minY: height2 };
    for (let y = height; y < height2; ++y) {
      for (let x = width; x < width2; ++x) {
        if (!isA(states[y][x])) continue;
        ++shape.count;
        shape.sumX += 2 * x + 1;
        shape.sumY += 2 * y + 1;
        shape.minX = Math.min(shape.minX, x);
        shape.minY = Math.min(shape.minY, y);
      }
    }
    return shape;
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
    inspectGroup = undefined;
    points = [];
    const shape = getShapeInfo();
    switch (shape.count) {
      case 0:
        break;
      case 1: {
        const centerA = { x: shape.sumX, y: shape.sumY };
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
      }
      default:
        for (let cy = height2; cy <= height4; ++cy) {
          for (let cx = width2; cx <= width4; ++cx) {
            searchSolution(cx, cy, shape);
          }
        }
        for (const group of points) {
          group.sort((a, b) => a.cby - b.cby || a.cbx - b.cbx);
        }
        break;
    }
    const endTime = Date.now();
    updateInspectButton();
    elemProcessTimeInfo.innerHTML = `
処理時間: ${endTime - startTime}ミリ秒<br>
解となる中心点数(濃い点線枠内): ${points.length}点<br>
<a href="${getUrlInfo()}&m=manual" target="_blank" rel="noopener">手動モードで開く（別タブ）</a>`;
    updateUrlInfo();
    draw(e);
  }

})();
