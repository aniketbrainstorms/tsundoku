/* Tsundoku — hold-to-reorder home tabs
   Hold a tab (~400ms) to lift it, drag sideways, release to drop.
   The order is saved on this device; the app always opens on the first tab.
   Loads after core/app.js (uses currentFilter, _SWIPE_FILTERS, _swipeEngine). */
(function () {
  'use strict';

  const KEY = 'tsundoku_tab_order';
  const DEFAULT_ORDER = ['reading', 'read', 'unread'];
  const HOLD_MS = 400;     // press time before a tab lifts
  const SLOP = 8;          // px of drift allowed while holding (more = it's a swipe/scroll)
  const SETTLE_MS = 250;   // drop animation
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const strip = document.querySelector('.filter-tabs');
  if (!strip) return;

  // ── STYLES (injected, same pattern as desktop.js) ──
  const css = `
    .tab-btn.tr-holding {
      scale: 0.96;
      transition: scale 380ms cubic-bezier(0.25,1,0.5,1) 90ms, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }
    .filter-tabs.tr-active { overflow: visible; }
    .filter-tabs.tr-active .tab-btn {
      will-change: transform;
      transition: transform 0.24s cubic-bezier(0.25,1,0.5,1), scale 0.24s cubic-bezier(0.25,1,0.5,1),
                  opacity 0.2s ease, box-shadow 0.24s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }
    .filter-tabs.tr-active .tab-btn.tr-dim { opacity: 0.6; }
    /* lifted tab: transform is NOT transitioned so it tracks the finger exactly */
    .filter-tabs.tr-active .tab-btn.tr-lifted {
      scale: 1.06;
      z-index: 3;
      box-shadow: 0 10px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,113,74,0.55), 0 0 18px rgba(201,113,74,0.28);
      transition: scale 0.16s cubic-bezier(0.25,1,0.5,1), box-shadow 0.16s ease,
                  opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }
    .filter-tabs.tr-nofx .tab-btn { transition: none !important; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── ORDER: read / save / apply ──
  let order = DEFAULT_ORDER.slice();

  function readOrder() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(v) && v.length === DEFAULT_ORDER.length && DEFAULT_ORDER.every(f => v.includes(f))) return v;
    } catch (e) { /* fall through */ }
    return DEFAULT_ORDER.slice();
  }
  function saveOrder(o) {
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode etc. */ }
  }

  // put a group of sibling nodes into `order`, keeping any non-group siblings (e.g. the sort row) where they were
  function sortChildren(nodes, keyOf) {
    if (nodes.length < 2) return;
    const parent = nodes[0].parentNode;
    const anchor = nodes[nodes.length - 1].nextSibling;
    order.forEach(k => {
      const n = nodes.find(x => keyOf(x) === k);
      if (n) parent.insertBefore(n, anchor);
    });
  }

  function applyOrder(o) {
    order = o.slice();
    sortChildren([...document.querySelectorAll('.filter-tabs > .tab-btn[data-filter]')], n => n.dataset.filter);
    sortChildren([...document.querySelectorAll('.desk-filter-chips > [data-desk-filter]')], n => n.dataset.deskFilter);
    sortChildren([...document.querySelectorAll('#deskShelfSub > .sb-sub-item[data-filter]')], n => n.dataset.filter);
    sortChildren([...document.querySelectorAll('.swipe-dots > .swipe-dot[data-filter]')], n => n.dataset.filter);

    // swipe panes — move only what changed, keep scroll positions, skip the card entrance animation
    const swipeStrip = document.getElementById('swipeStrip');
    if (swipeStrip) {
      const scrolls = new Map();
      order.forEach((f, i) => {
        const pane = document.getElementById('pane-' + f);
        if (pane && swipeStrip.children[i] !== pane) {
          scrolls.set(pane, pane.scrollTop);
          swipeStrip.classList.add('no-anim');
          swipeStrip.insertBefore(pane, swipeStrip.children[i] || null);
        }
      });
      scrolls.forEach((top, pane) => { pane.scrollTop = top; });
      if (scrolls.size) requestAnimationFrame(() => swipeStrip.classList.remove('no-anim'));
    }

    // the swipe engine indexes into this array, so it has to match the DOM order
    if (typeof _SWIPE_FILTERS !== 'undefined') _SWIPE_FILTERS.splice(0, _SWIPE_FILTERS.length, ...order);
  }

  // park the strip on the current tab without animating (its index just changed)
  function resnap() {
    const desktopSingle = window.matchMedia(DESKTOP_MEDIA_QUERY).matches && !isTabletDesktopSwipe();
    if (!desktopSingle && window._swipeEngine) window._swipeEngine.goTo(currentFilter, false);
  }

  function syncActive() {
    const f = currentFilter;
    document.querySelectorAll('.filter-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
    document.querySelectorAll('.swipe-dot').forEach(d => d.classList.toggle('active', d.dataset.filter === f));
    document.querySelectorAll('#deskShelfSub .sb-sub-item').forEach(el => el.classList.toggle('active', el.dataset.filter === f));
    document.querySelectorAll('[data-desk-filter]').forEach(b => {
      const a = b.dataset.deskFilter === f;
      b.classList.toggle('active', a);
      b.setAttribute('aria-selected', String(a));
    });
  }

  // ── BOOT: restore order, land on the first tab ──
  applyOrder(readOrder());
  currentFilter = order[0];
  syncActive();
  if (typeof updateHintBar === 'function') updateHintBar();
  if (typeof updateDeskHeader === 'function') updateDeskHeader();
  resnap();

  // ── DRAG ──
  let st = null;            // active press: { btn, tabs, idx, id, x0, y0, x, active, target, rects, gap, dx, timer }
  let settling = false;     // drop animation running
  let suppressClick = false;

  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } }

  function detach() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
  }

  function cancelHold() {
    if (!st) return;
    clearTimeout(st.timer);
    st.btn.classList.remove('tr-holding');
    st = null;
    detach();
  }

  strip.addEventListener('pointerdown', e => {
    if (st || settling) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tabs = [...strip.querySelectorAll('.tab-btn')];
    st = {
      btn, tabs, idx: tabs.indexOf(btn), id: e.pointerId,
      x0: e.clientX, y0: e.clientY, x: e.clientX,
      active: false, target: 0, rects: [], gap: 6, dx: 0,
      timer: setTimeout(lift, HOLD_MS)
    };
    btn.classList.add('tr-holding');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  });

  function lift() {
    const s = st;
    if (!s) return;
    s.active = true;
    // layout metrics (not getBoundingClientRect) so the hold-scale doesn't skew them
    s.rects = s.tabs.map(t => ({
      left: t.offsetLeft, right: t.offsetLeft + t.offsetWidth,
      width: t.offsetWidth, center: t.offsetLeft + t.offsetWidth / 2
    }));
    s.gap = s.rects.length > 1 ? s.rects[1].left - s.rects[0].right : 6;
    s.target = s.idx;
    s.x0 = s.x;                       // drag is measured from where the finger is at lift-off
    suppressClick = true;
    strip.classList.add('tr-active');
    s.tabs.forEach(t => { if (t !== s.btn) t.classList.add('tr-dim'); });
    s.btn.classList.remove('tr-holding');
    s.btn.classList.add('tr-lifted');
    buzz(12);
  }

  function onMove(e) {
    const s = st;
    if (!s || e.pointerId !== s.id) return;
    s.x = e.clientX;
    if (!s.active) {
      // moved before the hold finished: it's a swipe/scroll, not a reorder
      if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > SLOP) cancelHold();
      return;
    }
    drag(s);
  }

  function drag(s) {
    const r = s.rects, n = r.length, me = r[s.idx];
    const dx = Math.max(r[0].left - me.left, Math.min(r[n - 1].right - me.right, s.x - s.x0));
    s.dx = dx;
    const c = me.center + dx;
    let t = s.idx;
    for (let j = s.idx + 1; j < n; j++) if (c > r[j].center) t = j;
    for (let j = s.idx - 1; j >= 0; j--) if (c < r[j].center) t = j;
    s.btn.style.transform = `translate3d(${dx}px,0,0)`;
    if (t !== s.target) { s.target = t; shiftOthers(s); buzz(6); }
  }

  // neighbours slide one tab-width (+gap) toward the gap the lifted tab left behind
  function shiftOthers(s) {
    const dw = s.rects[s.idx].width + s.gap, t = s.target;
    s.tabs.forEach((tab, i) => {
      if (i === s.idx) return;
      let sh = 0;
      if (t > s.idx && i > s.idx && i <= t) sh = -dw;
      else if (t < s.idx && i >= t && i < s.idx) sh = dw;
      tab.style.transform = sh ? `translate3d(${sh}px,0,0)` : '';
    });
  }

  function onEnd(e) {
    const s = st;
    if (!s || e.pointerId !== s.id) return;
    if (!s.active) { cancelHold(); return; }
    drop(s);
  }

  function drop(s) {
    st = null;
    settling = true;
    clearTimeout(s.timer);
    detach();

    // where the lifted tab ends up: the combined width of the tabs it passed
    let off = 0;
    if (s.target > s.idx) for (let j = s.idx + 1; j <= s.target; j++) off += s.rects[j].width + s.gap;
    else if (s.target < s.idx) for (let j = s.target; j < s.idx; j++) off -= s.rects[j].width + s.gap;

    s.btn.style.transform = `translate3d(${off}px,0,0)`;
    s.btn.classList.remove('tr-lifted');
    s.tabs.forEach(t => t.classList.remove('tr-dim'));

    setTimeout(() => { suppressClick = false; }, 80);   // the click that follows the release
    setTimeout(() => commit(s), reduced ? 0 : SETTLE_MS);
  }

  // swap the DOM to the new order and clear the transforms in the same frame — no visual jump
  function commit(s) {
    const o = order.slice();
    const moved = o.splice(s.idx, 1)[0];
    o.splice(s.target, 0, moved);

    strip.classList.add('tr-nofx');
    s.tabs.forEach(t => { t.style.transform = ''; });
    if (s.target !== s.idx) {
      applyOrder(o);
      saveOrder(o);
      resnap();
    }
    strip.classList.remove('tr-active');
    void strip.offsetWidth;                 // flush, so removing tr-nofx doesn't animate the reset
    strip.classList.remove('tr-nofx');
    settling = false;
  }

  // the release after a drag would otherwise tap the tab underneath
  strip.addEventListener('click', e => {
    if (suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // once lifted, stop the browser from scrolling/panning under the finger
  strip.addEventListener('touchmove', e => {
    if (st && st.active && e.cancelable) e.preventDefault();
  }, { passive: false });

  // Android fires a context menu on long-press
  strip.addEventListener('contextmenu', e => { if (st) e.preventDefault(); });

  // keyboard: Alt + ←/→ moves the focused tab
  strip.addEventListener('keydown', e => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const key = btn.dataset.filter;
    const i = order.indexOf(key);
    const j = i + (e.key === 'ArrowLeft' ? -1 : 1);
    if (j < 0 || j >= order.length) return;
    e.preventDefault();
    const o = order.slice();
    o.splice(i, 1);
    o.splice(j, 0, key);
    applyOrder(o);
    saveOrder(o);
    resnap();
    btn.focus();
  });
})();
