/* ═══════════ tsundoku — landing motion scenes ═══════════
   Additive module: nothing here touches the page's own JS or CSS. Every class is namespaced `lm-`.

   USE      <div class="feat-visual" data-lm="add scan"> … static fallback … </div>
            space-separated names play in sequence inside one phone. The host's old children are
            kept as a no-JS fallback and replaced when the scene mounts.
   ADD ONE  scroll to "SCENES", copy any block: scene('name', { label, build(), async play(h) {…} })
            then put data-lm="name" on any element. No other file needs to change.
   HELPERS  h.tap / h.hold / h.type / h.say / h.flip / h.fly / h.swap / h.toast / h.wait (see helpers())
   SECTIONS 1 data · 2 icons+kit · 3 engine · 4 helpers · 5 stage · 6 SCENES · 7 mount
*/
(() => {
'use strict';

const SW = 300, SH = 620;                         // logical screen size (CSS scales the device)
const EASE = 'cubic-bezier(0.16,1,0.3,1)';
const ABORT = Symbol('lm-abort');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const SCENES = {};
const scene = (name, def) => { SCENES[name] = def; };
const $html = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── 1. DATA ─────────────────────────────────────────────── */
const BK = {
  midnight:  { t: 'The Midnight Library',  a: 'Matt Haig',          g: ['#4a2818', '#c9714a'] },
  babel:     { t: 'Babel',                 a: 'R.F. Kuang',         g: ['#1e2d3d', '#5a8fa8'] },
  tomorrow:  { t: 'Tomorrow, and Tomorrow, and Tomorrow', a: 'Gabrielle Zevin', g: ['#2d3a2e', '#6a9a72'] },
  secret:    { t: 'The Secret History',    a: 'Donna Tartt',        g: ['#3a3020', '#b0963c'] },
  pachinko:  { t: 'Pachinko',              a: 'Min Jin Lee',        g: ['#2d1e1e', '#c06a6a'] },
  piranesi:  { t: 'Piranesi',              a: 'Susanna Clarke',     g: ['#1e2d2a', '#6ac0b8'] },
  yellowface:{ t: 'Yellowface',            a: 'R.F. Kuang',         g: ['#3a2040', '#9a6ac0'] },
  little:    { t: 'A Little Life',         a: 'Hanya Yanagihara',   g: ['#1e1a2d', '#8a70c0'] },
  demon:     { t: 'Demon Copperhead',      a: 'Barbara Kingsolver', g: ['#1a2d20', '#6ac08a'] },
  hail:      { t: 'Project Hail Mary',     a: 'Andy Weir',          g: ['#3d2a1e', '#c0814a'] },
  normal:    { t: 'Normal People',         a: 'Sally Rooney',       g: ['#1e1e2d', '#6a72c0'] },
  klara:     { t: 'Klara and the Sun',     a: 'Kazuo Ishiguro',     g: ['#2a1e2d', '#a06ab8'] },
  circe:     { t: 'Circe',                 a: 'Madeline Miller',    g: ['#3a2a14', '#d0a060'] },
  station:   { t: 'Station Eleven',        a: 'Emily St. John Mandel', g: ['#1a2a3a', '#6aa0c8'] },
  dune:      { t: 'Dune',                  a: 'Frank Herbert',      g: ['#3a2814', '#d4a24a'] },
};

/* ── 2. ICONS + APP KIT (the pieces every scene is built from) ── */
const svg = (d, o = '') => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${o}>${d}</svg>`;
const I = {
  search: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>',
  plus:   '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><line x1="8" y1="2.5" x2="8" y2="13.5"/><line x1="2.5" y1="8" x2="13.5" y2="8"/></svg>',
  plus11: svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 'width="11" height="11"'),
  back:   svg('<path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>'),
  chev:   '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5l5 5 5-5"/></svg>',
  check:  svg('<polyline points="20 6 9 17 4 12"/>'),
  google: svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', 'width="17" height="17"'),
  manual: svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', 'width="17" height="17"'),
  borrow: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7l3 3 3-3"/>', 'width="17" height="17"'),
  pen:    svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', 'width="11" height="11"'),
  copy:   svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', 'width="15" height="15"'),
};
const SB = `<div class="lm-sb"><span>9:41</span><i class="lm-isl"></i><span class="lm-sbr"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect y="7" width="3" height="4" rx=".8"/><rect x="4.7" y="5" width="3" height="6" rx=".8"/><rect x="9.4" y="2.5" width="3" height="8.5" rx=".8"/><rect x="14" width="3" height="11" rx=".8"/></svg><svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3.2" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/><path d="M23 4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".45"/></svg></span></div><i class="lm-hbar"></i>`;

const cv = (k, cls = '') => { const b = BK[k]; return `<div class="lm-cv ${cls}" style="--g1:${b.g[0]};--g2:${b.g[1]}"><b>${esc(b.t)}</b><small>${esc(b.a)}</small></div>`; };
/* st: 'un' | 'rd' | 'dn'   p: progress % (reading only)   o: {fresh, pen} */
const book = (k, st = 'un', p = null, o = {}) =>
  `<div class="lm-bk${o.fresh ? ' lm-new' : ''}" data-k="${k}">${cv(k)}<span class="lm-dot ${st}"></span>${p != null ? `<span class="lm-pg"><i style="--p:${p}%"></i></span>` : ''}${o.pen ? `<span class="lm-pen">${I.pen}</span>` : ''}</div>`;

const TABS = ['unread', 'reading', 'read'];
const barHtml = `<div class="lm-bar"><div class="lm-bar-in"><div class="lm-bsr">${I.search}<span>Search library…</span></div><div class="lm-addb">${I.plus}</div></div></div>`;
const shelf = (on, n, grid) =>
  `<div class="lm-hd"><span class="lm-logo">tsundoku</span><span class="lm-ava">A</span></div>
   <div class="lm-tabs">${TABS.map(t => `<div class="lm-tab${t === on ? ' on' : ''}" data-t="${t}">${t}<b data-n="${t}">${n[t]}</b></div>`).join('')}</div>
   <div class="lm-grid">${grid}</div>${barHtml}`;
const nav = (l, t, r) => `<div class="lm-nav"><span class="lm-nb">${l}</span><span class="lm-nt">${t}</span>${r}</div>`;
const bars = () => { let x = 0, s = ''; for (let i = 0; i < 46; i++) { const w = 1 + ((i * 5 + (i >> 2)) % 3); if (i % 2 === 0) s += `<rect x="${x}" width="${w}" height="64"/>`; x += w; } return `<svg viewBox="0 0 ${x} 64" preserveAspectRatio="none" fill="#111">${s}</svg>`; };

/* ── 3. ENGINE (token = one run; kill() unwinds everything it started) ── */
const newTok = () => ({ dead: false, t: new Map(), a: new Set() });
const kill = tok => {
  tok.dead = true;
  tok.t.forEach((rej, id) => { clearTimeout(id); rej(ABORT); });
  tok.t.clear();
  tok.a.forEach(a => { try { a.cancel(); } catch (e) {} });
  tok.a.clear();
};

/* ── 4. HELPERS handed to every scene as `h` ── */
function helpers(stage, tok) {
  const root = stage.root, scr = stage.screen, fing = stage.fing;
  const h = {
    root, instant: stage.instant, fl: stage.fl,
    q: s => root.querySelector(s),
    qa: s => [...root.querySelectorAll(s)],
    go: p => p.catch(() => {}),

    wait: ms => new Promise((res, rej) => {
      if (tok.dead) return rej(ABORT);
      if (h.instant || ms <= 0) return res();
      const id = setTimeout(() => { tok.t.delete(id); res(); }, ms);
      tok.t.set(id, rej);
    }),
    later(fn, ms) {                                   // fire-and-forget timer that dies with the run
      if (h.instant) return;
      const id = setTimeout(() => { tok.t.delete(id); fn(); }, ms);
      tok.t.set(id, () => {});
    },

    /* element position in logical (300×620) units, unaffected by the device's CSS scale */
    box(el) {
      const r = el.getBoundingClientRect(), s = scr.getBoundingClientRect(), k = s.width / SW;
      return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
    },
    pos(el) { const b = h.box(el); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; },

    async move(x, y, ms = 620) {
      if (h.instant) return;
      fing.classList.add('on');
      fing.style.transform = `translate(${x}px,${y}px)`;
      await h.wait(ms);
    },
    /* tap an element (or selector, or {x,y}) — moves the pointer, presses, releases */
    async tap(target, o = {}) {
      const el = typeof target === 'string' ? h.q(target) : target;
      if (!el) throw new Error('lm: missing tap target ' + target);
      const p = el.nodeType ? h.pos(el) : el;
      await h.move(p.x + (o.dx || 0), p.y + (o.dy || 0), o.ms);
      if (!h.instant) {
        fing.classList.add('tap'); if (el.nodeType) el.classList.add('lm-press');
        await h.wait(o.hold || 150);
        fing.classList.remove('tap'); await h.wait(100);
        if (el.nodeType) el.classList.remove('lm-press');
      }
      return el;
    },
    async hold(target, ms = 700, mv) {
      const el = typeof target === 'string' ? h.q(target) : target;
      const p = h.pos(el);
      await h.move(p.x, p.y, mv);
      if (h.instant) return el;
      fing.classList.add('tap'); el.classList.add('lm-hold');
      await h.wait(ms);
      fing.classList.remove('tap'); el.classList.remove('lm-hold');
      return el;
    },

    /* type into / erase from a text element; onChar(text) runs after every keystroke */
    async type(el, str, cps = 9, onChar) {
      if (h.instant) { el.textContent = str; if (onChar) await onChar(str); return; }
      for (const ch of str) {
        el.textContent += ch;
        if (onChar) await onChar(el.textContent);
        await h.wait(1000 / cps + (ch.charCodeAt(0) * 7) % 45);
      }
    },
    async erase(el, cps = 14, onChar) {
      while (el.textContent.length) {
        el.textContent = el.textContent.slice(0, -1);
        if (onChar) await onChar(el.textContent);
        if (!h.instant) await h.wait(1000 / cps);
      }
    },

    say(txt) { const c = stage.cap; c.textContent = txt; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); },
    bump(el) { el.classList.remove('lm-bump'); void el.offsetWidth; el.classList.add('lm-bump'); },
    toast(txt, ms = 1700) {
      let t = h.q('.lm-toast');
      if (!t) { t = $html('<div class="lm-toast"></div>'); root.appendChild(t); }
      t.textContent = txt; void t.offsetWidth; t.classList.add('on');
      h.later(() => t.classList.remove('on'), ms);
    },

    /* Web Animations wrapper: end state must already be the element's CSS/DOM state (fill defaults to 'backwards') */
    anim(el, kf, o = {}) {
      if (tok.dead) return Promise.reject(ABORT);
      if (h.instant) return Promise.resolve();
      const a = el.animate(kf, { duration: o.d || 500, delay: o.delay || 0, easing: o.e || EASE, fill: o.fill || 'backwards' });
      tok.a.add(a);
      return a.finished.then(() => { tok.a.delete(a); }, () => { tok.a.delete(a); throw ABORT; });
    },

    /* FLIP: run mutate(), then glide every child from where it was to where it is now (new children pop in) */
    flip(box, mutate, o = {}) {
      const first = new Map([...box.children].filter(c => c.offsetParent).map(c => [c, [c.offsetLeft, c.offsetTop]]));
      mutate();
      const ps = [];
      [...box.children].forEach(c => {
        if (c.style.display === 'none' || !c.offsetParent) return;
        const f = first.get(c);
        if (!f) { ps.push(h.anim(c, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { d: 560 })); return; }
        const dx = f[0] - c.offsetLeft, dy = f[1] - c.offsetTop;
        if (dx || dy) ps.push(h.anim(c, [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { d: o.d || 650 }));
      });
      return Promise.all(ps);
    },
    /* fly a copy of `el` into `to` (e.g. a cover into a tab pill), then remove the copy */
    async fly(el, to, o = {}) {
      const s = scr.getBoundingClientRect(), k = s.width / SW;
      const a = el.getBoundingClientRect(), b = to.getBoundingClientRect();
      const c = el.cloneNode(true); c.classList.remove('lm-new', 'lm-hold', 'lm-press'); c.classList.add('lm-fly');
      c.style.cssText = `left:${(a.left - s.left) / k}px;top:${(a.top - s.top) / k}px;width:${a.width / k}px;height:${a.height / k}px`;
      root.appendChild(c);
      const dx = (b.left + b.width / 2 - a.left - a.width / 2) / k, dy = (b.top + b.height / 2 - a.top - a.height / 2) / k;
      await h.anim(c, [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${dx * .5}px,${dy * .5 - 36}px) scale(.55)`, opacity: 1, offset: .55 },
        { transform: `translate(${dx}px,${dy}px) scale(.1)`, opacity: .15 },
      ], { d: o.d || 760, e: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
      c.remove();
    },
    /* cross-fade an element's content: fade out → fn() → fade in */
    async swap(el, fn) {
      el.style.transition = 'opacity .16s'; el.style.opacity = '0';
      await h.wait(170);
      fn(); void el.offsetWidth;
      el.style.transition = 'opacity .45s'; el.style.opacity = '1';
    },
  };
  return h;
}

/* ── 5. STAGE (one phone: builds the device, runs scenes, obeys visibility / pause / reduced motion) ── */
class Stage {
  constructor(host, names) {
    this.host = host; this.defs = names.map(n => SCENES[n]); this.i = 0; this.def = this.defs[0];
    this.tok = null; this.vis = false; this.paused = false; this.instant = false;
    host.classList.add('lm-host');
    host.innerHTML =
      `<div class="lm-wrap" role="img" aria-label="${esc(this.def.label)}"><div class="lm-device"><div class="lm-screen" aria-hidden="true"><div class="lm-root"></div><div class="lm-fing"><b></b></div></div></div><div class="lm-fl-layer" aria-hidden="true"></div></div>
       <div class="lm-ctl"><div class="lm-cap" aria-hidden="true"></div><button type="button" class="lm-pp"></button></div>
       ${this.defs.length > 1 ? `<div class="lm-dots" aria-hidden="true">${this.defs.map(() => '<i></i>').join('')}</div>` : ''}`;
    const q = s => host.querySelector(s);
    this.wrap = q('.lm-wrap'); this.screen = q('.lm-screen'); this.root = q('.lm-root'); this.fing = q('.lm-fing');
    this.fl = q('.lm-fl-layer'); this.cap = q('.lm-cap'); this.pp = q('.lm-pp'); this.dots = q('.lm-dots');
    this.pp.addEventListener('click', () => this.toggle());
    this.label();
  }
  gate() { const m = this.host.closest('.feat-tab-mock'); return !m || m.classList.contains('active'); }   // hidden tab panels don't run
  label() { const on = !!this.tok; this.pp.textContent = on ? 'pause' : 'play'; this.pp.setAttribute('aria-label', on ? 'pause animation' : 'play animation'); }
  reset() {
    const d = this.def, r = this.root;
    r.className = 'lm-root lm-in'; r.innerHTML = SB + d.build();
    this.fing.classList.remove('on', 'tap'); this.fing.style.transform = `translate(${SW + 30}px,${SH - 60}px)`;
    this.cap.textContent = '';
    this.fl.classList.remove('lm-off'); this.fl.innerHTML = d.float ? d.float() : '';
    this.wrap.setAttribute('aria-label', d.label);
    if (this.dots) [...this.dots.children].forEach((x, i) => x.classList.toggle('on', i === this.i));
  }
  start(once) {
    if (this.tok) return;
    const tok = newTok(); this.tok = tok;
    this.instant = false; this.host.classList.remove('lm-instant');
    this.label(); this.run(tok, once);
  }
  stop() { if (!this.tok) return; kill(this.tok); this.tok = null; this.label(); }
  toggle() {
    if (this.tok) { this.paused = true; this.stop(); }
    else { this.paused = false; this.start(reduce.matches); }
  }
  async run(tok, once) {
    const h = helpers(this, tok);
    try {
      for (;;) {
        this.reset();
        await h.wait(this.def.pre ?? 800);
        await this.def.play(h);
        await h.wait(this.def.hold ?? 2400);
        if (once) break;
        this.root.classList.add('lm-out'); this.fl.classList.add('lm-off'); await h.wait(420);
        this.i = (this.i + 1) % this.defs.length; this.def = this.defs[this.i];
      }
    } catch (e) { if (e !== ABORT) console.error('[lm]', e); }
    if (this.tok === tok) { this.tok = null; this.label(); }
  }
  /* reduced motion: render the finished frame of the first scene, no motion */
  async final() {
    this.instant = true; this.host.classList.add('lm-instant');
    const tok = newTok(); this.reset();
    try { await this.def.play(helpers(this, tok)); } catch (e) { if (e !== ABORT) console.error('[lm]', e); }
    this.label();
  }
}

/* ═══════════════════════ 6. SCENES ═══════════════════════
   One block per feature. `build()` returns the starting frame; `play(h)` is the timeline.
   Optional: pre (ms before start, default 800) · hold (ms on final frame, default 2400).
   Keep copy lowercase in captions (h.say) and use the app's real labels inside the phone.        */

/* ── add: + → add from google → search → pick → lands on the shelf ── */
scene('add', {
  label: 'Animation: adding a book to your shelf by searching for it',
  build: () =>
    shelf('unread', { unread: 41, reading: 3, read: 24 }, ['pachinko', 'babel', 'demon', 'hail', 'little', 'klara', 'yellowface', 'tomorrow'].map(k => book(k)).join('')) +
    `<div class="lm-scrim"></div>
     <div class="lm-pop">${[['borrow', 'Track borrowed book', "A book you're reading but don't own", I.borrow], ['google', 'Add from Google', 'Search millions of books', I.google], ['manual', 'Add manually', 'Enter book details yourself', I.manual]]
       .map(([k, t, s, ic]) => `<div class="lm-pi" data-i="${k}"><span class="lm-pic">${ic}</span><div><div class="lm-pt">${t}</div><div class="lm-ps">${s}</div></div></div>`).join('')}</div>
     <div class="lm-sheet lm-ssh"><i class="lm-hdl"></i><div class="lm-sh-t">Add a book</div>
       <div class="lm-inp">${I.search}<span class="lm-t" data-ph="Title, author or ISBN"></span></div>
       <div class="lm-res">${['2020 · hardcover', '2021 · paperback'].map((m, i) => `<div class="lm-row" data-r="${i}">${cv('piranesi', 'lm-th')}<div><div class="lm-rt">Piranesi</div><div class="lm-ra">Susanna Clarke</div><div class="lm-rm">${m}</div></div></div>`).join('')}</div>
       <div class="lm-cta">Add to Shelf</div></div>`,
  async play(h) {
    const $ = h.q;
    h.say('tap + to add a book');
    await h.tap('.lm-addb');
    $('.lm-addb').classList.add('open'); $('.lm-pop').classList.add('on');
    await h.wait(900);
    h.say('search millions of books');
    await h.tap('.lm-pi[data-i="google"]');
    $('.lm-pop').classList.remove('on'); $('.lm-addb').classList.remove('open');
    $('.lm-scrim').classList.add('on'); $('.lm-ssh').classList.add('on');
    await h.wait(900);
    $('.lm-inp').classList.add('on');
    h.say('results appear as you type');
    await h.type($('.lm-t'), 'piranesi', 8);
    await h.wait(300);
    for (const r of h.qa('.lm-row')) { r.classList.add('on'); await h.wait(160); }
    await h.wait(700);
    h.say('covers and details fill in');
    const row = await h.tap('.lm-row[data-r="0"]');
    row.classList.add('sel'); $('.lm-cta').classList.add('on');
    await h.wait(800);
    await h.tap('.lm-cta');
    $('.lm-cta').classList.add('done'); $('.lm-cta').textContent = 'Added ✓';
    await h.wait(650);
    $('.lm-ssh').classList.remove('on'); $('.lm-scrim').classList.remove('on');
    await h.wait(550);
    const grid = $('.lm-grid'), nb = $html(book('piranesi', 'un', null, { fresh: true })), n = $('[data-n="unread"]');
    h.say('on your shelf');
    n.textContent = 42; h.bump(n);
    await h.flip(grid, () => grid.prepend(nb));
  },
});

/* ── scan: point the camera at a barcode → found → added ── */
scene('scan', {
  label: 'Animation: scanning a barcode to add a book',
  build: () =>
    `<div class="lm-cam">
       <div class="lm-camt"><b>Scan ISBN Barcode</b><span>Align barcode within the frame</span></div>
       <div class="lm-cbook"><div class="lm-cbl">${[70, 92, 84, 60, 88, 76, 52].map(w => `<i style="width:${w}%"></i>`).join('')}</div><div class="lm-bcw">${bars()}</div></div>
       <div class="lm-frame"><u></u><u></u><u></u><u></u><i class="lm-scl"></i><span class="lm-found">ISBN found ✓</span></div>
       <div class="lm-flash"></div>
       <div class="lm-sheet lm-rsh"><i class="lm-hdl"></i><div class="lm-rr">${cv('babel', 'lm-big')}<div><div class="lm-rt">Babel</div><div class="lm-ra">R.F. Kuang</div><div class="lm-rm">found by barcode</div></div></div><div class="lm-cta on">Add to Shelf</div></div>
     </div>`,
  async play(h) {
    const $ = h.q;
    h.say('point at the barcode');
    $('.lm-cbook').classList.add('in');
    await h.wait(1300);
    const ln = $('.lm-scl');
    await h.anim(ln, [{ transform: 'translateY(0)' }, { transform: 'translateY(114px)' }], { d: 900, e: 'ease-in-out', fill: 'forwards' });
    await h.anim(ln, [{ transform: 'translateY(114px)' }, { transform: 'translateY(0)' }], { d: 800, e: 'ease-in-out', fill: 'forwards' });
    $('.lm-frame').classList.add('ok'); $('.lm-flash').classList.add('on');
    h.say('found it');
    await h.wait(700);
    $('.lm-rsh').classList.add('on');
    await h.wait(1000);
    h.say('added in one scan');
    await h.tap('.lm-rsh .lm-cta');
    $('.lm-rsh .lm-cta').classList.add('done'); $('.lm-rsh .lm-cta').textContent = 'Added ✓';
  },
});

/* ── lists: + → name it → pick an icon → open it → books fan in ── */
const listRow = (emoji, name, count, keys, extra = '') =>
  `<div class="lm-lr${extra}"><span class="lm-em">${emoji}</span><div class="lm-li"><div class="lm-ln">${name}</div><div class="lm-lc">${count}</div></div><div class="lm-stk">${keys.map(k => cv(k, 'lm-mini')).join('')}</div></div>`;
const bookRow = k => `<div class="lm-row">${cv(k, 'lm-th')}<div><div class="lm-rt">${esc(BK[k].t)}</div><div class="lm-ra">${esc(BK[k].a)}</div></div></div>`;

scene('lists', {
  label: 'Animation: creating a list and adding books to it',
  build: () =>
    `<div class="lm-page lm-p1">${nav(I.back + 'Back', 'My Lists', '<span class="lm-plus">+</span>')}<div class="lm-hint">Hold to rename or delete</div>
       <div class="lm-ll">${listRow('🔥', 'Unread Gems', '14 books', ['hail', 'demon', 'little']) + listRow('🕯️', 'Comfort Reads', '8 books', ['klara', 'normal', 'midnight']) + listRow('⭐', 'Signed Editions', '3 books', ['secret', 'piranesi'])}</div></div>
     <div class="lm-page lm-p2">${nav(I.back + 'Back', '', '<span class="lm-more">•••</span>')}
       <div class="lm-hero"><div class="lm-fan">${['secret', 'babel', 'piranesi'].map((k, i) => cv(k, 'lm-fc f' + i)).join('')}</div>
         <div class="lm-hem">🌙</div><div class="lm-hn">Dark Academia</div><div class="lm-hm">0 books</div>
         <div class="lm-addbk">${I.plus11}Add book</div></div>
       <div class="lm-bl">${['secret', 'babel', 'piranesi'].map(bookRow).join('')}</div></div>
     <div class="lm-scrim"></div>
     <div class="lm-sheet lm-nsh"><i class="lm-hdl"></i><div class="lm-sh-t">New list</div>
       <div class="lm-lab">LIST NAME</div><div class="lm-inp"><span class="lm-t" data-ph="e.g. Sci-fi favourites"></span></div>
       <div class="lm-lab" style="margin-top:20px">PICK AN ICON</div><div class="lm-ems">${['📚', '🌙', '🔥', '🕯️', '⭐', '🖤'].map((e, i) => `<div class="lm-ei" data-e="${i}">${e}</div>`).join('')}</div>
       <div class="lm-cta on">Create list</div></div>`,
  async play(h) {
    const $ = h.q;
    h.say('tap + for a new list');
    await h.tap('.lm-plus');
    $('.lm-scrim').classList.add('on'); $('.lm-nsh').classList.add('on');
    await h.wait(900);
    h.say('name it, pick an icon');
    $('.lm-inp').classList.add('on');
    await h.type($('.lm-t'), 'Dark Academia', 10);
    await h.wait(300);
    const em = await h.tap('.lm-ei[data-e="1"]');
    h.qa('.lm-ei').forEach(x => x.classList.toggle('sel', x === em));
    await h.wait(500);
    await h.tap('.lm-cta');
    $('.lm-nsh').classList.remove('on'); $('.lm-scrim').classList.remove('on');
    await h.wait(650);
    const box = $('.lm-ll'), row = $html(listRow('🌙', 'Dark Academia', '0 books', [], ' lm-new'));
    h.say('your new list');
    await h.flip(box, () => box.prepend(row));
    await h.wait(1000);
    h.say('open it and add books');
    await h.tap(row);
    $('.lm-p2').classList.add('on'); $('.lm-p1').classList.add('back');
    await h.wait(950);
    await h.tap('.lm-addbk');
    const rows = h.qa('.lm-bl .lm-row'), fan = h.qa('.lm-fc'), hm = $('.lm-hm');
    for (let i = 0; i < 3; i++) {
      fan[i].classList.add('on'); rows[i].classList.add('on');
      hm.textContent = `${i + 1} ${i ? 'books' : 'book'}`;
      await h.wait(760);
    }
  },
});

/* ── status: hold a cover → Move to → it flies into the tab → unread → reading → read ── */
const qmHtml = cur => `<div class="lm-qm"><span class="lm-ql">Move to</span>${[['reading', 'var(--lm-ac)', 'Reading'], ['read', 'var(--lm-gr)', 'Read'], ['unread', 'var(--lm-mu)', 'Unread']]
  .map(([s, c, t]) => `<div class="lm-qi${s === cur ? ' cur' : ''}" data-s="${s}"><i style="background:${c}"></i>${t}</div>`).join('')}<div class="lm-qs"></div><div class="lm-qi"><span>✏️</span>Edit details</div><div class="lm-qi"><span>📋</span>Add to list</div><div class="lm-qi del"><span>🗑</span>Remove</div></div>`;
const STATUS_GRID = {
  unread:  () => ['pachinko', 'babel', 'demon', 'hail', 'little', 'klara', 'yellowface', 'tomorrow'].map(k => book(k)).join(''),
  reading: first => (first ? book(first, 'rd', 0, { fresh: true }) : '') + [['midnight', 61], ['secret', 34], ['normal', 12]].map(([k, p]) => book(k, 'rd', p)).join(''),
  read:    first => (first ? book(first, 'dn', null, { fresh: true }) : '') + ['piranesi', 'circe', 'station', 'dune'].map(k => book(k, 'dn')).join(''),
};
scene('status', {
  label: 'Animation: moving a book from unread to reading to read',
  build: () => shelf('unread', { unread: 41, reading: 3, read: 24 }, STATUS_GRID.unread()),
  async play(h) {
    const $ = h.q, grid = $('.lm-grid');
    const hop = async (key, from, to, say, toast) => {
      h.say(say);
      const bk = await h.hold(`.lm-bk[data-k="${key}"]`, 700);
      const b = h.box(bk), m = $html(qmHtml(from));
      m.style.left = Math.max(12, Math.min(SW - 190, b.x + b.w / 2 - 89)) + 'px';
      m.style.top = Math.min(b.y + b.h + 8, SH - 290) + 'px';
      h.root.appendChild(m); void m.offsetWidth; m.classList.add('on');
      await h.wait(600);
      await h.tap(`.lm-qi[data-s="${to}"]`);
      m.classList.remove('on'); h.later(() => m.remove(), 400);
      const tab = $(`.lm-tab[data-t="${to}"]`), nf = $(`[data-n="${from}"]`), nt = $(`[data-n="${to}"]`);
      await Promise.all([h.fly(bk, tab), h.flip(grid, () => bk.remove())]);
      nf.textContent = +nf.textContent - 1; nt.textContent = +nt.textContent + 1;
      h.bump(nt); tab.classList.add('lm-pulse'); h.toast(toast);
      await h.wait(650);
      await h.tap(tab);
      h.qa('.lm-tab').forEach(t => t.classList.toggle('on', t === tab));
      await h.swap(grid, () => { grid.innerHTML = STATUS_GRID[to](key); });
      await h.wait(900);
    };
    await hop('babel', 'unread', 'reading', 'unread → reading', 'Happy reading! 📖');
    await hop('babel', 'reading', 'read', 'reading → read', 'Marked as read ✓');
    h.say('read');
  },
});

/* ── progress: tap ✏️ → type pages → bar follows → saved ── */
scene('progress', {
  label: 'Animation: logging pages read and watching the progress bar fill',
  build: () =>
    shelf('reading', { unread: 40, reading: 3, read: 24 }, [['midnight', 20], ['secret', 34], ['normal', 12]].map(([k, p]) => book(k, 'rd', p, { pen: true })).join('')) +
    `<div class="lm-scrim"></div>
     <div class="lm-sheet lm-psh"><i class="lm-hdl"></i><div class="lm-sh-t">Track progress</div>
       <div class="lm-prb">${cv('midnight', 'lm-th')}<div><div class="lm-rt">The Midnight Library</div><div class="lm-ra">Matt Haig</div></div></div>
       <div class="lm-fl"><div><div class="lm-lab">PAGES READ</div><div class="lm-inp on"><span class="lm-t" data-ph="0">61</span></div></div>
         <div><div class="lm-lab">TOTAL PAGES</div><div class="lm-inp"><span class="lm-t">304</span></div></div></div>
       <div class="lm-pv"><div class="lm-pvh"><span class="lm-pvp">20%</span><span class="lm-pvt">61 / 304 pages</span></div><div class="lm-pvb"><i style="width:20%"></i></div></div>
       <div class="lm-cta on">Save</div></div>`,
  async play(h) {
    const $ = h.q;
    const upd = txt => { const n = +txt || 0, p = Math.min(100, Math.floor(n / 304 * 100)); $('.lm-pvp').textContent = p + '%'; $('.lm-pvt').textContent = `${n} / 304 pages`; $('.lm-pvb i').style.width = p + '%'; };
    h.say('tap ✏️ on a book you’re reading');
    await h.tap('.lm-bk[data-k="midnight"] .lm-pen');
    $('.lm-scrim').classList.add('on'); $('.lm-psh').classList.add('on');
    await h.wait(900);
    h.say('type the page you’re on');
    const t = $('.lm-fl .lm-t');
    await h.erase(t, 12, upd);
    await h.wait(250);
    await h.type(t, '187', 5, upd);
    await h.wait(900);
    await h.tap('.lm-psh .lm-cta');
    $('.lm-psh').classList.remove('on'); $('.lm-scrim').classList.remove('on');
    await h.wait(500);
    h.say('progress, privately');
    $('.lm-bk[data-k="midnight"] .lm-pg i').style.setProperty('--p', '61%');
    h.toast('Progress saved ✓');
  },
});

/* ── detail: tap a cover → sheet rises → tap SUMMARY → it expands → close ── */
const SUMMARY = "Robin Swift, orphaned in Canton and brought to Britain, is raised to study at Oxford's Royal Institute of Translation, known as Babel. In this alternate 1830s, silver bars engraved with paired words in two languages power the Empire, and the scholars who craft them are paid in comfort and complicity. As Robin's loyalties pull apart, a secret society offers him a way to resist.";
scene('detail', {
  label: 'Animation: opening a book’s detail sheet and expanding its summary',
  build: () =>
    shelf('unread', { unread: 41, reading: 3, read: 24 }, STATUS_GRID.unread()) +
    `<div class="lm-scrim"></div>
     <div class="lm-ds"><div class="lm-dcv">${cv('babel', 'lg')}</div><i class="lm-hdl"></i>
       <div class="lm-dh1"><div class="lm-dt">Babel</div><div class="lm-da">R.F. Kuang</div><div class="lm-dst"><i></i>unread</div></div>
       <div class="lm-dh2">${cv('babel')}<div><div class="lm-dt">Babel</div><div class="lm-da">R.F. Kuang</div><div class="lm-dst"><i></i>unread</div></div></div>
       <div class="lm-sum"><div class="lm-sumh"><span>SUMMARY</span><span class="lm-chv">${I.chev}</span></div><div class="lm-sumc"><p>${SUMMARY}</p></div></div>
       <div class="lm-dcta"><div class="lm-btn p">Move to Reading</div><div class="lm-btn s">Mark as Read</div></div></div>`,
  async play(h) {
    const $ = h.q, ds = $('.lm-ds');
    h.say('tap any book');
    await h.tap('.lm-bk[data-k="babel"]');
    $('.lm-scrim').classList.add('on'); ds.classList.add('on');
    await h.wait(1200);
    h.say('tap summary to read more');
    await h.tap('.lm-sumh');
    ds.classList.add('full');
    await h.wait(3200);
    h.say('tuck it away');
    await h.tap('.lm-ds .lm-hdl');
    ds.classList.remove('full');
    await h.wait(1000);
    await h.tap({ x: 150, y: 110 });
    ds.classList.remove('on'); $('.lm-scrim').classList.remove('on');
    await h.wait(700);
  },
});

/* ── search: tap the bar → type → the list narrows as you type → authors surface ── */
const SEARCH_KEYS = Object.keys(BK).filter(k => !['circe', 'station', 'dune'].includes(k)).sort((a, b) => BK[a].t.replace(/^The /, '').localeCompare(BK[b].t.replace(/^The /, '')));
const STATUS_OF = { midnight: 'rd', tomorrow: 'rd', secret: 'dn', piranesi: 'dn', normal: 'dn' };
scene('search', {
  label: 'Animation: searching your library and seeing results narrow as you type',
  build: () =>
    shelf('unread', { unread: 41, reading: 3, read: 24 }, ['pachinko', 'babel', 'demon', 'hail', 'little', 'klara', 'yellowface', 'tomorrow', 'piranesi'].map(k => book(k)).join('')) +
    `<div class="lm-srch"><div class="lm-srh"><span class="lm-back">${I.back}</span><div class="lm-inp">${I.search}<span class="lm-t" data-ph="Search library…"></span></div></div>
       <div class="lm-sl"><div class="lm-arow" style="display:none"><span class="lm-av">RK</span><div><div class="lm-rt">R.F. <mark class="lm-mk">Kuang</mark></div><div class="lm-ra">Author · 2 books in your library</div></div></div>
         ${SEARCH_KEYS.map(k => `<div class="lm-sr" data-s="${esc((BK[k].t + ' ' + BK[k].a).toLowerCase())}" data-k="${k}">${cv(k)}<div><div class="lm-rt" data-o="${esc(BK[k].t)}">${esc(BK[k].t)}</div><div class="lm-ra" data-o="${esc(BK[k].a)}">${esc(BK[k].a)}</div></div><span class="lm-dot ${STATUS_OF[k] || 'un'}"></span></div>`).join('')}</div>
       <div class="lm-az">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => `<span${c === 'K' ? ' class="on"' : ''}>${c}</span>`).join('')}</div></div>`,
  async play(h) {
    const $ = h.q, list = $('.lm-sl'), rows = h.qa('.lm-sr'), arow = $('.lm-arow');
    h.say('tap search');
    await h.tap('.lm-bsr');
    $('.lm-srch').classList.add('on'); $('.lm-srch .lm-inp').classList.add('on');
    await h.wait(900);
    h.say('the list narrows as you type');
    const mark = (el, q) => { const o = el.dataset.o, i = q ? o.toLowerCase().indexOf(q) : -1; el.innerHTML = i < 0 ? esc(o) : `${esc(o.slice(0, i))}<mark class="lm-mk">${esc(o.slice(i, i + q.length))}</mark>${esc(o.slice(i + q.length))}`; };
    const filt = async txt => {
      const q = txt.toLowerCase();
      rows.forEach(r => { mark(r.querySelector('.lm-rt'), q); mark(r.querySelector('.lm-ra'), q); });
      const out = rows.filter(r => r.style.display !== 'none' && !r.dataset.s.includes(q));
      const showA = q.length >= 2 && 'r.f. kuang'.includes(q) && arow.style.display === 'none';
      out.forEach(r => r.classList.add('gone'));
      if (out.length) await h.wait(150);
      await h.flip(list, () => { out.forEach(r => { r.style.display = 'none'; }); if (showA) arow.style.display = ''; }, { d: 420 });
    };
    await h.type($('.lm-srch .lm-t'), 'kuang', 5, filt);
    await h.wait(800);
    h.say('authors show up too');
  },
});

/* ── share: toggle public → copy the link → what friends see → sort ── */
const PUB_KEYS = ['midnight', 'babel', 'piranesi', 'klara', 'little', 'pachinko', 'normal', 'hail', 'demon'];
const pubOrder = by => [...PUB_KEYS].sort((a, b) => BK[a][by].replace(/^The /, '').localeCompare(BK[b][by].replace(/^The /, '')));
scene('share', {
  label: 'Animation: making your shelf public and sharing the link',
  build: () =>
    `<div class="lm-page lm-pA">${nav(I.back + 'Back', 'Share your shelf', '<span style="min-width:60px"></span>')}
       <div class="lm-sc"><div class="lm-sr1"><div><div class="lm-pt">Public shelf</div><div class="lm-ps">Anyone with the link can browse</div></div><div class="lm-tg"><i></i></div></div>
         <div class="lm-link"><span>tsundoku.app/?shelf=aniket</span><b class="lm-cp">${I.copy}</b></div></div></div>
     <div class="lm-page lm-pB"><div class="lm-pbh"><span class="lm-logo">tsundoku</span><span class="lm-pbb">public shelf</span></div>
       <div class="lm-pbo"><span class="lm-pav">A</span><div><div class="lm-pbn">aniket’s shelf</div><div class="lm-pbs">68 books</div></div><span class="lm-sortb">sort by title</span></div>
       <div class="lm-grid">${pubOrder('t').map(k => `<div class="lm-bk" data-k="${k}">${cv(k)}</div>`).join('')}</div></div>`,
  async play(h) {
    const $ = h.q;
    h.say('make your shelf public');
    const tg = await h.tap('.lm-tg');
    tg.classList.add('on'); $('.lm-link').classList.add('on');
    await h.wait(900);
    h.say('one link to share');
    const cp = await h.tap('.lm-cp');
    cp.classList.add('done'); cp.innerHTML = I.check; h.toast('Link copied ✓');
    await h.wait(1300);
    h.say('what your friends see — no account');
    $('.lm-pA').classList.add('out'); $('.lm-pB').classList.add('on');
    await h.wait(2200);
    h.say('they can sort and search too');
    const sb = await h.tap('.lm-sortb');
    const m = $html(`<div class="lm-qm lm-sm"><span class="lm-ql">Sort by</span><div class="lm-qi cur" data-s="t">Title (A–Z)</div><div class="lm-qi" data-s="a">Author (A–Z)</div></div>`);
    h.root.appendChild(m); void m.offsetWidth; m.classList.add('on');
    await h.wait(700);
    await h.tap('.lm-qi[data-s="a"]');
    m.classList.remove('on'); h.later(() => m.remove(), 400);
    sb.textContent = 'sort by author';
    const grid = $('.lm-pB .lm-grid');
    await h.flip(grid, () => pubOrder('a').forEach(k => grid.appendChild(grid.querySelector(`[data-k="${k}"]`))), { d: 850 });
  },
});

/* ── hero: the ~10s reel — add a book, send it to reading, the shelf settles ──
   `float()` returns badges drawn OUTSIDE the phone (on the .lm-fl-layer); the scene switches them on/off with h.fl. */
const ARR_L = '<div style="position:absolute;top:50%;left:-5px;transform:translateY(-50%) rotate(45deg);width:9px;height:9px;background:var(--text)"></div>';
const ARR_R = '<div style="position:absolute;top:50%;right:-5px;transform:translateY(-50%) rotate(45deg);width:9px;height:9px;background:#f0dccf;border-right:1px solid rgba(201,113,74,.3);border-top:1px solid rgba(201,113,74,.3)"></div>';
scene('hero', {
  label: 'Animation: adding a book to your shelf and moving it to reading',
  pre: 500, hold: 1800,
  float: () =>
    `<div class="lm-fl lm-fl-l"><div class="fl fl-warm float-label" style="--fl-dur:3.4s">your shelf, your pile${ARR_R}</div></div>` +
    `<div class="lm-fl lm-fl-r"><div class="fl fl-dark float-label" style="--fl-dur:3s">added just now${ARR_L}</div></div>`,
  build: () =>
    shelf('unread', { unread: 41, reading: 3, read: 24 }, ['pachinko', 'demon', 'hail', 'little', 'klara', 'yellowface', 'tomorrow', 'piranesi'].map(k => book(k)).join('')) +
    `<div class="lm-scrim"></div>
     <div class="lm-sheet lm-ssh"><i class="lm-hdl"></i><div class="lm-sh-t">Add a book</div>
       <div class="lm-inp">${I.search}<span class="lm-t" data-ph="Title, author or ISBN"></span></div>
       <div class="lm-res"><div class="lm-row" data-r="0">${cv('babel', 'lm-th')}<div><div class="lm-rt">Babel</div><div class="lm-ra">R.F. Kuang</div><div class="lm-rm">2022 · hardcover</div></div></div></div>
       <div class="lm-cta">Add to Shelf</div></div>`,
  async play(h) {
    const $ = h.q, grid = $('.lm-grid'), B = s => h.fl.querySelector(s);
    B('.lm-fl-l').classList.add('on');
    h.say('add a book in seconds');
    await h.tap('.lm-addb', { ms: 460, hold: 110 });
    $('.lm-scrim').classList.add('on'); $('.lm-ssh').classList.add('on');
    await h.wait(500);
    $('.lm-inp').classList.add('on');
    await h.type($('.lm-t'), 'babel', 14);
    $('.lm-row').classList.add('on');
    await h.wait(220);
    const row = await h.tap('.lm-row', { ms: 400, hold: 110 });
    row.classList.add('sel'); $('.lm-cta').classList.add('on');
    await h.wait(260);
    await h.tap('.lm-cta', { ms: 320, hold: 110 });
    $('.lm-cta').classList.add('done'); $('.lm-cta').textContent = 'Added ✓';
    await h.wait(350);
    $('.lm-ssh').classList.remove('on'); $('.lm-scrim').classList.remove('on');
    await h.wait(380);
    const nb = $html(book('babel', 'un', null, { fresh: true })), nu = $('[data-n="unread"]');
    h.say('on your shelf');
    nu.textContent = 42; h.bump(nu); B('.lm-fl-r').classList.add('on');
    await h.flip(grid, () => grid.prepend(nb), { d: 560 });
    await h.wait(350);
    h.say('start reading');
    await h.hold(nb, 420, 420);
    const b = h.box(nb), m = $html(qmHtml('unread'));
    m.style.left = Math.max(12, Math.min(SW - 190, b.x + b.w / 2 - 89)) + 'px';
    m.style.top = Math.min(b.y + b.h + 8, SH - 290) + 'px';
    h.root.appendChild(m); void m.offsetWidth; m.classList.add('on');
    await h.wait(380);
    await h.tap('.lm-qi[data-s="reading"]', { ms: 340, hold: 110 });
    m.classList.remove('on'); h.later(() => m.remove(), 400);
    B('.lm-fl-r').classList.remove('on');
    const tab = $('.lm-tab[data-t="reading"]'), nr = $('[data-n="reading"]');
    await Promise.all([h.fly(nb, tab, { d: 640 }), h.flip(grid, () => nb.remove(), { d: 560 })]);
    nu.textContent = 41; nr.textContent = 4; h.bump(nr); tab.classList.add('lm-pulse');
    await h.wait(250);
    await h.tap(tab, { ms: 380, hold: 110 });
    h.qa('.lm-tab').forEach(t => t.classList.toggle('on', t === tab));
    h.say('your whole shelf');
    await h.swap(grid, () => { grid.innerHTML = STATUS_GRID.reading('babel'); });
    await h.wait(120);
    const pg = $('.lm-bk[data-k="babel"] .lm-pg i'); if (pg) pg.style.setProperty('--p', '12%');
  },
});

/* ── 7. MOUNT ──────────────────────────────────────────────── */
const stages = [];
const sync = s => {
  const ok = s.vis && !document.hidden && s.gate() && !s.paused;
  if (ok && !s.tok) s.start(false); else if (!ok && s.tok) s.stop();
};
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { e.target._lm.vis = e.isIntersecting; sync(e.target._lm); }), { threshold: .35 }) : null;

function mount() {
  document.querySelectorAll('[data-lm]').forEach(el => {
    if (el._lm) return;
    const names = el.dataset.lm.split(/\s+/).filter(n => SCENES[n]);
    if (!names.length) { console.warn('[lm] unknown scene(s):', el.dataset.lm); return; }
    const s = new Stage(el, names); el._lm = s; stages.push(s);
    if (reduce.matches || !io) { s.paused = true; s.final(); } else { s.reset(); io.observe(el); }
  });
  /* tabbed panels: start/stop scenes as their tab becomes active (no edits to the page's tab code) */
  const mo = new MutationObserver(() => stages.forEach(sync));
  document.querySelectorAll('.feat-tab-mock').forEach(m => mo.observe(m, { attributes: true, attributeFilter: ['class'] }));
  document.addEventListener('visibilitychange', () => stages.forEach(sync));
}
window.LM = { scene, mount, scenes: SCENES };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
