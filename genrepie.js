// ══════════════════════════════════════════════════════════════
// GENRE / THEME PIE CHART — genrepie.js
// Takes over #genresListOverlay: adds Genres/Themes tabs + pie↔list toggle.
// Detail drill-in reuses existing #genreDetailOverlay via a type flag.
// ══════════════════════════════════════════════════════════════

let gpActiveTab = 'genres';   // 'genres' | 'themes'
let gpView = 'pie';           // 'pie' | 'list'
let gpSort = 'az';            // 'az' | 'count' (list view only)
let gpOpenPanelIndex = null;
let gpEntriesCache = [];
let _gpDetailType = 'genres';

// Palette generation is done per-tag via gpHashColor() below (wider warm HSL spread).

const GP_ICON_PIE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`;
const GP_ICON_LIST = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;

// ── STYLES ──
(function gpInjectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #genresListOverlay .gp-tabs { display:flex; gap:8px; padding:0 16px 10px; flex-shrink:0; }
    #genresListOverlay .gp-tab { flex:1; padding:8px 0; border-radius:100px; border:1.5px solid var(--border); background:transparent; color:var(--text-muted); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.18s; text-align:center; }
    #genresListOverlay .gp-tab.active { background:var(--accent); border-color:var(--accent); color:#fff; }
    #genScroll { position:relative; }
    .gp-pie-wrap { display:flex; justify-content:center; padding:14px 0 20px; }
    .gp-pie-wrap svg { filter: drop-shadow(0 6px 18px rgba(0,0,0,0.35)); }
    .gp-slice, .gp-legend-row { cursor:pointer; }
    .gp-slice { transition:opacity 0.15s, transform 0.15s; stroke:var(--bg); stroke-width:1.5; stroke-linejoin:round; transform-box:fill-box; transform-origin:center; }
    .gp-slice:active { opacity:0.8; transform:scale(1.025); }
    .gp-pie-center-label { pointer-events:none; }
    .gp-pie-center-count { font-family:'DM Sans',sans-serif; font-weight:700; fill:var(--text); }
    .gp-pie-center-sub { font-family:'DM Sans',sans-serif; font-weight:500; fill:var(--text-muted); }
    .gp-fastbar { position:fixed; right:2px; bottom:0; width:26px; z-index:9; opacity:0; pointer-events:none; transition:opacity 0.2s ease; touch-action:none; }
    .gp-pie-sticky { flex-shrink:0; }
    .gp-pie-sticky:empty { display:none; }
    .gp-fastbar.visible { opacity:1; pointer-events:auto; }
    .gp-fastbar-track { position:absolute; right:9px; top:8px; bottom:8px; width:4px; border-radius:2px; background:rgba(122,112,104,0.2); }
    .gp-fastbar-thumb { position:absolute; right:6px; width:10px; border-radius:5px; background:var(--accent); box-shadow:0 2px 8px rgba(201,113,74,0.45); }
    .gp-legend { display:flex; flex-direction:column; gap:2px; padding-bottom:8px; }
    .gp-legend-item { border-bottom:1px solid var(--border); }
    .gp-legend-item:last-child { border-bottom:none; }
    .gp-legend-row { display:flex; align-items:center; gap:10px; padding:12px 4px; transition:opacity 0.15s; }
    .gp-legend-row:active { opacity:0.6; }
    .gp-dot { width:11px; height:11px; border-radius:50%; flex-shrink:0; box-shadow:0 0 0 1px rgba(0,0,0,0.25) inset; }
    .gp-legend-name { flex:1; font-size:14px; font-weight:600; color:var(--text); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .gp-legend-count { font-size:12px; color:var(--text-muted); font-weight:500; }
    .gp-panel { max-height:0; overflow:hidden; transition:max-height 0.32s cubic-bezier(0.32,0.72,0,1); }
    .gp-panel.open { max-height:132px; }
    .gp-panel-scroll { display:flex; gap:8px; padding:4px 4px 14px 24px; overflow-x:auto; scrollbar-width:none; }
    .gp-panel-scroll::-webkit-scrollbar { display:none; }
    .gp-panel-cover { width:54px; aspect-ratio:2/3; border-radius:6px; overflow:hidden; flex-shrink:0; background:var(--surface2); cursor:pointer; }
    .gp-panel-cover img { width:100%; height:100%; object-fit:cover; display:block; }
  `;
  document.head.appendChild(style);
})();

// ── DATA ──
function buildThemeMap() {
  const map = new Map();
  books.filter(b => !isHiddenFromShelf(b)).forEach(b => {
    const arr = Array.isArray(b.themes) ? b.themes.map(t => (t || '').trim()).filter(Boolean) : [];
    arr.forEach(t => {
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(b);
    });
  });
  return map;
}
function gpBuildMap(type) { return type === 'themes' ? buildThemeMap() : buildGenreMap(); }

function gpHashColor(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // Wide warm spread — deep rust → brick → terracotta → gold — so adjacent
  // slices in a long tail rarely land on the same hue/lightness combo.
  const hue = 6 + (h % 52);              // 6–58°
  const sat = 46 + ((h >>> 6) % 34);     // 46–80%
  const light = 32 + ((h >>> 13) % 34);  // 32–66%
  return `hsl(${hue} ${sat}% ${light}%)`;
}

// ── PIE MATH ──
function gpPoint(cx, cy, r, angleDeg) {
  const a = angleDeg * Math.PI / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}
function gpArcPath(cx, cy, r, startAngle, endAngle) {
  const p1 = gpPoint(cx, cy, r, startAngle);
  const p2 = gpPoint(cx, cy, r, endAngle);
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x.toFixed(3)} ${p1.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)} Z`;
}
function gpAnnulusPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const po1 = gpPoint(cx, cy, rOuter, startAngle);
  const po2 = gpPoint(cx, cy, rOuter, endAngle);
  const pi1 = gpPoint(cx, cy, rInner, endAngle);
  const pi2 = gpPoint(cx, cy, rInner, startAngle);
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${po1.x.toFixed(3)} ${po1.y.toFixed(3)} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${po2.x.toFixed(3)} ${po2.y.toFixed(3)} L ${pi1.x.toFixed(3)} ${pi1.y.toFixed(3)} A ${rInner} ${rInner} 0 ${largeArc} 0 ${pi2.x.toFixed(3)} ${pi2.y.toFixed(3)} Z`;
}

// ── MARKUP INJECTION (once) ──
function gpEnsureMarkup() {
  const overlay = document.getElementById('genresListOverlay');
  if (!overlay || overlay.dataset.gpInit === '1') return;
  overlay.dataset.gpInit = '1';
  const fastscrollHtml = `
    <div class="gp-fastbar" id="gpFastBar">
      <div class="gp-fastbar-track"></div>
      <div class="gp-fastbar-thumb" id="gpFastThumb"></div>
    </div>`;
  overlay.innerHTML = fastscrollHtml + `
    <div class="shelf-header">
      <button class="shelf-back-btn" onclick="closeGenresOverlay()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </button>
      <span class="shelf-header-title" id="gpHeaderTitle">Genres</span>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="al-sort-btn" id="gpViewToggleBtn" onclick="gpToggleView()"></button>
        <button class="al-sort-btn" id="genSortBtn" onclick="toggleGenSort()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
          <span id="genSortLabel">Sort A–Z</span>
        </button>
      </div>
    </div>
    <div class="gp-tabs">
      <button class="gp-tab active" data-tab="genres" onclick="gpSetTab('genres')">Genres</button>
      <button class="gp-tab" data-tab="themes" onclick="gpSetTab('themes')">Themes</button>
    </div>
    <p class="al-shelf-sub" id="genShelfSub"></p>
    <div style="padding:0 16px 10px;">
      <div class="al-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--text-muted);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="al-search-input" id="genSearchInput" placeholder="Search genres…" oninput="gpRenderCurrent()" autocomplete="off" autocorrect="off" spellcheck="false" />
      </div>
    </div>
    <div class="divider"></div>
    <div class="gp-pie-sticky" id="genPieSticky"></div>
    <div class="al-scroll" id="genScroll"></div>
  `;
  gpInitFastScroll();
}

// ── FAST-SCROLL THUMB ──
function gpInitFastScroll() {
  const bar = document.getElementById('gpFastBar');
  const thumb = document.getElementById('gpFastThumb');
  const scroll = document.getElementById('genScroll');
  if (!bar || !thumb || !scroll || bar.dataset.bound === '1') return;
  bar.dataset.bound = '1';
  let dragging = false;

  function trackRect() { return bar.querySelector('.gp-fastbar-track').getBoundingClientRect(); }

  function updateThumbFromScroll() {
    const { scrollTop, scrollHeight, clientHeight } = scroll;
    if (scrollHeight <= clientHeight + 4) { bar.classList.remove('visible'); return; }
    const tRect = trackRect();
    const barRect = bar.getBoundingClientRect();
    const trackH = tRect.height;
    const thumbH = Math.max(28, trackH * (clientHeight / scrollHeight));
    const maxTravel = trackH - thumbH;
    const frac = scrollTop / (scrollHeight - clientHeight);
    thumb.style.height = thumbH + 'px';
    thumb.style.top = ((tRect.top - barRect.top) + frac * maxTravel) + 'px';
  }

  function scrollToClientY(clientY) {
    const tRect = trackRect();
    const frac = Math.max(0, Math.min(1, (clientY - tRect.top) / tRect.height));
    const { scrollHeight, clientHeight } = scroll;
    scroll.scrollTop = frac * (scrollHeight - clientHeight);
  }

  bar.addEventListener('pointerdown', e => {
    dragging = true;
    bar.setPointerCapture(e.pointerId);
    scrollToClientY(e.clientY);
  });
  bar.addEventListener('pointermove', e => { if (dragging) scrollToClientY(e.clientY); });
  const endDrag = () => { dragging = false; };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);
  scroll.addEventListener('scroll', () => { if (!dragging) updateThumbFromScroll(); }, { passive: true });
  window._gpUpdateThumb = updateThumbFromScroll;
  window.addEventListener('resize', () => gpRefreshFastScroll());
}

function gpRefreshFastScroll() {
  requestAnimationFrame(() => {
    const bar = document.getElementById('gpFastBar');
    const scroll = document.getElementById('genScroll');
    if (!bar || !scroll) return;
    bar.style.top = scroll.getBoundingClientRect().top + 'px';
    bar.classList.toggle('visible', scroll.scrollHeight > scroll.clientHeight + 4);
    if (window._gpUpdateThumb) window._gpUpdateThumb();
  });
}

// ── HEADER STATE ──
function gpUpdateHeaderState() {
  document.querySelectorAll('#genresListOverlay .gp-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === gpActiveTab));
  const title = document.getElementById('gpHeaderTitle');
  if (title) title.textContent = gpActiveTab === 'themes' ? 'Themes' : 'Genres';
  const viewBtn = document.getElementById('gpViewToggleBtn');
  if (viewBtn) viewBtn.innerHTML = gpView === 'pie' ? `${GP_ICON_LIST} List` : `${GP_ICON_PIE} Pie`;
  const sortBtn = document.getElementById('genSortBtn');
  if (sortBtn) sortBtn.style.display = gpView === 'list' ? '' : 'none';
  const searchInput = document.getElementById('genSearchInput');
  if (searchInput) searchInput.placeholder = gpActiveTab === 'themes' ? 'Search themes…' : 'Search genres…';
}

// ── RENDER DISPATCH ──
function gpRenderCurrent() {
  gpUpdateHeaderState();
  if (gpView === 'pie') gpRenderPie(gpActiveTab);
  else gpRenderList(gpActiveTab);
}

function gpSetTab(tab) {
  gpActiveTab = tab;
  gpOpenPanelIndex = null;
  gpRenderCurrent();
}

function gpToggleView() {
  gpView = gpView === 'pie' ? 'list' : 'pie';
  gpOpenPanelIndex = null;
  gpRenderCurrent();
}

// ── PIE VIEW ──
function gpRenderPie(type) {
  const scroll = document.getElementById('genScroll');
  if (!scroll) return;
  const q = (document.getElementById('genSearchInput')?.value || '').toLowerCase().trim();
  const map = gpBuildMap(type);
  let entries = Array.from(map.entries());
  if (q) entries = entries.filter(([name]) => name.toLowerCase().includes(q));
  entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const subEl = document.getElementById('genShelfSub');
  if (subEl) subEl.textContent = type === 'themes' ? 'All themes in your shelf.' : 'All genres in your shelf.';

  if (!entries.length) {
    const pieStickyEmpty = document.getElementById('genPieSticky');
    if (pieStickyEmpty) pieStickyEmpty.innerHTML = '';
    scroll.innerHTML = `<div class="al-empty">📭<br>${q ? `No ${type} match your search.` : `No ${type} yet.`}</div>`;
    gpOpenPanelIndex = null;
    return;
  }

  const total = entries.reduce((s, [, arr]) => s + arr.length, 0);
  const cx = 100, cy = 100, rOuter = 92, rInner = 38;
  const MIN_DEG = 5; // guarantees every slice, even a count-of-1 tag, is visible and tappable
  const raw = entries.map(([, arr]) => (arr.length / total) * 360);
  const floored = raw.map(d => Math.max(d, MIN_DEG));
  const flooredTotal = floored.reduce((s, d) => s + d, 0);
  const degrees = floored.map(d => (d / flooredTotal) * 360);

  let pathsHtml;
  if (entries.length === 1) {
    pathsHtml = `<path d="${gpAnnulusPath(cx, cy, rOuter, rInner, 0, 359.99)}" fill="${gpHashColor(entries[0][0])}" data-idx="0" class="gp-slice"/>`;
  } else {
    let cum = 0;
    pathsHtml = entries.map(([name], i) => {
      const start = cum;
      cum += degrees[i];
      const end = cum;
      return `<path d="${gpAnnulusPath(cx, cy, rOuter, rInner, start, end)}" fill="${gpHashColor(name)}" data-idx="${i}" class="gp-slice"/>`;
    }).join('');
  }
  const centerLabel = `<g class="gp-pie-center-label" text-anchor="middle">
      <text x="${cx}" y="${cy - 3}" font-size="22" class="gp-pie-center-count">${entries.length}</text>
      <text x="${cx}" y="${cy + 15}" font-size="9" class="gp-pie-center-sub">${type === 'themes' ? 'themes' : 'genres'}</text>
    </g>`;

  const legendHtml = entries.map(([name, arr], i) => `
    <div class="gp-legend-item">
      <div class="gp-legend-row" data-idx="${i}">
        <span class="gp-dot" style="background:${gpHashColor(name)}"></span>
        <span class="gp-legend-name">${escapeHtml(name)}</span>
        <span class="gp-legend-count">${arr.length}</span>
      </div>
      <div class="gp-panel" id="gp-panel-${i}">
        <div class="gp-panel-scroll" id="gp-panel-scroll-${i}"></div>
      </div>
    </div>`).join('');

  const pieSticky = document.getElementById('genPieSticky');
  if (pieSticky) pieSticky.innerHTML = `<div class="gp-pie-wrap"><svg viewBox="0 0 200 200" width="196" height="196">${pathsHtml}${centerLabel}</svg></div>`;
  scroll.innerHTML = `<div class="gp-legend">${legendHtml}</div>`;

  gpEntriesCache = entries;

  document.querySelectorAll('#genPieSticky .gp-slice, #genScroll .gp-legend-row').forEach(el => {
    el.addEventListener('click', () => gpTogglePanel(+el.dataset.idx));
  });

  if (gpOpenPanelIndex !== null && entries[gpOpenPanelIndex]) {
    gpRenderPanelContent(gpOpenPanelIndex);
    const panel = document.getElementById('gp-panel-' + gpOpenPanelIndex);
    if (panel) panel.classList.add('open');
  } else {
    gpOpenPanelIndex = null;
  }
  gpRefreshFastScroll();
}

function gpTogglePanel(idx) {
  const prev = gpOpenPanelIndex;
  if (prev !== null) {
    const prevPanel = document.getElementById('gp-panel-' + prev);
    if (prevPanel) prevPanel.classList.remove('open');
  }
  if (prev === idx) { gpOpenPanelIndex = null; return; }
  gpOpenPanelIndex = idx;
  gpRenderPanelContent(idx);
  const panel = document.getElementById('gp-panel-' + idx);
  if (panel) panel.classList.add('open');
}

function gpRenderPanelContent(idx) {
  const entry = gpEntriesCache[idx];
  if (!entry) return;
  const scrollEl = document.getElementById('gp-panel-scroll-' + idx);
  if (!scrollEl) return;
  const list = entry[1].slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  scrollEl.innerHTML = list.map(b => `
    <div class="gp-panel-cover" data-id="${b.id}">${coverHtml(b, 10)}</div>`).join('');
  scrollEl.querySelectorAll('.gp-panel-cover').forEach(el => {
    el.addEventListener('click', () => openDetailModal(el.dataset.id));
  });
}

// ── LIST VIEW ──
function gpRenderList(type) {
  const scroll = document.getElementById('genScroll');
  if (!scroll) return;
  const pieSticky = document.getElementById('genPieSticky');
  if (pieSticky) pieSticky.innerHTML = '';
  const q = (document.getElementById('genSearchInput')?.value || '').toLowerCase().trim();
  const map = gpBuildMap(type);
  let entries = Array.from(map.entries());
  if (q) entries = entries.filter(([name]) => name.toLowerCase().includes(q));
  if (gpSort === 'az') entries.sort((a, b) => a[0].localeCompare(b[0]));
  else entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const subEl = document.getElementById('genShelfSub');
  if (subEl) subEl.textContent = type === 'themes' ? 'All themes in your shelf.' : 'All genres in your shelf.';

  gpEntriesCache = entries;

  if (!entries.length) {
    scroll.innerHTML = `<div class="al-empty">📭<br>${q ? `No ${type} match your search.` : `No ${type} yet.`}</div>`;
    return;
  }

  scroll.innerHTML = entries.map(([name, arr], i) => {
    const bookWord = arr.length === 1 ? 'book' : 'books';
    return `<div class="al-author-row" data-name="${escapeAttr(name)}" style="animation-delay:${Math.min(i, 14) * 0.028}s">
      <div class="al-author-avatar" style="font-size:16px">📚</div>
      <div class="al-author-info">
        <div class="al-author-name">${escapeHtml(name)}</div>
        <div class="al-author-count">${arr.length} ${bookWord}</div>
      </div>
      <svg class="al-author-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');

  scroll.querySelectorAll('.al-author-row').forEach(row => {
    row.addEventListener('click', () => window.openGenreDetail(row.dataset.name, type));
  });
  gpRefreshFastScroll();
}

// ── SORT TOGGLE OVERRIDE ──
window.toggleGenSort = function toggleGenSort() {
  gpSort = gpSort === 'az' ? 'count' : 'az';
  const label = document.getElementById('genSortLabel');
  if (label) label.textContent = gpSort === 'az' ? 'Sort A–Z' : 'Sort by count';
  gpRenderCurrent();
};

// ── OPEN OVERLAY OVERRIDE ──
window.openGenresOverlay = function openGenresOverlay() {
  gpEnsureMarkup();
  gpActiveTab = 'genres';
  gpView = 'pie';
  gpOpenPanelIndex = null;
  gpRenderCurrent();
  navPush(document.getElementById('profileModal'), document.getElementById('genresListOverlay'));
};

// ── DETAIL DRILL-IN OVERRIDE (reuses #genreDetailOverlay for both types) ──
const _gpOrigOpenGenreDetail = window.openGenreDetail;
window.openGenreDetail = function openGenreDetail(name, type) {
  _gpDetailType = type || 'genres';
  _gpOrigOpenGenreDetail(name);
};

const _gpOrigRenderGenreDetailGrid = window.renderGenreDetailGrid;
window.renderGenreDetailGrid = function renderGenreDetailGrid() {
  if (_gpDetailType !== 'themes') { _gpOrigRenderGenreDetailGrid(); return; }

  const grid = document.getElementById('genreDetailGrid');
  const countEl = document.getElementById('genreDetailCount');
  const map = buildThemeMap();
  const list = (map.get(genreDetailName) || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  if (countEl) countEl.textContent = list.length === 1 ? '1 book' : `${list.length} books`;
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>No books with this theme.</p></div>`;
    return;
  }
  grid.classList.remove('reading-mode');
  grid.innerHTML = list.map((b, i) => `
    <div class="book-card" data-id="${b.id}" data-title="${escapeAttr(b.title || '')}" data-author="${escapeAttr(b.author || '')}" style="animation-delay:${Math.min(i, 12) * 0.035}s">
      ${coverHtml(b)}<div class="status-dot ${b.status}"></div>
    </div>`).join('');
  grid.querySelectorAll('.book-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('touchstart', e => startPress(e, id, card), { passive: true });
    card.addEventListener('touchend', e => { e.stopPropagation(); endPress(e, id, card); });
    card.addEventListener('touchcancel', () => { if (!didLongPress) cancelPress(card); });
    card.addEventListener('click', e => {
      if (isTouch()) { openDetailModal(id); return; }
      if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
      else openQuickMenu(id, card);
    });
  });
};

// ── INIT ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', gpEnsureMarkup);
} else {
  gpEnsureMarkup();
}
