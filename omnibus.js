// ── OMNIBUS (om- namespace) ──
window.OM = (function () {
  const RNG = /^\s*(\d+)\s*[-–]\s*(\d+)\s*$/;
  const IC = {
    book: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    undo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`
  };

  function range(b) {
    const m = RNG.exec((b && b.series_covers) || '');
    if (!m) return null;
    const a = +m[1], z = +m[2];
    return z > a && z - a < 12 ? { a, z, n: z - a + 1 } : null;
  }
  const is = b => !!b && b.status !== 'not-owned' && !!range(b);

  function parts(b) {
    const g = range(b); if (!g) return [];
    const cur = Array.isArray(b.parts) ? b.parts : [];
    return Array.from({ length: g.n }, (_, i) => {
      const p = cur[i] || {};
      let name = p.n;
      if (!name) {
        const S = window.TsundokuSeries;
        const sib = S && b.series_name ? S.booksIn(S.keyOf(b.series_name)).find(x => x.id !== b.id && Number(x.series_index) === g.a + i) : null;
        name = sib ? cleanTitle(sib.title) : 'Part ' + (g.a + i);
      }
      return { n: name, s: p.s || '', d: p.d ? 1 : 0, r: +p.r || 0, t: +p.t || 0 };
    });
  }
  const sums = ps => ({
    r: ps.reduce((a, p) => a + (p.d ? (p.t || p.r) : p.r), 0),
    t: ps.reduce((a, p) => a + p.t, 0),
    d: ps.filter(p => p.d).length
  });
  const curIdx = ps => { const i = ps.findIndex(p => !p.d); return i < 0 ? ps.length - 1 : i; };

  async function persist(b, ps, status) {
    const s = sums(ps);
    const u = { parts: ps, pages_read: s.r, total_pages: s.t };
    if (status) u.status = status;
    if (s.d === ps.length) { u.status = 'read'; if (b.status !== 'read') u.created_at = new Date().toISOString(); }
    const ok = await dbUpdate(b.id, u);
    if (ok) Object.assign(b, u);
    return ok;
  }
  function refresh(b) {
    renderGrid();
    if (typeof dsRefreshDetailSheet === 'function' && String(editingId) === String(b.id)) dsRefreshDetailSheet();
  }

  // ── Detail sheet: CTA buttons ──
  function renderCTA(primary, secondary, status, b) {
    primary.onclick = async () => {
      const next = status === 'reading' ? 'unread' : 'reading';
      b.status = next; editStatus = next;
      await dbUpdate(b.id, { status: next });
      refresh(b);
    };
    secondary.onclick = () => openChecklist(b);
    secondary.className = 'ds-secondary-btn';
    if (status === 'reading') {
      primary.className = 'ds-primary-btn btn-accent';
      primary.innerHTML = `${IC.undo} Move to Unread`;
    } else if (status === 'read') {
      primary.className = 'ds-primary-btn btn-green';
      primary.innerHTML = `${IC.book} Move to Reading`;
    } else {
      primary.className = 'ds-primary-btn btn-accent';
      primary.innerHTML = `${IC.book} Move to Reading`;
    }
    secondary.innerHTML = `${IC.check} ${status === 'read' ? 'Edit Parts' : 'Mark a Part as Read'}`;
  }

  // ── Detail sheet: progress strip + summary carousel ──
  function segsHtml(ps) {
    return `<div class="om-segs">${ps.map((p, i) => `<span class="om-seg${p.d ? ' on' : ''}" style="flex:${p.t || 1}"><i></i>${p.d ? '✓ ' : ''}${i + 1}</span>`).join('')}</div>`;
  }
  function decorateDetail(b) {
    const old = document.getElementById('omDetailProg'); if (old) old.remove();
    const row = document.querySelector('.ds-status-row');
    const lab = document.querySelector('#dsSummarySection .summary-label');
    if (!is(b)) {
      if (lab && lab.dataset.om) { lab.textContent = 'SUMMARY'; delete lab.dataset.om; }
      const h = document.getElementById('dsAiLibrarian');
      if (h && !document.getElementById('dsAiSummary')) h.innerHTML = '<p id="dsAiSummary" style="margin-bottom:0;"></p>';
      return;
    }
    const ps = parts(b), s = sums(ps);
    if (row) row.insertAdjacentHTML('afterend', `<div class="om-prog" id="omDetailProg">${segsHtml(ps)}<div class="om-prog-t">${s.d} of ${ps.length} read</div></div>`);
    renderSummary(b);
  }
  function renderSummary(b) {
    const ps = parts(b);
    const host = document.getElementById('dsAiLibrarian');
    const lab = document.querySelector('#dsSummarySection .summary-label');
    if (!host) return;
    if (lab) lab.dataset.om = '1';
    host.innerHTML = `<div class="om-car" id="omCar" onscroll="OM.onScroll(this)">${ps.map((p, i) => `<div class="om-sl${p.d ? ' on' : ''}"><div class="om-pn"><span class="om-dot"></span>${i + 1} · ${escapeHtml(p.n)}<span class="om-st">${p.d ? 'read' : 'unread'}</span></div><p class="om-sum">${p.s ? escapeHtml(p.s) : 'writing…'}</p></div>`).join('')}</div><div class="om-dts" id="omDts">${ps.map((p, i) => `<i class="${i === 0 ? 'a' : ''}"></i>`).join('')}</div>`;
    if (lab) lab.textContent = `SUMMARY · 1/${ps.length}`;
    if (ps.some(p => !p.s)) gen(b);
  }
  function onScroll(el) {
    const i = Math.round(el.scrollLeft / (el.clientWidth || 1));
    document.querySelectorAll('#omDts i').forEach((d, j) => d.classList.toggle('a', j === i));
    const lab = document.querySelector('#dsSummarySection .summary-label');
    if (lab && lab.dataset.om) lab.textContent = `SUMMARY · ${i + 1}/${el.children.length}`;
  }
  const _gen = new Set();
  async function gen(b) {
    if (_gen.has(b.id)) return; _gen.add(b.id);
    try {
      const ps = parts(b);
      const session = (await sb.auth.getSession()).data.session;
      const prompt = `"${b.title}" by ${b.author || 'unknown'} is an omnibus edition of ${ps.length} books, in order. Current names: ${ps.map(p => p.n).join('; ')}. For each book write a spoiler-light summary of 2 to 3 sentences, and give its real title. Respond ONLY with a JSON array of ${ps.length} objects, no markdown: [{"name": string, "summary": string}]`;
      const res = await fetch('https://rrnryszgvctxainqyuyr.supabase.co/functions/v1/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1));
      const next = parts(b).map((p, i) => ({ ...p, s: p.s || (arr[i]?.summary || ''), n: /^Part \d+$/.test(p.n) && arr[i]?.name ? arr[i].name : p.n }));
      if (await dbUpdate(b.id, { parts: next })) b.parts = next;
      if (String(editingId) === String(b.id) && is(b)) renderSummary(b);
    } catch (e) { console.warn('omnibus summaries:', e.message); _gen.delete(b.id); }
  }

  // ── Checklist + choice sheet ──
  function sheet() {
    let o = document.getElementById('omSheet');
    if (!o) {
      o = document.createElement('div');
      o.id = 'omSheet'; o.className = 'om-ov';
      o.innerHTML = '<div class="om-sh" id="omShBody"></div>';
      o.addEventListener('click', e => { if (e.target === o) closeSheet(); });
      document.body.appendChild(o);
    }
    return o;
  }
  function closeSheet() { const o = document.getElementById('omSheet'); if (o) o.classList.remove('on'); }
  let _cl = null;
  function openChecklist(b, pend) {
    _cl = { id: b.id, pend: !!pend };
    sheet().classList.add('on'); drawChecklist();
  }
  function drawChecklist() {
    const b = books.find(x => x.id === _cl.id); if (!b) return;
    const ps = parts(b), s = sums(ps);
    const foot = s.d === ps.length ? `<p class="om-note">All ${ps.length} parts read. Moved to Read.</p>`
      : _cl.pend ? `<p class="om-note">Part finished. Where should the book sit?</p><div class="om-ac"><button class="om-b p" onclick="OM.choose('reading')">Keep in reading</button><button class="om-b" onclick="OM.choose('unread')">Move to unread</button></div>`
      : `<p class="om-note">Tick a part you finished.</p>`;
    document.getElementById('omShBody').innerHTML = `<div class="om-h">Mark as read</div><div class="om-sub">${escapeHtml(b.title)}</div>`
      + ps.map((p, i) => `<button class="om-k${p.d ? ' on' : ''}" onclick="OM.tick(${i})"><span class="om-bx">${p.d ? '✓' : ''}</span>${escapeHtml(p.n)}</button>`).join('')
      + foot + `<button class="om-b" style="width:100%;margin-top:12px" onclick="OM.closeSheet()">Close</button>`;
  }
  async function tick(i) {
    const b = books.find(x => x.id === _cl.id); if (!b) return;
    const ps = parts(b), p = ps[i];
    p.d = p.d ? 0 : 1;
    if (p.d && p.t > 0) p.r = p.t;
    if (!p.d && p.t > 0 && p.r >= p.t) p.r = 0;
    const n = ps.filter(x => x.d).length;
    _cl.pend = !!p.d && n < ps.length;
    const was = b.status;
    await persist(b, ps, (!p.d && was === 'read') ? 'reading' : null);
    drawChecklist(); refresh(b);
    if (n === ps.length) setTimeout(closeSheet, 900);
  }
  async function choose(st) {
    const b = books.find(x => x.id === _cl.id); if (!b) return;
    b.status = st; editStatus = st;
    await dbUpdate(b.id, { status: st });
    closeSheet(); refresh(b);
  }

  // ── Reading card ──
  function card(b) {
    const ps = parts(b), i = curIdx(ps);
    return { label: `Part ${i + 1} of ${ps.length} · ${escapeHtml(ps[i].n)}`, segs: segsHtml(ps) };
  }

  // ── Progress modal ──
  let pm = null;
  function pmSync() {
    if (!pm) return;
    pm.ps[pm.cur].r = Math.max(0, parseInt(document.getElementById('progressPagesRead').value) || 0);
    pm.ps[pm.cur].t = Math.max(0, parseInt(document.getElementById('progressTotalPages').value) || 0);
  }
  function pmLoad() {
    const p = pm.ps[pm.cur];
    document.getElementById('progressPagesRead').value = p.d && p.t ? p.t : (p.r || '');
    document.getElementById('progressTotalPages').value = p.t || '';
    document.querySelectorAll('#omPmTabs button').forEach((x, j) => x.classList.toggle('on', j === pm.cur));
  }
  function progressOpen(b) {
    const old = document.getElementById('omPmTabs'); if (old) old.remove();
    pm = null;
    if (!is(b)) return;
    const ps = parts(b);
    pm = { id: b.id, ps, cur: curIdx(ps), prev: b.pages_read || 0 };
    document.querySelector('#progressModal .progress-inputs-row').insertAdjacentHTML('beforebegin',
      `<div class="om-tabs" id="omPmTabs">${ps.map((p, i) => `<button type="button" onclick="OM.pmGo(${i})">${i + 1} · ${escapeHtml(p.n.length > 12 ? p.n.slice(0, 11) + '…' : p.n)}${p.d ? ' ✓' : ''}</button>`).join('')}</div>`);
    pmLoad(); updateProgressPreview();
  }
  function pmGo(i) { pmSync(); pm.cur = i; pmLoad(); updateProgressPreview(); }
  function progressPreview() {
    if (!pm) return;
    pmSync();
    const p = pm.ps[pm.cur];
    const s = sums(pm.ps.map(x => ({ ...x, d: x === p ? (x.t > 0 && x.r >= x.t) : x.d })));
    const pct = s.t > 0 ? Math.min(100, Math.round(s.r / s.t * 100)) : 0;
    const badge = document.getElementById('progressCoverBadge'); if (badge) badge.textContent = pct + '%';
    const btn = document.getElementById('saveProgressBtn');
    if (btn && p.t > 0 && p.r >= p.t && s.d < pm.ps.length) btn.textContent = 'finish part';
  }
  async function progressSave() {
    pmSync();
    const b = books.find(x => x.id === pm.id); if (!b) return;
    const p = pm.ps[pm.cur];
    if (p.t > 0) { p.r = Math.min(p.r, p.t); p.d = p.r >= p.t ? 1 : 0; }
    const finished = !!p.d && !(Array.isArray(b.parts) && b.parts[pm.cur] && b.parts[pm.cur].d);
    const n = pm.ps.filter(x => x.d).length;
    const btn = document.getElementById('saveProgressBtn'); btn.disabled = true; btn.textContent = 'Saving…';
    const ok = await persist(b, pm.ps, null);
    btn.disabled = false; btn.textContent = 'Save Progress';
    if (!ok) { showToast('Could not save — check connection'); return; }
    const delta = (b.pages_read || 0) - pm.prev;
    if (delta > 0 && currentUser) {
      const today = new Date().toISOString().slice(0, 10);
      sb.from('reading_log').upsert({ user_id: currentUser.id, book_id: b.id, date: today, pages_read: delta }, { onConflict: 'user_id,book_id,date' }).then(() => {}).catch(() => {});
    }
    closeModal('progressModal'); renderGrid();
    if (n === pm.ps.length) showToast('moved to read ✓');
    else if (finished) openChecklist(b, true);
    else showToast('Progress saved ✓');
  }

  return { range, is, parts, decorateDetail, renderCTA, renderSummary, onScroll, openChecklist, closeSheet, tick, choose, card, progressOpen, pmGo, progressPreview, progressSave, hasPm: () => !!pm };
})();
