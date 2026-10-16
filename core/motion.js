// ── MOTION ───────────────────────────────────────────────────────────────
// Tiny shared spring helper. Load before app.js. Exposes window.Motion.
//
// Why a spring: a CSS transition has a fixed curve, so when a finger lets go
// at some speed the content lurches to whatever speed the curve starts at.
// A spring begins at the finger's speed and settles from there, so a gesture
// flows straight into its settle. It is also interruptible: stop() it and
// read x/v, and the next gesture picks up from where things actually are.
//
// Time-based, closed-form (no per-frame integration), so it behaves the same
// at 60Hz and 120Hz. Units: px and px/s.
(function () {
  'use strict';

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(mq && mq.matches);

  // Position/velocity at time t (seconds) for a spring settling on `to`.
  // d0 = from - to, v0 = initial velocity. ζ is clamped to (0, 1].
  function solve(d0, v0, w, z, t) {
    if (z >= 1) {
      const B = v0 + w * d0, e = Math.exp(-w * t);
      return { d: (d0 + B * t) * e, v: (v0 - w * B * t) * e };
    }
    const a = z * w, wd = w * Math.sqrt(1 - z * z), e = Math.exp(-a * t);
    const c = Math.cos(wd * t), s = Math.sin(wd * t);
    return {
      d: e * (d0 * c + ((v0 + a * d0) / wd) * s),
      v: e * (v0 * c - ((a * v0 + w * w * d0) / wd) * s)
    };
  }

  // Motion.spring({ from, to, velocity, response, damping, overshoot, onUpdate, onDone })
  //   response  – seconds for one undamped period; ~0.3 snappy, ~0.5 relaxed
  //   damping   – ratio, 1 = critically damped (no overshoot)
  //   overshoot – false (default) caps an initial velocity that would carry the
  //               value past `to`. Set true on gestures where you want the spring.
  // Returns { stop(), x, v, running }.
  function spring(o) {
    const w = (2 * Math.PI) / (o.response || 0.4);
    const z = Math.min(o.damping == null ? 1 : o.damping, 1);
    const to = o.to;
    const d0 = o.from - to;
    let v0 = o.velocity || 0;

    if (!o.overshoot && z >= 1 && d0 !== 0 && v0 * d0 < 0) {
      const cap = w * Math.abs(d0);                 // fastest approach with no overshoot
      if (Math.abs(v0) > cap) v0 = -Math.sign(d0) * cap;
    }

    const h = { running: true, x: o.from, v: v0, stop() { h.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; } };
    let raf = 0;

    if (reduced() || d0 === 0 && v0 === 0) {
      h.running = false; h.x = to; h.v = 0;
      if (o.onUpdate) o.onUpdate(to, 0);
      if (o.onDone) o.onDone();
      return h;
    }

    const called = performance.now();
    let t0 = null;
    function frame(ts) {
      if (!h.running) return;
      // First frame: count only the time since the call, and never more than
      // one frame's worth, so a slow first paint can't swallow the motion.
      if (t0 === null) t0 = ts - Math.max(0, Math.min(17, ts - called));
      const t = (ts - t0) / 1000;
      const s = solve(d0, v0, w, z, t);
      const x = to + s.d;
      const done = t > 3 || (Math.abs(s.d) < 0.25 && Math.abs(s.v) < 8);
      h.x = done ? to : x; h.v = done ? 0 : s.v;
      if (o.onUpdate) o.onUpdate(h.x, h.v);
      if (done) { h.running = false; raf = 0; if (o.onDone) o.onDone(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return h;
  }

  window.Motion = { spring, reduced, solve };
})();
