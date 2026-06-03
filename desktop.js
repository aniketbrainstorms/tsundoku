/**
 * desktop.js — Tsundoku desktop layer
 * Injects all desktop HTML, CSS, and interaction logic.
 * Mobile files (app.html, styles.css, app.js) are never touched.
 * To modify anything on desktop, edit only this file.
 */
(function () {

  // ─────────────────────────────────────────────
  // 1. CSS
  // ─────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `

/* ── Hide mobile-only elements on desktop ── */
@media (min-width: 1024px) {
  .hint-bar { display: none; }
  .divider  { display: none; }
}

/* ── Sidebar layout ── */
@media (min-width: 1024px) {
  #app {
    flex-direction: row;
  }
  .app-screen {
    flex-direction: row;
    overflow: visible;
  }
  .header {
    width: 220px;
    min-width: 220px;
    flex-shrink: 0;
    height: 100vh;
    height: 100dvh;
    border-right: 1px solid var(--border);
    border-bottom: none;
    display: flex;
    flex-direction: column;
    padding: max(var(--safe-top), 28px) 0 max(var(--safe-bottom), 28px);
    background: var(--surface);
    position: sticky;
    top: 0;
    overflow: hidden;
  }
  .header-top {
    padding: 0 20px;
    margin-bottom: 28px;
  }
  /* hide mobile avatar btn — desktop has profile row at bottom */
  .header-top .profile-avatar { display: none; }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 0 12px;
    margin-bottom: 0;
    flex: 0 0 auto;
    overflow: visible;
  }
  .filter-tabs {
    flex-direction: column;
    gap: 2px;
    overflow: visible;
    width: auto;
  }
  .tab-btn {
    border-radius: 10px;
    justify-content: flex-start;
    padding: 10px 12px;
    font-size: 14px;
    border-color: transparent;
    background: transparent;
  }
  .tab-btn.active {
    background: rgba(201,113,74,0.12);
    border-color: transparent;
    color: var(--accent);
  }
  .tab-count {
    margin-left: auto;
    font-size: 11px;
    background: var(--surface2);
    border-radius: 100px;
    padding: 1px 7px;
    opacity: 1;
  }
  .tab-btn.active .tab-count {
    background: rgba(201,113,74,0.18);
    color: var(--accent);
  }
  /* hide mobile sort button — sort is in sidebar sub-row */
  #sortToggleBtn { display: none; }

  .grid-container {
    flex: 1;
    padding-left: 20px;
    padding-right: 20px;
  }
  .floating-bar {
    left: 236px;
    right: 20px;
  }
  .book-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 14px;
  }
}

@media (min-width: 1280px) {
  .header { width: 240px; min-width: 240px; }
  .book-grid { grid-template-columns: repeat(6, 1fr); }
  .floating-bar { left: 256px; }
}

/* ── Sidebar nav extras ── */
.dsb-nav-section,
.dsb-bottom { display: none; }

@media (min-width: 1024px) {
  .dsb-nav-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 12px;
    margin-top: 4px;
  }
  .dsb-bottom {
    display: flex;
    flex-direction: column;
    margin-top: auto;
    padding: 0 6px 0;
    flex-shrink: 0;
  }
  .dsb-divider {
    height: 1px;
    background: var(--border);
    margin: 8px 8px;
    flex-shrink: 0;
  }
  .dsb-nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    border: none;
    background: none;
    font-family: 'DM Sans', sans-serif;
    user-select: none;
    -webkit-user-select: none;
  }
  .dsb-nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text-dim); }
  .dsb-nav-item.active { color: var(--accent); background: rgba(201,113,74,0.1); }
  .dsb-nav-count {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
    background: var(--surface2);
    border-radius: 100px;
    padding: 1px 7px;
  }
  .dsb-nav-item.active .dsb-nav-count {
    background: rgba(201,113,74,0.18);
    color: var(--accent);
  }
  /* sort sub-row */
  .dsb-sort-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px 8px;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .dsb-sort-row:hover { background: rgba(255,255,255,0.03); }
  .dsb-sort-row:hover .dsb-sort-val { color: var(--text-dim); }
  .dsb-sort-icon { color: var(--text-muted); flex-shrink: 0; display: flex; }
  .dsb-sort-val {
    font-size: 12px;
    color: var(--text-muted);
    transition: color 0.15s;
    flex: 1;
  }
  .dsb-sort-arrow { margin-left: auto; color: var(--text-muted); font-size: 10px; }
  /* share */
  .dsb-share-wrap { position: relative; }
  .dsb-share-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border-radius: 10px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    user-select: none;
    -webkit-user-select: none;
  }
  .dsb-share-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-dim); }
  .dsb-share-pop {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 8px;
    right: 8px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.65);
    z-index: 55;
  }
  .dsb-share-pop-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    margin-bottom: 8px;
    font-weight: 600;
  }
  .dsb-share-url-row {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 8px;
    margin-bottom: 8px;
  }
  .dsb-share-url {
    font-size: 10px;
    color: var(--text-muted);
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .dsb-share-copy {
    width: 22px; height: 22px;
    border-radius: 5px;
    background: var(--border);
    border: none;
    cursor: pointer;
    color: var(--text-dim);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .dsb-share-copy:hover { background: var(--text-muted); color: var(--text); }
  .dsb-share-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dsb-share-toggle-label {
    font-size: 12px;
    color: var(--text-muted);
  }
  /* profile row */
  .dsb-profile-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s;
    user-select: none;
    -webkit-user-select: none;
  }
  .dsb-profile-row:hover { background: rgba(255,255,255,0.04); }
  .dsb-profile-email {
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }
}

/* ─── TABLET (768–1023px): hamburger + overlay sidebar ─── */
.desk-hamburger,
.dsb-backdrop { display: none; }

@media (min-width: 768px) and (max-width: 1023px) {
  .desk-hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    bottom: 24px;
    left: 16px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    z-index: 48;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    transition: color 0.15s;
  }
  .desk-hamburger:hover { color: var(--text); }
  .header {
    position: fixed !important;
    top: 0; left: 0; bottom: 0;
    transform: translateX(calc(-1 * 220px - 2px));
    transition: transform 0.28s cubic-bezier(0.32,0.72,0,1);
    z-index: 50;
    border-right: 1px solid var(--border);
    border-bottom: none !important;
    flex-direction: column !important;
    height: 100% !important;
    width: 220px !important;
    min-width: 0 !important;
    display: flex;
    padding: max(var(--safe-top), 28px) 0 max(var(--safe-bottom), 28px);
    background: var(--surface);
    overflow: hidden;
  }
  .header.dsb-open { transform: translateX(0); }
  .dsb-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0);
    z-index: 49;
    pointer-events: none;
    transition: background 0.28s;
  }
  .dsb-backdrop.open {
    background: rgba(0,0,0,0.55);
    pointer-events: auto;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
  .app-screen { flex-direction: column !important; }
  .grid-container { padding-left: 16px !important; padding-right: 16px !important; }
  .floating-bar { left: 16px !important; right: 16px !important; }
  .book-grid { grid-template-columns: repeat(4, 1fr) !important; }
  /* show nav extras on tablet too */
  .dsb-nav-section { display: flex; flex-direction: column; gap: 2px; padding: 0 12px; margin-top: 4px; }
  .dsb-bottom { display: flex; flex-direction: column; margin-top: auto; padding: 0 6px 0; flex-shrink: 0; }
  .header-top { padding: 0 20px; margin-bottom: 28px; }
  .header-top .profile-avatar { display: none; }
  #sortToggleBtn { display: none; }
  .filter-tabs { flex-direction: column; gap: 2px; overflow: visible; width: auto; }
  .tab-btn { border-radius: 10px; justify-content: flex-start; padding: 10px 12px; font-size: 14px; border-color: transparent; background: transparent; }
  .tab-btn.active { background: rgba(201,113,74,0.12); border-color: transparent; color: var(--accent); }
  .tab-count { margin-left: auto; font-size: 11px; background: var(--surface2); border-radius: 100px; padding: 1px 7px; opacity: 1; }
  .tab-btn.active .tab-count { background: rgba(201,113,74,0.18); color: var(--accent); }
  .toolbar { flex-direction: column; align-items: stretch; gap: 4px; padding: 0 12px; margin-bottom: 0; flex: 0 0 auto; overflow: visible; }
}

@media (min-width: 1024px) {
  .desk-hamburger { display: none !important; }
  .dsb-backdrop { display: none !important; }
}

/* ─── DESKTOP DETAIL PANEL ─── */
.desk-detail-panel { display: none; }

@media (min-width: 768px) {
  /* on desktop the mobile detail modal is hidden — panel takes over */
  #detailModal { display: none !important; }

  .desk-shell {
    display: flex;
    flex-direction: row;
    height: 100dvh;
    overflow: hidden;
  }

  .desk-detail-panel {
    display: flex;
    flex-direction: column;
    width: 0;
    min-width: 0;
    overflow: hidden;
    background: var(--surface);
    border-left: 0px solid var(--border);
    flex-shrink: 0;
    transition:
      width 0.28s cubic-bezier(0.32,0.72,0,1),
      min-width 0.28s cubic-bezier(0.32,0.72,0,1),
      border-left-width 0.28s;
    height: 100dvh;
    position: sticky;
    top: 0;
  }
  .desk-detail-panel.ddp-open {
    width: 260px;
    min-width: 260px;
    border-left-width: 1px;
  }
  .ddp-inner {
    width: 260px;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  .ddp-close {
    position: absolute;
    top: 12px; right: 12px;
    width: 24px; height: 24px;
    border-radius: 6px;
    background: var(--surface2);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); z-index: 2;
    transition: color 0.15s, border-color 0.15s;
  }
  .ddp-close:hover { color: var(--text); border-color: var(--text-muted); }
  .ddp-scroll {
    flex: 1; overflow-y: auto; padding: 14px 14px 24px;
    scrollbar-width: none;
  }
  .ddp-scroll::-webkit-scrollbar { width: 0; }
  .ddp-cover {
    width: 100%; aspect-ratio: 2/3; border-radius: 9px;
    overflow: hidden; background: var(--surface2);
    margin-bottom: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }
  .ddp-cover img { width: 100%; height: 100%; object-fit: cover; }
  .ddp-title { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.25; letter-spacing: -0.02em; margin-bottom: 2px; }
  .ddp-author { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
  .ddp-year { font-size: 10px; color: var(--text-muted); opacity: 0.6; margin-bottom: 9px; }
  .ddp-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 100px; font-size: 10px; font-weight: 500;
    background: rgba(201,113,74,0.15); color: var(--accent); margin-bottom: 12px;
  }
  .ddp-badge-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
  .ddp-meta {
    display: grid; grid-template-columns: 1fr 1fr; gap: 7px;
    background: var(--surface2); border-radius: 7px;
    padding: 8px 9px; margin-bottom: 12px;
  }
  .ddp-meta-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 2px; font-weight: 600; opacity: 0.6; }
  .ddp-meta-val { font-size: 11px; font-weight: 600; color: var(--text-muted); }
  .ddp-progress-wrap { margin-bottom: 12px; }
  .ddp-progress-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-bottom: 5px; }
  .ddp-progress-meta span:last-child { color: var(--accent); }
  .ddp-bar-bg { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .ddp-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }
  .ddp-sum-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; opacity: 0.5; }
  .ddp-sum-text { font-size: 11px; color: var(--text-muted); line-height: 1.65; margin-bottom: 14px; }
  .ddp-primary {
    width: 100%; padding: 9px; background: var(--accent); border: none;
    border-radius: 7px; color: #fff; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit; display: flex;
    align-items: center; justify-content: center; gap: 5px;
    margin-bottom: 5px; transition: opacity 0.15s;
  }
  .ddp-primary:hover { opacity: 0.88; }
  .ddp-secondary {
    width: 100%; padding: 9px; background: transparent;
    border: 1.5px solid var(--border); border-radius: 7px;
    color: var(--text-muted); font-size: 12px; cursor: pointer;
    font-family: inherit; display: flex; align-items: center;
    justify-content: center; gap: 5px;
    transition: border-color 0.15s, color 0.15s;
  }
  .ddp-secondary:hover { border-color: var(--text-muted); color: var(--text); }

  /* book card desktop hover */
  .book-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.4);
  }
  .book-card.ddp-selected {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  #bookGrid.grid-narrow {
    grid-template-columns: repeat(4, 1fr) !important;
  }
}
  `;
  document.head.appendChild(style);


  // ─────────────────────────────────────────────
  // 2. INJECT HTML
  // ─────────────────────────────────────────────

  // ── 2a. Sidebar nav section (Lists + Authors + Sort row) ──
  // Inserted at the end of .toolbar, after the filter tabs and sort button
  const toolbar = document.querySelector('.toolbar');
  if (toolbar) {
    toolbar.insertAdjacentHTML('beforeend', `
      <div class="dsb-nav-section" id="dsbNavSection">
        <div class="dsb-divider"></div>
        <div class="dsb-nav-item" id="dsbNavLists">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          my lists
          <span class="dsb-nav-count" id="dsbListsCount"></span>
        </div>
        <div class="dsb-nav-item" id="dsbNavAuthors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          authors
          <span class="dsb-nav-count" id="dsbAuthorsCount"></span>
        </div>
        <div class="dsb-sort-row" id="dsbSortRow">
          <span class="dsb-sort-icon">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
          </span>
          <span class="dsb-sort-val" id="dsbSortVal">recently added</span>
          <span class="dsb-sort-arrow">▾</span>
        </div>
      </div>
    `);
  }

  // ── 2b. Sidebar bottom (share + profile) ──
  // Inserted at end of .header
  const header = document.querySelector('.header');
  if (header) {
    header.insertAdjacentHTML('beforeend', `
      <div class="dsb-bottom" id="dsbBottom">
        <div class="dsb-divider"></div>
        <div class="dsb-share-wrap">
          <button class="dsb-share-btn" id="dsbShareBtn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            share my shelf
          </button>
          <div class="dsb-share-pop" id="dsbSharePop" style="display:none">
            <div class="dsb-share-pop-label">public shelf link</div>
            <div class="dsb-share-url-row">
              <span class="dsb-share-url" id="dsbShareUrl">set a name in profile first</span>
              <button class="dsb-share-copy" id="dsbShareCopy" aria-label="Copy link">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
            <div class="dsb-share-toggle-row">
              <span class="dsb-share-toggle-label">shelf is public</span>
              <button class="share-toggle" id="dsbShareToggle" aria-label="Toggle shelf public">
                <div class="share-toggle-knob"></div>
              </button>
            </div>
          </div>
        </div>
        <div class="dsb-divider"></div>
        <div class="dsb-profile-row" id="dsbProfileRow">
          <div class="profile-avatar" id="dsbProfileAvatar" style="width:28px;height:28px;font-size:10px">?</div>
          <span class="dsb-profile-email" id="dsbProfileEmail">—</span>
        </div>
      </div>
    `);
  }

  // ── 2c. Desktop detail panel ──
  // Inserted as last child of #app (sibling of .app-screen)
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.insertAdjacentHTML('beforeend', `
      <aside class="desk-detail-panel" id="deskDetailPanel">
        <div class="ddp-inner">
          <button class="ddp-close" id="ddpClose" aria-label="Close detail panel">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="ddp-scroll">
            <div class="ddp-cover" id="ddpCover"></div>
            <div class="ddp-title" id="ddpTitle"></div>
            <div class="ddp-author" id="ddpAuthor"></div>
            <div class="ddp-year" id="ddpYear"></div>
            <div class="ddp-badge" id="ddpBadge"><span class="ddp-badge-dot"></span><span id="ddpBadgeLabel"></span></div>
            <div class="ddp-meta" id="ddpMeta">
              <div><div class="ddp-meta-label">Genre</div><div class="ddp-meta-val" id="ddpGenre">—</div></div>
              <div><div class="ddp-meta-label">Pages</div><div class="ddp-meta-val" id="ddpPages">—</div></div>
            </div>
            <div class="ddp-progress-wrap" id="ddpProgressWrap" style="display:none">
              <div class="ddp-progress-meta"><span id="ddpProgressPages"></span><span id="ddpProgressPct"></span></div>
              <div class="ddp-bar-bg"><div class="ddp-bar-fill" id="ddpBarFill"></div></div>
            </div>
            <div class="ddp-sum-label">summary</div>
            <p class="ddp-sum-text" id="ddpSummary">—</p>
            <button class="ddp-primary" id="ddpPrimary"></button>
            <button class="ddp-secondary" id="ddpSecondary"></button>
          </div>
        </div>
      </aside>
    `);
  }

  // ── 2d. Hamburger + backdrop ──
  document.body.insertAdjacentHTML('beforeend', `
    <button class="desk-hamburger" id="deskHamburger" aria-label="Open navigation" aria-expanded="false">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div id="dsbBackdrop" class="dsb-backdrop"></div>
  `);


  // ─────────────────────────────────────────────
  // 3. LOGIC
  // ─────────────────────────────────────────────

  const isDesktopLayout = () => window.innerWidth >= 768;

  // ── 3a. Hamburger (tablet) ──
  function openSidebar() {
    const header = document.querySelector('.header');
    const backdrop = document.getElementById('dsbBackdrop');
    const hamburger = document.getElementById('deskHamburger');
    if (header) header.classList.add('dsb-open');
    if (backdrop) backdrop.classList.add('open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    const header = document.querySelector('.header');
    const backdrop = document.getElementById('dsbBackdrop');
    const hamburger = document.getElementById('deskHamburger');
    if (header) header.classList.remove('dsb-open');
    if (backdrop) backdrop.classList.remove('open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', e => {
    const hamburger = document.getElementById('deskHamburger');
    const backdrop = document.getElementById('dsbBackdrop');
    if (hamburger && hamburger.contains(e.target)) {
      const header = document.querySelector('.header');
      header && header.classList.contains('dsb-open') ? closeSidebar() : openSidebar();
      return;
    }
    if (backdrop && backdrop.contains(e.target)) { closeSidebar(); return; }
  });

  // ── 3b. Desktop sidebar: sort row cycles sort ──
  document.addEventListener('click', e => {
    const sortRow = document.getElementById('dsbSortRow');
    if (!sortRow || !sortRow.contains(e.target)) return;
    const sorts = ['recently added', 'title (a–z)', 'author (a–z)'];
    const sortMap = { 'recently added': 'recent', 'title (a–z)': 'title', 'author (a–z)': 'author' };
    const valEl = document.getElementById('dsbSortVal');
    if (!valEl) return;
    const cur = valEl.textContent.trim();
    const idx = sorts.indexOf(cur);
    const next = sorts[(idx + 1) % sorts.length];
    valEl.textContent = next;
    if (typeof window.setSort === 'function') window.setSort(sortMap[next]);
  });

  // ── 3c. Sidebar nav: Lists + Authors ──
  window.dsbNavTo = function (view) {
    document.querySelectorAll('.dsb-nav-item').forEach(i => i.classList.remove('active'));
    if (view === 'lists') {
      document.getElementById('dsbNavLists')?.classList.add('active');
      if (typeof window.openListsOverlay === 'function') window.openListsOverlay();
    } else if (view === 'authors') {
      document.getElementById('dsbNavAuthors')?.classList.add('active');
      if (typeof window.openAuthorsOverlay === 'function') window.openAuthorsOverlay();
    }
  };

  document.addEventListener('click', e => {
    if (e.target.closest('#dsbNavLists')) { e.stopPropagation(); window.dsbNavTo('lists'); }
    if (e.target.closest('#dsbNavAuthors')) { e.stopPropagation(); window.dsbNavTo('authors'); }
  });

  // ── 3d. Share popover ──
  document.addEventListener('click', e => {
    const btn = document.getElementById('dsbShareBtn');
    const pop = document.getElementById('dsbSharePop');
    if (!btn || !pop) return;
    if (btn.contains(e.target)) {
      e.stopPropagation();
      pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
      return;
    }
    if (!pop.contains(e.target)) pop.style.display = 'none';
  });

  document.getElementById('dsbShareCopy')?.addEventListener('click', e => {
    e.stopPropagation();
    if (typeof window.copyShelfLink === 'function') window.copyShelfLink();
  });

  document.getElementById('dsbShareToggle')?.addEventListener('click', e => {
    e.stopPropagation();
    if (typeof window.toggleShelfPublic === 'function') window.toggleShelfPublic();
  });

  // ── 3e. Profile row → open profile modal ──
  document.addEventListener('click', e => {
    if (e.target.closest('#dsbProfileRow')) {
      if (typeof window.openProfileModal === 'function') window.openProfileModal();
    }
  });

  // ── 3f. Sync desktop sidebar with app state ──
  window.dsbSyncProfile = function () {
    // guard — only run if app state is ready
    if (typeof window.currentUser === 'undefined') return;

    const email = window.currentUser?.email || '—';
    const initials = typeof window.getUserInitials === 'function'
      ? window.getUserInitials(email) : (email[0] || '?').toUpperCase();

    const avatarEl = document.getElementById('dsbProfileAvatar');
    const emailEl  = document.getElementById('dsbProfileEmail');
    if (avatarEl) avatarEl.textContent = initials;
    if (emailEl)  emailEl.textContent  = email;

    // counts
    const lists = typeof window._getLoLists === 'function' ? window._getLoLists() : [];
    const listCountEl = document.getElementById('dsbListsCount');
    if (listCountEl) listCountEl.textContent = lists.length || '';

    const booksArr = window.books || [];
    const authorsCountEl = document.getElementById('dsbAuthorsCount');
    if (authorsCountEl) {
      const n = new Set(
        booksArr.filter(b => b.status !== 'not-owned' && b.author).map(b => b.author.trim())
      ).size;
      authorsCountEl.textContent = n || '';
    }

    // share URL
    const profile = window.userProfile;
    const urlEl   = document.getElementById('dsbShareUrl');
    const toggle  = document.getElementById('dsbShareToggle');
    if (urlEl) {
      if (profile?.shelf_slug) {
        urlEl.textContent = `${location.origin}${location.pathname}?shelf=${profile.shelf_slug}`;
      } else {
        urlEl.textContent = 'set a name in profile first';
      }
    }
    if (toggle) toggle.classList.toggle('on', !!profile?.shelf_public);
  };

  // Patch app.js functions to also call dsbSyncProfile after they run
  // We wait for load so app.js functions are defined first
  window.addEventListener('load', () => {
    // Patch loadProfile
    const _origLoadProfile = window.loadProfile;
    if (_origLoadProfile) {
      window.loadProfile = async function (...args) {
        const result = await _origLoadProfile.apply(this, args);
        window.dsbSyncProfile();
        return result;
      };
    }

    // Patch renderGrid
    const _origRenderGrid = window.renderGrid;
    if (_origRenderGrid) {
      window.renderGrid = function (...args) {
        _origRenderGrid.apply(this, args);
        window.dsbSyncProfile();
      };
    }

    // Patch loLoadLists
    const _origLoLoadLists = window.loLoadLists;
    if (_origLoLoadLists) {
      window.loLoadLists = async function (...args) {
        const result = await _origLoLoadLists.apply(this, args);
        window.dsbSyncProfile();
        return result;
      };
    }

    // ── 3g. Desktop detail panel logic ──
    const panel    = document.getElementById('deskDetailPanel');
    const closeBtn = document.getElementById('ddpClose');
    const bookGrid = document.getElementById('bookGrid');

    let ddpSelectedId = null;

    function openDDP(book) {
      if (!panel || !isDesktopLayout()) return;
      ddpSelectedId = book.id;

      // cover
      const coverEl = document.getElementById('ddpCover');
      if (coverEl) {
        coverEl.innerHTML = book.cover_url
          ? `<img src="${book.cover_url.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" alt="">`
          : (typeof window.makePlaceholder === 'function' ? window.makePlaceholder(book, 22) : '');
      }

      const safe = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const el   = id => document.getElementById(id);

      if (el('ddpTitle'))       el('ddpTitle').textContent  = book.title  || '—';
      if (el('ddpAuthor'))      el('ddpAuthor').textContent = book.author || '—';
      if (el('ddpYear'))        el('ddpYear').textContent   = [book.year, book.publisher].filter(Boolean).join(' · ') || '';
      if (el('ddpBadgeLabel'))  el('ddpBadgeLabel').textContent = { reading: 'Reading', read: 'Read', unread: 'Unread', 'not-owned': 'Not owned' }[book.status] || book.status || '';
      if (el('ddpGenre'))       el('ddpGenre').textContent  = book.genre      || '—';
      if (el('ddpPages'))       el('ddpPages').textContent  = book.page_count ? book.page_count + ' pg' : '—';

      // progress
      const pw = el('ddpProgressWrap');
      if (pw) {
        if (book.status === 'reading' && book.total_pages > 0) {
          const pct = Math.round((book.pages_read || 0) / book.total_pages * 100);
          if (el('ddpProgressPages')) el('ddpProgressPages').textContent = `${book.pages_read || 0} / ${book.total_pages} pages`;
          if (el('ddpProgressPct'))   el('ddpProgressPct').textContent   = pct + '%';
          if (el('ddpBarFill'))       el('ddpBarFill').style.width        = pct + '%';
          pw.style.display = '';
        } else {
          pw.style.display = 'none';
        }
      }

      // summary
      if (el('ddpSummary')) el('ddpSummary').textContent = book.description || book.ai_summary || '—';

      // CTAs
      const statusNext = { reading: ['read',    'Mark as read'],      unread: ['reading', 'Start reading'],  read: ['reading', 'Re-read']      };
      const statusSec  = { reading: ['unread',  'Move to unread'],    unread: ['read',    'Mark as read'],   read: ['unread',  'Move to unread'] };
      const [pStatus, pLabel] = statusNext[book.status] || ['reading', 'Start reading'];
      const [sStatus, sLabel] = statusSec[book.status]  || ['unread',  'Move to unread'];
      const primary   = el('ddpPrimary');
      const secondary = el('ddpSecondary');
      if (primary)   { primary.textContent   = pLabel; primary.onclick   = () => ddpSetStatus(book.id, pStatus); }
      if (secondary) { secondary.textContent = sLabel; secondary.onclick = () => ddpSetStatus(book.id, sStatus); }

      panel.classList.add('ddp-open');
      if (bookGrid) bookGrid.classList.add('grid-narrow');

      // highlight selected card
      if (bookGrid) {
        bookGrid.querySelectorAll('.book-card').forEach(c => c.classList.remove('ddp-selected'));
        const card = bookGrid.querySelector(`.book-card[data-id="${book.id}"]`);
        if (card) card.classList.add('ddp-selected');
      }
    }

    function closeDDP() {
      if (!panel) return;
      panel.classList.remove('ddp-open');
      if (bookGrid) bookGrid.classList.remove('grid-narrow');
      if (bookGrid) bookGrid.querySelectorAll('.book-card').forEach(c => c.classList.remove('ddp-selected'));
      ddpSelectedId = null;
    }

    async function ddpSetStatus(id, status) {
      const booksArr = window.books || [];
      const book = booksArr.find(b => String(b.id) === String(id));
      if (!book) return;
      book.status = status;
      if (typeof window.renderGrid === 'function') window.renderGrid();
      if (typeof window.dbUpdate === 'function') await window.dbUpdate(id, { status });
      if (typeof window.showToast === 'function') window.showToast('Status updated ✓');
      openDDP(book); // refresh panel CTAs
    }

    if (closeBtn) closeBtn.addEventListener('click', closeDDP);

    // Keyboard: Escape closes panel
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeDDP(); closeSidebar(); }
    });

    // Book grid click → open detail panel (event delegation, survives every renderGrid call)
    if (bookGrid) {
      bookGrid.addEventListener('click', e => {
        if (!isDesktopLayout()) return;
        const card = e.target.closest('.book-card');
        if (!card) return;
        e.stopPropagation();
        const booksArr = window.books || [];
        const book = booksArr.find(b => String(b.id) === String(card.dataset.id));
        if (book) openDDP(book);
      }, true);

      bookGrid.addEventListener('contextmenu', e => {
        if (!isDesktopLayout()) return;
        e.preventDefault();
        const card = e.target.closest('.book-card');
        if (!card) return;
        if (typeof window.openQuickMenu === 'function') window.openQuickMenu(card.dataset.id, card);
      });
    }

    // Override openDetailModal so desktop click goes to panel instead of bottom sheet
    const _origOpenDetailModal = window.openDetailModal;
    window.openDetailModal = function (id) {
      if (isDesktopLayout()) {
        const booksArr = window.books || [];
        const book = booksArr.find(b => String(b.id) === String(id));
        if (book) { openDDP(book); return; }
      }
      if (_origOpenDetailModal) _origOpenDetailModal.call(this, id);
    };

    // Resize: clean up if viewport drops below tablet breakpoint
    window.addEventListener('resize', () => {
      if (!isDesktopLayout()) { closeDDP(); closeSidebar(); }
    });

    // Initial sync
    window.dsbSyncProfile();
  });

})();
