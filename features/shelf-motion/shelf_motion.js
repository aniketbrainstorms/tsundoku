// ── SHELF MOTION ──────────────────────────────────────────────────────────
// Wraps renderGrid() additively (same pattern as the envelope code) so none of
// the call sites that change a book's status or progress need touching.
//
//  · Shelf moves  When a re-render puts a book on a different shelf, play a
//    FLIP: the card slides out of its old shelf, neighbours close the gap, the
//    view follows it, and it lands at the top of the new shelf.
//  · Progress     When a reading card's progress changed, tween the wave, the
//    page count and the % from the old value to the new one.
//
// Mobile only. Skipped for reduced motion. If anything throws, the plain
// render has already happened, so the worst case is today's behaviour.
(function () {
  'use strict';
  if (!window.Motion || typeof window.renderGrid !== 'function') return;

  const FILTERS = ['reading', 'read', 'unread'];
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const CARD = '.reading-card[data-id], .book-card[data-id]';
  // follow: slide the view to the new shelf when the move starts from the shelf you're on
  const cfg = window.ShelfMotion = { follow: true };

  const isMobile = () => !window.matchMedia('(min-width: 1024px)').matches;
  const gridOf = f => document.querySelector('#pane-' + f + ' .book-grid');
  const cardsOf = f => { const g = gridOf(f); return g ? Array.from(g.querySelectorAll(CARD)) : []; };
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  const far = r => r.bottom < -200 || r.top > window.innerHeight + 200;
  const overlayOpen = () => !!document.querySelector(
    '.modal-overlay.visible, .sbs-sheet.open, .nav-panel.open, .book-search-overlay.open');

  // The re-render replays every card's entrance (a pop-in); during these animations, don't.
  const quiet = () => FILTERS.forEach(f => cardsOf(f).forEach(el => { el.style.animation = 'none'; }));

  // Run fn now, or once the sheet/modal on top has closed (so it isn't played under a scrim).
  function whenClear(fn) {
    if (!overlayOpen()) { fn(false); return; }
    let n = 0;
    const iv = setInterval(() => {
      if (!overlayOpen()) { clearInterval(iv); fn(true); }
      else if (++n > 1500) clearInterval(iv);
    }, 120);
  }

  // ── Before the render: what is where? ──
  function prepare() {
    const where = new Map();
    FILTERS.forEach(f => cardsOf(f).forEach(el => where.set(el.dataset.id, f)));

    const movers = [];
    books.forEach(b => {
      const from = where.get(String(b.id));
      if (from && FILTERS.includes(b.status) && b.status !== from)
        movers.push({ id: String(b.id), from, to: b.status });
    });
    if (movers.length > 3) movers.length = 0;       // bulk change: not worth animating

    const reading = new Map();
    cardsOf('reading').forEach(el => {
      const w = el.querySelector('[data-rc-wave]');
      if (!w) return;
      const label = el.querySelector('.rc-progress-label');
      reading.set(el.dataset.id, { pct: parseFloat(w.dataset.percent) || 0, label: label ? label.textContent : '' });
    });

    if (!movers.length && !reading.size) return null;

    const before = new Map(), cls = {}, involved = new Set();
    movers.forEach(m => { involved.add(m.from); involved.add(m.to); });
    involved.forEach(f => {
      const g = gridOf(f); cls[f] = g ? g.className : '';
      cardsOf(f).forEach(el => before.set(el.dataset.id, { f, el, r: el.getBoundingClientRect() }));
    });
    return { movers, reading, before, cls, involved };
  }

  // ── After the render ──
  function play(p) {
    const moved = new Set(p.movers.map(m => m.id));
    if (p.movers.length) animateMoves(p, moved);
    animateProgress(p, moved);
  }

  function animateMoves(p, moved) {
    quiet();
    const landing = p.movers
      .map(m => ({ m, el: cardsOf(m.to).find(e => e.dataset.id === m.id) }))
      .filter(x => x.el);
    if (!landing.length) return;

    const run = deferred => {
      const follow = cfg.follow && window._swipeEngine && p.movers.every(m => m.from === currentFilter);
      const delay = follow ? 300 : 0;
      const dirOf = m => (FILTERS.indexOf(m.to) > FILTERS.indexOf(m.from) ? 1 : -1);

      if (!deferred) {
        // 1. The old card leaves (the original element, kept alive as a fixed-position ghost).
        p.movers.forEach(m => {
          const old = p.before.get(m.id);
          if (!old) return;
          const g = document.createElement('div');
          g.className = p.cls[m.from];
          Object.assign(g.style, { position: 'fixed', left: old.r.left + 'px', top: old.r.top + 'px',
            width: old.r.width + 'px', height: old.r.height + 'px', margin: '0', padding: '0',
            display: 'block', zIndex: '95', pointerEvents: 'none' });
          Object.assign(old.el.style, { margin: '0', width: '100%', height: '100%', animation: 'none' });
          g.appendChild(old.el);
          document.body.appendChild(g);
          g.animate([
            { transform: 'none', opacity: 1 },
            { transform: 'scale(1.03)', opacity: 1, offset: 0.25 },
            { transform: 'translateX(' + dirOf(m) * 60 + '%) scale(0.96)', opacity: 0 }
          ], { duration: 340, easing: 'cubic-bezier(0.4, 0, 0.7, 0.2)', fill: 'forwards' })
            .finished.then(() => g.remove(), () => g.remove());
        });
        // 2. Neighbours close the gap on the old shelf.
        flipShelf(p, moved, p.movers[0].from, 0);
      }
      // 3. Neighbours make room on the new shelf, and the card lands.
      if (follow) { const dst = document.getElementById('pane-' + p.movers[0].to); if (dst) dst.scrollTop = 0; }
      if (!deferred) p.movers.forEach(m => flipShelf(p, moved, m.to, delay));   // 'before' rects are stale once deferred
      landing.forEach(({ m, el }) => {
        el.animate([
          { transform: 'translateX(' + -dirOf(m) * 36 + 'px) scale(0.96)', opacity: 0 },
          { transform: 'none', opacity: 1 }
        ], { duration: 460, delay, easing: EASE, fill: 'both' });
        el.animate([
          { outline: '1.5px solid rgba(201,113,74,0.9)' },
          { outline: '1.5px solid rgba(201,113,74,0)' }
        ], { duration: 1100, delay, easing: 'ease-out' });
        const c = document.getElementById('count-' + m.to);
        if (c) { c.style.display = 'inline-block';
          c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }],
            { duration: 420, delay, easing: EASE }); }
      });
      if (follow) setTimeout(() => window._swipeEngine.goTo(p.movers[0].to, true), 160);
    };
    whenClear(run);
  }

  // FLIP every card on a shelf that stayed on it: from where it was to where it is.
  function flipShelf(p, moved, f, delay) {
    cardsOf(f).forEach(el => {
      if (moved.has(el.dataset.id)) return;
      const o = p.before.get(el.dataset.id);
      if (!o || o.f !== f) return;
      const r = el.getBoundingClientRect();
      const dx = o.r.left - r.left, dy = o.r.top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      if (far(o.r) && far(r)) return;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: 420, delay, easing: EASE, fill: 'backwards' });
    });
  }

  // ── Progress: old value → new value, wave and numbers on one clock ──
  const PAGES = /^(\d+) \/ (\d+) pages$/;
  function animateProgress(p, moved) {
    const cards = cardsOf('reading');
    const changed = cards.filter(el => {
      if (moved.has(el.dataset.id)) return false;
      const old = p.reading.get(el.dataset.id), w = el.querySelector('[data-rc-wave]');
      return old && w && Math.abs((parseFloat(w.dataset.percent) || 0) - old.pct) >= 0.5;
    });
    if (!changed.length) return;
    quiet();

    changed.forEach(el => {
      const old = p.reading.get(el.dataset.id);
      const wEl = el.querySelector('[data-rc-wave]');
      const w = _rcWaves.find(x => x.container === wEl);
      if (!w) return;
      const to = parseFloat(wEl.dataset.percent) || 0, from = old.pct;
      const label = el.querySelector('.rc-progress-label'), pctEl = el.querySelector('.rc-progress-pct');
      const nm = PAGES.exec(label ? label.textContent : ''), om = PAGES.exec(old.label);
      const dur = 520 + 680 * Math.min(Math.abs(to - from) / 100 * 3, 1);
      const paint = t => {
        const e = easeOut(t);
        w.percent = from + (to - from) * e;
        _rcLayoutWave(w);
        if (pctEl) pctEl.textContent = Math.round(w.percent) + '%';
        if (nm && om && label) label.textContent = Math.round(+om[1] + (+nm[1] - +om[1]) * e) + ' / ' + nm[2] + ' pages';
      };
      paint(0);                                   // start from the old value this very frame
      whenClear(() => {
        const t0 = performance.now();
        (function f(now) {
          const t = Math.min(1, (now - t0) / dur);
          paint(t);
          if (t < 1) requestAnimationFrame(f);
        })(t0);
      });
    });
  }

  const orig = window.renderGrid;
  window.renderGrid = function () {
    let plan = null;
    if (isMobile() && !Motion.reduced() && typeof _gridsReady !== 'undefined' && _gridsReady) {
      try { plan = prepare(); } catch (e) { console.error('ShelfMotion prepare', e); }
    }
    const out = orig.apply(this, arguments);
    if (plan) { try { play(plan); } catch (e) { console.error('ShelfMotion play', e); } }
    return out;
  };
})();
