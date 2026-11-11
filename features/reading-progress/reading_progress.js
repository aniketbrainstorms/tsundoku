// READING PROGRESS inside the detail sheet / desktop panel (rp-)
// Saves through confirmProgress() in app.js, so behaviour matches the old modal.
(function () {
  const IDS = ['rpHostSheet', 'rpHostDdp'];
  const saved = {};
  const wants = b => !!b && b.status === 'reading' && !(window.OM && OM.is(b));

  function read(host) {
    const t = Math.max(0, parseInt(host.querySelector('[data-rp=tp]').value) || 0);
    let r = Math.max(0, parseInt(host.querySelector('[data-rp=pr]').value) || 0);
    if (t) r = Math.min(r, t);
    return [r, t];
  }

  function paint(host) {
    const [r, t] = read(host), s = saved[host.id];
    const pct = t ? Math.min(100, Math.round(r / t * 100)) : 0;
    host.querySelector('.rp-fill').style.width = pct + '%';
    host.querySelector('.rp-pct').textContent = t ? pct + '%' : '—';
    host.querySelector('.rp-sub').textContent = t ? r + ' of ' + t + ' pages' : r + ' pages read';
    const done = t > 0 && r >= t, dirty = r !== s.r || t !== s.t;
    const btn = host.querySelector('[data-rp=save]');
    btn.classList.toggle('dirty', dirty || done);
    btn.textContent = done ? 'Finish' : (dirty ? 'Save' : 'Saved');
  }

  function mount(book, id) {
    const host = document.getElementById(id);
    if (!host) return;
    if (!wants(book)) { host.classList.remove('on'); host.innerHTML = ''; return; }
    const r = book.pages_read || 0, t = book.total_pages || 0;
    saved[id] = { id: book.id, r, t };
    host.innerHTML =
      '<div class="rp-cap"><span>Progress</span><span class="rp-pct"></span></div>' +
      '<div class="rp-track"><span class="rp-fill"></span></div>' +
      '<div class="rp-sub"></div>' +
      '<div class="rp-row">' +
        '<input class="rp-in" data-rp="pr" type="number" inputmode="numeric" min="0" aria-label="Pages read" value="' + (r || '') + '">' +
        '<span class="rp-sep">/</span>' +
        '<input class="rp-in" data-rp="tp" type="number" inputmode="numeric" min="0" aria-label="Total pages" value="' + (t || '') + '">' +
        '<button type="button" class="rp-save" data-rp="save">Saved</button>' +
        '<button type="button" class="rp-q" data-rp="a10">+10</button>' +
        '<button type="button" class="rp-q" data-rp="a25">+25</button>' +
      '</div>';
    host.classList.add('on');
    paint(host);
  }

  function add(host, n) {
    const [r, t] = read(host);
    host.querySelector('[data-rp=pr]').value = t ? Math.min(t, r + n) : r + n;
    paint(host);
  }

  async function save(host) {
    const s = saved[host.id];
    if (!s || host.dataset.busy) return;
    const [r, t] = read(host);
    host.dataset.busy = '1';
    const btn = host.querySelector('[data-rp=save]');
    btn.disabled = true; btn.textContent = 'Saving…';
    progressBookId = s.id;
    document.getElementById('progressPagesRead').value = r;
    document.getElementById('progressTotalPages').value = t || '';
    try { await confirmProgress(); }
    finally { delete host.dataset.busy; btn.disabled = false; }
    const b = books.find(x => String(x.id) === String(s.id));
    if (b && b.status !== 'reading') {
      if (window.matchMedia('(min-width: 1024px)').matches) window.openDetailModal(b.id);
      else if (typeof DS !== 'undefined' && DS.isOpen && window.dsRefreshDetailSheet) window.dsRefreshDetailSheet();
    } else {
      mount(b, host.id);
    }
  }

  IDS.forEach(id => {
    const host = document.getElementById(id);
    if (!host) return;
    host.addEventListener('input', e => { if (e.target.dataset.rp) paint(host); });
    host.addEventListener('click', e => {
      const k = e.target.closest('[data-rp]')?.dataset.rp;
      if (k === 'a10') add(host, 10);
      else if (k === 'a25') add(host, 25);
      else if (k === 'save') save(host);
    });
  });

  // iOS: lift the sheet above the keyboard while a progress field is focused
  const vv = window.visualViewport;
  function lift() {
    const sh = document.getElementById('detailSheet');
    if (!sh) return;
    const a = document.activeElement;
    const kb = vv && a && a.closest && a.closest('.rp-box') ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0;
    sh.style.marginBottom = kb > 80 ? kb + 'px' : '';
  }
  window.addEventListener('focusin', lift);
  window.addEventListener('focusout', () => setTimeout(lift, 60));
  if (vv) vv.addEventListener('resize', lift);

  window.RP = { mount };
})();
