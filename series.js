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
    const s = await getJson(`${base}?action=wbsearchentities&search=${encodeURIComponent(book.title)}&language=en&type=item&limit=6&format=json&origin=*`);
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
      if (label !== t) continue;
      if (!/novel|book|fantasy|fiction|literary|written work|memoir|story/.test(desc)) continue;
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

  return { detect, booksIn, keyOf, mount() {}, open() {} }; // mount/open filled in steps 3–4
})();
