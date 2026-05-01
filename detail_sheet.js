
// ══════════════════════════════════════════════════════════════
// DETAIL BOTTOM SHEET — snap-based, Apple Maps / Spotify style
// ══════════════════════════════════════════════════════════════

// ── Sheet state ──
const DS = {
  HALF_RATIO: 0.46,   // 46% of sheet height from top = half state (~54% visible)
  FULL_RATIO: 0.08,   // 8% from top = full state (92% visible)
  SNAP_VELOCITY: 0.4, // px/ms threshold for velocity snapping
  isOpen: false,
  isExpanded: false,
  isDragging: false,
  startY: 0,
  startTranslate: 0,
  lastY: 0,
  lastTime: 0,
  velocity: 0,
  currentTranslate: 0,
  animating: false,
  summaryExpanded: false,
  // Store summary text for toggle
  summaryFull: '',
  summaryShort: '',
};

function dsGetHalfY() {
  return 0; // Auto-sizing sheet sits perfectly at bottom
}

function dsGetFullY() {
  return 0;
}

function dsSetTranslate(y, animate) {
  const sheet = document.getElementById('detailSheet');
  if (!sheet) return;
  DS.currentTranslate = y;
  if (animate) {
    sheet.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)';
  } else {
    sheet.style.transition = 'none';
  }
  sheet.style.setProperty('--ds-current-translate', `${y}px`);
  sheet.style.transform = `translateY(${y}px)`;
}

function dsSnapTo(expanded, animate = true) {
  const targetY = expanded ? dsGetFullY() : dsGetHalfY();
  dsSetTranslate(targetY, animate);
  DS.isExpanded = expanded;
  const overlay = document.getElementById('detailModal');
  overlay.classList.toggle('ds-expanded', expanded);
  const scroll = document.getElementById('dsScroll');
  scroll.classList.toggle('unlocked', expanded);
  const hint = document.getElementById('dsScrollHint');
  if (hint) hint.classList.add('hidden');
  if (!expanded) {
    document.getElementById('dsTop').classList.remove('scrolled');
  }
  // CTA always anchors to bottom of sheet — no repositioning needed,
  // flex column layout handles it. Just ensure scroll area contracts correctly.
  const dsScroll = document.getElementById('dsScroll');
  if (dsScroll) {
    dsScroll.style.transition = animate ? 'flex 0.38s cubic-bezier(0.32,0.72,0,1)' : 'none';
  }
}

let _dsOpenTime = 0;
function dsOpen() {
  const overlay = document.getElementById('detailModal');
  const sheet = document.getElementById('detailSheet');
  if (!overlay || !sheet) return;
  DS.isOpen = false;
  DS.isExpanded = false;
  DS.isDragging = false;
  _dsOpenTime = Date.now();
  sheet.style.transition = 'none';
  const offscreen = window.innerHeight;
  sheet.style.transform = `translateY(${offscreen}px)`;
  DS.currentTranslate = offscreen;
  overlay.classList.add('visible');
  overlay.style.pointerEvents = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          dsSnapTo(false, true);
        } catch(e) {
          console.error('dsSnapTo error:', e);
        }
        setTimeout(() => {
          DS.isOpen = true;
          overlay.style.pointerEvents = '';
        }, 420);
      }, 32);
    });
  });
}

function dsClose() {
  const sheetEl = document.getElementById('detailSheet');
  const sheetH = sheetEl ? sheetEl.offsetHeight : window.innerHeight * 0.92;
  dsSetTranslate(sheetH, true);
  const overlay = document.getElementById('detailModal');
  overlay.classList.remove('ds-expanded');
  overlay.style.pointerEvents = 'none';
  const section = document.getElementById('dsSummarySection');
  if (section) section.classList.remove('expanded');
  setTimeout(() => {
    overlay.classList.remove('visible');
    overlay.style.pointerEvents = '';
    DS.isOpen = false;
    DS.isExpanded = false;
    DS.summaryExpanded = false;
    closeEditSheet();
  }, 380);
}

// ── Touch / drag handling ──
function dsOnTouchStart(e) {
  if (DS.animating) return;
  if (!DS.isOpen && Date.now() - _dsOpenTime < 600) return;
  if (document.getElementById('progressModal').classList.contains('visible')) return;
  if (!e.target.closest('#detailSheet')) return;
  if (e.target.closest('#dsSummarySection') && !e.target.closest('#dsSummaryHeader')) return;
  // Block drag-up to full — only summary tap can expand
  // In FULL state, only allow drag from handle area
  if (DS.isExpanded) {
    const handle = document.getElementById('dsHandleWrap');
    const top = document.getElementById('dsTop');
    if (!handle.contains(e.target) && !top.contains(e.target)) return;
    // If scroll area has scrollTop > 0, don't intercept
    const scroll = document.getElementById('dsScroll');
    if (scroll.scrollTop > 2) return;
  }
  DS.isDragging = true;
  DS.startY = e.touches[0].clientY;
  DS.lastY = DS.startY;
  DS.lastTime = Date.now();
  DS.startTranslate = DS.currentTranslate;
  DS.velocity = 0;
  const sheet = document.getElementById('detailSheet');
  sheet.style.transition = 'none';
}

function dsOnTouchMove(e) {
  if (!DS.isDragging) return;
  const y = e.touches[0].clientY;
  const now = Date.now();
  const dt = Math.max(now - DS.lastTime, 1);
  DS.velocity = (y - DS.lastY) / dt;
  DS.lastY = y;
  DS.lastTime = now;

  const delta = y - DS.startY;
  let newTranslate = DS.startTranslate + delta;

  // Clamp: can't go above full position, slight resistance below half
  const fullY = dsGetFullY();
  const halfY = dsGetHalfY();
  if (newTranslate < 0) {
    newTranslate = 0 - Math.pow(0 - newTranslate, 0.6);
  }
  // No resistance dragging down, let it close smoothly
  dsSetTranslate(newTranslate, false);
  // Prevent page scroll only if no other modal is on top
  if (delta !== 0 && !document.getElementById('progressModal').classList.contains('visible')) e.preventDefault();
}

function dsOnTouchEnd(e) {
  if (!DS.isDragging) return;
  DS.isDragging = false;
  DS.startY = 0;

  const halfY = dsGetHalfY();
  const fullY = dsGetFullY();
  const midpoint = (halfY + fullY) / 2;

  // Close if dragged far enough down
  if (DS.currentTranslate > halfY + 60 || DS.velocity > 0.8) {
    dsClose();
    return;
  }
  dsSnapTo(false);
}

// Mouse equivalents for desktop
function dsOnMouseDown(e) {
  if (DS.isExpanded) {
    const handle = document.getElementById('dsHandleWrap');
    const top = document.getElementById('dsTop');
    if (!handle.contains(e.target) && !top.contains(e.target)) return;
  }
  DS.isDragging = true;
  DS.startY = e.clientY;
  DS.lastY = DS.startY;
  DS.lastTime = Date.now();
  DS.startTranslate = DS.currentTranslate;
  DS.velocity = 0;
  const sheet = document.getElementById('detailSheet');
  sheet.style.transition = 'none';
  e.preventDefault();

  function onMouseMove(e) {
    if (!DS.isDragging) return;
    const y = e.clientY;
    const now = Date.now();
    const dt = Math.max(now - DS.lastTime, 1);
    DS.velocity = (y - DS.lastY) / dt;
    DS.lastY = y;
    DS.lastTime = now;

    const delta = y - DS.startY;
    let newTranslate = DS.startTranslate + delta;
    const fullY = dsGetFullY(), halfY = dsGetHalfY();
    if (newTranslate < fullY) newTranslate = fullY - Math.pow(fullY - newTranslate, 0.6);
    if (newTranslate > halfY + 80) newTranslate = halfY + 80 + (newTranslate - halfY - 80) * 0.3;
    dsSetTranslate(newTranslate, false);
  }

  function onMouseUp() {
    if (!DS.isDragging) return;
    DS.isDragging = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    const halfY = dsGetHalfY();
    if (DS.currentTranslate > halfY + 60 || DS.velocity > 0.8) { dsClose(); return; }
    dsSnapTo(false);
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

// ── Sticky header border on scroll ──
function dsOnScroll() {
  const scroll = document.getElementById('dsScroll');
  const top = document.getElementById('dsTop');
  if (scroll && top) {
    top.classList.toggle('scrolled', scroll.scrollTop > 4);
  }
}

// ── Init drag events ──
function dsInitDragEvents() {
  const sheet = document.getElementById('detailSheet');
  if (!sheet) return;
  const overlay = document.getElementById('detailModal');
  overlay.addEventListener('touchstart', dsOnTouchStart, { passive: false });
  overlay.addEventListener('touchmove', dsOnTouchMove, { passive: false });
  overlay.addEventListener('touchend', dsOnTouchEnd, { passive: true });
  overlay.addEventListener('touchcancel', dsOnTouchEnd, { passive: true });
  sheet.addEventListener('mousedown', dsOnMouseDown);
  const scroll = document.getElementById('dsScroll');
  if (scroll) scroll.addEventListener('scroll', dsOnScroll, { passive: true });
}

// ── CTA rendering ──
function dsRenderCTA(status) {
  const primary = document.getElementById('dsPrimaryBtn');
  const secondary = document.getElementById('dsSecondaryBtn');
  if (!primary || !secondary) return;

  const icons = {
    book: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    history: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><polyline points="12 7 12 12 15 15"/></svg>`,
    undo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
    archive: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  };

  if (status === 'reading') {
    primary.className = 'ds-primary-btn btn-accent';
    primary.innerHTML = `${icons.check} Mark as Read`;
    secondary.innerHTML = `${icons.undo} Move to Unread`;
} else if (status === 'read') {
    primary.className = 'ds-primary-btn btn-green';
    primary.innerHTML = `${icons.history} Move to Reading`;
    secondary.innerHTML = `${icons.archive} Mark as Unread`;
  } else { // unread
    primary.className = 'ds-primary-btn btn-accent';
    primary.innerHTML = `${icons.book} Move to Reading`;
    secondary.innerHTML = `${icons.check} Mark as Read`;
  }
}

// ── Primary / secondary actions ──
async function doPrimaryAction() {
  const book = books.find(b => b.id === editingId);
  if (!book) return;
  let nextStatus;
  if (book.status === 'reading') nextStatus = 'read';
  else if (book.status === 'read') nextStatus = 'reading';
  else nextStatus = 'reading'; // unread → start reading

  book.status = nextStatus;
  editStatus = nextStatus;
  updateDetailBadge(nextStatus);
  dsRenderCTA(nextStatus);
  renderGrid();
  await dbUpdate(editingId, { status: nextStatus });
  showToast(nextStatus === 'read' ? 'Marked as read ✓' : nextStatus === 'reading' ? 'Happy reading! 📖' : 'Moved ✓');
}

async function doSecondaryAction() {
  const book = books.find(b => b.id === editingId);
  if (!book) return;
  let nextStatus;
  if (book.status === 'reading') nextStatus = 'unread';
  else if (book.status === 'read') nextStatus = 'unread';
  else nextStatus = 'read'; // unread → mark as read

  book.status = nextStatus;
  editStatus = nextStatus;
  updateDetailBadge(nextStatus);
  dsRenderCTA(nextStatus);
  renderGrid();
  await dbUpdate(editingId, { status: nextStatus });
  showToast('Status updated ✓');
}

// ── Summary expand / collapse ──
function toggleDetailSummary() {
  DS.summaryExpanded = !DS.summaryExpanded;
  const section = document.getElementById('dsSummarySection');
  const preview = document.getElementById('dsSummaryPreview');
  if (!section || !preview) return;

  if (DS.summaryExpanded) {
    preview.textContent = DS.summaryFull || DS.summaryShort || 'No summary available.';
    preview.scrollTop = 0;
    section.classList.add('expanded');
  } else {
    section.classList.remove('expanded');
  }
}

// ── Edit sheet (standalone overlay) ──
function openEditSheet() {
  const book = books.find(b => b.id === editingId);
  if (!book) return;
  editStatus = book.status;
  dsInitStarInput(book);
  // Populate fields
  document.getElementById('editTitle').value = book.title;
  document.getElementById('editAuthor').value = book.author || '';
  document.getElementById('editYear').value = book.year || '';
  document.getElementById('editPublisher').value = book.publisher || '';
  document.getElementById('editGenre').value = book.genre || '';
  document.getElementById('editPageCount').value = book.page_count || '';
  document.getElementById('editCoverUrlInput').value = book.cover_url || '';
  editCoverUrl = book.cover_url || null;
  editCoverFile = null;
  const editThumb = document.getElementById('editCoverThumbWrap');
  if (editThumb) {
    editThumb.innerHTML = book.cover_url
      ? `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
  }
  const editReady = document.getElementById('editCoverReadyMsg');
  if (editReady) editReady.style.display = book.cover_url ? 'flex' : 'none';
  document.getElementById('saveEditBtn').disabled = false;
  document.getElementById('saveEditBtn').textContent = 'Save Changes';
  // Sync status seg to current editStatus
  document.querySelectorAll('#editStatusSeg .es-seg-btn, #editStatusSeg .ef-seg-btn').forEach(btn => {
    btn.classList.toggle('es-seg-active', btn.dataset.seg === editStatus);
    btn.classList.toggle('ef-seg-active', btn.dataset.seg === editStatus);
  });
  document.getElementById('dsEditToggle').classList.add('active');
  document.getElementById('editSheetOverlay').classList.add('visible');
}

function closeEditSheet() {
  document.getElementById('editSheetOverlay').classList.remove('visible');
  document.getElementById('dsEditToggle').classList.remove('active');
}

// ── Summary fetching via Google Books ──
function isEnglishText(str) {
  if (!str) return false;
  const sample = str.slice(0, 200);
  const nonLatin = (sample.match(/[^\x00-\x7F\u00C0-\u024F\u2000-\u206F\u2018-\u2019\u201C-\u201D\s\d.,!?;:()\-'"]/g) || []).length;
  if (nonLatin / sample.length > 0.05) return false;
  const englishWords = /\b(the|a|an|is|was|are|were|has|have|had|it|he|she|they|this|that|of|in|to|and|with|for|on|at|by|from|her|his|their|be|been|being|not|but|or|as|into|through|about|after|before|when|who|which|one|two|three|can|will|would|could|she|he|you|we|all|more|new|just|only|over|up|out|so|than|then|there|these|those)\b/gi;
  const matches = (str.slice(0, 300).match(englishWords) || []).length;
  return matches >= 5;
}

const _metaCache = {};
const _metaInFlight = {};

async function fetchBookMeta(title, author) {
  const cacheKey = `${title}__${author || ''}`.toLowerCase();
  if (_metaCache[cacheKey] !== undefined) return Promise.resolve(_metaCache[cacheKey]);
  if (_metaInFlight[cacheKey]) return _metaInFlight[cacheKey];
  // Skip network entirely if local books cache has full data
  const _bk = (typeof books !== 'undefined' ? books : []).find(b => `${b.title}__${b.author || ''}`.toLowerCase() === cacheKey);
  if (_bk && _bk.year && _bk.publisher && _bk.genre && _bk.page_count && _bk.description && isEnglishText(_bk.description || '')) {
    const hit = { description: _bk.description, year: _bk.year, publisher: _bk.publisher, genre: _bk.genre, pageCount: _bk.page_count ? String(_bk.page_count) : '' };
    _metaCache[cacheKey] = hit;
    return Promise.resolve(hit);
  }

  const empty = { description: '', year: '', publisher: '', genre: '', pageCount: '' };

  // ── Google Books fetch ──
  async function fetchGoogle() {
    const lastQuotaHit = window._gbQuotaHitAt || 0;
    if (Date.now() - lastQuotaHit < 120_000) return null;
    const q = encodeURIComponent(`${title} ${author || ''}`.trim());
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=8&langRestrict=en`);
    if (!res.ok) {
      if (res.status === 429) window._gbQuotaHitAt = Date.now();
      return null;
    }
    const data = await res.json();
    const items = data.items || [];
    const meta = { description: '', year: '', publisher: '', genre: '', pageCount: '' };
    for (const item of items) {
      const v = item.volumeInfo || {};
      const lang = v.language || '';
      const isEnglishDesc = (lang === 'en') || (lang === '' && isEnglishText(v.description || ''));
      if (!meta.description && v.description && v.description.length >= 40 && isEnglishDesc) meta.description = v.description;
      if (!meta.year        && v.publishedDate) meta.year      = v.publishedDate.slice(0, 4);
      if (!meta.publisher   && v.publisher)     meta.publisher = v.publisher;
      if (!meta.genre       && v.categories?.length) meta.genre = v.categories.join(', ');
      if (!meta.pageCount   && v.pageCount)     meta.pageCount = String(v.pageCount);
      if (meta.description && meta.year && meta.publisher && meta.genre && meta.pageCount) break;
    }
    return meta;
  }

  // ── Open Library fetch ──
  async function fetchOpenLibrary() {
    const parts = [title, author].filter(Boolean).map(s => encodeURIComponent(s)).join('+');
    // Search endpoint for basic fields
    const searchRes = await fetch(
      `https://openlibrary.org/search.json?q=${parts}&limit=5&language=eng&fields=title,author_name,first_publish_year,publisher,subject,number_of_pages_median,key,language`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const docs = searchData.docs || [];
    const meta = { description: '', year: '', publisher: '', genre: '', pageCount: '' };

    for (const doc of docs) {
      if (!meta.year      && doc.first_publish_year) meta.year      = String(doc.first_publish_year);
      if (!meta.publisher && doc.publisher?.length)  meta.publisher = doc.publisher[0];
      if (!meta.genre     && doc.subject?.length) {
        const clean = doc.subject.filter(s => !s.includes(':'));
        const source = clean.length ? clean : doc.subject;
        meta.genre = source.slice(0, 2).join(', ');
      }
      if (!meta.pageCount && doc.number_of_pages_median) meta.pageCount = String(doc.number_of_pages_median);
      if (meta.year && meta.publisher && meta.genre && meta.pageCount) break;
    }

    // Fetch description from the Works API using the first result's key
    if (!meta.description && docs[0]?.key) {
      try {
        const workRes = await fetch(`https://openlibrary.org${docs[0].key}.json`);
        if (workRes.ok) {
          const work = await workRes.json();
          const desc = work.description;
          const raw = typeof desc === 'string' ? desc : (desc?.value || '');
          if (raw.length >= 40 && isEnglishText(raw)) meta.description = raw;
        }
      } catch { /* description stays empty */ }
    }

    return meta;
  }

  // ── Merge: run both in parallel, Google wins per field, OL fills gaps ──
  _metaInFlight[cacheKey] = (async () => {
    try {
      const [gResult, olResult] = await Promise.allSettled([fetchGoogle(), fetchOpenLibrary()]);
      const g  = gResult.status  === 'fulfilled' && gResult.value  ? gResult.value  : {};
      const ol = olResult.status === 'fulfilled' && olResult.value ? olResult.value : {};

      const merged = {
        description: (g.description && isEnglishText(g.description) ? g.description : '') || (ol.description && isEnglishText(ol.description) ? ol.description : '') || '',
        year:        g.year        || ol.year        || '',
        publisher:   g.publisher   || ol.publisher   || '',
        genre:       g.genre       || ol.genre       || '',
        pageCount:   g.pageCount   || ol.pageCount   || '',
      };

      // Only cache if we got something useful — allows retry if both failed
      const hasData = Object.values(merged).some(v => v !== '');
      if (hasData) _metaCache[cacheKey] = merged;
      delete _metaInFlight[cacheKey];
      return merged;
    } catch {
      delete _metaInFlight[cacheKey];
      return empty;
    }
  })();

  return _metaInFlight[cacheKey];
}

function dsBuildSummary(text) {
  if (!text) {
    DS.summaryFull = '';
    DS.summaryShort = 'No summary available.';
    return;
  }
  const plain = text.replace(/<[^>]+>/g, '').trim();
  DS.summaryFull = plain;
  if (plain.length <= 280) {
    DS.summaryShort = plain;
  } else {
    const cut = plain.lastIndexOf(' ', 280);
    DS.summaryShort = plain.slice(0, cut > 0 ? cut : 280) + '…';
  }
}

function dsRenderSummary() {
  const preview = document.getElementById('dsSummaryPreview');
  const section = document.getElementById('dsSummarySection');
  if (!preview) return;
  const text = DS.summaryExpanded
    ? (DS.summaryFull || DS.summaryShort || 'No summary available.')
    : (DS.summaryShort || DS.summaryFull || '');
  preview.textContent = text;
  if (section) section.classList.toggle('expanded', DS.summaryExpanded);
}

let _userRating = 0;

function setUserRating(val) {
  _userRating = val;
  const ratingVal = document.getElementById('editRatingVal');
  if (ratingVal) ratingVal.textContent = val > 0 ? `${val}.0 / 5` : '— / 5';
  document.querySelectorAll('.es-star-btn, .ef-star-btn, .star-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.star <= val);
  });
}

function dsRenderRating(book) {
  const el = document.getElementById('detailRating');
  if (!el) return;
  const rating = (book.rating != null) ? book.rating : 0;
  _userRating = rating;
  const starPath = 'M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z';
  if (book.status !== 'read') { el.innerHTML = ''; return; }
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<svg class="ds-star-svg${i <= rating ? ' on' : ''}" viewBox="0 0 16 16" style="cursor:default"><path d="${starPath}"/></svg>`;
  }
  el.innerHTML = rating > 0
    ? `<span class="ds-rating-label">Rating</span>${stars}`
    : `<span class="ds-rating-label" style="font-size:11px;opacity:0.5">Not rated · edit to rate</span>`;
}

// dsRateFromDetail removed — rating is now edit-sheet only

function dsInitStarInput(book) {
  _userRating = book.rating || 0;
  const ratingSection = document.getElementById('editRatingSection');
  const input = document.getElementById('starRatingInput');
  const show = editStatus === 'read';
  if (ratingSection) ratingSection.style.display = show ? 'block' : 'none';
  if (input) input.style.display = show ? 'flex' : 'none';
  // Sync segmented control to current status
  document.querySelectorAll('#editStatusSeg .ef-seg-btn, #editStatusSeg .es-seg-btn').forEach(btn => {
    btn.classList.toggle('ef-seg-active', btn.dataset.seg === editStatus);
    btn.classList.toggle('es-seg-active', btn.dataset.seg === editStatus);
  });
  setUserRating(_userRating);
  document.querySelectorAll('.es-star-btn, .ef-star-btn, .star-btn').forEach(btn => {
    btn.onclick = () => setUserRating(+btn.dataset.star);
  });
}
function cleanGenre(raw) {
  if (!raw || raw === '—') return raw || '—';
  return raw
    .split(/[,\/]/)
    .map(s => s.trim())
    .map(s => s.replace(/^[a-zA-Z]+\s*:\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(', ');
}
function dsRenderMetaGrid(book) {
  const yearPub = document.getElementById('detailYearPub');
  const metaGrid = document.getElementById('detailMetaGrid');
  if (yearPub) {
    const parts = [book.year, book.publisher].filter(Boolean);
    yearPub.textContent = parts.join(' • ');
  }
  if (metaGrid) {
    const pages = book.page_count ? `${book.page_count} pages` : '—';
    const genre = book.genre || '—';
    metaGrid.style.display = 'grid';
    const genreEl = document.getElementById('detailMetaGenre');
    const pagesEl = document.getElementById('detailMetaPages');
    if (genreEl) genreEl.textContent = cleanGenre(genre);
    if (pagesEl) pagesEl.textContent = pages;
  }
}

function dsRenderTagline(status) {
  // tagline removed from UI
}

// ── OVERRIDE openDetailModal ── 
// (replaces the original function defined earlier in app.js)
function openDetailModal(id) {
  try {
  const book = books.find(b => String(b.id) === String(id));
  if (!book) return;
  editingId = book.id;
  editCoverFile = null;
  editStatus = book.status;

  // Reset state
  DS.summaryExpanded = false;
  DS.editVisible = false;

  // Populate top section
  document.getElementById('detailTitleEl').textContent = book.title;
  document.getElementById('detailAuthorEl').textContent = book.author || '';
  document.getElementById('detailCoverEl').innerHTML = coverHtml(book, 14);

  // Render from DB values immediately
  dsRenderMetaGrid(book);
  dsRenderTagline(book.status);
  const yearPub = document.getElementById('detailYearPub');
  if (yearPub) {
    const parts = [book.year, book.publisher].filter(Boolean);
    yearPub.textContent = parts.join(' • ');
  }
  dsRenderRating(book);

  // Edit form new fields
  document.getElementById('editYear').value = book.year || '';
  document.getElementById('editPublisher').value = book.publisher || '';
  document.getElementById('editGenre').value = book.genre || '';
  document.getElementById('editPageCount').value = book.page_count || '';
  updateDetailBadge(book.status);
  dsRenderCTA(book.status);

  // Edit form fields
  document.getElementById('editTitle').value = book.title;
  document.getElementById('editAuthor').value = book.author || '';
  const editThumb = document.getElementById('editCoverThumbWrap');
  if (editThumb) {
    editThumb.innerHTML = book.cover_url
      ? `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
  }
  const editReady = document.getElementById('editCoverReadyMsg');
  if (editReady) editReady.style.display = book.cover_url ? 'flex' : 'none';
  document.getElementById('editCoverUrlInput').value = book.cover_url || '';
  editCoverUrl = book.cover_url || null;

// Reset edit toggle state
  document.getElementById('dsEditToggle').classList.remove('active');

  // Render meta immediately from DB values (no flash)
  dsRenderMetaGrid(book);
  // Summary — set placeholder, fetch async
  dsBuildSummary('');
  DS.summaryShort = '';
  dsRenderSummary();

  // Open sheet
  dsOpen();

  // Only hit the API if summary is missing OR any metadata field is absent
  const cacheKey = `${book.title}__${book.author || ''}`.toLowerCase();
  const hasCachedSummary = _metaCache[cacheKey];
  const storedDescriptionIsEnglish = !!(book.description && isEnglishText(book.description));
  const hasAllMeta = book.year && book.publisher && book.genre && book.page_count;

  if (storedDescriptionIsEnglish) {
    dsBuildSummary(book.description);
    dsRenderSummary();
    _metaCache[cacheKey] = _metaCache[cacheKey] || {
      description: book.description,
      year: book.year || '',
      publisher: book.publisher || '',
      genre: book.genre || '',
      pageCount: book.page_count ? String(book.page_count) : '',
    };
  } else if (hasCachedSummary?.description) {
    dsBuildSummary(hasCachedSummary.description);
    dsRenderSummary();
  }

  // Skip network if everything is already known AND description is good
  const hasGoodDescription = storedDescriptionIsEnglish || !!(hasCachedSummary?.description);
  if (hasAllMeta && hasGoodDescription) {
    // Nothing to fetch
  } else {
    fetchBookMeta(book.title, book.author).then(async meta => {
      if (editingId !== id) return;
      if (!meta) meta = {};
      dsBuildSummary(meta.description);
      dsRenderSummary();
      const apiUpdates = {};
      if (!book.year        || book.year === '')        { if (meta.year)      { apiUpdates.year       = meta.year;                    book.year       = meta.year; } }
      if (!book.publisher   || book.publisher === '')   { if (meta.publisher) { apiUpdates.publisher  = meta.publisher;               book.publisher  = meta.publisher; } }
      if (!book.genre       || book.genre === '')       { if (meta.genre)     { apiUpdates.genre      = meta.genre;                   book.genre      = meta.genre; } }
      if (!book.page_count  || book.page_count === 0)  { if (meta.pageCount) { apiUpdates.page_count = parseInt(meta.pageCount) || 0; book.page_count = parseInt(meta.pageCount) || 0; } }
      // Backfill description to DB so future opens are free
      if (meta.description && (!book.description || !isEnglishText(book.description))) {
        apiUpdates.description = meta.description;
        book.description = meta.description;
      }
      // Update in-memory cache with fresh English data so same-session reopens are free
      _metaCache[cacheKey] = {
        description: book.description || '',
        year: book.year || '',
        publisher: book.publisher || '',
        genre: book.genre || '',
        pageCount: book.page_count ? String(book.page_count) : '',
      };
      dsRenderMetaGrid(book);
      const yearPub = document.getElementById('detailYearPub');
      if (yearPub) yearPub.textContent = [book.year, book.publisher].filter(Boolean).join(' • ');
      if (Object.keys(apiUpdates).length) await dbUpdate(id, apiUpdates);
      const editYear = document.getElementById('editYear');
      const editPublisher = document.getElementById('editPublisher');
      const editGenre = document.getElementById('editGenre');
      const editPageCount = document.getElementById('editPageCount');
      if (editYear && !editYear.value)           editYear.value      = book.year || '';
      if (editPublisher && !editPublisher.value) editPublisher.value = book.publisher || '';
      if (editGenre && !editGenre.value)         editGenre.value     = book.genre || '';
      if (editPageCount && !editPageCount.value) editPageCount.value = book.page_count || '';
    });
  }
  } catch(e) { console.error('openDetailModal error:', e); }
}

// ── OVERRIDE closeModal for detailModal ──
const _origCloseModal = closeModal;
window.closeModal = function closeModal(id) {
  if (id === 'detailModal') {
    dsClose();
    return;
  }
  _origCloseModal(id);
};

// ── Overlay click handler override — dropdown removed, handler cleared ──
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('detailModal');
  overlay.addEventListener('click', e => {
    if (e.target === overlay && DS.isOpen && (Date.now() - _dsOpenTime > 600)) closeModal('detailModal');
  });
});

// ── Init on DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
  dsInitDragEvents();
});
// Also init immediately if DOM already loaded
if (document.readyState !== 'loading') {
  dsInitDragEvents();
}

// ── Public: refresh detail sheet from current editingId ──
window.dsRefreshDetailSheet = function() {
  const book = books.find(b => String(b.id) === String(editingId));
  if (!book) return;

  const titleEl = document.getElementById('detailTitleEl');
  const authorEl = document.getElementById('detailAuthorEl');
  const coverEl  = document.getElementById('detailCoverEl');
  const yearPubEl = document.getElementById('detailYearPub');

  if (titleEl)  titleEl.textContent  = book.title;
  if (authorEl) authorEl.textContent = book.author || '';
  if (coverEl)  coverEl.innerHTML    = coverHtml(book, 14);
  if (yearPubEl) yearPubEl.textContent = [book.year, book.publisher].filter(Boolean).join(' • ');

  dsRenderMetaGrid(book);
  dsRenderRating(book);
  updateDetailBadge(book.status);
  dsRenderCTA(book.status);
  editStatus = book.status;
  // Sync edit form fields to reflect saved values
  document.getElementById('editTitle').value = book.title;
  document.getElementById('editAuthor').value = book.author || '';
  document.getElementById('editYear').value = book.year || '';
  document.getElementById('editPublisher').value = book.publisher || '';
  document.getElementById('editGenre').value = book.genre || '';
  document.getElementById('editPageCount').value = book.page_count || '';
};
