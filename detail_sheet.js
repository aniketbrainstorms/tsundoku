
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
  return 0; // Summary toggle naturally expands sheet height
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
const _metaCache = {};
const _metaInFlight = {};

async function fetchBookMeta(title, author) {
  const cacheKey = `${title}__${author || ''}`.toLowerCase();
  if (_metaCache[cacheKey] !== undefined) return _metaCache[cacheKey];
  if (_metaInFlight[cacheKey]) return _metaInFlight[cacheKey];
  try {
    const q = encodeURIComponent(`${title} ${author || ''}`.trim());
    _metaInFlight[cacheKey] = fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&langRestrict=en`)
      .then(async res => {
        delete _metaInFlight[cacheKey];
        const empty = { description: '', year: '', publisher: '', genre: '', pageCount: '', rating: null };
        if (!res.ok) { _metaCache[cacheKey] = empty; return empty; }
        const data = await res.json();
        const items = data.items || [];
        // Build best meta by merging across results — first item wins per field
        const meta = { description: '', year: '', publisher: '', genre: '', pageCount: '' };
        for (const item of items) {
          const v = item.volumeInfo || {};
          if (!meta.description && v.description && v.description.length >= 40) meta.description = v.description;
          if (!meta.year       && v.publishedDate) meta.year       = v.publishedDate.slice(0, 4);
          if (!meta.publisher  && v.publisher)     meta.publisher  = v.publisher;
          if (!meta.genre      && v.categories?.length) meta.genre = v.categories.join(', ');
          if (!meta.pageCount  && v.pageCount)     meta.pageCount  = String(v.pageCount);
          // Stop early if we have everything
          if (meta.description && meta.year && meta.publisher && meta.genre && meta.pageCount) break;
        }
        _metaCache[cacheKey] = meta;
        return meta;
      });
    return _metaInFlight[cacheKey];
  } catch { return { description: '', year: '', publisher: '', genre: '', pageCount: '', rating: null }; }
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
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<svg class="ds-star-svg${i <= rating ? ' on' : ''}" data-star="${i}" viewBox="0 0 16 16" onclick="dsRateFromDetail(${i})"><path d="${starPath}"/></svg>`;
  }
  el.innerHTML = `<span class="ds-rating-label">Rate</span>${stars}`;
}

async function dsRateFromDetail(n) {
  const newRating = (_userRating === n) ? 0 : n; // tap same star to clear
  _userRating = newRating;

  document.querySelectorAll('.ds-star-svg').forEach(svg => {
    svg.classList.toggle('on', +svg.dataset.star <= newRating);
  });
  setUserRating(newRating); // sync to edit sheet

  const book = books.find(b => b.id === editingId);
  if (book) {
    book.rating = newRating || null;
    await dbUpdate(editingId, { rating: newRating || null });
  }
}

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
    if (genreEl) genreEl.textContent = genre;
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

  // Fetch meta in background
  // Fetch meta in background — only fill fields not already in DB
  // Fetch summary only — meta fields are pre-filled at add-time
  fetchBookMeta(book.title, book.author).then(async meta => {
    if (editingId !== id || !meta) return;
    dsBuildSummary(meta.description);
    dsRenderSummary();
    // Only backfill fields genuinely missing (e.g. old books added before this fix)
    const apiUpdates = {};
    if (!book.year        || book.year === '')        { if (meta.year)       { apiUpdates.year       = meta.year;                    book.year       = meta.year; } }
    if (!book.publisher   || book.publisher === '')   { if (meta.publisher)  { apiUpdates.publisher  = meta.publisher;               book.publisher  = meta.publisher; } }
    if (!book.genre       || book.genre === '')       { if (meta.genre)      { apiUpdates.genre      = meta.genre;                   book.genre      = meta.genre; } }
    if (!book.page_count  || book.page_count === 0)  { if (meta.pageCount)  { apiUpdates.page_count = parseInt(meta.pageCount) || 0; book.page_count = parseInt(meta.pageCount) || 0; } }
    // Always re-render meta and summary regardless of whether DB needed updating
    dsRenderMetaGrid(book);
    const yearPub = document.getElementById('detailYearPub');
    if (yearPub) yearPub.textContent = [book.year, book.publisher].filter(Boolean).join(' • ');
    if (Object.keys(apiUpdates).length) {
      await dbUpdate(id, apiUpdates);
    }
  // Sync backfilled values into edit sheet fields if they're open
    const editYear = document.getElementById('editYear');
    const editPublisher = document.getElementById('editPublisher');
    const editGenre = document.getElementById('editGenre');
    const editPageCount = document.getElementById('editPageCount');
    if (editYear && !editYear.value)           editYear.value       = book.year || '';
    if (editPublisher && !editPublisher.value) editPublisher.value  = book.publisher || '';
    if (editGenre && !editGenre.value)         editGenre.value      = book.genre || '';
    if (editPageCount && !editPageCount.value) editPageCount.value  = book.page_count || '';
  });
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
