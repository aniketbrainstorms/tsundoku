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
  // A collection is a book of many short pieces (stories, essays). Parts are {n, d} only: no summaries, no per-part pages.
  const coll = b => !!b && !!b.is_collection && b.status !== 'not-owned';
  const is = b => coll(b) || (!!b && b.status !== 'not-owned' && !!range(b));

  function parts(b) {
    if (coll(b)) return (Array.isArray(b.parts) ? b.parts : []).map(p => ({ n: String((p && p.n) || ''), s: '', d: p && p.d ? 1 : 0, r: 0, t: 0 }));
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
    if (coll(b)) {
      const done = ps.filter(p => p.d).length;
      const u = { parts: ps.map(p => ({ n: p.n, d: p.d ? 1 : 0 })) };
      let st = status;
      if (!st) {
        if (ps.length && done === ps.length) st = 'read';
        else if (done > 0 && b.status === 'unread') st = 'reading';
        else if (done < ps.length && b.status === 'read') st = 'reading';
      }
      if (st && st !== b.status) { u.status = st; if (st === 'read') u.created_at = new Date().toISOString(); }
      const ok = await dbUpdate(b.id, u);
      if (ok && u.status) { b.status = u.status; if (u.created_at) b.created_at = u.created_at; }
      return ok; // parts are set optimistically by the caller
    }
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
    secondary.innerHTML = `${IC.check} ${coll(b) ? (!parts(b).length ? 'Add Stories' : status === 'read' ? 'Edit Stories' : 'Mark a Story as Read') : (status === 'read' ? 'Edit Parts' : 'Mark a Part as Read')}`;
  }

  // ── Detail sheet: progress strip + summary carousel ──
  function barHtml(ps) {
    const d = ps.filter(p => p.d).length;
    return `<div class="om-bar"><i style="width:${ps.length ? Math.round(d / ps.length * 100) : 0}%"></i></div>`;
  }
  function segsHtml(ps) {
    return `<div class="om-segs">${ps.map((p, i) => `<span class="om-seg${p.d ? ' on' : ''}" style="flex:${p.t || 1}"><i></i>${p.d ? '✓ ' : ''}${i + 1}</span>`).join('')}</div>`;
  }
  function decorateDetail(b) {
    const old = document.getElementById('omDetailProg'); if (old) old.remove();
    const row = document.querySelector('.ds-status-row');
    const lab = document.querySelector('#dsSummarySection .summary-label');
    if (!is(b) || coll(b)) {
      if (lab && lab.dataset.om) { lab.textContent = 'SUMMARY'; delete lab.dataset.om; }
      const h = document.getElementById('dsAiLibrarian');
      if (h && !document.getElementById('dsAiSummary')) h.innerHTML = '<p id="dsAiSummary" style="margin-bottom:0;"></p>';
      if (!is(b)) return;
      const cp = parts(b), cd = cp.filter(p => p.d).length;
      if (row) row.insertAdjacentHTML('afterend', `<div class="om-prog" id="omDetailProg">${barHtml(cp)}<div class="om-prog-t">${cp.length ? `${cd} of ${cp.length} read` : 'no stories yet'}</div></div>`);
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
    _cl = { id: b.id, pend: !!pend, f: 'all', mode: 'list', tab: 'titles', draft: '', cnt: '', sug: false };
    sheet().classList.add('on');
    if (coll(b) && !parts(b).length) editList(); else drawChecklist();
  }
  function drawChecklist() {
    const b = books.find(x => x.id === _cl.id); if (!b) return;
    if (coll(b)) return drawColl(b);
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
    if (coll(b)) return tickColl(b, i);
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

  // ── Collection checklist (many stories) ──
  const PH = /^Story \d+$/;
  function drawColl(b) {
    const body = document.getElementById('omShBody'), ps = parts(b);
    if (_cl.mode === 'edit') return drawEdit(b, ps, body);
    const d = ps.filter(p => p.d).length, f = _cl.f;
    const old = body.querySelector('.om-list'), top = old ? old.scrollTop : 0;
    const rows = ps.map((p, i) => ({ p, i })).filter(x => f === 'all' || (f === 'read' ? x.p.d : !x.p.d));
    body.innerHTML = `<div class="om-h">Mark as read</div><div class="om-sub">${escapeHtml(b.title)} · ${d} of ${ps.length} read</div>`
      + `<div class="om-chips">${['all', 'unread', 'read'].map(k => `<button type="button" class="${f === k ? 'on' : ''}" onclick="OM.filter('${k}')">${k}</button>`).join('')}</div>`
      + `<div class="om-list">${rows.length ? rows.map(x => `<button class="om-k${x.p.d ? ' on' : ''}" onclick="OM.tick(${x.i})"><span class="om-bx">${x.p.d ? '✓' : ''}</span>${escapeHtml(x.p.n)}</button>`).join('') : `<p class="om-note">${f === 'read' ? 'nothing read yet' : 'all read'}</p>`}</div>`
      + (d === ps.length ? '<p class="om-note">All stories read. Moved to Read.</p>' : '')
      + `<div class="om-ac"><button class="om-b" onclick="OM.editList()">edit list</button><button class="om-b" onclick="OM.closeSheet()">Close</button></div>`;
    const nl = body.querySelector('.om-list'); if (nl) nl.scrollTop = top;
  }
  function filter(k) { _cl.f = k; drawChecklist(); }
  async function tickColl(b, i) {
    const ps = parts(b); if (!ps[i]) return;
    const prev = { parts: b.parts, status: b.status };
    ps[i].d = ps[i].d ? 0 : 1;
    b.parts = ps.map(p => ({ n: p.n, d: p.d }));
    drawChecklist();
    const ok = await persist(b, ps, null);
    if (!ok) { b.parts = prev.parts; b.status = prev.status; drawChecklist(); return; }
    refresh(b);
    if (ps.every(p => p.d)) setTimeout(closeSheet, 900);
  }
  function nextList(ps) {
    if (_cl.tab === 'titles') {
      const seen = new Set(), out = []; let dupes = 0;
      for (const ln of _cl.draft.split(/\r?\n/)) {
        const n = ln.replace(/^\s*(?:\d+\s*[.)]|[-•*])\s*/, '').trim();
        if (!n) continue;
        const k = n.toLowerCase(); if (seen.has(k)) { dupes++; continue; }
        seen.add(k); out.push(n);
      }
      const ph = ps.length && ps.every(p => PH.test(p.n)), old = new Map(ps.map(p => [p.n.toLowerCase(), p.d]));
      return { dupes, list: out.slice(0, 500).map((n, i) => ({ n, d: ph ? (ps[i] ? ps[i].d : 0) : (old.get(n.toLowerCase()) || 0) })) };
    }
    const n = Math.min(500, parseInt(_cl.cnt) || 0);
    return { dupes: 0, list: Array.from({ length: n }, (_, i) => ps[i] ? { n: ps[i].n, d: ps[i].d } : { n: 'Story ' + (i + 1), d: 0 }) };
  }
  function drawEdit(b, ps, body) {
    const ph = ps.length && ps.every(p => PH.test(p.n)), t = _cl.tab;
    body.innerHTML = `<div class="om-h">${ps.length ? 'Edit list' : 'Add stories'}</div><div class="om-sub">${escapeHtml(b.title)}</div>`
      + `<div class="om-chips"><button type="button" class="${t === 'titles' ? 'on' : ''}" onclick="OM.setTab('titles')">paste titles</button><button type="button" class="${t === 'count' ? 'on' : ''}" onclick="OM.setTab('count')">just a number</button></div>`
      + (t === 'titles'
        ? `<p class="om-note">One title per line. Numbers and bullets at the start of a line are dropped. ${ph ? 'Your list is numbered placeholders, so ticks stay by position.' : 'Ticked stories stay ticked if their titles still match.'}</p>${_cl.sug ? '<p class="om-note">Suggested list. Check it against your edition before saving.</p>' : ''}<textarea class="om-ta" oninput="OM.draftIn(this.value)" placeholder="The Judgment&#10;The Metamorphosis">${escapeHtml(_cl.draft)}</textarea><button type="button" class="om-b" id="omSug" style="width:100%;margin-top:8px" onclick="OM.suggest()">suggest a list</button>`
        : `<p class="om-note">Enter how many stories the book has. They are numbered Story 1, Story 2 and so on, and you can rename them later. Ticks are kept.</p><input class="om-in" inputmode="numeric" placeholder="e.g. 78" value="${escapeHtml(_cl.cnt)}" oninput="OM.cntIn(this.value)">`)
      + `<div class="om-note" id="omRv"></div><div class="om-ac"><button class="om-b" onclick="OM.cancelEdit()">${ps.length ? 'Cancel' : 'Close'}</button><button class="om-b p" id="omSv" onclick="OM.saveList()">Save list</button></div>`;
    review();
  }
  function review() {
    const b = books.find(x => x.id === _cl.id), rv = document.getElementById('omRv'), sv = document.getElementById('omSv');
    if (!b || !rv || !sv) return;
    const ps = parts(b), r = nextList(ps), n = r.list.length;
    const lost = ps.filter(p => p.d).length - r.list.filter(x => x.d).length;
    let h = n ? `${n} ${n === 1 ? 'story' : 'stories'}${r.dupes ? ` · ${r.dupes} duplicate${r.dupes > 1 ? 's' : ''} removed` : ''}` : 'nothing to save yet';
    if (lost > 0) h += `<br>${lost} ticked ${lost === 1 ? 'story' : 'stories'} would be removed${_cl.tab === 'count' ? '. enter a higher number' : ''}`;
    rv.innerHTML = h; sv.disabled = !n || (_cl.tab === 'count' && lost > 0);
  }
  function editList() {
    const b = books.find(x => x.id === _cl.id); if (!b) return;
    const ps = parts(b);
    _cl.mode = 'edit'; _cl.sug = false;
    _cl.tab = ps.length && ps.every(p => PH.test(p.n)) ? 'count' : 'titles';
    _cl.draft = ps.map(p => p.n).join('\n'); _cl.cnt = ps.length ? String(ps.length) : '';
    drawChecklist();
  }
  function setTab(t) { _cl.tab = t; drawChecklist(); }
  function draftIn(v) { _cl.draft = v; _cl.sug = false; review(); }
  function cntIn(v) { _cl.cnt = v.replace(/\D/g, '').slice(0, 3); review(); }
  function cancelEdit() {
    const b = books.find(x => x.id === _cl.id);
    if (!b || !parts(b).length) return closeSheet();
    _cl.mode = 'list'; drawChecklist();
  }
  async function saveList() {
    const b = books.find(x => x.id === _cl.id); if (!b) return;
    const r = nextList(parts(b)); if (!r.list.length) return;
    const prev = b.parts;
    b.parts = r.list;
    const ok = await persist(b, r.list, null);
    if (!ok) { b.parts = prev; return; }
    _cl.mode = 'list'; _cl.f = 'all'; drawChecklist(); refresh(b);
    showToast(`list saved · ${r.list.length} stories`);
  }
  async function suggest() {
    const b = books.find(x => x.id === _cl.id); if (!b) return;
    const btn = document.getElementById('omSug'); if (btn) { btn.disabled = true; btn.textContent = 'asking…'; }
    try {
      const session = (await sb.auth.getSession()).data.session;
      const prompt = `List the contents of "${b.title}" by ${b.author || 'unknown'}, in table-of-contents order, as story titles. Respond ONLY with a JSON array of strings, no markdown. If you are not certain of the contents, respond with [].`;
      const res = await fetch('https://rrnryszgvctxainqyuyr.supabase.co/functions/v1/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)).filter(x => typeof x === 'string' && x.trim());
      if (!arr.length) throw new Error('empty');
      _cl.draft = arr.join('\n'); _cl.tab = 'titles'; _cl.sug = true; drawChecklist();
    } catch (e) {
      showToast('Could not suggest a list');
      if (btn) { btn.disabled = false; btn.textContent = 'suggest a list'; }
    }
  }

  // ── Reading card ──
  function card(b) {
    if (coll(b)) {
      const cp = parts(b), cd = cp.filter(p => p.d).length;
      return { label: '', segs: `${barHtml(cp)}<div class="om-prog-t">${cp.length ? `${cd} of ${cp.length} stories read` : 'no stories yet'}</div>` };
    }
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
    if (!is(b) || coll(b)) return;
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

  return { range, is, coll, parts, filter, editList, setTab, draftIn, cntIn, cancelEdit, saveList, suggest, decorateDetail, renderCTA, renderSummary, onScroll, openChecklist, closeSheet, tick, choose, card, progressOpen, pmGo, progressPreview, progressSave, hasPm: () => !!pm };
})();
