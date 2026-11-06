// ══════════════════════════════════════════════════════════════
// GENRE / THEME PIE CHART — genrepie.js
// Takes over #genresListOverlay: adds Genres/Themes tabs + pie↔list toggle.
// Detail drill-in reuses existing #genreDetailOverlay via a type flag.
// ══════════════════════════════════════════════════════════════
let gpActiveTab = 'genres';   // themes tab is off; kept so the detail code still has a value
let gpView = 'browse';        // 'browse' | 'mix' (remembered)
try { gpView = localStorage.getItem('tsundoku_genres_view') === 'mix' ? 'mix' : 'browse'; } catch {}
let gpEntriesCache = [];
let _gpDetailType = 'genres';   // 'genres' (raw tag) | 'main' (rolled-up main genre) | 'themes'
const GP_PIE_MAX = 12;          // slices drawn in the pie; the rest merge into one "more" slice
window._gpSubs = new Map();
let _gpDetailSub = null;   // sub-genre chip filter on the detail screen
const GP_MIX_COLORS = ['#c9714a', '#1D9E75', '#7F77DD', '#EF9F27', '#378ADD', '#D4537E', '#639922'];   // one distinct hue per slice     // main genre -> Map(sub tag -> book count)

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
    .gp-slice { transition:opacity 0.15s, transform 0.15s; stroke:none; transform-box:fill-box; transform-origin:center; }
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
    .gp-panel.open { max-height:230px; }
    .gp-subs { display:flex; flex-wrap:wrap; gap:6px; padding:2px 4px 8px 24px; }
    .gp-sub-chip { font-family:'DM Sans',sans-serif; font-size:12px; font-weight:500; padding:5px 11px; border-radius:100px; border:1px solid var(--border); background:var(--surface2); color:var(--text-dim); cursor:pointer; transition:border-color 0.15s, color 0.15s; }
    .gp-sub-chip span { opacity:0.55; margin-left:2px; }
    .gp-sub-chip:active { opacity:0.7; }
    .gp-sub-chip--all { border-color:var(--accent); color:var(--accent); background:transparent; }
    .gp-seg { display:flex; gap:2px; margin:0 16px 10px; padding:3px; border-radius:100px; background:var(--surface2); border:1px solid var(--border); flex-shrink:0; }
    .gp-seg-btn { flex:1; padding:7px 0; border:none; border-radius:100px; background:transparent; color:var(--text-muted); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:background 0.18s, color 0.18s; }
    .gp-seg-btn.active { background:var(--accent); color:#fff; }
    .gp-cards { display:flex; flex-direction:column; gap:8px; padding:2px 16px 24px; }
    .gp-card { display:flex; align-items:center; gap:12px; padding:11px 12px 11px 14px; border-radius:14px; background:var(--surface2); border:1px solid var(--border); cursor:pointer; transition:border-color 0.15s, transform 0.15s; }
    .gp-card:active { transform:scale(0.985); }
    .gp-card--none { border-style:dashed; }
    .gp-card-main { flex:1; min-width:0; }
    .gp-card-name { font-size:15px; font-weight:600; color:var(--text); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .gp-card-meta { font-size:12px; color:var(--text-muted); margin-top:2px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .gp-cvs { display:flex; flex-shrink:0; }
    .gp-cv { width:26px; height:39px; border-radius:4px; overflow:hidden; margin-left:-9px; border:1.5px solid var(--surface2); background:var(--surface2); }
    .gp-cv:first-child { margin-left:0; }
    .gp-cv img { width:100%; height:100%; object-fit:cover; display:block; }
    .gp-card-chev { color:var(--text-muted); flex-shrink:0; }
    .gp-mix-wrap { display:flex; flex-direction:column; align-items:center; gap:8px; padding:6px 16px 24px; }
    .gp-donut svg { width:196px; height:196px; display:block; }
    .gp-arc { cursor:pointer; transition:opacity 0.15s; }
    .gp-arc:hover { opacity:0.82; }
    .gp-mix-rows { width:100%; }
    .gp-mix-row { display:flex; align-items:center; gap:10px; padding:11px 4px; border-bottom:1px solid var(--border); cursor:pointer; }
    .gp-mix-row:last-child { border-bottom:none; }
    .gp-mix-row:active { opacity:0.6; }
    .gp-mix-name { width:140px; flex-shrink:0; font-size:14px; font-weight:600; color:var(--text); overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .gp-mix-bar { flex:1; height:4px; border-radius:2px; background:var(--surface2); overflow:hidden; }
    .gp-mix-bar b { display:block; height:100%; border-radius:2px; }
    .gp-mix-pct { width:66px; flex-shrink:0; text-align:right; font-size:12px; color:var(--text-muted); }
    .gp-detail-chips { display:flex; gap:6px; overflow-x:auto; padding:0 16px 10px; flex-shrink:0; scrollbar-width:none; }
    .gp-detail-chips::-webkit-scrollbar { display:none; }
    @media (min-width:1024px) {
      .gp-seg { max-width:300px; margin-left:24px; }
      #gpSearchWrap { max-width:420px; }
      #genresListOverlay .gp-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:10px; padding:2px 24px 32px; }
      #genresListOverlay .gp-mix-wrap { flex-direction:row; align-items:flex-start; justify-content:center; gap:48px; max-width:960px; margin:0 auto; padding:12px 24px 32px; }
      .gp-donut { position:sticky; top:8px; flex-shrink:0; }
      .gp-mix-rows { flex:1; min-width:0; }
      .gp-mix-name { width:180px; }
      .gp-card:hover { border-color:var(--accent); }
      .gp-mix-row:hover { background:rgba(255,255,255,0.03); }
    }
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
// Rolls raw tags up to main genres. Returns Map(main -> books[]); sub-tags land in window._gpSubs.
function buildMainGenreMap() {
  const map = new Map();
  const subs = new Map();
  const entry = m => { if (!map.has(m)) { map.set(m, []); subs.set(m, new Map()); } return m; };
  books.filter(b => !isHiddenFromShelf(b)).forEach(b => {
    const tags = getBookGenres(b);
    const first = tags[0] || 'Untagged';          // the pie reads only the first tag
    map.get(entry(first)).push(b);
    const sm = subs.get(first);
    tags.slice(1).forEach(t => sm.set(t, (sm.get(t) || 0) + 1));   // 2nd/3rd tags become sub chips
  });
  window._gpSubs = subs;
  return map;
}
function gpBuildMap(type) { return type === 'themes' ? buildThemeMap() : buildMainGenreMap(); }

// search matches a main genre's name or any of its sub-genres
function gpFilterEntries(entries, q, type) {
  if (!q) return entries;
  return entries.filter(([name]) => {
    if (name.toLowerCase().includes(q)) return true;
    if (type === 'themes') return false;
    const sm = window._gpSubs.get(name);
    return !!sm && [...sm.keys()].some(s => s.toLowerCase().includes(q));
  });
}

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
function gpHashColorGradient(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = 6 + (h % 52);
  const sat = 46 + ((h >>> 6) % 34);
  const light = 32 + ((h >>> 13) % 34);
  return { from: `hsl(${hue} ${sat}% ${Math.min(light + 16, 78)}%)`, to: `hsl(${hue} ${sat}% ${Math.max(light - 14, 18)}%)` };
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
  overlay.innerHTML = `
    <div class="gp-fastbar" id="gpFastBar">
      <div class="gp-fastbar-track"></div>
      <div class="gp-fastbar-thumb" id="gpFastThumb"></div>
    </div>
    <div class="shelf-header">
      <button class="shelf-back-btn" onclick="closeGenresOverlay()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </button>
      <span class="shelf-header-title" id="gpHeaderTitle">Genres</span>
      <span style="min-width:62px"></span>
    </div>
    <div class="gp-seg" role="tablist" aria-label="Genres view">
      <button class="gp-seg-btn" data-view="browse" role="tab" onclick="gpSetView('browse')">Browse</button>
      <button class="gp-seg-btn" data-view="mix" role="tab" onclick="gpSetView('mix')">Mix</button>
    </div>
    <div id="gpSearchWrap" style="padding:0 16px 10px;">
      <div class="al-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--text-muted);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="al-search-input" id="genSearchInput" placeholder="Search genres or sub-genres…" oninput="gpRenderCurrent()" autocomplete="off" autocorrect="off" spellcheck="false" />
      </div>
    </div>
    <div class="divider"></div>
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
    updateThumbFromScroll();
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
  document.querySelectorAll('#genresListOverlay .gp-seg-btn').forEach(b => {
    const on = b.dataset.view === gpView;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  const sw = document.getElementById('gpSearchWrap');
  if (sw) sw.style.display = gpView === 'browse' ? '' : 'none';
}

function gpRenderCurrent() {
  gpUpdateHeaderState();
  if (gpView === 'mix') gpRenderMix(); else gpRenderBrowse();
}

function gpSetView(v) {
  gpView = v === 'mix' ? 'mix' : 'browse';
  try { localStorage.setItem('tsundoku_genres_view', gpView); } catch {}
  gpRenderCurrent();
  const sc = document.getElementById('genScroll');
  if (sc) sc.scrollTop = 0;
}

// main genres, biggest first, Untagged always last
function gpEntries(q) {
  const entries = gpFilterEntries(Array.from(gpBuildMap('genres').entries()), q, 'genres');
  const rank = n => (n === 'Untagged' ? 1 : 0);
  return entries.sort((a, b) => rank(a[0]) - rank(b[0]) || b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

// ── BROWSE ──
function gpRenderBrowse() {
  const scroll = document.getElementById('genScroll');
  if (!scroll) return;
  const q = (document.getElementById('genSearchInput')?.value || '').toLowerCase().trim();
  const entries = gpEntries(q);
  gpEntriesCache = entries;
  if (!entries.length) {
    scroll.innerHTML = `<div class="al-empty">📭<br>${q ? 'No genres match your search.' : 'No genres yet.'}</div>`;
    gpRefreshFastScroll();
    return;
  }
  scroll.innerHTML = '<div class="gp-cards">' + entries.map(([name, arr], i) => {
    const subMap = window._gpSubs.get(name);
    const subs = subMap ? [...subMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(s => escapeHtml(s[0])) : [];
    const covers = arr.slice().sort((a, b) => !!b.cover_url - !!a.cover_url).slice(0, 3)
      .map(b => `<div class="gp-cv">${coverHtml(b, 10)}</div>`).join('');
    const meta = `${arr.length} ${arr.length === 1 ? 'book' : 'books'}` + (subs.length ? ' · ' + subs.join(', ') : '');
    return `<div class="gp-card${name === 'Untagged' ? ' gp-card--none' : ''}" data-name="${escapeAttr(name)}" role="button" tabindex="0" style="animation:loFadeIn 0.28s ease ${Math.min(i, 10) * 0.03}s both">
      <div class="gp-card-main"><div class="gp-card-name">${escapeHtml(name)}</div><div class="gp-card-meta">${meta}</div></div>
      <div class="gp-cvs">${covers}</div>
      <svg class="gp-card-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('') + '</div>';
  scroll.querySelectorAll('.gp-card').forEach(c => {
    c.addEventListener('click', () => window.openGenreDetail(c.dataset.name, 'main'));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
  });
  gpRefreshFastScroll();
}

// ── MIX ──
function gpRenderMix() {
  const scroll = document.getElementById('genScroll');
  if (!scroll) return;
  const entries = gpEntries('');
  gpEntriesCache = entries;
  if (!entries.length) {
    scroll.innerHTML = '<div class="al-empty">📭<br>No genres yet.</div>';
    gpRefreshFastScroll();
    return;
  }
  const named = entries.filter(e => e[0] !== 'Untagged');
  const untagged = entries.find(e => e[0] === 'Untagged');
  const rest = named.slice(GP_MIX_COLORS.length);
  const slices = named.slice(0, GP_MIX_COLORS.length).map(([name, arr], i) => ({ key: name, label: name, n: arr.length, color: GP_MIX_COLORS[i] }));
  if (rest.length) slices.push({ key: '__more', label: `More (${rest.length} genres)`, n: rest.reduce((s, [, a]) => s + a.length, 0), color: '#888780' });
  if (untagged) slices.push({ key: 'Untagged', label: 'Untagged', n: untagged[1].length, color: '#5F5E5A' });

  const total = slices.reduce((s, x) => s + x.n, 0);
  const maxN = Math.max(...slices.map(x => x.n));
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = slices.map(x => {
    const len = x.n / total * C, dash = Math.max(len - 2, 1);
    const el = `<circle class="gp-arc" data-key="${escapeAttr(x.key)}" cx="75" cy="75" r="${R}" fill="none" stroke="${x.color}" stroke-width="22" stroke-dasharray="${dash.toFixed(1)} ${(C - dash).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 75 75)"><title>${escapeHtml(x.label)} · ${x.n}</title></circle>`;
    off += len;
    return el;
  }).join('');
  const rows = slices.map(x => `<div class="gp-mix-row" data-key="${escapeAttr(x.key)}" role="button" tabindex="0">
      <span class="gp-dot" style="background:${x.color}"></span>
      <span class="gp-mix-name">${escapeHtml(x.label)}</span>
      <span class="gp-mix-bar"><b style="width:${Math.round(x.n / maxN * 100)}%;background:${x.color}"></b></span>
      <span class="gp-mix-pct">${x.n} · ${Math.round(x.n / total * 100)}%</span>
    </div>`).join('');

  scroll.innerHTML = `<div class="gp-mix-wrap">
    <div class="gp-donut"><svg viewBox="0 0 150 150" role="img" aria-label="Genre share">${arcs}
      <g class="gp-pie-center-label" text-anchor="middle">
        <text x="75" y="76" font-size="22" class="gp-pie-center-count">${total}</text>
        <text x="75" y="92" font-size="11" class="gp-pie-center-sub">books</text>
      </g></svg></div>
    <div class="gp-mix-rows">${rows}</div>
  </div>`;

  const open = key => { if (key === '__more') gpSetView('browse'); else window.openGenreDetail(key, 'main'); };
  scroll.querySelectorAll('.gp-arc, .gp-mix-row').forEach(el => {
    el.addEventListener('click', () => open(el.dataset.key));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el.dataset.key); } });
  });
  gpRefreshFastScroll();
}

// ── DETAIL: sub-genre filter chips ──
function gpRenderDetailChips(grid, all) {
  let row = document.getElementById('gpDetailChips');
  const counts = new Map();
  if (_gpDetailType === 'main') all.forEach(b => getBookGenres(b).slice(1).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  const subs = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  if (!subs.length) { if (row) row.remove(); return; }
  if (!row) {
    row = document.createElement('div');
    row.id = 'gpDetailChips';
    row.className = 'gp-detail-chips';
    grid.parentNode.insertBefore(row, grid);
    row.addEventListener('click', e => {
      const c = e.target.closest('.ld-chip');
      if (!c) return;
      _gpDetailSub = c.dataset.sub || null;
      window.renderGenreDetailGrid();
    });
  }
  row.innerHTML = `<button class="ld-chip${_gpDetailSub ? '' : ' active'}" data-sub="">All <span style="opacity:0.65">${all.length}</span></button>`
    + subs.map(([s, n]) => `<button class="ld-chip${_gpDetailSub === s ? ' active' : ''}" data-sub="${escapeAttr(s)}">${escapeHtml(s)} <span style="opacity:0.65">${n}</span></button>`).join('');
}

// ── OPEN OVERLAY OVERRIDE ──
window.openGenresOverlay = function openGenresOverlay() {
  gpEnsureMarkup();
  const _si = document.getElementById('genSearchInput');
  if (_si) _si.value = '';
  gpRenderCurrent();
  navPush(document.getElementById('profileModal'), document.getElementById('genresListOverlay'));
};

// ── DETAIL DRILL-IN OVERRIDE (reuses #genreDetailOverlay for both types) ──
const _gpOrigOpenGenreDetail = window.openGenreDetail;
window.openGenreDetail = function openGenreDetail(name, type) {
  _gpDetailType = type || 'genres';
  _gpDetailSub = null;
  _gpOrigOpenGenreDetail(name);
};

const _gpOrigRenderGenreDetailGrid = window.renderGenreDetailGrid;
window.renderGenreDetailGrid = function renderGenreDetailGrid() {
  if (_gpDetailType !== 'themes' && _gpDetailType !== 'main') {
    document.getElementById('gpDetailChips')?.remove();
    _gpOrigRenderGenreDetailGrid();
    return;
  }

  const grid = document.getElementById('genreDetailGrid');
  const countEl = document.getElementById('genreDetailCount');
  const map = _gpDetailType === 'main' ? buildMainGenreMap() : buildThemeMap();
  const all = (map.get(genreDetailName) || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  gpRenderDetailChips(grid, all);
  const list = _gpDetailSub ? all.filter(b => getBookGenres(b).includes(_gpDetailSub)) : all;
  if (countEl) countEl.textContent = list.length === 1 ? '1 book' : `${list.length} books`;
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>No books here.</p></div>`;
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
