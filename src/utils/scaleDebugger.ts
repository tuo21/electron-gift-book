// 缩放调试工具
// 默认隐藏，通过 toggleScaleDebugger() 切换显示/隐藏

const LAYOUT = {
  BASELINE_WIDTH: 1650,
  BASELINE_HEIGHT_FULL: 1200,
  BASELINE_HEIGHT_COMPACT: 1015,
  MAX_SCALE: 1.5,
  MIN_SCALE: 0.55,
};

function getMeasurements() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const q = (sel: string) => document.querySelector(sel);
  const getH = (sel: string) => {
    const el = q(sel);
    return el ? el.getBoundingClientRect().height : null;
  };
  return {
    winW,
    winH,
    headerH: getH('.app-header'),
    previewH: getH('.name-preview-section'),
    mainH: getH('.main-content'),
    containerH: getH('.giftbook-container'),
    contentH: getH('.giftbook-content'),
    gridH: getH('.records-grid'),
    paginationH: getH('.pagination-bar'),
  };
}

function applyScale(scale: number) {
  document.documentElement.style.setProperty('--fullscreen-scale', scale.toString());
}

function checkOverflow(m: ReturnType<typeof getMeasurements>) {
  const results: Array<{
    label: string;
    bottom: string;
    overflow: number;
    ok: boolean;
  }> = [];
  const containerEl = document.querySelector('.giftbook-container');
  const paginationEl = document.querySelector('.pagination-bar');
  if (containerEl) {
    const bottom = containerEl.getBoundingClientRect().bottom;
    const overflow = bottom - m.winH;
    results.push({
      label: 'giftbook-container',
      bottom: bottom.toFixed(0),
      overflow,
      ok: overflow <= 0,
    });
  }
  if (paginationEl) {
    const bottom = paginationEl.getBoundingClientRect().bottom;
    const overflow = bottom - m.winH;
    results.push({
      label: 'pagination-bar',
      bottom: bottom.toFixed(0),
      overflow,
      ok: overflow <= 0,
    });
  }
  return results;
}

function getRec(m: ReturnType<typeof getMeasurements>, bh: number, ms: number) {
  const scaleW = m.winW / LAYOUT.BASELINE_WIDTH;
  const scaleH = m.winH / bh;
  return {
    scaleW,
    scaleH,
    byWidthHeight: Math.max(ms, Math.min(LAYOUT.MAX_SCALE, Math.min(scaleW, scaleH))),
    byWidthOnly: Math.max(ms, Math.min(LAYOUT.MAX_SCALE, scaleW)),
    byHeightOnly: Math.max(ms, Math.min(LAYOUT.MAX_SCALE, scaleH)),
    currentApplied: parseFloat(
      (getComputedStyle(document.documentElement).getPropertyValue('--fullscreen-scale') || '1').trim()
    ),
  };
}

let panel: HTMLDivElement | null = null;
let resizeHandler: (() => void) | null = null;

export function initScaleDebugger() {
  if (panel) return;

  panel = document.createElement('div');
  panel.id = 'scale-debug-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 99999,
    background: 'rgba(30,30,30,0.95)',
    color: '#e0e0e0',
    border: '1px solid #555',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '12px',
    fontFamily: 'monospace',
    minWidth: '340px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  });

  const s = (el: HTMLElement, css: Partial<CSSStyleDeclaration>) => Object.assign(el.style, css);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '10px',
    background: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '16px',
  });
  closeBtn.onclick = () => destroyScaleDebugger();
  panel.appendChild(closeBtn);

  const title = document.createElement('div');
  title.textContent = '🔧 缩放调试面板';
  s(title, {
    fontWeight: 'bold',
    fontSize: '14px',
    marginBottom: '10px',
    color: '#fff',
    borderBottom: '1px solid #444',
    paddingBottom: '6px',
  });
  panel.appendChild(title);

  const dimSection = document.createElement('div');
  panel.appendChild(dimSection);

  const modeSection = document.createElement('div');
  modeSection.style.marginTop = '10px';
  modeSection.innerHTML = `
    <div style="margin-bottom:6px;color:#aaa">🎛 布局模式（临时，不影响实际设置）</div>
    <div style="display:flex;gap:6px">
      <button id="debug-mode-full" style="cursor:pointer;padding:4px 8px">完整大字型</button>
      <button id="debug-mode-compact" style="cursor:pointer;padding:4px 8px">简洁紧凑型</button>
    </div>
  `;
  panel.appendChild(modeSection);

  const bhSection = document.createElement('div');
  bhSection.style.marginTop = '10px';
  bhSection.innerHTML = `
    <div style="margin-bottom:6px;color:#aaa">📏 BASELINE_HEIGHT（当前: <b id="bh-val">1200</b>）</div>
    <input id="bh-slider" type="range" min="700" max="1400" value="1200" style="width:100%">
    <div style="display:flex;justify-content:space-between;color:#666;font-size:10px;margin-top:2px">
      <span>700</span><span>1400</span>
    </div>
  `;
  panel.appendChild(bhSection);

  const msSection = document.createElement('div');
  msSection.style.marginTop = '10px';
  msSection.innerHTML = `
    <div style="margin-bottom:6px;color:#aaa">⬇ MIN_SCALE（当前: <b id="ms-val">0.55</b>）</div>
    <input id="ms-slider" type="range" min="40" max="100" value="55" style="width:100%">
    <div style="display:flex;justify-content:space-between;color:#666;font-size:10px;margin-top:2px">
      <span>0.40</span><span>1.00</span>
    </div>
  `;
  panel.appendChild(msSection);

  const manualSection = document.createElement('div');
  manualSection.style.marginTop = '10px';
  manualSection.innerHTML = `
    <div style="margin-bottom:6px;color:#aaa">🔢 手动设置 scale（临时）</div>
    <input id="manual-scale" type="number" step="0.01" min="0.4" max="1.5" value="1" style="width:100%;padding:4px;color:#333">
    <button id="apply-scale-btn" style="margin-top:4px;width:100%;padding:4px;cursor:pointer;background:#1976d2;color:#fff;border:none;border-radius:4px">✅ 应用 scale</button>
  `;
  panel.appendChild(manualSection);

  const recSection = document.createElement('div');
  recSection.style.marginTop = '10px';
  panel.appendChild(recSection);

  const overflowSection = document.createElement('div');
  overflowSection.style.marginTop = '10px';
  panel.appendChild(overflowSection);

  const copySection = document.createElement('div');
  copySection.style.marginTop = '10px';
  copySection.innerHTML = `<button id="copy-params-btn" style="width:100%;padding:6px;cursor:pointer;background:#4caf50;color:#fff;border:none;border-radius:4px">📋 复制参数到剪贴板</button>`;
  panel.appendChild(copySection);

  document.body.appendChild(panel);

  let currentStyle: 'full' | 'compact' = 'full';
  let bhOverride = LAYOUT.BASELINE_HEIGHT_FULL;
  let msOverride = LAYOUT.MIN_SCALE;

  function refresh() {
    const m = getMeasurements();
    const r = getRec(m, bhOverride, msOverride);

    dimSection.innerHTML = `
      <div style="margin-bottom:8px;color:#aaa">📐 当前尺寸</div>
      <div>窗口: <b>${m.winW} × ${m.winH}px</b></div>
      <div>header: <b>${m.headerH?.toFixed(0) || '?'}px</b></div>
      <div>preview: <b>${m.previewH?.toFixed(0) || '?'}px</b></div>
      <div>main-content: <b>${m.mainH?.toFixed(0) || '?'}px</b></div>
      <div>records-grid: <b>${m.gridH?.toFixed(0) || '?'}px</b></div>
      <div>pagination: <b>${m.paginationH?.toFixed(0) || '?'}px</b></div>
      <div>已应用 scale: <b style="color:#4fc3f7">${r.currentApplied.toFixed(4)}</b></div>
    `;

    document.getElementById('bh-val')!.textContent = bhOverride.toString();
    document.getElementById('ms-val')!.textContent = msOverride.toFixed(2);

    document.querySelectorAll('.rec-btn').forEach((btn) => {
      const s2 = parseFloat((btn as HTMLElement).dataset.scale || '0');
      const isCurrent = Math.abs(s2 - r.currentApplied) < 0.001;
      Object.assign((btn as HTMLElement).style, isCurrent
        ? { background: '#1565c0', color: '#fff', border: '1px solid #1976d2' }
        : { background: '#2a2a2a', color: '#ccc', border: '1px solid #444' }
      );
    });

    const overflows = checkOverflow(m);
    overflowSection.innerHTML = `
      <div style="margin-bottom:6px;color:#aaa">🔍 溢出检测</div>
      ${overflows.length ? overflows.map(o => `
        <div style="color:${o.ok ? '#a5d6a7' : '#ef9a9a'}">
          ${o.label}: 底部 ${o.bottom}px / 窗口 ${m.winH}px → ${o.ok ? `✅ 未溢出` : `❌ 向下溢出 ${o.overflow.toFixed(0)}px`}
        </div>
      `).join('') : '<div style="color:#a5d6a7">✅ 未检测到溢出</div>'}
    `;
  }

  document.getElementById('debug-mode-full')!.onclick = () => {
    currentStyle = 'full';
    bhOverride = LAYOUT.BASELINE_HEIGHT_FULL;
    (document.getElementById('bh-slider') as HTMLInputElement).value = bhOverride.toString();
    refresh();
  };

  document.getElementById('debug-mode-compact')!.onclick = () => {
    currentStyle = 'compact';
    bhOverride = LAYOUT.BASELINE_HEIGHT_COMPACT;
    (document.getElementById('bh-slider') as HTMLInputElement).value = bhOverride.toString();
    refresh();
  };

  document.getElementById('bh-slider')!.oninput = (e) => {
    bhOverride = parseInt((e.target as HTMLInputElement).value);
    refresh();
  };

  document.getElementById('ms-slider')!.oninput = (e) => {
    msOverride = parseInt((e.target as HTMLInputElement).value) / 100;
    refresh();
  };

  document.getElementById('apply-scale-btn')!.onclick = () => {
    const v = parseFloat((document.getElementById('manual-scale') as HTMLInputElement).value);
    if (!isNaN(v)) {
      applyScale(v);
      refresh();
    }
  };

  document.getElementById('copy-params-btn')!.onclick = () => {
    const m = getMeasurements();
    const r = getRec(m, bhOverride, msOverride);
    const overflows = checkOverflow(m);
    const text = [
      '=== 缩放调试数据 ===',
      `窗口尺寸: ${m.winW} × ${m.winH}`,
      `布局模式: ${currentStyle}`,
      `当前应用 scale: ${r.currentApplied.toFixed(4)}`,
      `BASELINE_HEIGHT: ${bhOverride}`,
      `MIN_SCALE: ${msOverride}`,
      `scaleW (宽/1650): ${r.scaleW.toFixed(4)}`,
      `scaleH (高/${bhOverride}): ${r.scaleH.toFixed(4)}`,
      `推荐 byWidthHeight scale: ${r.byWidthHeight.toFixed(4)}`,
      `推荐 byWidthOnly scale: ${r.byWidthOnly.toFixed(4)}`,
      `推荐 byHeightOnly scale: ${r.byHeightOnly.toFixed(4)}`,
      `records-grid 高度: ${m.gridH?.toFixed(0) || '?'}px`,
      `pagination 高度: ${m.paginationH?.toFixed(0) || '?'}px`,
      `溢出: ${overflows.map(o => `${o.label}: ${o.ok ? '✅' : '❌ ' + o.overflow.toFixed(0) + 'px'}`).join(', ')}`,
      '====================',
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板！'));
  };

  recSection.innerHTML = `
    <div style="margin-bottom:6px;color:#aaa">📊 推荐 scale 方案（供参考，点击直接应用）</div>
    <button class="rec-btn" id="rec-wh" style="display:block;width:100%;margin-bottom:4px;padding:5px;cursor:pointer">🅰️ 按宽高 min → <b id="rec-wh-val">-</b></button>
    <button class="rec-btn" id="rec-w" style="display:block;width:100%;margin-bottom:4px;padding:5px;cursor:pointer">🅱️ 仅按宽度（内容区高度自适应）→ <b id="rec-w-val">-</b></button>
    <button class="rec-btn" id="rec-h" style="display:block;width:100%;padding:5px;cursor:pointer">⬆ 仅按高度 → <b id="rec-h-val">-</b></button>
  `;

  function applyRec(which: 'wh' | 'w' | 'h') {
    const m = getMeasurements();
    const r = getRec(m, bhOverride, msOverride);
    const scale = which === 'wh' ? r.byWidthHeight : which === 'w' ? r.byWidthOnly : r.byHeightOnly;
    applyScale(scale);
    (document.getElementById('manual-scale') as HTMLInputElement).value = scale.toFixed(2);
    refresh();
  }

  document.getElementById('rec-wh')!.onclick = () => applyRec('wh');
  document.getElementById('rec-w')!.onclick = () => applyRec('w');
  document.getElementById('rec-h')!.onclick = () => applyRec('h');

  const m0 = getMeasurements();
  const r0 = getRec(m0, bhOverride, msOverride);
  document.getElementById('rec-wh-val')!.textContent = r0.byWidthHeight.toFixed(3);
  document.getElementById('rec-w-val')!.textContent = r0.byWidthOnly.toFixed(3);
  document.getElementById('rec-h-val')!.textContent = r0.byHeightOnly.toFixed(3);

  refresh();

  resizeHandler = () => refresh();
  window.addEventListener('resize', resizeHandler);

  console.log('✅ 缩放调试面板已创建（右上角浮窗）');
}

export function destroyScaleDebugger() {
  if (panel) {
    panel.remove();
    panel = null;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  console.log('✅ 缩放调试面板已清理');
}

export function toggleScaleDebugger() {
  if (panel) {
    destroyScaleDebugger();
  } else {
    initScaleDebugger();
  }
}
