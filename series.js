const cleanTitle = t => {
  let s = (t || '').trim();
  s = s.replace(/^SE\s+/, '');                                  // "SE Norwegian Wood"
  s = s.replace(/^[^\d:]+?\s\d+\s*:?\s+(?=\S)/, '');            // "Shiva Trilogy 2 : X", "PLBC 81: X", "kalki trilogy 01 X"
  s = s.replace(/(?:[:,]\s*|\s+)(?:vol\.?|volume|book)?\s*\d+$/i, ''); // "The Hidden Hindu 2", "Mahabharata: Volume 3"
  return s.trim() || t;
};

// ── SERIES (sr- namespace) ──
window.TsundokuSeries = (function () {
  const inflight = new Map();

  const keyOf = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '');
  const cleanName = s => (s || '').replace(/\s+/g, ' ').replace(/\s*(series|saga|trilogy)\s*$/i, ' $1').trim().toLowerCase();

  async function getJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }

  // Returns {name, index} | null. Throws on network failure.
  async function viaWikidata(book) {
    const base = 'https://www.wikidata.org/w/api.php';
    const s = await getJson(`${base}?action=wbsearchentities&search=${encodeURIComponent(book.title)}&language=en&type=item&limit=10&format=json&origin=*`);
    const ids = (s.search || []).map(x => x.id);
    if (!ids.length) return null;
    const e = await getJson(`${base}?action=wbgetentities&ids=${ids.join('|')}&props=claims|labels|descriptions&languages=en&format=json&origin=*`);
    const t = keyOf(book.title);
    for (const id of ids) {
      const ent = e.entities?.[id];
      const claim = ent?.claims?.P179?.[0];
      if (!claim) continue;
      const label = keyOf(ent.labels?.en?.value);
      const desc = (ent.descriptions?.en?.value || '').toLowerCase();
      const last = keyOf((book.author || '').split(/\s+/).pop());
      const titleOk = label === t || (label && (t.startsWith(label + ' ') || label.startsWith(t + ' ')));
      if (!titleOk) continue;
      const authorOk = last && keyOf(desc).includes(last);
      if (!authorOk && !/novel|book|fantasy|fiction|literary|written work|memoir|story|comic|manga/.test(desc)) continue;
      const serId = claim.mainsnak?.datavalue?.value?.id;
      if (!serId) continue;
      const ord = parseFloat(claim.qualifiers?.P1545?.[0]?.datavalue?.value);
      const sr = await getJson(`${base}?action=wbgetentities&ids=${serId}&props=labels&languages=en&format=json&origin=*`);
      const name = sr.entities?.[serId]?.labels?.en?.value;
      if (!name) continue;
      return { name: cleanName(name), index: isNaN(ord) ? null : ord };
    }
    return null;
  }

  // Best effort: Open Library edition "series" strings like "The Stormlight Archive ; 1"
  async function viaOpenLibrary(book) {
    const q = `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author || '')}&limit=1&fields=key`;
    const d = await getJson(q);
    const key = d.docs?.[0]?.key;
    if (!key) return null;
    const ed = await getJson(`https://openlibrary.org${key}/editions.json?limit=25`);
    for (const e of ed.entries || []) {
      const raw = Array.isArray(e.series) ? e.series[0] : e.series;
      if (!raw || typeof raw !== 'string') continue;
      const m = raw.match(/^(.*?)\s*(?:;|,|#|\(|book|vol\.?|volume)\s*(\d+(?:\.\d+)?)\)?\s*$/i);
      const name = cleanName(m ? m[1] : raw);
      if (!name) continue;
      return { name, index: m ? parseFloat(m[2]) : null };
    }
    return null;
  }

  async function viaGemini(book) {
    const session = (await sb.auth.getSession()).data.session;
    const prompt = `Is the book "${book.title}" by ${book.author || 'an unknown author'} part of a named series? Respond ONLY with valid JSON (no markdown): {"series": string or null, "index": number or null}. Use the series' common English name, e.g. "Shiva Trilogy". "index" is this book's position in the series. If you are not sure, return null for both. Never guess.`;
    const res = await fetch('https://rrnryszgvctxainqyuyr.supabase.co/functions/v1/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (!parsed.series || typeof parsed.series !== 'string') return null;
    const idx = parseFloat(parsed.index);
    return { name: cleanName(parsed.series), index: isNaN(idx) ? null : idx };
  }

  async function run(book) {
    const probe = { ...book, title: cleanTitle(book.title) };
    let result = null, failed = 0;
    for (const fn of [viaWikidata, viaGemini]) {
      try {
        const r = await fn(probe);
 
        if (r) { result = r; break; }
      } catch (e) { if (fn === viaGemini) failed++; }
    }
    if (!result && failed > 0) return book; // Gemini failed (quota/network): leave unchecked, retry next open
    const updates = result
      ? { series_name: result.name, series_index: result.index, series_source: 'auto' }
      : { series_name: null, series_index: null, series_source: 'none' };
    // manual may have been set while we were fetching
    if (book.series_source === 'manual') return book;
    if (await dbUpdate(book.id, updates)) Object.assign(book, updates);
    return book;
  }

  function detect(book) {
    if (!book || !book.title) return Promise.resolve(book);
    if (book.series_source) return Promise.resolve(book); // auto / manual / none → never re-check
    const k = String(book.id);
    if (inflight.has(k)) return inflight.get(k);
    const p = run(book).finally(() => inflight.delete(k));
    inflight.set(k, p);
    return p;
  }

  function booksIn(seriesKey) {
    return books
      .filter(b => (b.series_source === 'auto' || b.series_source === 'manual') && keyOf(b.series_name) === seriesKey)
      .sort((a, b) => (a.series_index ?? 1e9) - (b.series_index ?? 1e9));
  }

  // ── Series page ──
  let pg = null, openKey = null, bgRunning = false;

  function ensurePage() {
    if (pg) return pg;
    pg = document.createElement('div');
    pg.id = 'srPage';
    pg.className = 'sr-page';
    pg.innerHTML = `<div class="sr-page-bar">
        <button type="button" class="sr-back" id="srBack" aria-label="back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div class="sr-page-titles"><div class="sr-page-title" id="srTitle"></div><div class="sr-page-sub" id="srSub"></div></div>
      </div>
      <div class="sr-page-scroll" id="srScroll"></div>`;
    document.body.appendChild(pg);
    pg.querySelector('#srBack').addEventListener('click', close);
    pg.querySelector('#srScroll').addEventListener('click', e => {
      const row = e.target.closest('.sr-row-tap');
      if (!row) return;
      close();
      setTimeout(() => { if (typeof openDetailModal === 'function') openDetailModal(row.dataset.id); }, 120);
    });
    return pg;
  }

  function joinNums(a) {
    if (a.length <= 1) return a.join('');
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  function rowHtml(b, cov) {
    const n = b.series_index != null && b.series_index !== '' ? Number(b.series_index) : null;
    const om = window.OM && OM.is(b) ? OM.range(b) : null;
    const inOm = !om && b.status === 'not-owned' && cov && n != null && cov.has(n);
    const st = inOm ? 'in your omnibus' : (b.status === 'not-owned' ? 'not owned' : b.status);
    return `<div class="sr-row sr-row-tap" data-id="${b.id}">
      <div class="sr-num-col">${om ? om.a + '–' + om.z : (n != null && !isNaN(n) ? n : '–')}</div>
      <div class="sr-cover">${coverHtml(b, 12)}</div>
      <div class="sr-info">
        <div class="sr-row-title">${escapeHtml(cleanTitle(b.title || ''))}</div>
        <div class="sr-row-author">${escapeHtml(b.author || '')}</div>
        ${om ? OM.parts(b).map((p, i) => `<div class="sr-row-author">${om.a + i} · ${escapeHtml(p.n)} — ${p.d ? 'read' : 'unread'}</div>`).join('') : ''}
      </div>
      <span class="sr-st sr-st-${b.status === 'not-owned' ? 'none' : b.status}">${st}</span>
    </div>`;
  }

  function render() {
    if (!pg || !openKey) return;
    const list = booksIn(openKey);
    const scroll = pg.querySelector('#srScroll');
    if (!list.length) { scroll.innerHTML = '<div class="sr-empty">nothing on your shelf for this series yet</div>'; return; }

    pg.querySelector('#srTitle').textContent = list[0].series_name;
    const numbered = list.filter(b => b.series_index != null && b.series_index !== '' && !isNaN(Number(b.series_index)));
    const unnumbered = list.filter(b => !numbered.includes(b));
    const owned = list.filter(b => b.status !== 'not-owned');
    const cov = new Set();
    owned.forEach(b => { const g = window.OM && OM.is(b) ? OM.range(b) : null; if (g) for (let k = g.a; k <= g.z; k++) cov.add(k); });
    const ownedInts = owned.filter(b => numbered.includes(b)).map(b => Number(b.series_index)).filter(Number.isInteger).concat([...cov]);
    const ints = numbered.map(b => Number(b.series_index)).filter(Number.isInteger);
    const haveSet = new Set([...ints, ...cov]);
    pg.querySelector('#srSub').textContent = ownedInts.length
      ? `you have ${joinNums([...new Set(ownedInts)].sort((a, b) => a - b))}`
      : `${owned.length} ${owned.length === 1 ? 'book' : 'books'}`;

    let html = '';
    // walk numbered books
    let prevInt = null;
    numbered.forEach(b => {
      const n = Number(b.series_index);
      if (Number.isInteger(n)) {
        if (prevInt != null) for (let g = prevInt + 1; g < n; g++) if (!haveSet.has(g)) html += `<div class="sr-row sr-gap"><div class="sr-num-col">${g}</div><div class="sr-gap-text">not on your shelf</div></div>`;
        prevInt = Math.max(prevInt ?? 0, n, (window.OM && OM.is(b) && OM.range(b)) ? OM.range(b).z : 0);
      }
      html += rowHtml(b, cov);
    });
    html += unnumbered.map(b => rowHtml(b, cov)).join('');
    if (list.length === 1) html += '<div class="sr-empty">just this one on your shelf so far</div>';
    scroll.innerHTML = html;
  }

  // Other books by the same author may not be checked yet; check a few quietly.
  async function backgroundDetect(author) {
    if (bgRunning || !author) return;
    bgRunning = true;
    const todo = books.filter(b => !b.series_source && b.title && (b.author || '').trim() === author.trim()).slice(0, 8);
    for (const b of todo) {
      if (!openKey) break;
      await detect(b);
      render();
      await new Promise(r => setTimeout(r, 400));
    }
    bgRunning = false;
  }

  function open(seriesKey) {
    if (!seriesKey) return;
    ensurePage();
    openKey = seriesKey;
    render();
    pg.querySelector('#srScroll').scrollTop = 0;
    requestAnimationFrame(() => pg.classList.add('open'));
    const first = booksIn(seriesKey)[0];
    if (first) backgroundDetect(first.author);
  }

  function close() {
    if (!pg) return;
    pg.classList.remove('open');
    openKey = null;
  }

  // Series line under the author. Hidden unless the book has a series.
  function mount(book, anchor) {
    if (!anchor || !book) return;
    const next = anchor.nextElementSibling;
    if (next && next.classList.contains('sr-line')) next.remove();
    anchor.dataset.srBook = String(book.id);
    const has = (book.series_source === 'auto' || book.series_source === 'manual') && book.series_name;
    if (has) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'sr-line';
      el.dataset.series = keyOf(book.series_name);
      const num = book.series_index != null && book.series_index !== '' ? Number(book.series_index) : null;
      el.innerHTML = `<span class="sr-name">${escapeHtml(book.series_name)}</span>`
        + (num != null && !isNaN(num) ? `<span class="sr-sep">·</span><span class="sr-num">book ${num}</span>` : '')
        + `<svg class="sr-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="9 18 15 12 9 6"/></svg>`;
      el.addEventListener('click', e => { e.stopPropagation(); open(el.dataset.series); });
      anchor.after(el);
      return;
    }
    if (!book.series_source) {
      detect(book).then(b => {
        if (anchor.dataset.srBook === String(book.id) && b && b.series_source) mount(b, anchor);
      });
    }
  }

  // Edit-sheet fields, injected after the themes field.
  function mountEdit(book) {
    const themes = document.getElementById('editThemes');
    if (!themes || !book) return;
    let box = document.getElementById('srEditBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'srEditBox';
      box.className = 'sr-edit';
      box.innerHTML = `<div class="sr-edit-head"><span class="es-field-label">Series <span style="color:var(--text-muted);font-weight:400;font-size:10px">— name and book number</span></span><span class="sr-badge" id="srEditBadge"></span></div>
        <div class="sr-edit-row">
          <input type="text" class="es-input" id="srEditName" placeholder="e.g. shiva trilogy" />
          <input type="text" inputmode="decimal" class="es-input" id="srEditIdx" placeholder="#" />
          <input type="text" class="es-input" id="srEditCovers" placeholder="1-3" title="omnibus covers books, e.g. 1-3" />
        </div>`;
      (themes.closest('.es-field-row') || themes.parentElement).after(box);
      box.addEventListener('input', () => {
        const same = (document.getElementById('srEditName').value.trim().toLowerCase() + '|' + document.getElementById('srEditIdx').value.trim() + '|' + document.getElementById('srEditCovers').value.trim().replace(/\s+/g, '')) === box.dataset.orig;
        document.getElementById('srEditBadge').textContent = same ? (box.dataset.src === 'auto' ? 'auto-detected' : box.dataset.src === 'manual' ? 'set by you' : '') : 'set by you';
      });
    }
    const name = book.series_name || '';
    const idx = book.series_index != null && book.series_index !== '' ? String(Number(book.series_index)) : '';
    document.getElementById('srEditName').value = name;
    document.getElementById('srEditIdx').value = idx;
    document.getElementById('srEditCovers').value = book.series_covers || '';
    box.dataset.book = String(book.id);
    box.dataset.src = book.series_source || '';
    box.dataset.orig = name.trim().toLowerCase() + '|' + idx + '|' + (book.series_covers || '');
    document.getElementById('srEditBadge').textContent = book.series_source === 'auto' ? 'auto-detected' : book.series_source === 'manual' ? 'set by you' : '';
  }

  // Returns the columns to merge into the edit save. {} when untouched.
  function readEdit(id) {
    const box = document.getElementById('srEditBox');
    if (!box || box.dataset.book !== String(id)) return {};
    const name = document.getElementById('srEditName').value.trim().toLowerCase();
    const rawIdx = document.getElementById('srEditIdx').value.trim();
    const cov = document.getElementById('srEditCovers').value.trim().replace(/\s+/g, '');
    if ((name + '|' + rawIdx + '|' + cov) === box.dataset.orig) return {};
    if (!name) return { series_name: null, series_index: null, series_source: 'none', series_covers: cov || null };
    const idx = parseFloat(rawIdx);
    return { series_name: name, series_index: isNaN(idx) ? null : idx, series_source: 'manual', series_covers: cov || null };
  }

    // ── Bulk detection: Wikipedia evidence → Gemini in batches ──
  const BAD_SERIES = /classics|edition|\bpress\b|publish|collection|library|bookshelf|tascabili|poche|\bbur\b|supercoralli|\bno\.\s*\d|\s--\s|\d{4,}/i;
  const okSeries = n => !!n && typeof n === 'string' && !BAD_SERIES.test(n);

  async function wikiEvidence(book) {
    const q = encodeURIComponent(`${book.title} ${book.author || ''} novel`);
    const d = await getJson(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=1&prop=extracts|revisions&exintro=1&explaintext=1&exchars=350&rvprop=content&rvslots=main&rvsection=0&format=json&formatversion=2&origin=*`);
    const p = d.query?.pages?.[0];
    if (!p) return '';
    const wt = p.revisions?.[0]?.slots?.main?.content || '';
    const m = wt.match(/\|\s*series\s*=\s*([^\n|]+)/i);
    const infobox = m ? m[1].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/<[^>]+>|'''?|\{\{|\}\}/g, '').trim() : '';
    return `page "${p.title}"` + (infobox ? `; infobox series: ${infobox}` : '') + `; intro: ${(p.extract || '').replace(/\s+/g, ' ').slice(0, 300)}`;
  }

  async function bulkDetect({ limit = 12, dry = false } = {}) {
    const todo = books.filter(b => !b.series_source && b.title).slice(0, limit);
    if (!todo.length) { console.log('nothing to check'); return []; }
    const known = [...new Set(books.filter(b => (b.series_source === 'manual' || b.series_source === 'auto') && okSeries(b.series_name)).map(b => b.series_name))];
    const session = (await sb.auth.getSession()).data.session;
    const report = [];
    for (let i = 0; i < todo.length; i += 12) {
      const batch = todo.slice(i, i + 12);
      const ev = await Promise.all(batch.map(b => wikiEvidence({ ...b, title: cleanTitle(b.title) }).catch(() => '')));
      const lines = batch.map((b, j) => `${j + 1} | ${cleanTitle(b.title)} | ${b.author || 'unknown'} | wikipedia: ${ev[j] || 'none found'}`).join('\n');
      const prompt = `For each book below, decide whether it is part of a named book series.
Rules:
- Use the Wikipedia evidence when it clearly matches the book. Otherwise use only what you are certain of. Never guess.
- "series" is the series' common English name in lowercase, e.g. "shiva trilogy". If the book belongs to one of these existing names, reuse it exactly: ${known.join('; ') || '(none yet)'}
- "index" is the book's position in the series as a number, or null if unsure. Omnibus editions and box sets: null.
- Publisher imprints, editions and collections (Penguin Classics, Dover Thrift, etc.) are NOT series.
- "basis" is "wikipedia" or "memory".
Respond ONLY with a JSON array, one object per book: [{"n": 1, "series": string or null, "index": number or null, "basis": string}]

Books (n | title | author | evidence):
${lines}`;
      let arr;
      try {
        const res = await fetch('https://rrnryszgvctxainqyuyr.supabase.co/functions/v1/gemini-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ prompt })
        });
        if (!res.ok) throw new Error('http ' + res.status);
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1));
      } catch (e) { console.warn('batch skipped (left unchecked):', i, e.message); continue; }
      for (const r of arr) {
        const b = batch[(r.n | 0) - 1];
        if (!b || b.series_source === 'manual') continue;
        const name = okSeries(r.series) ? cleanName(r.series) : null;
        const idx = parseFloat(r.index);
        const updates = name
          ? { series_name: name, series_index: isNaN(idx) ? null : idx, series_source: 'auto' }
          : { series_name: null, series_index: null, series_source: 'none' };
        report.push({ title: b.title, series: name, idx: updates.series_index, basis: r.basis });
        if (!dry && await dbUpdate(b.id, updates)) Object.assign(b, updates);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    console.table(report.filter(r => r.series));
    return report;
  }
  
  return { detect, booksIn, keyOf, mount, mountEdit, readEdit, open, close, bulkDetect };})();
