// ── SERIES (sr- namespace) ──
window.TsundokuSeries = (function () {
  const inflight = new Map();

  const keyOf = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

  async function run(book) {
    let result = null, okCount = 0;
    for (const fn of [viaWikidata, viaOpenLibrary]) {
      try {
        const r = await fn(book);
        okCount++;
        if (r) { result = r; break; }
      } catch (e) { /* try next source */ }
    }
    if (!result && okCount === 0) return book; // all sources failed: leave unchecked, retry next open
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
    return pg;
  }

  function joinNums(a) {
    if (a.length <= 1) return a.join('');
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  function rowHtml(b) {
    const n = b.series_index != null && b.series_index !== '' ? Number(b.series_index) : null;
    const st = b.status === 'not-owned' ? 'not owned' : b.status;
    return `<div class="sr-row${b.id === undefined ? '' : ''}">
      <div class="sr-num-col">${n != null && !isNaN(n) ? n : '–'}</div>
      <div class="sr-cover">${coverHtml(b, 12)}</div>
      <div class="sr-info">
        <div class="sr-row-title">${escapeHtml(b.title || '')}</div>
        <div class="sr-row-author">${escapeHtml(b.author || '')}</div>
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
    const ints = numbered.map(b => Number(b.series_index)).filter(Number.isInteger);
    const haveSet = new Set(ints);
    pg.querySelector('#srSub').textContent = ints.length
      ? `you have ${joinNums([...haveSet].sort((a, b) => a - b))}`
      : `${list.length} ${list.length === 1 ? 'book' : 'books'}`;

    const lo = ints.length ? Math.min(...ints) : 0, hi = ints.length ? Math.max(...ints) : 0;
    let html = '';
    const done = new Set();
    numbered.forEach(b => {
      const n = Number(b.series_index);
      if (Number.isInteger(n) && ints.length > 1 && !done.has(n)) {
        done.add(n);
      }
    });
    // walk numbered books in order, inserting dashed gaps between owned integers
    let prevInt = null;
    numbered.forEach(b => {
      const n = Number(b.series_index);
      if (Number.isInteger(n)) {
        if (prevInt != null) for (let g = prevInt + 1; g < n; g++) if (!haveSet.has(g)) html += `<div class="sr-row sr-gap"><div class="sr-num-col">${g}</div><div class="sr-gap-text">not on your shelf</div></div>`;
        prevInt = n;
      }
      html += rowHtml(b);
    });
    html += unnumbered.map(rowHtml).join('');
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
      box.innerHTML = `<div class="sr-edit-head"><p class="field-label">series</p><span class="sr-badge" id="srEditBadge"></span></div>
        <div class="sr-edit-row">
          <input type="text" class="text-input" id="srEditName" placeholder="series name" />
          <input type="text" inputmode="decimal" class="text-input" id="srEditIdx" placeholder="#" />
        </div>`;
      themes.parentElement.after(box);
      box.addEventListener('input', () => {
        const same = (document.getElementById('srEditName').value.trim().toLowerCase() + '|' + document.getElementById('srEditIdx').value.trim()) === box.dataset.orig;
        document.getElementById('srEditBadge').textContent = same ? (box.dataset.src === 'auto' ? 'auto-detected' : box.dataset.src === 'manual' ? 'set by you' : '') : 'set by you';
      });
    }
    const name = book.series_name || '';
    const idx = book.series_index != null && book.series_index !== '' ? String(Number(book.series_index)) : '';
    document.getElementById('srEditName').value = name;
    document.getElementById('srEditIdx').value = idx;
    box.dataset.book = String(book.id);
    box.dataset.src = book.series_source || '';
    box.dataset.orig = name.trim().toLowerCase() + '|' + idx;
    document.getElementById('srEditBadge').textContent = book.series_source === 'auto' ? 'auto-detected' : book.series_source === 'manual' ? 'set by you' : '';
  }

  // Returns the columns to merge into the edit save. {} when untouched.
  function readEdit(id) {
    const box = document.getElementById('srEditBox');
    if (!box || box.dataset.book !== String(id)) return {};
    const name = document.getElementById('srEditName').value.trim().toLowerCase();
    const rawIdx = document.getElementById('srEditIdx').value.trim();
    if ((name + '|' + rawIdx) === box.dataset.orig) return {};
    if (!name) return { series_name: null, series_index: null, series_source: 'none' };
    const idx = parseFloat(rawIdx);
    return { series_name: name, series_index: isNaN(idx) ? null : idx, series_source: 'manual' };
  }

  return { detect, booksIn, keyOf, mount, mountEdit, readEdit, open, close };})();
