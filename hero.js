/* ═══════════ tsundoku — hero extras ═══════════
   Additive module (classes namespaced `lm-`, no dependencies, touches no existing JS).
   1 INSTALL  any [data-lm-install] button opens a short "add to home screen" guide.
              It points at app.html first: only app.html carries the manifest, so adding the
              landing page itself to a home screen would install the wrong thing.
   2 PILE     a tsundoku pile slowly builds in the hero's two bottom corners (background).
              Transform + opacity only, ~14 nodes, stops off-screen / hidden tab / reel paused.
*/
(() => {
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

/* ── 1. INSTALL GUIDE ───────────────────────────────────── */
const primary = document.querySelector('.hero-actions .btn-primary');
const APP = primary ? primary.href : 'https://aniketbrainstorms.github.io/tsundoku/app.html';
const ua = navigator.userAgent;
const OS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios'
         : /Android/.test(ua) ? 'android' : 'desktop';
const GUIDE = {
  ios:     { tab: 'iphone',   steps: ['open the app in safari', 'tap the share button, then “add to home screen”'] },
  android: { tab: 'android',  steps: ['open the app in chrome', 'tap ⋮ at the top right, then “install app”'] },
  desktop: { tab: 'computer', steps: ['open the app in chrome or edge', 'click the install icon at the right of the address bar'] },
};

let sheet = null, opener = null;
function build() {
  const el = document.createElement('div');
  el.className = 'lm-ins'; el.hidden = true;
  el.innerHTML =
    `<div class="lm-ins-scrim"></div>
     <div class="lm-ins-card" role="dialog" aria-modal="true" aria-labelledby="lmInsT" tabindex="-1">
       <button type="button" class="lm-ins-x" aria-label="close">×</button>
       <h2 id="lmInsT">install tsundoku</h2>
       <p>it’s a web app, so there’s no app store. two taps and it lives on your home screen.</p>
       <div class="lm-ins-tabs" role="tablist">${Object.keys(GUIDE).map(k => `<button type="button" role="tab" data-os="${k}">${GUIDE[k].tab}</button>`).join('')}</div>
       <ol class="lm-ins-steps"></ol>
       <a class="lm-ins-go" href="${APP}" target="_blank" rel="noopener">open the app →</a>
     </div>`;
  document.body.appendChild(el);
  el.querySelector('.lm-ins-scrim').addEventListener('click', close);
  el.querySelector('.lm-ins-x').addEventListener('click', close);
  el.querySelectorAll('[data-os]').forEach(b => b.addEventListener('click', () => show(b.dataset.os)));
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;                                   // keep focus inside the dialog
    const f = [...el.querySelectorAll('button,a[href]')].filter(x => x.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  return el;
}
function show(os) {
  sheet.querySelectorAll('[data-os]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.os === os)));
  sheet.querySelector('.lm-ins-steps').innerHTML = GUIDE[os].steps.map(t => `<li>${t}</li>`).join('');
}
function open(btn) {
  if (!sheet) sheet = build();
  opener = btn; show(OS);
  sheet.hidden = false; void sheet.offsetWidth; sheet.classList.add('on');
  document.documentElement.style.overflow = 'hidden';
  sheet.querySelector('.lm-ins-card').focus();
}
function close() {
  if (!sheet || sheet.hidden) return;
  sheet.classList.remove('on');
  document.documentElement.style.overflow = '';
  setTimeout(() => { if (!sheet.classList.contains('on')) sheet.hidden = true; }, 420);
  if (opener) opener.focus();
}
document.querySelectorAll('[data-lm-install]').forEach(b => b.addEventListener('click', () => open(b)));

/* ── 2. BACKGROUND PILE ─────────────────────────────────── */
const hero = document.querySelector('.hero');
if (!hero) return;
const COL = [['#4a2818', '#c9714a'], ['#1e2d3d', '#5a8fa8'], ['#2d3a2e', '#6a9a72'], ['#3a2040', '#9a6ac0'], ['#3a3020', '#b0963c'], ['#2d1e1e', '#c06a6a'], ['#1e2d2a', '#6ac0b8']];
const N = 7;                                                         // books per stack
const pile = document.createElement('div');
pile.className = 'lm-pile'; pile.setAttribute('aria-hidden', 'true');
pile.innerHTML = [0, 1].map(s =>
  `<div class="lm-stack ${s ? 'lm-stack-r' : 'lm-stack-l'}">${Array.from({ length: N }, (_, i) => {
    const c = COL[(i * 2 + s * 3) % COL.length];
    const w = 46 + ((i * 7 + s * 11) % 5) * 5;                       // 46–66px, a little different each
    const r = ((i * 37 + s * 19) % 7) - 3;                           // resting tilt −3…3°
    const dx = ((i * 53 + s * 29) % 9) - 4;                          // resting nudge −4…4px
    return `<i class="lm-lb" style="--w:${w}px;--r:${r}deg;--dx:${dx}px;--r0:${r * 5 + (s ? 18 : -18)}deg;background:linear-gradient(90deg,${c[0]},${c[1]})"></i>`;
  }).join('')}</div>`).join('');
hero.appendChild(pile);

if (reduce.matches) { pile.classList.add('static'); return; }        // finished pile, no motion

const stacks = [...pile.querySelectorAll('.lm-stack')];
let gen = 0, vis = false, userPaused = false;
const sleep = (ms, g) => new Promise(res => setTimeout(() => res(g === gen), ms));
async function loop(stack, lag, g) {
  const bs = [...stack.children];
  if (!await sleep(lag, g)) return;
  while (g === gen) {
    for (const b of bs) { b.classList.add('on'); if (!await sleep(1500, g)) return; }   // a book lands every 1.5s
    if (!await sleep(3200, g)) return;                                                 // admire the pile
    stack.classList.add('out'); if (!await sleep(1300, g)) return;                     // fade it away…
    stack.classList.add('reset'); bs.forEach(b => b.classList.remove('on')); void stack.offsetWidth;
    stack.classList.remove('out', 'reset');                                            // …and start again
    if (!await sleep(900, g)) return;
  }
}
function sync() {
  const run = vis && !document.hidden && !userPaused;
  gen++;                                                           // cancels every pending sleep
  if (!run) return;
  stacks.forEach((st, i) => {
    st.classList.add('reset'); [...st.children].forEach(b => b.classList.remove('on')); void st.offsetWidth;
    st.classList.remove('out', 'reset'); loop(st, i * 900, gen);
  });
}
if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); }, { threshold: .1 }).observe(hero);
document.addEventListener('visibilitychange', sync);
/* the reel's pause button also pauses the pile (it runs after the reel's own handler, so the label is already updated) */
const pp = hero.querySelector('.lm-pp');
if (pp) pp.addEventListener('click', () => { userPaused = pp.textContent === 'play'; sync(); });
})();
