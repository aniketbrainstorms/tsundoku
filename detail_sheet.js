
// ══════════════════════════════════════════════════════════════
// DETAIL BOTTOM SHEET — snap-based, Apple Maps / Spotify style
// ══════════════════════════════════════════════════════════════

// ── Sheet state ──
const DS = {
  HALF_RATIO: 0.50,   // 50% of viewport = half state
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
  editVisible: false,
  // Store summary text for toggle
  summaryFull: '',
  summaryShort: '',
};

function dsGetHalfY() {
  const sheetH = window.innerHeight * 0.92;
  return sheetH * DS.HALF_RATIO;
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
  sheet.style.transform = `translateY(${y}px)`;
}

function dsSnapTo(expanded, animate = true) {
  const targetY = expanded ? dsGetFullY() : dsGetHalfY();
  dsSetTranslate(targetY, animate);
  DS.isExpanded = expanded;
  // Toggle overlay class for blur intensity
  const overlay = document.getElementById('detailModal');
  overlay.classList.toggle('ds-expanded', expanded);
  // Unlock / lock scroll
  const scroll = document.getElementById('dsScroll');
  scroll.classList.toggle('unlocked', expanded);
  // Show/hide scroll hint
  const hint = document.getElementById('dsScrollHint');
  hint.classList.toggle('hidden', expanded);
  // Sticky header border
  if (!expanded) {
    document.getElementById('dsTop').classList.remove('scrolled');
  }
}

function dsOpen() {
  const overlay = document.getElementById('detailModal');
  const sheet = document.getElementById('detailSheet');
  // Start from bottom (translateY = full sheet height = 92vh)
  const sheetH = window.innerHeight * 0.92;
  dsSetTranslate(sheetH, false);
  overlay.classList.add('visible');
  DS.isOpen = true;
  DS.isExpanded = false;
  // Animate into HALF position
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      dsSnapTo(false, true);
    });
  });
}

function dsClose() {
  const sheetH = window.innerHeight * 0.92;
  dsSetTranslate(sheetH, true);
  const overlay = document.getElementById('detailModal');
  overlay.classList.remove('ds-expanded');
  setTimeout(() => {
    overlay.classList.remove('visible');
    DS.isOpen = false;
    DS.isExpanded = false;
    DS.editVisible = false;
    DS.summaryExpanded = false;
  }, 380);
}

// ── Touch / drag handling ──
function dsOnTouchStart(e) {
  if (DS.animating) return;
  if (!DS.isOpen) return;
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
  if (newTranslate < fullY) {
    // Rubber band above full
    newTranslate = fullY - Math.pow(fullY - newTranslate, 0.6);
  }
  const maxY = halfY + 80;
  if (newTranslate > maxY) {
    newTranslate = maxY + (newTranslate - maxY) * 0.3;
  }

  dsSetTranslate(newTranslate, false);
  // Prevent page scroll
  if (delta !== 0) e.preventDefault();
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

  // Velocity snap
  if (DS.velocity < -DS.SNAP_VELOCITY) {
    dsSnapTo(true);
  } else if (DS.velocity > DS.SNAP_VELOCITY) {
    dsSnapTo(false);
  } else {
    // Position-based snap
    dsSnapTo(DS.currentTranslate < midpoint);
  }
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

    const halfY = dsGetHalfY(), fullY = dsGetFullY();
    if (DS.currentTranslate > halfY + 60 || DS.velocity > 0.8) { dsClose(); return; }
    if (DS.velocity < -DS.SNAP_VELOCITY) dsSnapTo(true);
    else if (DS.velocity > DS.SNAP_VELOCITY) dsSnapTo(false);
    else dsSnapTo(DS.currentTranslate < (halfY + fullY) / 2);
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
  sheet.addEventListener('touchstart', dsOnTouchStart, { passive: false });
  sheet.addEventListener('touchmove', dsOnTouchMove, { passive: false });
  sheet.addEventListener('touchend', dsOnTouchEnd, { passive: true });
  sheet.addEventListener('touchcancel', dsOnTouchEnd, { passive: true });
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
    primary.innerHTML = `${icons.book} Start Reading`;
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
  const preview = document.getElementById('dsSummaryPreview');
  const readMore = document.getElementById('dsSummaryReadMore');
  const expandBtn = document.getElementById('dsSummaryExpandBtn');

  if (DS.summaryExpanded) {
    preview.textContent = DS.summaryFull;
    preview.classList.add('expanded');
    if (readMore) { readMore.style.display = 'block'; readMore.textContent = 'Show less'; }
    if (expandBtn) expandBtn.classList.add('open');
    // Auto-expand sheet to FULL when reading summary
    if (!DS.isExpanded) dsSnapTo(true);
  } else {
    preview.textContent = DS.summaryShort;
    preview.classList.remove('expanded');
    if (readMore) readMore.style.display = DS.summaryFull.length > DS.summaryShort.length ? 'block' : 'none';
    if (readMore) readMore.textContent = 'Read more';
    if (expandBtn) expandBtn.classList.remove('open');
  }
}

// ── Edit toggle ──
function toggleDetailEdit() {
  DS.editVisible = !DS.editVisible;
  const form = document.getElementById('dsEditForm');
  const divider = document.getElementById('dsEditDivider');
  const btn = document.getElementById('dsEditToggle');
  form.style.display = DS.editVisible ? 'block' : 'none';
  divider.style.display = DS.editVisible ? 'block' : 'none';
  btn.classList.toggle('active', DS.editVisible);
  if (DS.editVisible && !DS.isExpanded) dsSnapTo(true);
}

// ── Summary fetching via Google Books ──
const _summaryCache = {};
const _summaryInFlight = {};

async function fetchBookSummary(title, author) {
  const cacheKey = `${title}__${author || ''}`.toLowerCase();
  if (_summaryCache[cacheKey] !== undefined) return _summaryCache[cacheKey];
  if (_summaryInFlight[cacheKey]) return _summaryInFlight[cacheKey];
  try {
    const q = encodeURIComponent(`${title} ${author || ''}`.trim());
    _summaryInFlight[cacheKey] = fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&langRestrict=en`)
      .then(async res => {
        delete _summaryInFlight[cacheKey];
        if (!res.ok) { _summaryCache[cacheKey] = ''; return ''; }
    const data = await res.json();
        for (const item of (data.items || [])) {
          const desc = item.volumeInfo?.description;
          if (desc && desc.length > 40) { _summaryCache[cacheKey] = desc; return desc; }
        }
        _summaryCache[cacheKey] = '';
        return '';
      });
    return _summaryInFlight[cacheKey];
  } catch { return ''; }
}

function dsBuildSummary(text) {
  if (!text) {
    DS.summaryFull = '';
    DS.summaryShort = 'No summary available.';
    return;
  }
  // Strip HTML tags
  const plain = text.replace(/<[^>]+>/g, '').trim();
  DS.summaryFull = plain;
  // Short = first ~280 chars, ending at word boundary
  if (plain.length <= 280) {
    DS.summaryShort = plain;
  } else {
    const cut = plain.lastIndexOf(' ', 280);
    DS.summaryShort = plain.slice(0, cut > 0 ? cut : 280) + '…';
  }
}

function dsRenderSummary() {
  const preview = document.getElementById('dsSummaryPreview');
  const readMore = document.getElementById('dsSummaryReadMore');
  if (!preview) return;
  preview.textContent = DS.summaryShort || 'Loading summary…';
  preview.classList.remove('expanded');
  if (readMore) {
    readMore.style.display = DS.summaryFull && DS.summaryFull.length > DS.summaryShort.length ? 'block' : 'none';
    readMore.textContent = 'Read more';
  }
  const expandBtn = document.getElementById('dsSummaryExpandBtn');
  if (expandBtn) expandBtn.classList.remove('open');
}

function dsRenderRating(rating) {
  const el = document.getElementById('detailRating');
  if (!el) return;
  if (!rating) { el.innerHTML = ''; return; }
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= full) stars += `<span class="ds-star">★</span>`;
    else if (i === full + 1 && half) stars += `<span class="ds-star">½</span>`;
    else stars += `<span class="ds-star empty">★</span>`;
  }
  el.innerHTML = `${stars}<span class="ds-rating-num">${rating}/5</span>`;
}

// ── OVERRIDE openDetailModal ── 
// (replaces the original function defined earlier in app.js)
function openDetailModal(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  editingId = id;
  editCoverFile = null;
  editStatus = book.status;

  // Reset state
  DS.summaryExpanded = false;
  DS.editVisible = false;

  // Populate top section
  document.getElementById('detailTitleEl').textContent = book.title;
  document.getElementById('detailAuthorEl').textContent = book.author || '';
  document.getElementById('detailCoverEl').innerHTML = coverHtml(book, 14);

  // Year / publisher (not in DB, skip if empty)
  const yearPub = document.getElementById('detailYearPub');
  if (yearPub) yearPub.textContent = '';

  // Genre (not in DB — clear)
  const genreEl = document.getElementById('detailGenre');
  if (genreEl) genreEl.textContent = '';

  // Rating — not stored in DB, skip
  const ratingEl = document.getElementById('detailRating');
  if (ratingEl) ratingEl.innerHTML = '';

  updateDetailBadge(book.status);
  closeStatusDropdown();
  dsRenderCTA(book.status);

  // Edit form fields
  document.getElementById('editTitle').value = book.title;
  document.getElementById('editAuthor').value = book.author || '';
  document.getElementById('editCoverUpload').innerHTML = book.cover_url
    ? `<img class="cover-preview" src="${book.cover_url}"/><span style="font-size:13px;color:var(--text-dim)">Cover added ✓</span><input type="file" accept="image/*" onchange="handleCoverUpload(event,'edit')"/>`
    : `<input type="file" accept="image/*" onchange="handleCoverUpload(event,'edit')"/><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Change cover</span>`;
  document.getElementById('editCoverUrlInput').value = book.cover_url || '';
  editCoverUrl = book.cover_url || null;

  // Hide edit form
  document.getElementById('dsEditForm').style.display = 'none';
  document.getElementById('dsEditDivider').style.display = 'none';
  document.getElementById('dsEditToggle').classList.remove('active');

  // Summary — set placeholder, fetch async
  dsBuildSummary('');
  dsRenderSummary();
  const preview = document.getElementById('dsSummaryPreview');
  if (preview) preview.textContent = 'Loading…';

  // Open sheet
  dsOpen();

  // Fetch summary in background
  fetchBookSummary(book.title, book.author).then(text => {
    dsBuildSummary(text);
    // Only update if same book still open
    if (editingId === id) dsRenderSummary();
  });
}

// ── OVERRIDE closeModal for detailModal ──
const _origCloseModal = closeModal;
function closeModal(id) {
  if (id === 'detailModal') {
    dsClose();
    closeStatusDropdown();
    return;
  }
  _origCloseModal(id);
}

// ── Overlay click handler override ──
function handleDetailOverlayClick(e) {
  if (e.target === document.getElementById('detailModal')) {
    closeModal('detailModal');
    return;
  }
  const dropdown = document.getElementById('statusDropdown');
  if (dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== document.getElementById('statusChevronBtn')) {
    closeStatusDropdown();
  }
}

// ── Init on DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
  dsInitDragEvents();
});
// Also init immediately if DOM already loaded
if (document.readyState !== 'loading') {
  dsInitDragEvents();
}
