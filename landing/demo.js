/* ═══════════ tsundoku — landing demo (proof section) ═══════════
   Additive module (classes namespaced `pf-`, no dependencies, touches no existing JS).
   Turns the two mockups into a toned-down, clickable version of the real app.
   HOSTS    <div class="pf-app"   data-pf="desktop">  window  : sidebar, shelf, lists, authors, genres
            <div class="pf-phone" data-pf="phone">    phone   : shelf only
   Whatever markup the host already contains is a no-JS fallback and is replaced on load.
   DATA     all fake, kept in memory, per host. Nothing is stored or sent anywhere.
   TRY      tabs · search · sort · cover-size slider · tap a cover (change status / progress)
            · "+ add book" (search "piranesi" — you already own it) · lists / authors / genres
*/
(() => {
'use strict';

const PALS = [['#4a2818', '#c9714a'], ['#1e2d3d', '#5a8fa8'], ['#2d3a2e', '#6a9a72'], ['#3a2040', '#9a6ac0'], ['#3d2a1e', '#c0814a'], ['#1e1e2d', '#6a72c0'],
              ['#2d1e1e', '#c06a6a'], ['#1e2d2a', '#6ac0b8'], ['#3a3020', '#b0963c'], ['#2a1e2d', '#a06ab8'], ['#1a2d20', '#6ac08a'], ['#1e1a2d', '#8a70c0']];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (r, s) => r.querySelector(s);

/* title, author, genre, pages, status (default unread), pages read */
const LIB = [
  ['The Midnight Library', 'Matt Haig', 'fantasy', 304, 'reading', 187],
  ['Babel', 'R.F. Kuang', 'fantasy', 560, 'reading', 112],
  ['Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'literary', 401, 'reading', 110],
  ['Piranesi', 'Susanna Clarke', 'fantasy', 272, 'read'],
  ['Normal People', 'Sally Rooney', 'literary', 273, 'read'],
  ['The Secret History', 'Donna Tartt', 'literary', 559, 'read'],
  ['Klara and the Sun', 'Kazuo Ishiguro', 'sci-fi', 303, 'read'],
  ['Cloud Atlas', 'David Mitchell', 'sci-fi', 509, 'read'],
  ['Outline', 'Rachel Cusk', 'literary', 249, 'read'],
  ['The Remains of the Day', 'Kazuo Ishiguro', 'literary', 258, 'read'],
  ['Circe', 'Madeline Miller', 'fantasy', 393, 'read'],
  ['Project Hail Mary', 'Andy Weir', 'sci-fi', 476, 'read'],
  ['Pachinko', 'Min Jin Lee', 'historical', 490],
  ['Demon Copperhead', 'Barbara Kingsolver', 'literary', 560],
  ['A Little Life', 'Hanya Yanagihara', 'literary', 720],
  ['Yellowface', 'R.F. Kuang', 'literary', 336],
  ['Bewilderment', 'Richard Powers', 'sci-fi', 278],
  ['The Overstory', 'Richard Powers', 'literary', 502],
  ['Shuggie Bain', 'Douglas Stuart', 'literary', 430],
  ['The Song of Achilles', 'Madeline Miller', 'historical', 378],
  ['Sapiens', 'Yuval Noah Harari', 'nonfiction', 443],
  ['Atomic Habits', 'James Clear', 'nonfiction', 320],
  ['Kafka on the Shore', 'Haruki Murakami', 'fantasy', 467],
  ['Station Eleven', 'Emily St. John Mandel', 'sci-fi', 333],
  ['The Vegetarian', 'Han Kang', 'literary', 188],
  ['Dune', 'Frank Herbert', 'sci-fi', 612],
  ['The Goldfinch', 'Donna Tartt', 'literary', 771],
  ['Never Let Me Go', 'Kazuo Ishiguro', 'sci-fi', 288],
];
/* not on the shelf yet: what "add book" can find */
const EXTRA = [
  ['Hamnet', 'Maggie O’Farrell', 'historical', 305],
  ['Giovanni’s Room', 'James Baldwin', 'literary', 169],
  ['The Bell Jar', 'Sylvia Plath', 'literary', 244],
  ['Lessons in Chemistry', 'Bonnie Garmus', 'literary', 390],
  ['Trust', 'Hernan Diaz', 'historical', 402],
  ['Convenience Store Woman', 'Sayaka Murata', 'literary', 163],
];
const LISTS = [
  ['🌙', 'dark academia', ['The Secret History', 'The Goldfinch', 'Circe', 'The Song of Achilles', 'Outline']],
  ['🔥', 'unread gems', ['Pachinko', 'A Little Life', 'Shuggie Bain', 'Station Eleven', 'Dune', 'Kafka on the Shore']],
  ['🕯️', 'comfort reads', ['Piranesi', 'Klara and the Sun', 'The Midnight Library', 'Project Hail Mary']],
  ['⭐', 'signed editions', ['Babel', 'Circe']],
];
const SORTS = [['recent', 'recently added'], ['title', 'title'], ['author', 'author']];
const CMP = [(a, b) => b.o - a.o, (a, b) => a.t.localeCompare(b.t), (a, b) => a.a.localeCompare(b.a)];
const ICO = {
  shelf:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  lists:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  authors: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  genres:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.2"/></svg>',
};
const NAV = [['shelf', 'my shelf'], ['lists', 'my lists'], ['authors', 'authors'], ['genres', 'genres']];
const STATUSES = ['reading', 'read', 'unread'];

function demo(host) {
  const phone = host.dataset.pf === 'phone';
  const tid = phone ? 'pfTp' : 'pfTd';
  let seq = 0;
  const books = LIB.map((r, i) => ({ id: 'b' + i, t: r[0], a: r[1], g: r[2], pg: r[3], st: r[4] || 'unread', p: r[5] || 0, c: PALS[(i * 5 + 3) % 12], o: ++seq }));
  const S = { view: 'shelf', tab: 'unread', q: '', sort: 0, scope: null };
  let curId = '', openerKey = '', closeT = 0, toastT = 0;

  const byId = id => books.find(b => b.id === id);
  const byTitle = t => books.find(b => b.t.toLowerCase() === t.toLowerCase());
  const count = st => books.filter(b => b.st === st).length;
  const listBooks = l => books.filter(b => l[2].includes(b.t));
  const grad = c => `--a:${c[0]};--b:${c[1]}`;

  /* ── shell ───────────────────────────────────────────── */
  const tabBtn = (s, cls) => `<button type="button" class="${cls}" data-tab="${s}">${s} <span data-n="${s}"></span></button>`;
  const DESK = `<aside class="pf-side"><div class="pf-logo">tsundoku</div><div class="pf-label">library</div>${
    NAV.map(n => `<button type="button" class="pf-nav" data-view="${n[0]}">${ICO[n[0]]}${n[1]}</button>`).join('')
  }<div class="pf-side-foot"><button type="button" class="pf-share" data-share>share my shelf</button><div class="pf-user"><span class="pf-ava"></span>you@mail.com</div></div></aside><div class="pf-main"></div>`;
  const PHONE = `<div class="app-sim"><div class="app-notch"></div><div class="app-inner">
    <div class="app-hdr"><span style="font-family:'Playfair Display',serif;font-size:14px">tsundoku</span><div class="pf-hdr-r"><button type="button" class="pf-plus" data-add aria-label="add a book">+</button><div class="app-ava">A</div></div></div>
    <label class="app-search"><span class="app-search-ico"></span><input class="pf-q" type="search" placeholder="Search library…" aria-label="search your library" autocomplete="off"></label>
    <div class="app-tabs">${STATUSES.map(s => tabBtn(s, 'app-tab')).join('')}</div>
    <div class="pf-grid"></div></div></div>`;
  host.innerHTML = (phone ? PHONE : DESK) +
    `<div class="pf-ov" hidden><div class="pf-scrim" data-close></div><div class="pf-panel" role="dialog" aria-modal="true" aria-labelledby="${tid}" tabindex="-1"></div></div><div class="pf-toast" role="status" aria-live="polite"></div>`;
  const ov = $(host, '.pf-ov'), panel = $(host, '.pf-panel'), toastEl = $(host, '.pf-toast');

  /* ── shelf ───────────────────────────────────────────── */
  function visible() {
    let l = books;
    if (S.scope) l = l.filter(b => S.scope.ids.includes(b.id));
    else if (!S.q) l = l.filter(b => b.st === S.tab);
    if (S.q) { const q = S.q.toLowerCase(); l = l.filter(b => (b.t + ' ' + b.a + ' ' + b.g).toLowerCase().includes(q)); }
    return [...l].sort(CMP[S.sort]);
  }
  const cover = (b, i, anim) =>
    `<button type="button" class="pf-cov" data-id="${b.id}" style="${grad(b.c)};${anim ? `animation-delay:${Math.min(i, 18) * 0.02}s` : 'animation:none'}" aria-label="${esc(b.t)}, ${esc(b.a)}, ${b.st}"><span class="pf-cov-in"><span class="pf-cov-t">${esc(b.t)}</span><span class="pf-cov-a">${esc(b.a)}</span></span><i class="pf-dot ${b.st}"></i></button>`;

  function syncHead(n) {
    const t = $(host, '[data-t]'); if (t) t.textContent = S.scope ? S.scope.label : S.q ? 'results' : S.tab;
    const c = $(host, '[data-c]'); if (c) c.textContent = n + (n === 1 ? ' book' : ' books');
    const x = $(host, '[data-clear]'); if (x) x.hidden = !S.scope;
    const so = $(host, '[data-sortl]'); if (so) so.textContent = 'sort ' + SORTS[S.sort][1] + ' ⌄';
    host.querySelectorAll('[data-tab]').forEach(b => {
      const on = !S.q && !S.scope && b.dataset.tab === S.tab;
      b.classList.toggle(phone ? 'active' : 'on', on); b.setAttribute('aria-pressed', String(on));
    });
    host.querySelectorAll('[data-n]').forEach(s => { s.textContent = count(s.dataset.n); });
  }
  function drawGrid(anim) {
    const g = $(host, '.pf-grid'); if (!g) return;
    const l = visible();
    g.innerHTML = l.length ? l.map((b, i) => cover(b, i, anim)).join('')
      : `<p class="pf-empty">${S.q ? 'nothing matches “' + esc(S.q) + '”' : 'nothing here yet'}</p>`;
    if (anim) g.scrollTop = 0;
    syncHead(l.length);
  }
  const clearQ = () => { S.q = ''; const qi = $(host, '.pf-q'); if (qi) qi.value = ''; };

  /* ── desktop views ───────────────────────────────────── */
  function drawMain() {
    const m = $(host, '.pf-main'); if (!m) return;
    if (S.view === 'shelf') {
      m.innerHTML = `<div class="pf-top"><div class="pf-title"><span data-t></span><span class="pf-count" data-c></span><button type="button" class="pf-chip" data-clear hidden>× all books</button></div>
        <div class="pf-top-r"><input class="pf-size" type="range" min="56" max="130" value="${parseInt(host.style.getPropertyValue('--pf-min')) || 78}" aria-label="cover size"><label class="pf-search"><input class="pf-q" type="search" placeholder="Search…" value="${esc(S.q)}" aria-label="search your library" autocomplete="off"></label><button type="button" class="pf-add" data-add>+ add book</button></div></div>
        <div class="pf-tabs">${STATUSES.map(s => tabBtn(s, 'pf-tab')).join('')}<button type="button" class="pf-sort" data-sort><span data-sortl></span></button></div>
        <div class="pf-grid"></div>`;
      drawGrid(true);
    } else if (S.view === 'lists') {
      m.innerHTML = `<div class="pf-top"><div class="pf-title">my lists<span class="pf-count">${LISTS.length} lists</span></div></div><div class="pf-rows">${
        LISTS.map((l, i) => { const bs = listBooks(l);
          return `<button type="button" class="pf-row" data-list="${i}"><span class="pf-emoji">${l[0]}</span><span><b>${l[1]}</b><small>${bs.length} books · ${bs.filter(b => b.st === 'read').length} read</small></span><span class="pf-stack">${bs.slice(0, 3).map(b => `<i class="pf-mini" style="${grad(b.c)}"></i>`).join('')}</span></button>`; }).join('')}</div>`;
    } else if (S.view === 'authors') {
      const by = {}; books.forEach(b => (by[b.a] = by[b.a] || []).push(b));
      const as = Object.entries(by).sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));
      m.innerHTML = `<div class="pf-top"><div class="pf-title">authors<span class="pf-count">${as.length}</span></div></div><div class="pf-rows">${
        as.map(([a, bs]) => { const w = a.split(' ');
          return `<button type="button" class="pf-row" data-author="${esc(a)}"><span class="pf-av">${esc(w[0][0] + w[w.length - 1][0])}</span><span><b>${esc(a)}</b><small>${bs.length} ${bs.length === 1 ? 'book' : 'books'} on your shelf</small></span></button>`; }).join('')}</div>`;
    } else {
      const by = {}; books.forEach(b => { by[b.g] = (by[b.g] || 0) + 1; });
      m.innerHTML = `<div class="pf-top"><div class="pf-title">genres<span class="pf-count">${Object.keys(by).length}</span></div></div><div class="pf-pills">${
        Object.entries(by).sort((x, y) => y[1] - x[1]).map(([g, n]) => `<button type="button" class="pf-pill" data-genre="${g}">${g}<small>${n}</small></button>`).join('')}</div>`;
    }
  }
  function go(view) {
    if (view === 'shelf') { S.q = ''; S.scope = null; }
    S.view = view; drawMain(); setNav();
  }
  function setNav() {
    host.querySelectorAll('[data-view]').forEach(b => {
      const on = b.dataset.view === S.view; b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }

  /* ── sheet (book detail / add book) ──────────────────── */
  function showSheet(opener, focusSel) {
    openerKey = opener && opener.dataset.id ? opener.dataset.id : '';
    clearTimeout(closeT); ov.hidden = false; void ov.offsetWidth; ov.classList.add('on');
    const f = focusSel && $(panel, focusSel); (f || panel).focus({ preventScroll: true });
  }
  function closeSheet() {
    if (ov.hidden) return;
    ov.classList.remove('on'); closeT = setTimeout(() => { ov.hidden = true; }, 280);
    const el = (openerKey && $(host, `[data-id="${openerKey}"]`)) || $(host, '[data-add]');
    if (el) el.focus({ preventScroll: true });
  }
  function fillBook() {
    const b = byId(curId);
    panel.innerHTML = `<button type="button" class="pf-x" data-close aria-label="close">×</button>
      <div class="pf-bk"><div class="pf-bk-cov" style="${grad(b.c)}"></div><div class="pf-bk-i"><h3 id="${tid}">${esc(b.t)}</h3><p>${esc(b.a)}</p><small>${b.g} · ${b.pg} pages</small></div></div>
      <div class="pf-seg" role="group" aria-label="reading status">${STATUSES.map(s => `<button type="button" data-st="${s}" class="${b.st === s ? 'on' : ''}" aria-pressed="${b.st === s}">${s}</button>`).join('')}</div>
      ${b.st === 'reading' ? `<label class="pf-prog"><span>page <b data-pp>${b.p}</b> of ${b.pg}</span><input class="pf-pr" type="range" min="0" max="${b.pg}" value="${b.p}" aria-label="pages read"></label>` : ''}`;
  }
  function openBook(id, opener) { curId = id; fillBook(); showSheet(opener); }
  function setStatus(s) {
    const b = byId(curId); b.st = s;
    if (s === 'read') b.p = b.pg; else if (s === 'unread') b.p = 0; else if (!b.p || b.p >= b.pg) b.p = Math.round(b.pg * 0.1);
    fillBook(); $(panel, `[data-st="${s}"]`).focus({ preventScroll: true });
    drawGrid(false);
  }
  function fillRes(q) {
    q = q.trim().toLowerCase();
    const pool = [
      ...books.map(b => ({ key: b.id, t: b.t, a: b.a, c: b.c, own: b.st })),
      ...EXTRA.map((x, i) => ({ key: 'x' + i, t: x[0], a: x[1], c: PALS[(i * 5 + 8) % 12], own: '' })).filter(x => !byTitle(x.t)),
    ];
    const hit = (q ? pool.filter(x => (x.t + ' ' + x.a).toLowerCase().includes(q)) : pool.filter(x => !x.own)).slice(0, 4);
    $(panel, '.pf-res').innerHTML =
      (q ? '' : '<p class="pf-hint">try “piranesi” — you might already own it.</p>') +
      (hit.length ? hit.map(x => `<div class="pf-rr"><i class="pf-mini" style="${grad(x.c)}"></i><span><b>${esc(x.t)}</b><small>${esc(x.a)}</small></span>${
        x.own ? `<em class="pf-own">already on your shelf<br>${x.own}</em>` : `<button type="button" data-addbook="${x.key}">add</button>`}</div>`).join('')
        : '<p class="pf-hint">no match. in the real app you can scan the barcode or add it by hand.</p>');
  }
  function openAdd(opener) {
    panel.innerHTML = `<button type="button" class="pf-x" data-close aria-label="close">×</button><h3 class="pf-add-h" id="${tid}">add a book</h3>
      <input class="pf-addq" type="search" placeholder="title or author…" aria-label="search for a book to add" autocomplete="off"><div class="pf-res"></div>`;
    fillRes(''); showSheet(opener, '.pf-addq');
  }
  function addBook(key) {
    const i = +key.slice(1), x = EXTRA[i], o = ++seq;
    books.push({ id: 'n' + o, t: x[0], a: x[1], g: x[2], pg: x[3], st: 'unread', p: 0, c: PALS[(i * 5 + 8) % 12], o });
    S.tab = 'unread'; S.sort = 0; S.scope = null; S.q = ''; S.view = 'shelf';
    closeSheet(); if (phone) { clearQ(); drawGrid(true); } else { drawMain(); setNav(); }
    toast('added “' + x[0] + '” to unread');
  }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }

  /* ── events (one delegated set per host) ─────────────── */
  host.addEventListener('click', e => {
    const t = e.target.closest('[data-view],[data-tab],[data-id],[data-sort],[data-add],[data-list],[data-author],[data-genre],[data-st],[data-close],[data-clear],[data-addbook],[data-share]');
    if (!t || !host.contains(t)) return;
    const d = t.dataset;
    if ('close' in d) closeSheet();
    else if (d.view) go(d.view);
    else if (d.tab) { S.tab = d.tab; S.scope = null; clearQ(); drawGrid(true); }
    else if (d.id) openBook(d.id, t);
    else if ('sort' in d) { S.sort = (S.sort + 1) % SORTS.length; drawGrid(false); }
    else if ('add' in d) openAdd(t);
    else if (d.list) { const l = LISTS[+d.list]; S.scope = { label: l[1], ids: listBooks(l).map(b => b.id) }; S.q = ''; S.view = 'shelf'; drawMain(); setNav(); }
    else if (d.author || d.genre) { S.q = d.author || d.genre; S.scope = null; S.view = 'shelf'; drawMain(); setNav(); }
    else if (d.st) setStatus(d.st);
    else if ('clear' in d) { S.scope = null; drawGrid(true); }
    else if (d.addbook) addBook(d.addbook);
    else if ('share' in d) toast('your public link would be copied here');
  });
  host.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('.pf-q')) { S.q = t.value.trim(); drawGrid(false); const g = $(host, '.pf-grid'); if (g) g.scrollTop = 0; }
    else if (t.matches('.pf-size')) host.style.setProperty('--pf-min', t.value + 'px');
    else if (t.matches('.pf-pr')) { const b = byId(curId); b.p = +t.value; $(panel, '[data-pp]').textContent = b.p; }
    else if (t.matches('.pf-addq')) fillRes(t.value);
  });
  host.addEventListener('keydown', e => {
    if (ov.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(); return; }
    if (e.key !== 'Tab') return;                                   // keep focus inside the open sheet
    const f = [...panel.querySelectorAll('button,input')].filter(x => !x.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ── start: shell is built now, covers drop in when the section scrolls into view ── */
  syncHead(visible().length); if (!phone) { setNav(); }
  const start = () => { if (phone) drawGrid(true); else drawMain(); };
  if (!phone) { $(host, '.pf-main').innerHTML = ''; }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); start(); } }, { threshold: 0.2 });
    io.observe(host);
  } else start();
}

document.querySelectorAll('[data-pf]').forEach(demo);
})();
