/**
 * desktop.js — Tsundoku desktop layer
 * Injects all desktop HTML, CSS, and interaction logic.
 * Mobile files (app.html, styles.css, app.js) are never touched.
 */
(function () {

  // ─────────────────────────────────────────────
  // 1. CSS
  // ─────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `

/* ── Hide mobile-only elements on desktop ── */
@media (min-width: 768px) {
  .hint-bar { display: none; }
  .divider  { display: none; }
}

/* ── Desktop shell: sidebar always visible, never overlaid ── */
@media (min-width: 768px) {
  #app {
    flex-direction: row !important;
    height: 100dvh;
    overflow: hidden;
  }
  .app-screen {
    flex-direction: row !important;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  /* Sidebar: always sticky, never moves */
  .header {
    width: 200px;
    min-width: 200px;
    flex-shrink: 0;
    height: 100dvh;
    border-right: 1px solid var(--border);
    border-bottom: none !important;
    display: flex !important;
    flex-direction: column;
    padding: max(var(--safe-top), 24px) 0 max(var(--safe-bottom), 20px);
    background: var(--surface);
    position: sticky;
    top: 0;
    overflow: hidden;
    z-index: 10;
    /* NEVER let anything slide over it */
    isolation: isolate;
  }
  .header-top {
    padding: 0 16px;
    margin-bottom: 20px;
  }
  .header-top .profile-avatar { display: none; }

  /* All sidebar nav items unified */
  .toolbar {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 2px !important;
    padding: 0 8px !important;
    margin-bottom: 0 !important;
    flex: 0 0 auto !important;
    overflow: visible !important;
  }
  .filter-tabs {
    flex-direction: column !important;
    gap: 2px !important;
    overflow: visible !important;
    width: auto !important;
  }
  .tab-btn {
    border-radius: 8px !important;
    justify-content: flex-start !important;
    padding: 8px 10px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    border-color: transparent !important;
    background: transparent !important;
    color: var(--text-muted) !important;
    min-height: 0 !important;
    height: 36px !important;
    transition: background 0.12s, color 0.12s !important;
  }
  .tab-btn:hover {
    background: rgba(255,255,255,0.04) !important;
    color: var(--text-dim) !important;
  }
  .tab-btn.active {
    background: rgba(201,113,74,0.10) !important;
    border-color: transparent !important;
    color: var(--accent) !important;
  }
  .tab-count {
    margin-left: auto !important;
    font-size: 10px !important;
    font-weight: 500 !important;
    background: transparent !important;
    border-radius: 100px !important;
    padding: 0 !important;
    opacity: 0.5 !important;
    color: inherit !important;
  }
  .tab-btn.active .tab-count {
    color: var(--accent) !important;
    opacity: 0.7 !important;
  }
  #sortToggleBtn { display: none !important; }

  /* Main content area */
  .grid-container {
    flex: 1;
    min-width: 0;
    padding-left: 16px;
    padding-right: 16px;
    overflow-y: auto;
    height: 100dvh;
  }
  .floating-bar {
    left: 216px;
    right: 16px;
  }

  /* Book grid */
  .book-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
  }

  /* ── Force all full-screen overlays to respect sidebar ──
     Any overlay opened by app.js must sit to the right of the sidebar */
  .lo-overlay,
  #listsOverlay,
  #authorsOverlay,
  #loScreen,
  .screen-overlay,
  [id$="Overlay"]:not(#addModalOverlay):not(#dsbSharePop) {
    left: 200px !important;
  }
}

@media (min-width: 1024px) {
  .header { width: 216px; min-width: 216px; }
  .book-grid { grid-template-columns: repeat(7, 1fr); }
  .floating-bar { left: 232px; }
  [id$="Overlay"]:not(#addModalOverlay):not(#dsbSharePop) {
    left: 216px !important;
  }
}

@media (min-width: 1280px) {
  .header { width: 216px; min-width: 216px; }
  .book-grid { grid-template-columns: repeat(8, 1fr); }
  .floating-bar { left: 232px; }
}

@media (min-width: 1600px) {
  .book-grid { grid-template-columns: repeat(9, 1fr); }
}

/* ── Sidebar nav extras ── */
.dsb-nav-section,
.dsb-bottom { display: none; }

@media (min-width: 768px) {
  .dsb-nav-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
    margin-top: 2px;
  }
  .dsb-bottom {
    display: flex;
    flex-direction: column;
    margin-top: auto;
    padding: 0 8px;
    flex-shrink: 0;
  }
  .dsb-divider {
    height: 1px;
    background: var(--border);
    margin: 6px 4px;
    flex-shrink: 0;
    opacity: 0.6;
  }

  .dsb-nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    border: none;
    background: none;
    font-family: 'DM Sans', sans-serif;
    user-select: none;
    -webkit-user-select: none;
    height: 36px;
    min-height: 0;
  }
  .dsb-nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text-dim); }
  .dsb-nav-item.active { color: var(--accent); background: rgba(201,113,74,0.10); }
  .dsb-nav-count {
    margin-left: auto;
    font-size: 10px;
    font-weight: 500;
    color: inherit;
    opacity: 0.5;
  }
  .dsb-nav-item.active .dsb-nav-count { color: var(--accent); opacity: 0.7; }

  /* Sort row */
  .dsb-sort-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.12s;
    height: 36px;
  }
  .dsb-sort-row:hover { background: rgba(255,255,255,0.04); }
  .dsb-sort-row:hover .dsb-sort-val { color: var(--text-dim); }
  .dsb-sort-icon { color: var(--text-muted); flex-shrink: 0; display: flex; opacity: 0.6; }
  .dsb-sort-val {
    font-size: 12px;
    color: var(--text-muted);
    transition: color 0.12s;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dsb-sort-arrow { margin-left: auto; color: var(--text-muted); font-size: 10px; opacity: 0.5; flex-shrink: 0; }

  /* Share */
  .dsb-share-wrap { position: relative; }
  .dsb-share-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border-radius: 8px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    user-select: none;
    -webkit-user-select: none;
    height: 34px;
  }
  .dsb-share-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-dim); }
  .dsb-share-pop {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 4px;
    right: 4px;
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
    opacity: 0.6;
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
    width: 20px; height: 20px;
    border-radius: 5px;
    background: var(--border);
    border: none;
    cursor: pointer;
    color: var(--text-dim);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s;
  }
  .dsb-share-copy:hover { background: var(--text-muted); color: var(--text); }
  .dsb-share-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dsb-share-toggle-label { font-size: 11px; color: var(--text-muted); }

  /* Profile row — no modal, just display */
  .dsb-profile-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
  }
  #dsbProfileAvatar {
    width: 26px !important;
    height: 26px !important;
    font-size: 11px !important;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dsb-profile-email {
    font-size: 11px;
    color: var(--text-muted);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }
}

/* ── Tablet hamburger — only below 768px ── */
.desk-hamburger,
.dsb-backdrop { display: none !important; }

/* ── Desktop detail panel ── */
.desk-detail-panel { display: none; }

@media (min-width: 768px) {
  /* Hide mobile bottom-sheet detail modal */
  #detailModal { display: none !important; }

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
      width 0.26s cubic-bezier(0.32,0.72,0,1),
      min-width 0.26s cubic-bezier(0.32,0.72,0,1),
      border-left-width 0.1s;
    height: 100dvh;
    position: sticky;
    top: 0;
  }
  .desk-detail-panel.ddp-open {
    width: 288px;
    min-width: 288px;
    border-left-width: 1px;
  }

  .ddp-inner {
    width: 288px;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .ddp-close {
    position: absolute;
    top: 14px; right: 14px;
    width: 26px; height: 26px;
    border-radius: 7px;
    background: var(--surface2);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); z-index: 2;
    transition: color 0.12s, border-color 0.12s;
  }
  .ddp-close:hover { color: var(--text); border-color: var(--text-muted); }

  .ddp-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px 16px 28px;
    scrollbar-width: none;
  }
  .ddp-scroll::-webkit-scrollbar { width: 0; }

  .ddp-cover {
    width: 100%;
    aspect-ratio: 2/3;
    border-radius: 10px;
    overflow: hidden;
    background: var(--surface2);
    margin-bottom: 14px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3);
  }
  .ddp-cover img { width: 100%; height: 100%; object-fit: cover; }

  .ddp-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.3;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }
  .ddp-author {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 2px;
    cursor: pointer;
    transition: color 0.12s;
  }
  .ddp-author:hover { color: var(--accent); }
  .ddp-year {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.5;
    margin-bottom: 12px;
  }

  .ddp-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 500;
    background: rgba(201,113,74,0.12);
    color: var(--accent);
    margin-bottom: 16px;
    letter-spacing: 0.01em;
  }
  .ddp-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

  .ddp-meta {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  .ddp-meta > div { display: flex; flex-direction: column; gap: 3px; }
  .ddp-meta-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    font-weight: 600;
    opacity: 0.5;
  }
  .ddp-meta-val { font-size: 12px; font-weight: 500; color: var(--text-dim); }

  .ddp-progress-wrap { margin-bottom: 16px; }
  .ddp-progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .ddp-progress-meta span:last-child { color: var(--accent); font-weight: 500; }
  .ddp-bar-bg { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .ddp-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }

  .ddp-sum-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 6px;
    opacity: 0.5;
  }
  .ddp-sum-text {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.7;
    margin-bottom: 20px;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ddp-primary {
    width: 100%;
    padding: 11px;
    background: var(--accent);
    border: none;
    border-radius: 100px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin-bottom: 7px;
    transition: opacity 0.15s;
    box-shadow: 0 4px 16px rgba(201,113,74,0.3);
    letter-spacing: -0.01em;
  }
  .ddp-primary:hover { opacity: 0.88; }
  .ddp-primary:active { opacity: 0.75; }

  .ddp-secondary {
    width: 100%;
    padding: 11px;
    background: transparent;
    border: 1.5px solid var(--border);
    border-radius: 100px;
    color: var(--text-muted);
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: border-color 0.12s, color 0.12s;
    letter-spacing: -0.01em;
  }
  .ddp-secondary:hover { border-color: var(--text-muted); color: var(--text); }

  /* Hover effect — desktop pointer only */
  @media (hover: hover) and (pointer: fine) {
    .book-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.45);
    }
  }

  .book-card.ddp-selected {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 9px;
  }

  /* Grid narrows when panel opens */
  #bookGrid.grid-narrow {
    grid-template-columns: repeat(4, 1fr) !important;
  }
  #bookGrid.grid-narrow .book-card,
  #bookGrid.grid-narrow .book-card * {
    animation: none !important;
  }
}

@media (min-width: 1024px) {
  #bookGrid.grid-narrow { grid-template-columns: repeat(5, 1fr) !important; }
}

@media (min-width: 1280px) {
  #bookGrid.grid-narrow { grid-template-columns: repeat(6, 1fr) !important; }
}

@media (min-width: 1600px) {
  #bookGrid.grid-narrow { grid-template-columns: repeat(7, 1fr) !important; }
}
  `;
  document.head.appendChild(style);


  // ─────────────────────────────────────────────
  // 2. INJECT HTML
  // ─────────────────────────────────────────────

  // ── 2a. Sidebar nav section ──
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

  // ── 2c. Desktop detail panel — sibling of .app-screen, inside #app ──
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


  // ─────────────────────────────────────────────
  // 3. LOGIC
  // ─────────────────────────────────────────────

  const isDesktop = () => window.innerWidth >= 768;

  // ── 3a. Sort row cycles sort ──
  document.addEventListener('click', e => {
    const sortRow = document.getElementById('dsbSortRow');
    if (!sortRow || !sortRow.contains(e.target)) return;
    const sorts = ['recently added', 'title (a–z)', 'author (a–z)'];
    const sortMap = { 'recently added': 'recent', 'title (a–z)': 'title', 'author (a–z)': 'author' };
    const valEl = document.getElementById('dsbSortVal');
    if (!valEl) return;
    const cur = valEl.textContent.trim();
    const next = sorts[(sorts.indexOf(cur) + 1) % sorts.length];
    valEl.textContent = next;
    if (typeof window.setSort === 'function') window.setSort(sortMap[next]);
  });

  // ── 3b. Sidebar nav: Lists + Authors
  //    On desktop: open the overlay but it will be offset right of the sidebar via CSS.
  //    The overlay CSS rule `left: 200px` ensures sidebar stays visible.
  document.addEventListener('click', e => {
    if (e.target.closest('#dsbNavLists')) {
      e.stopPropagation();
      document.querySelectorAll('.dsb-nav-item').forEach(i => i.classList.remove('active'));
      document.getElementById('dsbNavLists')?.classList.add('active');
      if (typeof window.openListsOverlay === 'function') window.openListsOverlay();
    }
    if (e.target.closest('#dsbNavAuthors')) {
      e.stopPropagation();
      document.querySelectorAll('.dsb-nav-item').forEach(i => i.classList.remove('active'));
      document.getElementById('dsbNavAuthors')?.classList.add('active');
      if (typeof window.openAuthorsOverlay === 'function') window.openAuthorsOverlay();
    }
  });

  // Deactivate nav item when overlays close — patch close functions after load
  window.addEventListener('load', () => {
    ['closeListsOverlay', 'closeAuthorsOverlay', 'loClose'].forEach(fnName => {
      const orig = window[fnName];
      if (typeof orig === 'function') {
        window[fnName] = function (...args) {
          document.querySelectorAll('.dsb-nav-item').forEach(i => i.classList.remove('active'));
          return orig.apply(this, args);
        };
      }
    });
  });

  // ── 3c. Share popover ──
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

  // ── 3d. Profile row — NO modal on desktop, it's just a display row ──
  // (clicking does nothing; profile management is handled via mobile sheet on mobile only)

  // ── 3e. Sync sidebar state ──
  window.dsbSyncProfile = function () {
    if (typeof window.currentUser === 'undefined') return;

    const email = window.currentUser?.email || '—';
    const initials = typeof window.getUserInitials === 'function'
      ? window.getUserInitials(email) : (email[0] || '?').toUpperCase();

    const avatarEl = document.getElementById('dsbProfileAvatar');
    const emailEl  = document.getElementById('dsbProfileEmail');
    if (avatarEl) avatarEl.textContent = initials;
    if (emailEl)  emailEl.textContent  = email;

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

    const profile = window.userProfile;
    const urlEl   = document.getElementById('dsbShareUrl');
    const toggle  = document.getElementById('dsbShareToggle');
    if (urlEl) {
      urlEl.textContent = profile?.shelf_slug
        ? `${location.origin}${location.pathname}?shelf=${profile.shelf_slug}`
        : 'set a name in profile first';
    }
    if (toggle) toggle.classList.toggle('on', !!profile?.shelf_public);
  };

  window.addEventListener('load', () => {
    // Patch loadProfile
    const _origLoadProfile = window.loadProfile;
    if (typeof _origLoadProfile === 'function') {
      window.loadProfile = async function (...args) {
        const result = await _origLoadProfile.apply(this, args);
        window.dsbSyncProfile();
        return result;
      };
    }

    // Patch renderGrid
    const _origRenderGrid = window.renderGrid;
    if (typeof _origRenderGrid === 'function') {
      window.renderGrid = function (...args) {
        _origRenderGrid.apply(this, args);
        window.dsbSyncProfile();
      };
    }

    // Patch loLoadLists
    const _origLoLoadLists = window.loLoadLists;
    if (typeof _origLoLoadLists === 'function') {
      window.loLoadLists = async function (...args) {
        const result = await _origLoLoadLists.apply(this, args);
        window.dsbSyncProfile();
        return result;
      };
    }
  });

  // ── 3f. Desktop detail panel ──
  let panel, closeBtn, bookGrid;
  let ddpSelectedId = null;

  function openDDP(book) {
    if (!panel || !isDesktop()) return;
    ddpSelectedId = book.id;

    const coverEl = document.getElementById('ddpCover');
    if (coverEl) {
      coverEl.innerHTML = book.cover_url
        ? `<img src="${book.cover_url}" alt="">`
        : (typeof window.makePlaceholder === 'function' ? window.makePlaceholder(book, 22) : '');
    }

    const el = id => document.getElementById(id);

    if (el('ddpTitle'))      el('ddpTitle').textContent  = book.title  || '—';
    if (el('ddpAuthor'))     el('ddpAuthor').textContent = book.author || '—';
    if (el('ddpYear'))       el('ddpYear').textContent   = [book.year, book.publisher].filter(Boolean).join(' · ') || '';
    if (el('ddpBadgeLabel')) el('ddpBadgeLabel').textContent = {
      reading: 'Reading', read: 'Read', unread: 'Unread', 'not-owned': 'Not owned'
    }[book.status] || book.status || '';
    if (el('ddpGenre'))  el('ddpGenre').textContent  = book.genre      || '—';
    if (el('ddpPages'))  el('ddpPages').textContent  = book.page_count ? book.page_count + ' pg' : '—';

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

    if (el('ddpSummary')) el('ddpSummary').textContent = book.description || book.ai_summary || '—';

    const statusNext = {
      reading: ['read',   'Mark as read'],
      unread:  ['reading','Start reading'],
      read:    ['reading','Re-read']
    };
    const statusSec = {
      reading: ['unread', 'Move to unread'],
      unread:  ['read',   'Mark as read'],
      read:    ['unread', 'Move to unread']
    };
    const [pStatus, pLabel] = statusNext[book.status] || ['reading', 'Start reading'];
    const [sStatus, sLabel] = statusSec[book.status]  || ['unread',  'Move to unread'];

    const primary   = el('ddpPrimary');
    const secondary = el('ddpSecondary');
    if (primary)   { primary.textContent   = pLabel; primary.onclick   = () => ddpSetStatus(book.id, pStatus); }
    if (secondary) { secondary.textContent = sLabel; secondary.onclick = () => ddpSetStatus(book.id, sStatus); }

    panel.classList.add('ddp-open');
    if (bookGrid) bookGrid.classList.add('grid-narrow');

    // Highlight selected card
    document.querySelectorAll('.book-card').forEach(c => c.classList.remove('ddp-selected'));
    const card = bookGrid?.querySelector(`.book-card[data-id="${book.id}"]`);
    if (card) card.classList.add('ddp-selected');
  }

  function closeDDP() {
    if (!panel) return;
    panel.classList.remove('ddp-open');
    if (bookGrid) bookGrid.classList.remove('grid-narrow');
    document.querySelectorAll('.book-card').forEach(c => c.classList.remove('ddp-selected'));
    ddpSelectedId = null;
  }

  async function ddpSetStatus(id, status) {
    const book = (window.books || []).find(b => String(b.id) === String(id));
    if (!book) return;
    book.status = status;
    if (typeof window.renderGrid === 'function') window.renderGrid();
    if (typeof window.dbUpdate  === 'function') await window.dbUpdate(id, { status });
    if (typeof window.showToast === 'function') window.showToast('Status updated ✓');
    openDDP(book);
  }

  document.addEventListener('DOMContentLoaded', () => {
    panel    = document.getElementById('deskDetailPanel');
    closeBtn = document.getElementById('ddpClose');
    bookGrid = document.getElementById('bookGrid');

    if (closeBtn) closeBtn.addEventListener('click', closeDDP);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDDP();
    });

    if (bookGrid) {
      bookGrid.addEventListener('click', e => {
        if (!isDesktop()) return;
        const card = e.target.closest('.book-card');
        if (!card) return;
        if (e.target.closest('button, a, [role="button"]')) return;
        const book = (window.books || []).find(b => String(b.id) === String(card.dataset.id));
        if (book) openDDP(book);
      });

      bookGrid.addEventListener('contextmenu', e => {
        if (!isDesktop()) return;
        e.preventDefault();
        const card = e.target.closest('.book-card');
        if (!card) return;
        if (typeof window.openQuickMenu === 'function') window.openQuickMenu(card.dataset.id, card);
      });
    }
  });

  // Override openDetailModal globally so any code path that calls it
  // routes to the panel on desktop instead of the bottom sheet.
  // We do this immediately (not on load) so it's ready before any click.
  const _hookDetailModal = () => {
    const orig = window.openDetailModal;
    window.openDetailModal = function (id) {
      if (isDesktop()) {
        const book = (window.books || []).find(b => String(b.id) === String(id));
        if (book) { openDDP(book); return; }
      }
      if (typeof orig === 'function') orig.call(this, id);
    };
  };

  // Try immediately, and again after load in case app.js defines it late
  _hookDetailModal();
  window.addEventListener('load', _hookDetailModal);

  window.addEventListener('resize', () => {
    if (!isDesktop()) { closeDDP(); }
  });

  // Initial sync after DOM settles
  window.addEventListener('load', () => window.dsbSyncProfile());

})();
