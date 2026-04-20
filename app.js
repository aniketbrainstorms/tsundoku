const { createClient } = supabase;
const sb = createClient(
  'https://rrnryszgvctxainqyuyr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybnJ5c3pndmN0eGFpbnF5dXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODg3NTcsImV4cCI6MjA5MDQ2NDc1N30.GkGvfR_ZlGIupbwOOl1BL5gb58M-E2LD5sD7pVl4tso'
);

// ── STATE ──
let books = [], currentFilter = 'reading';
let addStatus = 'unread', editStatus = 'unread';
let addCoverFile = null, addCoverUrl = null;
let editCoverFile = null, editCoverUrl = null, editingId = null;
let qmBookId = null, longPressTimer = null, isPressing = false, didLongPress = false;
let authMode = 'login';
let currentUser = null;
let bookSearchTimer = null;
let progressBookId = null;
let bsSearchCategory = 'all';
let currentSort = 'recent';
let scannerStream = null, scannerInterval = null;

// ── SHARE STATE ──
let userProfile = null;
let publicBooks = [];
let publicSort = 'title';

// ── DEVICE DETECTION ──
const isTouch = () => window.matchMedia('(hover:none)').matches;

function updateHintBar() {
  const hint = document.getElementById('hintBar');
  if (hint) hint.textContent = isTouch() ? 'Hold to quick-edit' : 'Click to quick-edit';
}

// ── PALETTES ──
const palettes = [
  ['#4a3728','#c9714a'],['#1e2d3d','#5a8fa8'],['#2d3a2e','#6a9a72'],
  ['#3a2040','#9a6ac0'],['#3d2a1e','#c0814a'],['#1e1e2d','#6a72c0'],
  ['#2d1e1e','#c06a6a'],['#1e2d2a','#6ac0b8'],['#3a3020','#b0963c'],['#2a1e2d','#a06ab8']
];
function palSeed(str) {
  let h = 0;
  for (let c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % palettes.length;
}
function makePlaceholder(book, sz) {
  sz = sz || 22;
  const p = palettes[palSeed(book.id)];
  return `<div class="book-placeholder" style="background:linear-gradient(160deg,${p[0]} 0%,${p[1]}33 100%)">
    <svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="${p[1]}" opacity="0.55">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="${p[1]}" stroke-width="1.5" fill="none"/>
    </svg></div>`;
}
function coverHtml(book, sz) {
  sz = sz || 22;
  return book.cover_url ? `<img src="${book.cover_url}" alt="" draggable="false"/>` : makePlaceholder(book, sz);
}
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function escapeAttr(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}
function getUserInitials(email) {
  if (!email) return '?';
  const local = email.split('@')[0];
  const parts = local.split(/[._\-+]/);
  return parts.slice(0,2).map(p => (p[0] || '').toUpperCase()).filter(Boolean).join('') || email[0].toUpperCase();
}

// ── PUBLIC SHELF URL CHECK ──
function getShelfParam() {
  return new URLSearchParams(window.location.search).get('shelf');
}

// ── INIT ──
(async function init() {
  const slug = getShelfParam();
  if (slug) {
    document.getElementById('loadingScreen').classList.add('hidden');
    await loadPublicShelf(slug);
    return;
  }

  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(() => document.getElementById('loadingScreen').classList.add('hidden'), 300);
    if (session) {
      currentUser = session.user;
      const initials = getUserInitials(currentUser?.email);
      const avatarBtn = document.getElementById('profileAvatarBtn');
      if (avatarBtn) avatarBtn.textContent = initials;
      document.getElementById('authScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'flex';
      updateHintBar();
      loadBooks();
      loadProfile();
      loLoadLists();
    } else {
      currentUser = null;
      document.getElementById('authScreen').style.display = 'flex';
      document.getElementById('appScreen').style.display = 'none';
      books = [];
    }
  });
})();

// ── AUTH ──
function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById('loginTab').classList.toggle('active', mode === 'login');
  document.getElementById('signupTab').classList.toggle('active', mode === 'signup');
  document.getElementById('authSubmitBtn').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('authError').textContent = '';
}
async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('authSubmitBtn');
  const errEl = document.getElementById('authError');
  if (!email || !password) { errEl.style.color = '#c06060'; errEl.textContent = 'Please fill in all fields.'; return; }
  btn.disabled = true; btn.textContent = authMode === 'login' ? 'Signing in…' : 'Creating account…'; errEl.textContent = '';
  const { error } = authMode === 'login'
    ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password });
  btn.disabled = false; btn.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
  if (error) { errEl.style.color = '#c06060'; errEl.textContent = error.message; return; }
  if (authMode === 'signup') { errEl.style.color = 'var(--green)'; errEl.textContent = 'Account created! Signing you in…'; }
}
async function signOut() {
  closeModal('profileModal');
  await sb.auth.signOut();
}

// ── DB ──
async function loadBooks() {
  renderSkeleton();
  const { data, error } = await sb.from('books').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  if (error) { showToast('Failed to load books'); return; }
  books = data || [];
  renderGrid();
}
async function dbAdd(book) {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from('books').insert({ user_id: user.id, ...book }).select().single();
  if (error) { console.error('dbAdd err:', error); showToast(error.message || 'Could not save book'); return null; }
  return data;
}
async function dbUpdate(id, updates) {
  const { error } = await sb.from('books').update(updates).eq('id', id);
  if (error) { console.error('dbUpdate err:', error); showToast(error.message || 'Could not update book'); }
  return !error;
}
async function dbDelete(id) {
  const { error } = await sb.from('books').delete().eq('id', id);
  if (error) showToast('Could not delete book');
  return !error;
}
async function uploadCover(file, bookId) {
  const { data: { user } } = await sb.auth.getUser();
  const ext = file.name.split('.').pop();
  const path = `${user.id}/${bookId}.${ext}`;
  const { error } = await sb.storage.from('covers').upload(path, file, { upsert: true });
  if (error) return null;
  return sb.storage.from('covers').getPublicUrl(path).data.publicUrl;
}

// ── PROFILE / SHARE ──
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('user_id', currentUser.id).single();
  userProfile = data || null;
  updateShareUI();
}

function updateShareUI() {
  const slugInput = document.getElementById('shareSlugInput');
  const urlEl = document.getElementById('shareShelfUrl');
  const toggle = document.getElementById('shareToggle');
  if (!slugInput) return;

  const slug = userProfile?.shelf_slug || '';
  const isPublic = userProfile?.shelf_public || false;
  slugInput.value = slug;

  if (slug) {
    const url = `${location.origin}${location.pathname}?shelf=${slug}`;
    urlEl.textContent = url;
    toggle.classList.toggle('on', isPublic);
    document.getElementById('shareShelfRow').style.opacity = '1';
    document.getElementById('shareCopyBtn').style.display = isPublic ? 'flex' : 'none';
  } else {
    urlEl.textContent = 'Set a name above to get your link';
    toggle.classList.remove('on');
    document.getElementById('shareShelfRow').style.opacity = '0.5';
    document.getElementById('shareCopyBtn').style.display = 'none';
  }
}

async function saveSlug() {
  const slug = document.getElementById('shareSlugInput').value.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) { showToast('Enter a valid name'); return; }
  const btn = document.getElementById('shareSlugSave');
  btn.disabled = true; btn.textContent = 'Saving…';

  const payload = { user_id: currentUser.id, shelf_slug: slug, shelf_public: userProfile?.shelf_public || false };
  const { data, error } = await sb.from('profiles').upsert(payload, { onConflict: 'user_id' }).select().single();
  btn.disabled = false; btn.textContent = 'Save';

  if (error) {
    if (error.code === '23505') showToast('That name is taken — try another');
    else showToast(error.message || 'Could not save');
    return;
  }
  userProfile = data;
  updateShareUI();
  showToast('Link saved ✓');
}

async function toggleShelfPublic() {
  if (!userProfile?.shelf_slug) { showToast('Set a name first'); return; }
  const newVal = !userProfile.shelf_public;
  const { data, error } = await sb.from('profiles').update({ shelf_public: newVal }).eq('user_id', currentUser.id).select().single();
  if (error) { showToast('Could not update'); return; }
  userProfile = data;
  updateShareUI();
  showToast(newVal ? 'Shelf is now public ✓' : 'Shelf is now private');
}

function copyShelfLink() {
  const slug = userProfile?.shelf_slug;
  if (!slug) return;
  const url = `${location.origin}${location.pathname}?shelf=${slug}`;
  navigator.clipboard.writeText(url).then(() => showToast('Link copied ✓')).catch(() => showToast('Copy failed'));
}

// ── PUBLIC SHELF ──
async function loadPublicShelf(slug) {
  document.getElementById('publicShelfScreen').style.display = 'flex';

  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('user_id, shelf_slug, shelf_public')
    .eq('shelf_slug', slug)
    .single();

  if (profileErr || !profile || !profile.shelf_public) {
    document.getElementById('publicShelfOwner').textContent = 'Shelf not found';
    document.getElementById('publicShelfSub').textContent = 'This shelf may be private or the link is incorrect.';
    return;
  }

  const { data: booksData, error: booksErr } = await sb
    .from('books')
    .select('*')
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: false });

  if (booksErr) {
    document.getElementById('publicShelfOwner').textContent = 'Could not load shelf';
    return;
  }

  publicBooks = booksData || [];
  document.getElementById('publicShelfOwner').textContent = `${profile.shelf_slug}'s shelf`;
  document.getElementById('publicShelfSub').textContent =
    `${publicBooks.length} ${publicBooks.length === 1 ? 'book' : 'books'}`;

  renderPublicShelf();
}

function renderPublicShelf() {
  const q = (document.getElementById('publicSearchInput')?.value || '').toLowerCase().trim();
  let list = [...publicBooks];
  if (q) list = list.filter(b => (b.title||'').toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q));

list.sort((a, b) => {
    if (publicSort === 'author') {
      const cmp = (a.author||'').localeCompare(b.author||'');
      return cmp !== 0 ? cmp : (a.title||'').localeCompare(b.title||'');
    }
    return (a.title||'').localeCompare(b.title||'');
  });

  const grid = document.getElementById('publicBookGrid');
  if (!list.length) {
    grid.classList.remove('reading-mode');
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>${q ? 'No results found.' : 'No books yet.'}</p></div>`;
    if (typeof alphaBarRefresh === 'function') alphaBarRefresh('public');
    return;
  }
  grid.classList.remove('reading-mode');
  grid.innerHTML = list.map((b, i) => `
    <div class="pub-book-card" data-id="${b.id}" data-title="${escapeAttr(b.title||'')}" data-author="${escapeAttr(b.author||'')}" style="animation-delay:${Math.min(i,12)*0.035}s">
      ${coverHtml(b)}
      <div class="status-dot ${b.status}"></div>
    </div>`).join('');
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('public');
}

// ── PUBLIC SORT ──
function openPublicSortMenu(btn) {
  const menu = document.getElementById('publicSortMenu');
  menu.querySelectorAll('.qm-item').forEach(i => i.classList.toggle('current-status', i.dataset.psort === publicSort));
  const ar = document.getElementById('app').getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  const menuWidth = 160; const margin = 8;
  const rightEdge = br.right - ar.left;
  const left = Math.min(rightEdge - menuWidth, ar.width - menuWidth - margin);
  menu.style.top = (br.bottom - ar.top + 6) + 'px';
  menu.style.left = Math.max(margin, left) + 'px';
  document.getElementById('qmDismiss').classList.add('active');
  menu.classList.add('visible');
}
function closePublicSortMenu() {
  const m = document.getElementById('publicSortMenu');
  if (m) m.classList.remove('visible');
}
function setPublicSort(s) {
  publicSort = s;
  document.querySelectorAll('#publicSortMenu .qm-item').forEach(btn =>
    btn.classList.toggle('current-status', btn.dataset.psort === s));
  closePublicSortMenu();
  document.getElementById('qmDismiss').classList.remove('active');
  renderPublicShelf();
}

// ── RENDER ──
function isHiddenFromShelf(b) {
  return b.total_pages === -1;
}
function getSortedFiltered() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  let list = q ? [...books] : books.filter(b => b.status === currentFilter);
  list = list.filter(b => !isHiddenFromShelf(b));
  if (q) list = list.filter(b => (b.title||'').toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q));
  list.sort((a, b) => {
    if (currentSort === 'title') return (a.title||'').localeCompare(b.title||'');
    if (currentSort === 'author') {
      const authorCmp = (a.author||'').trim().toLowerCase().localeCompare((b.author||'').trim().toLowerCase());
      if (authorCmp !== 0) return authorCmp;
      return (a.title||'').localeCompare(b.title||'');
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
  return list;
}
function updateTabCounts() {
  const el = id => document.getElementById(id);
  const visible = books.filter(b => !isHiddenFromShelf(b));
  if (el('count-reading')) el('count-reading').textContent = visible.filter(b => b.status === 'reading').length;
  if (el('count-read')) el('count-read').textContent = visible.filter(b => b.status === 'read').length;
  if (el('count-unread')) el('count-unread').textContent = visible.filter(b => b.status === 'unread').length;
}
function renderSkeleton() {
  const grid = document.getElementById('bookGrid');
  grid.classList.remove('reading-mode');
  grid.innerHTML = `<div style="display:contents">${Array(8).fill('<div class="skeleton"></div>').join('')}</div>`;
}
function readingCardHtml(book, i) {
  const pagesRead = book.pages_read || 0;
  const totalPages = book.total_pages || 0;
  const pct = totalPages > 0 ? Math.min(100, Math.round((pagesRead / totalPages) * 100)) : 0;
  const coverContent = book.cover_url
    ? `<img src="${escapeAttr(book.cover_url)}" alt="" draggable="false"/>`
    : makePlaceholder(book, 12);
  const progressHtml = totalPages > 0
    ? `<div class="rc-progress-wrap">
        <div class="rc-progress-meta">
          <span class="rc-progress-label">${pagesRead} / ${totalPages} pages</span>
          <span class="rc-progress-pct">${pct}%</span>
        </div>
        <div class="rc-bar-bg"><div class="rc-bar-fill" style="width:${pct}%"></div></div>
      </div>`
    : `<p class="rc-no-progress">tap ✏️ to track progress</p>`;
  return `<div class="reading-card" data-id="${book.id}" style="animation-delay:${Math.min(i,12)*0.035}s">
    <div class="rc-cover">${coverContent}</div>
    <div class="rc-info">
      <div class="rc-title">${escapeHtml(book.title)}</div>
      <div class="rc-author">${escapeHtml(book.author || '')}</div>
      ${progressHtml}
    </div>
    <button class="rc-edit-btn" data-id="${book.id}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
  </div>`;
}
function attachReadingCardEvents(card) {
  const id = card.dataset.id;
  const editBtn = card.querySelector('.rc-edit-btn');
  editBtn.addEventListener('click', e => { e.stopPropagation(); openProgressModal(id); });
  editBtn.addEventListener('touchend', e => { e.stopPropagation(); });
  card.addEventListener('touchstart', e => { if (e.target.closest('.rc-edit-btn')) return; startPress(e, id, card); }, { passive: true });
  card.addEventListener('touchend', e => { if (e.target.closest('.rc-edit-btn')) return; endPress(e, id, card); });
  card.addEventListener('touchcancel', () => { if (!didLongPress) cancelPress(card); });
  card.addEventListener('click', e => {
    if (isTouch() || e.target.closest('.rc-edit-btn')) return;
    if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
    else openQuickMenu(id, card);
  });
}
function renderGrid() {
  updateTabCounts();
  const grid = document.getElementById('bookGrid');
  const filtered = getSortedFiltered();
  if (!filtered.length) {
    grid.classList.remove('reading-mode');
    const q = (document.getElementById('searchInput')?.value || '').trim();
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span>
      <p>${q ? `No results for "<strong>${q}</strong>"` : 'Nothing here yet.'}<br>${!q ? `Tap <strong style="color:var(--accent)">+</strong> to search and add a book.` : ''}</p></div>`;
    return;
  }
  if (currentFilter === 'reading') {
    grid.classList.add('reading-mode');
    grid.innerHTML = filtered.map((b, i) => readingCardHtml(b, i)).join('');
    grid.querySelectorAll('.reading-card').forEach(attachReadingCardEvents);
  } else {
    grid.classList.remove('reading-mode');
    grid.innerHTML = filtered.map((b, i) => `
      <div class="book-card" data-id="${b.id}" data-title="${escapeAttr(b.title||'')}" data-author="${escapeAttr(b.author||'')}" style="animation-delay:${Math.min(i,12)*0.035}s">
        ${coverHtml(b)}<div class="status-dot ${b.status}"></div>
      </div>`).join('');
    grid.querySelectorAll('.book-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('touchstart', e => startPress(e, id, card), { passive: true });
      card.addEventListener('touchend', e => endPress(e, id, card));
      card.addEventListener('touchcancel', () => { if (!didLongPress) cancelPress(card); });
      card.addEventListener('click', () => {
        if (isTouch()) return;
        if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
        else openQuickMenu(id, card);
      });
    });
  }
  // refresh A–Z bar after DOM settles
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
}

// ── SEARCH (shelf) ──
function onShelfSearch() {
  const val = document.getElementById('searchInput').value;
  document.getElementById('searchClearBtn').classList.toggle('visible', val.length > 0);
  renderGrid();
}
function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClearBtn').classList.remove('visible');
  renderGrid();
  document.getElementById('searchInput').focus();
}

// ── PRESS ──
function startPress(e, id, card) {
  isPressing = true; didLongPress = false; card.classList.add('pressing');
  longPressTimer = setTimeout(() => {
    didLongPress = true; card.classList.remove('pressing'); card.classList.add('long-pressed');
    if (navigator.vibrate) navigator.vibrate(25);
    openQuickMenu(id, card);
  }, 500);
}
function endPress(e, id, card) {
  if (!isPressing) return; isPressing = false; clearTimeout(longPressTimer);
  card.classList.remove('pressing', 'long-pressed');
  if (!didLongPress && !isTouch()) {
    if (card.classList.contains('reading-card')) openProgressModal(id);
    else openDetailModal(id);
  }
  didLongPress = false;
}
function cancelPress(card) {
  if (didLongPress) return;
  isPressing = false; clearTimeout(longPressTimer);
  if (card) card.classList.remove('pressing', 'long-pressed');
}

// ── QUICK MENU ──
function openQuickMenu(id, card) {
  qmBookId = id;
  const menu = document.getElementById('quickMenu');
  const app = document.getElementById('app');
  const ar = app.getBoundingClientRect(), cr = card.getBoundingClientRect();
  let top = cr.bottom - ar.top + 6, left = cr.left - ar.left;
  if (left + 152 > ar.width - 8) left = ar.width - 160;
  if (top + 220 > ar.height - 8) top = (cr.top - ar.top) - 226;
  menu.style.top = top + 'px'; menu.style.left = left + 'px';
  const book = books.find(b => b.id === id);
  menu.querySelectorAll('[data-qm]').forEach(btn => btn.classList.toggle('current-status', book && btn.dataset.qm === book.status));
  document.getElementById('qmDismiss').classList.add('active');
  menu.classList.add('visible');
}
function closeQuickMenu() {
  document.getElementById('quickMenu').classList.remove('visible');
  qmBookId = null;
  if (!document.getElementById('sortMenu').classList.contains('visible') &&
      !document.getElementById('publicSortMenu').classList.contains('visible')) {
    document.getElementById('qmDismiss').classList.remove('active');
  }
}
function openSortMenu(btn) {
  const menu = document.getElementById('sortMenu');
  const ar = document.getElementById('app').getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  const menuWidth = 160; const margin = 8;
  const rightEdge = br.right - ar.left;
  const left = Math.min(rightEdge - menuWidth, ar.width - menuWidth - margin);
  menu.style.top = (br.bottom - ar.top + 6) + 'px';
  menu.style.left = Math.max(margin, left) + 'px';
  document.getElementById('qmDismiss').classList.add('active');
  menu.classList.add('visible');
}
function closeSortMenu() {
  if (document.getElementById('sortMenu')) document.getElementById('sortMenu').classList.remove('visible');
  if (!document.getElementById('quickMenu').classList.contains('visible') &&
      !document.getElementById('publicSortMenu').classList.contains('visible')) {
    document.getElementById('qmDismiss').classList.remove('active');
  }
}
function setSort(sortType) {
  currentSort = sortType;
  document.querySelectorAll('#sortMenu .qm-item').forEach(btn => btn.classList.toggle('current-status', btn.dataset.sort === sortType));
  closeSortMenu();
  renderGrid();
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
}

// ── SCANNER ──
async function openScannerModal() {
  document.getElementById('scannerModal').classList.add('visible');
  const video = document.getElementById('scannerVideo');
  try {
  scannerStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }
    });
    video.srcObject = scannerStream;
    await video.play();

    if ('BarcodeDetector' in window) {
      // Native API — Chrome, Android, Safari 17+
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] });
      scannerInterval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const isbn = barcodes[0].rawValue;
            closeScannerModal();
            document.getElementById('bsInput').value = isbn;
            onBsInput();
          }
        } catch (e) {}
      }, 500);
    } else {
      // Fallback — canvas polling for Safari (no BarcodeDetector, no ESM imports)
      showToast('Starting scanner…');
      const canvas = document.createElement('canvas');
      const ctx2d = canvas.getContext('2d', { willReadFrequently: true });

      // Dynamically load ZXing UMD (works on Safari, no ESM needed)
      await new Promise((resolve, reject) => {
        if (window.ZXing) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.19.2/umd/index.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(() => {
        showToast('Scanner unavailable — enter ISBN manually');
        closeScannerModal();
        document.getElementById('bsInput').focus();
        return;
      });

      if (!window.ZXing) return;

      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
      ]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

      const reader = new ZXing.BrowserMultiFormatReader(hints, 150);

      // Wait for video to be playing before handing to ZXing
      await new Promise(resolve => {
        if (video.readyState >= 3) { resolve(); return; }
        video.addEventListener('canplay', resolve, { once: true });
      });

      reader.decodeFromVideoElement(video, (result, err) => {
        if (result) {
          const isbn = result.getText();
          reader.reset();
          closeScannerModal();
          document.getElementById('bsInput').value = isbn;
          onBsInput();
        }
      });

      video._zxingReader = reader;
    }
  } catch (err) {
    closeScannerModal();
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      showToast('Camera permission denied — enable in Settings > Safari');
    } else if (err.name === 'NotFoundError') {
      showToast('No camera found on this device');
    } else {
      showToast('Could not start camera — try again');
    }
  }
}
function closeScannerModal() {
  document.getElementById('scannerModal').classList.remove('visible');
  const video = document.getElementById('scannerVideo');
  if (video._zxingReader) { try { video._zxingReader.reset(); } catch(e) {} video._zxingReader = null; }
  clearInterval(scannerInterval); scannerInterval = null;
  if (scannerStream) { scannerStream.getTracks().forEach(t => t.stop()); scannerStream = null; }
  video.srcObject = null;
}

// ── QUICK ACTIONS ──
async function quickSetStatus(status) {
  const id = qmBookId; closeQuickMenu();
  const book = books.find(b => b.id === id); if (!book) return;
  book.status = status; renderGrid();
  await dbUpdate(id, { status });
}
function editFromMenu() { const id = qmBookId; closeQuickMenu(); openDetailModal(id); }
async function deleteFromMenu() {
  const id = qmBookId; closeQuickMenu();
  await removeOrHideBook(id);
}
// ── ADD TO LIST FROM QUICK MENU ──
function addToListFromMenu() {
  const id = qmBookId;
  closeQuickMenu();
  document.getElementById('qmDismiss').classList.remove('active');
  const book = books.find(b => b.id === id);
  if (!book) return;

  const loLists = window._getLoLists ? window._getLoLists() : [];
  const content = document.getElementById('addToListContent');
  document.getElementById('addToListBookTitle').textContent = book.title;

  if (!loLists.length) {
    content.innerHTML = `<p style="color:var(--text-muted);font-size:14px;text-align:center;padding:16px 0">No lists yet.<br>Create one from Profile → My Lists.</p>`;
  } else {
    content.innerHTML = loLists.map(list => `
      <button onclick="confirmAddToList('${list.id}','${id}')"
        style="display:flex;align-items:center;gap:12px;width:100%;background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:13px 14px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;text-align:left;transition:border-color 0.2s"
        onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <span style="font-size:20px;flex-shrink:0">${escapeHtml(list.emoji || '📚')}</span>
        <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(list.name)}</span>
        <span style="font-size:11px;color:var(--text-muted);flex-shrink:0">${(list._books||[]).length} books</span>
      </button>`).join('');
  }

  document.getElementById('addToListModal').classList.add('visible');
}
async function confirmAddToList(listId, bookId) {
  closeModal('addToListModal');
  // Avoid duplicates
  const { data: existing } = await sb.from('list_books').select('id').eq('list_id', listId).eq('book_id', bookId).maybeSingle();
  if (existing) { showToast('Already in that list'); return; }
  const { error } = await sb.from('list_books').insert({ list_id: listId, book_id: bookId });
  if (error) { showToast('Could not add to list'); return; }
  // Update local _books cache so cover stacks refresh
  const list = (window._getLoLists ? window._getLoLists() : []).find(l => String(l.id) === String(listId));
  const book = books.find(b => b.id === bookId);
  if (list && book) list._books = [...(list._books || []), book];
  if (window._ldGetOwned && window._ldSetOwned) {
    const ownedArr = window._ldGetOwned(listId);
    if (!ownedArr.includes(String(bookId))) { ownedArr.push(String(bookId)); window._ldSetOwned(listId, ownedArr); }
  }
  showToast('Added to list ✓');
}
  
  
// ── DETAIL MODAL ──
const STATUS_LABELS = { reading: 'Reading', read: 'Read', unread: 'Unread' };
function updateDetailBadge(status) {
  const badge = document.getElementById('detailBadge');
  badge.className = `status-badge ${status}`;
  badge.innerHTML = `<span class="status-badge-dot"></span>${STATUS_LABELS[status]}`;
  document.querySelectorAll('#statusDropdown .sd-item').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.sd === status));
}
function toggleStatusDropdown(e) { e.stopPropagation(); document.getElementById('statusDropdown').classList.toggle('open'); }
function closeStatusDropdown() { document.getElementById('statusDropdown').classList.remove('open'); }
function setEditStatusFromDropdown(status) { editStatus = status; updateDetailBadge(status); closeStatusDropdown(); }
function handleDetailOverlayClick(e) {
  if (e.target === document.getElementById('detailModal')) { closeModal('detailModal'); return; }
  const dropdown = document.getElementById('statusDropdown');
  if (dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== document.getElementById('statusChevronBtn'))
    closeStatusDropdown();
}
function openDetailModal(id) {
  const book = books.find(b => b.id === id); if (!book) return;
  editingId = id; editCoverFile = null;
  document.getElementById('detailTitleEl').textContent = book.title;
  document.getElementById('detailAuthorEl').textContent = book.author || '';
  document.getElementById('detailCoverEl').innerHTML = coverHtml(book, 14);
  editStatus = book.status;
  updateDetailBadge(book.status);
  closeStatusDropdown();
  document.getElementById('editTitle').value = book.title;
  document.getElementById('editAuthor').value = book.author || '';
  document.getElementById('editCoverUpload').innerHTML = book.cover_url
    ? `<img class="cover-preview" src="${book.cover_url}"/><span style="font-size:13px;color:var(--text-dim)">Cover added ✓</span><input type="file" accept="image/*" onchange="handleCoverUpload(event,'edit')"/>`
    : `<input type="file" accept="image/*" onchange="handleCoverUpload(event,'edit')"/><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Change cover</span>`;
  document.getElementById('editCoverUrlInput').value = book.cover_url || ''; editCoverUrl = book.cover_url || null;
  document.getElementById('detailModal').classList.add('visible');
}
async function confirmEdit() {
  const title = document.getElementById('editTitle').value.trim();
  if (!title) { document.getElementById('editTitle').style.borderColor = 'var(--accent)'; return; }
  const btn = document.getElementById('saveEditBtn'); btn.disabled = true; btn.textContent = 'Saving…';
  const updates = { title, author: document.getElementById('editAuthor').value.trim() || '', status: editStatus };
  if (editCoverFile) { const url = await uploadCover(editCoverFile, editingId); if (url) updates.cover_url = url; }
  else if (editCoverUrl) { updates.cover_url = editCoverUrl; }
  const ok = await dbUpdate(editingId, updates);
  if (ok) { const book = books.find(b => b.id === editingId); if (book) Object.assign(book, updates); closeModal('detailModal'); renderGrid(); showToast('Changes saved ✓'); }
  btn.disabled = false; btn.textContent = 'Save Changes';
}
async function removeOrHideBook(id) {
  const lists = window._getLoLists ? window._getLoLists() : [];
  let inList = false;
  for (const l of lists) {
    if ((l._books || []).some(b => String(b.id) === String(id))) { inList = true; break; }
  }
  if (inList) {
    const book = books.find(b => String(b.id) === String(id));
    if (book) book.total_pages = -1;
    for (const l of lists) {
      if (window._ldIsOwned && window._ldIsOwned(l.id, id)) {
        await sb.from('list_books').update({ owned: false }).eq('list_id', l.id).eq('book_id', id);
        try { _ownedCache[l.id].delete(String(id)); } catch(e){}
      }
    }
    await sb.from('books').update({ total_pages: -1 }).eq('id', id);
    renderGrid();
    if (typeof renderShelfGrid === 'function') renderShelfGrid();
    showToast('Book removed from shelf');
  } else {
    books = books.filter(b => String(b.id) !== String(id));
    renderGrid();
    if (typeof renderShelfGrid === 'function') renderShelfGrid();
    await dbDelete(id); showToast('Book removed');
  }
}
async function deleteBook() {
  const id = editingId;
  closeModal('detailModal');
  await removeOrHideBook(id);
}

// ── PROGRESS ──
function openProgressModal(id) {
  const book = books.find(b => b.id === id); if (!book) return;
  progressBookId = id;
  document.getElementById('progressModalSubtitle').textContent = book.title;
  document.getElementById('progressPagesRead').value = book.pages_read || '';
  document.getElementById('progressTotalPages').value = book.total_pages || '';
  updateProgressPreview();
  document.getElementById('progressModal').classList.add('visible');
}
function updateProgressPreview() {
  const pr = parseInt(document.getElementById('progressPagesRead').value) || 0;
  const tp = parseInt(document.getElementById('progressTotalPages').value) || 0;
  const pct = tp > 0 ? Math.min(100, Math.round((pr / tp) * 100)) : 0;
  document.getElementById('progressPreviewBar').style.width = pct + '%';
  document.getElementById('progressPreviewPages').textContent = `${pr} / ${tp > 0 ? tp : '?'} pages`;
  document.getElementById('progressPreviewPct').textContent = pct + '%';
}
async function confirmProgress() {
  let pagesRead = parseInt(document.getElementById('progressPagesRead').value) || 0;
  const totalPages = parseInt(document.getElementById('progressTotalPages').value) || 0;
  if (totalPages > 0) pagesRead = Math.min(pagesRead, totalPages);
  const btn = document.getElementById('saveProgressBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const ok = await dbUpdate(progressBookId, { pages_read: pagesRead, total_pages: totalPages });
  if (ok) {
    const book = books.find(b => b.id === progressBookId);
    if (book) { book.pages_read = pagesRead; book.total_pages = totalPages; }
    closeModal('progressModal'); renderGrid(); showToast('Progress saved ✓');
  }
  btn.disabled = false; btn.textContent = 'Save Progress';
}

// ── PROFILE ──
function openProfileModal() {
  const email = currentUser?.email || '—';
  const initials = getUserInitials(email);
  document.getElementById('profileAvatarLarge').textContent = initials;
  document.getElementById('profileEmailDisplay').textContent = email;
  const countEl = document.getElementById('shelfTotalCount');
  if (countEl) countEl.textContent = books.length === 1 ? '1 book' : `${books.length} books`;
  updateShareUI();
  if (typeof updateListsCount === 'function') updateListsCount();
  document.getElementById('profileModal').classList.add('visible');
}

// ── MY SHELF VIEW ──
let shelfSort = 'recent';
function updateShelfStats() {
  const visible = books.filter(b => !isHiddenFromShelf(b));
  ['reading','read','unread'].forEach(s => {
    const el = document.getElementById('shelfStatNum-' + s);
    if (el) el.textContent = visible.filter(b => b.status === s).length;
  });
}
function openShelfView() {
  const si = document.getElementById('shelfSearchInput');
  if (si) { si.value = ''; document.getElementById('shelfSearchClear').classList.remove('visible'); }
  updateShelfStats();
  renderShelfGrid();
  document.getElementById('shelfOverlay').classList.add('open');
}
function closeShelfView() { document.getElementById('shelfOverlay').classList.remove('open'); }
function clearShelfSearch() {
  const si = document.getElementById('shelfSearchInput');
  si.value = ''; document.getElementById('shelfSearchClear').classList.remove('visible');
  renderShelfGrid(); si.focus();
}
function openShelfSortMenu(btn) {
  const menu = document.getElementById('shelfSortMenu');
  menu.querySelectorAll('.qm-item').forEach(i => i.classList.toggle('current-status', i.dataset.ssort === shelfSort));
  const ar = document.getElementById('app').getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  const menuWidth = 160, margin = 8;
  const left = Math.min(br.right - ar.left - menuWidth, ar.width - menuWidth - margin);
  menu.style.top = (br.bottom - ar.top + 6) + 'px';
  menu.style.left = Math.max(margin, left) + 'px';
  document.getElementById('qmDismiss').classList.add('active');
  menu.classList.add('visible');
}
function closeShelfSortMenu() {
  const m = document.getElementById('shelfSortMenu'); if (m) m.classList.remove('visible');
}
function setShelfSort(s) {
  shelfSort = s;
  document.querySelectorAll('#shelfSortMenu .qm-item').forEach(btn => btn.classList.toggle('current-status', btn.dataset.ssort === s));
  closeShelfSortMenu();
  document.getElementById('qmDismiss').classList.remove('active');
  renderShelfGrid();
}
function renderShelfGrid() {
  const grid = document.getElementById('shelfGrid');
  const countEl = document.getElementById('shelfOverlayCount');
  const q = (document.getElementById('shelfSearchInput')?.value || '').toLowerCase().trim();
  let all = books.filter(b => !isHiddenFromShelf(b));
  if (q) all = all.filter(b => (b.title||'').toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q));
  document.getElementById('shelfSearchClear')?.classList.toggle('visible', q.length > 0);
  all.sort((a, b) => {
    if (shelfSort === 'title') return (a.title||'').localeCompare(b.title||'');
    if (shelfSort === 'author') {
      const cmp = (a.author||'').localeCompare(b.author||'');
      return cmp !== 0 ? cmp : (a.title||'').localeCompare(b.title||'');
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
  if (countEl) countEl.textContent = all.length === 1 ? '1 book' : `${all.length} books`;
  if (!all.length) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>Your shelf is empty.<br>Tap <strong style="color:var(--accent)">+</strong> to add books.</p></div>`;
    return;
  }
  grid.classList.remove('reading-mode');
  grid.innerHTML = all.map((b, i) => `
    <div class="book-card" data-id="${b.id}" data-title="${escapeAttr(b.title||'')}" data-author="${escapeAttr(b.author||'')}" style="animation-delay:${Math.min(i,12)*0.035}s">
      ${coverHtml(b)}<div class="status-dot ${b.status}"></div>
    </div>`).join('');
  grid.querySelectorAll('.book-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('touchstart', e => startPress(e, id, card), { passive: true });
    card.addEventListener('touchend', e => endPress(e, id, card));
    card.addEventListener('touchcancel', () => { if (!didLongPress) cancelPress(card); });
    card.addEventListener('click', () => {
      if (isTouch()) return;
      if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
      else openQuickMenu(id, card);
    });
  });
  // refresh A–Z bar after DOM settles
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('shelf');
}

// ── BOOK SEARCH ──
function openBookSearch() {
  document.getElementById('addBtn').classList.add('open');
  document.getElementById('bookSearchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('bsInput').focus(), 380);
}
function closeBookSearch() {
  document.getElementById('addBtn').classList.remove('open');
  document.getElementById('bookSearchOverlay').classList.remove('open');
  document.getElementById('bsInput').value = '';
  document.getElementById('bsResults').innerHTML = '<div class="bs-state"><p>Type a title, author, or ISBN to search</p></div>';
  clearTimeout(bookSearchTimer);
  setBsCategory('all');
}
function setBsCategory(cat) {
  bsSearchCategory = cat;
  document.getElementById('bsCategories').querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.cat === cat));
  if (document.getElementById('bsInput').value.trim()) onBsInput();
}
function onBsInput() {
  clearTimeout(bookSearchTimer);
  const q = document.getElementById('bsInput').value.trim();
  if (!q) { document.getElementById('bsResults').innerHTML = '<div class="bs-state"><p>Type a title, author, or ISBN to search</p></div>'; return; }
  document.getElementById('bsResults').innerHTML = '<div class="bs-state"><div class="loading-spinner"></div></div>';
  bookSearchTimer = setTimeout(() => fetchBookSearch(q), 500);
}

async function fetchBookSearch(query) {
  const resultsEl = document.getElementById('bsResults');
  const isIsbn = /^[\d\-]{9,17}$/.test(query.replace(/\s/g,''));

  async function searchGoogle(q, cat) {
    let qParam = encodeURIComponent(q);
    if (cat === 'intitle') qParam = `intitle:${qParam}`;
    else if (cat === 'inauthor') qParam = `inauthor:${qParam}`;
    else if (isIsbn) qParam = `isbn:${qParam}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${qParam}&maxResults=40&langRestrict=en`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(item => {
      const v = item.volumeInfo || {};
      let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '';
      if (cover) cover = cover.replace(/^http:/, 'https:').replace('zoom=1','zoom=2').replace('&edge=curl','');
      return { title: v.title || '', author: (v.authors||[])[0] || '', cover, source: 'google' };
    });
  }

  async function searchOpenLibrary(q, cat) {
    let field = 'q';
    if (cat === 'intitle') field = 'title';
    else if (cat === 'inauthor') field = 'author';
    else if (isIsbn) field = 'isbn';
    const res = await fetch(`https://openlibrary.org/search.json?${field}=${encodeURIComponent(q)}&limit=30&fields=title,author_name,cover_i,isbn`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || []).filter(d => d.title).map(d => ({
      title: d.title || '',
      author: (d.author_name||[])[0] || '',
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
      source: 'ol'
    }));
  }

  try {
    const [gResult, olResult] = await Promise.allSettled([
      searchGoogle(query, bsSearchCategory),
      searchOpenLibrary(query, bsSearchCategory)
    ]);
    const g = gResult.status === 'fulfilled' ? gResult.value : [];
    const ol = olResult.status === 'fulfilled' ? olResult.value : [];
    const seen = new Set(g.map(b => (b.title+b.author).toLowerCase().replace(/\s/g,'')));
    const merged = [...g, ...ol.filter(b => {
      const key = (b.title+b.author).toLowerCase().replace(/\s/g,'');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    })];
    renderBsResults(merged);
  } catch(e) {
    resultsEl.innerHTML = '<div class="bs-state"><p>Search failed.<br>Check your connection or add manually.</p></div>';
  }
}

function renderBsResults(items) {
  const el = document.getElementById('bsResults');
  if (!items.length) {
    el.innerHTML = '<div class="bs-state"><p>No results found.<br>Try a different keyword or add manually.</p></div>';
    return;
  }
  el.innerHTML = items.map((book, i) => {
    const coverContent = book.cover ? `<img src="${escapeAttr(book.cover)}" alt="" onerror="this.parentElement.innerHTML=''">` : '';
    return `<div class="bs-result" data-bs-index="${i}">
      <div class="bs-result-cover">${coverContent}</div>
      <div class="bs-result-info">
        <div class="bs-result-title">${escapeHtml(book.title || 'Unknown Title')}</div>
        <div class="bs-result-author">${escapeHtml(book.author || 'Unknown Author')}</div>
      </div>
      <span class="bs-result-add">+</span>
    </div>`;
  }).join('');
  el._bsResults = items;
  el.querySelectorAll('.bs-result').forEach(row => {
    row.addEventListener('click', () => {
      const book = el._bsResults[+row.dataset.bsIndex];
      if (book) selectBsResult(book.title, book.author, book.cover);
    });
  });
}

function selectBsResult(title, author, coverUrl) {
  closeBookSearch();
  addCoverFile = null; addCoverUrl = coverUrl || null;
  document.getElementById('addTitle').value = title || '';
  document.getElementById('addAuthor').value = author || '';
  document.getElementById('addCoverUrlInput').value = coverUrl || '';
  const uploadEl = document.getElementById('addCoverUpload');
  if (coverUrl) {
    const img = document.createElement('img'); img.className = 'cover-preview'; img.src = coverUrl;
    img.onerror = () => img.remove();
    const label = document.createElement('span'); label.style.cssText = 'font-size:13px;color:var(--text-dim)'; label.textContent = 'Cover ready ✓';
    const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/*';
    fileInput.onchange = e => handleCoverUpload(e, 'add');
    uploadEl.innerHTML = ''; uploadEl.append(img, label, fileInput);
  }
  setTimeout(() => document.getElementById('addModal').classList.add('visible'), 80);
}

function openManualAdd() {
  closeBookSearch();
  setTimeout(() => document.getElementById('addModal').classList.add('visible'), 80);
}

// ── ADD ──
async function confirmAdd() {
  const title = document.getElementById('addTitle').value.trim();
  if (!title) { document.getElementById('addTitle').style.borderColor = 'var(--accent)'; return; }
  const btn = document.getElementById('addBookBtn'); btn.disabled = true; btn.textContent = 'Adding…';
  const newBook = await dbAdd({ title, author: document.getElementById('addAuthor').value.trim() || '', status: addStatus, cover_url: null, pages_read: 0, total_pages: 0 });
  if (newBook) {
    let finalUrl = null;
    if (addCoverFile) finalUrl = await uploadCover(addCoverFile, newBook.id);
    else if (addCoverUrl) finalUrl = addCoverUrl;
    if (finalUrl) { await dbUpdate(newBook.id, { cover_url: finalUrl }); newBook.cover_url = finalUrl; }
    books.unshift(newBook);
    closeModal('addModal'); renderGrid(); showToast('Book added ✓');
  }
  btn.disabled = false; btn.textContent = 'Add to Shelf';
}

// ── SHARED HELPERS ──
function closeModal(id) {
  document.getElementById(id).classList.remove('visible');
  if (id === 'addModal') resetAddModal();
  if (id === 'detailModal') closeStatusDropdown();
}
function handleOverlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}
function setPillStatus(ctx, status) {
  if (ctx === 'add') addStatus = status; else editStatus = status;
  document.querySelectorAll(`#${ctx}Pills .pill`).forEach(p => p.classList.toggle('active', p.dataset.status === status));
}
function handleCoverUpload(e, ctx) {
  const file = e.target.files[0]; if (!file) return;
  if (ctx === 'add') { addCoverFile = file; addCoverUrl = null; document.getElementById('addCoverUrlInput').value = ''; }
  else { editCoverFile = file; editCoverUrl = null; document.getElementById('editCoverUrlInput').value = ''; }
  const reader = new FileReader();
  reader.onload = ev => {
    const src = ev.target.result;
    document.getElementById(ctx === 'add' ? 'addCoverUpload' : 'editCoverUpload').innerHTML =
      `<img class="cover-preview" src="${src}"/><span style="font-size:13px;color:var(--text-dim)">Cover ready ✓</span><input type="file" accept="image/*" onchange="handleCoverUpload(event,'${ctx}')"/>`;
  };
  reader.readAsDataURL(file);
}
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  renderGrid();
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
}
function resetAddModal() {
  document.getElementById('addTitle').value = '';
  document.getElementById('addAuthor').value = '';
  document.getElementById('addTitle').style.borderColor = '';
  addCoverFile = null; addCoverUrl = null;
  addStatus = 'unread'; setPillStatus('add', 'unread');
  document.getElementById('addCoverUpload').innerHTML =
    `<input type="file" accept="image/*" onchange="handleCoverUpload(event,'add')"/><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Upload cover image</span>`;
  document.getElementById('addCoverUrlInput').value = '';
  document.getElementById('addBookBtn').disabled = false;
  document.getElementById('addBookBtn').textContent = 'Add to Shelf';
}
function handleCoverUrlPaste(e, ctx) {
  const url = e.target.value.trim(); if (!url) return;
  const img = new Image();
  img.onload = () => {
    if (ctx === 'add') { addCoverFile = null; addCoverUrl = url; }
    else { editCoverFile = null; editCoverUrl = url; }
    document.getElementById(ctx === 'add' ? 'addCoverUpload' : 'editCoverUpload').innerHTML =
      `<img class="cover-preview" src="${escapeAttr(url)}"/><span style="font-size:13px;color:var(--text-dim)">URL cover ready ✓</span><input type="file" accept="image/*" onchange="handleCoverUpload(event,'${ctx}')"/>`;
  };
  img.src = url;
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── A–Z ALPHABET SCROLLBAR ─────────────────────────────────────────────────
// position:fixed on main shelf (scrolls independently of content)
// position:absolute on shelf overlay (overlay is already full-screen fixed)
(function () {
  const ALL_LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  function firstLetter(str) {
    if (!str) return '#';
    const c = str.trim()[0].toLowerCase();
    return /[a-z]/.test(c) ? c.toUpperCase() : '#';
  }

  function haptic() {
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
  }

  const CONTEXTS = {
    main: {
      barId:       'mainAlphaBar',
      trackId:     'mainAlphaTrack',
      bubbleId:    'mainAlphaBubble',
      gridId:      'bookGrid',
      containerId: 'mainGridContainer',
      getSort:     () => currentSort,
    },
    shelf: {
      barId:       'shelfAlphaBar',
      trackId:     'shelfAlphaTrack',
      bubbleId:    'shelfAlphaBubble',
      gridId:      'shelfGrid',
      containerId: 'shelfGridContainer',
      getSort:     () => shelfSort,
    },
    public: {
      barId:       'publicAlphaBar',
      trackId:     'publicAlphaTrack',
      bubbleId:    'publicAlphaBubble',
      gridId:      'publicBookGrid',
      containerId: 'publicShelfContent',
      getSort:     () => publicSort,
    },
  };

  const lastLetter  = { main: null, shelf: null, public: null };
  const mouseState  = { main: false, shelf: false, public: false };

  // ── Position the bar so it sits exactly over the grid area ──
  function positionBar(ctx) {
    const cfg = CONTEXTS[ctx];
    const bar = document.getElementById(cfg.barId);
    const container = document.getElementById(cfg.containerId);
    if (!bar || !container) return;
    const rect = container.getBoundingClientRect();
    bar.style.top    = rect.top + 'px';
    bar.style.bottom = (window.innerHeight - rect.bottom) + 'px';
  }

  function getCards(ctx) {
    const grid = document.getElementById(CONTEXTS[ctx].gridId);
    return grid ? Array.from(grid.querySelectorAll('.book-card[data-id], .pub-book-card[data-id]')) : [];
  }

  function getActiveLetters(ctx) {
    const sort  = CONTEXTS[ctx].getSort();
    const field = sort === 'author' ? 'data-author' : 'data-title';
    const seen  = new Set();
    getCards(ctx).forEach(card => seen.add(firstLetter(card.getAttribute(field) || '')));
    return seen;
  }

  function buildBar(ctx) {
    const cfg    = CONTEXTS[ctx];
    const bar    = document.getElementById(cfg.barId);
    const track  = document.getElementById(cfg.trackId);
    const bubble = document.getElementById(cfg.bubbleId);
    if (!bar || !track || !bubble) return;

    const sort = cfg.getSort();

    if (sort === 'recent') {
      bar.classList.remove('visible');
      hideBubble(ctx);
      return;
    }

    const activeLetters = getActiveLetters(ctx);
    if (activeLetters.size < 2) {
      bar.classList.remove('visible');
      hideBubble(ctx);
      return;
    }

    // Position the fixed bar over the exact grid area
    positionBar(ctx);

    track.innerHTML = '';
    ALL_LETTERS.forEach(letter => {
      const el = document.createElement('div');
      el.className  = 'alpha-letter' + (activeLetters.has(letter) ? '' : ' dim');
      el.textContent = letter;
      el.dataset.letter = letter;
      track.appendChild(el);
    });

    bar.classList.add('visible');
  }

  function hideBubble(ctx) {
    const cfg    = CONTEXTS[ctx];
    const bubble = document.getElementById(cfg.bubbleId);
    const track  = document.getElementById(cfg.trackId);
    if (bubble) bubble.classList.remove('show');
    if (track)  track.querySelectorAll('.alpha-letter').forEach(el => el.classList.remove('active'));
    lastLetter[ctx] = null;
  }

  function activateLetter(ctx, letter, clientY) {
    if (!letter) return;
    const cfg    = CONTEXTS[ctx];
    const track  = document.getElementById(cfg.trackId);
    const bubble = document.getElementById(cfg.bubbleId);
    if (!track || !bubble) return;

    // Highlight active letter in strip
    track.querySelectorAll('.alpha-letter').forEach(el =>
      el.classList.toggle('active', el.dataset.letter === letter));

    // Position bubble — always uses viewport clientY since bubble is position:fixed
    const bubbleH  = 52;
    const topBound = 60;
    const botBound = window.innerHeight - bubbleH - 16;
    const clampedY = Math.max(topBound, Math.min(botBound, clientY - bubbleH / 2));
    bubble.style.top = clampedY + 'px';
    bubble.textContent = letter;
    bubble.classList.add('show');

    if (letter !== lastLetter[ctx]) {
      lastLetter[ctx] = letter;
      haptic();
      scrollToLetter(ctx, letter);
    }
  }

  function scrollToLetter(ctx, letter) {
    const cfg   = CONTEXTS[ctx];
    const sort  = cfg.getSort();
    const field = sort === 'author' ? 'data-author' : 'data-title';
    const container = document.getElementById(cfg.containerId);
    if (!container) return;

    for (const card of getCards(ctx)) {
      if (firstLetter(card.getAttribute(field) || '') === letter) {
        // scrollTop + getBoundingClientRect delta is correct here:
        // container.scrollTop is the current scroll offset.
        // card.getBoundingClientRect().top - container.getBoundingClientRect().top
        // gives the card's position RELATIVE TO THE VISIBLE CONTAINER TOP,
        // which may be negative (card above viewport) or positive (below).
        // Adding container.scrollTop converts that to an absolute scroll position.
        // This is scroll-position-independent and works correctly at any scroll depth.
        const cTop   = container.getBoundingClientRect().top;
        const cardTop = card.getBoundingClientRect().top;
        const target = container.scrollTop + (cardTop - cTop) - 8;
        container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
        return;
      }
    }
  }

  function letterFromY(ctx, clientY) {
    const track = document.getElementById(CONTEXTS[ctx].trackId);
    if (!track) return null;
    const active = Array.from(track.querySelectorAll('.alpha-letter:not(.dim)'));
    for (const el of active) {
      const r = el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return el.dataset.letter;
    }
    // Edge clamp — snap to nearest active letter
    const all = track.querySelectorAll('.alpha-letter');
    if (!all.length) return null;
    const firstRect = all[0].getBoundingClientRect();
    const lastRect  = all[all.length - 1].getBoundingClientRect();
    if (clientY < firstRect.top) {
      return active.length ? active[0].dataset.letter : null;
    }
    if (clientY > lastRect.bottom) {
      return active.length ? active[active.length - 1].dataset.letter : null;
    }
    return null;
  }

  function setupTouchEvents(ctx) {
    const bar = document.getElementById(CONTEXTS[ctx].barId);
    if (!bar) return;

    bar.addEventListener('touchstart', e => {
      e.stopPropagation();
      const t = e.touches[0];
      const letter = letterFromY(ctx, t.clientY);
      if (letter) activateLetter(ctx, letter, t.clientY);
    }, { passive: true });

    bar.addEventListener('touchmove', e => {
      e.stopPropagation();
      const t = e.touches[0];
      const letter = letterFromY(ctx, t.clientY);
      if (letter) activateLetter(ctx, letter, t.clientY);
    }, { passive: true });

    bar.addEventListener('touchend', e => {
      e.stopPropagation();
      setTimeout(() => hideBubble(ctx), 700);
    }, { passive: true });

    bar.addEventListener('touchcancel', e => {
      e.stopPropagation();
      hideBubble(ctx);
    }, { passive: true });
  }

  function setupMouseEvents(ctx) {
    const bar = document.getElementById(CONTEXTS[ctx].barId);
    if (!bar) return;

    bar.addEventListener('mousedown', e => {
      e.preventDefault();
      mouseState[ctx] = true;
      const letter = letterFromY(ctx, e.clientY);
      if (letter) activateLetter(ctx, letter, e.clientY);
    });

    window.addEventListener('mousemove', e => {
      if (!mouseState[ctx]) return;
      const letter = letterFromY(ctx, e.clientY);
      if (letter) activateLetter(ctx, letter, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (mouseState[ctx]) {
        mouseState[ctx] = false;
        setTimeout(() => hideBubble(ctx), 500);
      }
    });
  }

  window.alphaBarRefresh = function (ctx) {
    setTimeout(() => {
      if (ctx === 'main'  || !ctx) buildBar('main');
      if (ctx === 'shelf' || !ctx) buildBar('shelf');
      if (ctx === 'public'|| !ctx) buildBar('public');
    }, 80);
  };

  document.addEventListener('DOMContentLoaded', () => {
    setupTouchEvents('main');
    setupMouseEvents('main');
    setupTouchEvents('shelf');
    setupMouseEvents('shelf');
    setupTouchEvents('public');
    setupMouseEvents('public');
    
    // Reposition resiliently across iOS screen rotation animation delays
    const handleLayoutShift = () => {
      alphaBarRefresh(); // Fires buildBar logic at 80ms
      setTimeout(() => alphaBarRefresh(), 300); // Fallback for laggy orientation completion
    };
    window.addEventListener('resize', handleLayoutShift);
    window.addEventListener('orientationchange', handleLayoutShift);
  });
})();
// ── MY LISTS ──────────────────────────────────────────────────────────────
;(function () {
  const LO_EMOJIS = ['📚','🔖','⭐','🌙','🔥','💭','🌿','🗺️','🧠','🎭','🌊','🏔️','🎯','✨','🕯️'];
  const LO_PALETTES = [
    ['#4a3728','#c9714a'],['#1e2d3d','#5a8fa8'],['#2d3a2e','#6a9a72'],
    ['#3a2040','#9a6ac0'],['#3d2a1e','#c0814a'],['#1e1e2d','#6a72c0'],
    ['#2d1e1e','#c06a6a'],['#1e2d2a','#6ac0b8'],['#3a3020','#b0963c'],['#2a1e2d','#a06ab8']
  ];
  let loLists = [];
  window._getLoLists = () => loLists;
  let ldBooks = [];
  let loSelectedEmoji = LO_EMOJIS[0];
  let loSheetEditingId = null;
  let loQMTargetId = null;
  let ldCurrentListId = null;
  let ldCurrentFilter = 'all';
  let ldCurrentSort = 'recent';
  let ldCurrentView = 'list'; // 'list' | 'grid3' | 'grid4'
  let ldQMTargetId = null;
  let loLongTimer = null, ldLongTimer = null;
  let ldasCurrentTab = 'search';
  let ldasSearchTimer = null;
  let ldasAddedIds = new Set(); // track which books were added this session

  // ── HELPERS ──
  function loPal(i) { return LO_PALETTES[i % LO_PALETTES.length]; }

  function loThumbHtml(palIdx) {
    palIdx = palIdx || 0;
    const p = loPal(palIdx);
    return `<div class="lo-thumb">
      <div class="lo-thumb-inner" style="background:linear-gradient(160deg,${p[0]} 0%,${p[1]}55 100%)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="${p[1]}" opacity="0.55" stroke="${p[1]}" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none"/>
        </svg>
      </div>
    </div>`;
  }

  function ldCoverHtml(book) {
    const palIdx = (function(str){ let s=String(str||''); let h=0; for(let c of s) h=(h*31+c.charCodeAt(0))>>>0; return h%10; })(book.id);
    const p = loPal(palIdx);
    if (book.cover_url) return `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none" draggable="false" />`;
    return `<div class="ld-cover-inner" style="background:linear-gradient(160deg,${p[0]} 0%,${p[1]}55 100%)">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="${p[1]}" opacity="0.5" stroke="${p[1]}" stroke-width="1.5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none"/>
      </svg>
    </div>`;
  }

  function fanCoversFor(list) {
    const base = (list._books || []).slice(0, 3);
    while (base.length < 3) base.push(null);
    const listIdNum = typeof list.id === 'string'
      ? list.id.split('').reduce((h,c) => (h*31+c.charCodeAt(0))>>>0, 0)
      : (list.id || 0);
    return base.map((b, idx) => {
      const palIdx = b ? (function(s){let st=String(s||'');let h=0;for(let c of st)h=(h*31+c.charCodeAt(0))>>>0;return h%10;})(b.id) : (listIdNum+idx)%10;
      const p = loPal(palIdx || 0);
      const inner = b && b.cover_url
        ? `<img src="${escapeAttr(b.cover_url)}" style="width:100%;height:100%;object-fit:cover" />`
        : `<div class="ld-fan-inner" style="background:linear-gradient(160deg,${p[0]} 0%,${p[1]}55 100%)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${p[1]}" opacity="0.5" stroke="${p[1]}" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none"/>
            </svg>
          </div>`;
      return `<div class="ld-fan-cover">${inner}</div>`;
    }).join('');
  }

  function loThumbStackFor(list) {
    const base = (list._books || []).slice(0, 3);
    while (base.length < 3) base.push(null);
    const listIdNum = typeof list.id === 'string'
      ? list.id.split('').reduce((h,c) => (h*31+c.charCodeAt(0))>>>0, 0)
      : (list.id || 0);
    return base.map((b, idx) => {
      const palIdx = b
        ? (function(s){let st=String(s||'');let h=0;for(let c of st)h=(h*31+c.charCodeAt(0))>>>0;return h%10;})(b.id)
        : (listIdNum + idx) % 10;
      if (b && b.cover_url) return `<div class="lo-thumb"><img src="${escapeAttr(b.cover_url)}" style="width:100%;height:100%;object-fit:cover"/></div>`;
      return loThumbHtml(palIdx);
    }).join('');
  }

  function timeSince(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff/60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs/24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days/7)}w ago`;
  }

  window.updateListsCount = function () {
    const el = document.getElementById('listsCount');
    if (el) el.textContent = loLists.length === 1 ? '1 list' : `${loLists.length} lists`;
  };

  // ── SUPABASE ──
  window.loLoadLists = async function loLoadLists() {
    if (!currentUser) return;
    const { data, error } = await sb.from('lists').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) { showToast('Could not load lists'); return; }
    loLists = data || [];
    await Promise.all(loLists.map(async list => {
      const { data: lb } = await sb.from('list_books').select('books(*)').eq('list_id', list.id);
      list._books = (lb || []).map(r => r.books).filter(Boolean);
    }));
    updateListsCount();
  };

  async function loCreateList(name, emoji) {
    const { data, error } = await sb.from('lists').insert({ user_id: currentUser.id, name, emoji }).select().single();
    if (error) { showToast(error.message || 'Could not create list'); return null; }
    data._books = [];
    return data;
  }

  async function loUpdateList(id, updates) {
    const { error } = await sb.from('lists').update(updates).eq('id', id);
    if (error) showToast('Could not update list');
    return !error;
  }

  async function loDeleteList(id) {
    const { error } = await sb.from('lists').delete().eq('id', id);
    if (error) showToast('Could not delete list');
    return !error;
  }

  async function ldRemoveBook(listId, bookId) {
    const { error } = await sb.from('list_books').delete().eq('list_id', listId).eq('book_id', bookId);
    if (error) showToast('Could not remove book');
    return !error;
  }

  // ── OWNED FLAG — stored in list_books as a metadata field ──
  // We store owned state locally for now (no extra DB column needed)
  // using a per-list localStorage key. If you add an `owned` bool column to list_books, swap here.
  // owned state — stored in list_books as owned boolean column
  // Falls back to localStorage if DB not yet migrated
  let _ownedCache = {}; // { [listId]: Set of bookId strings }

  async function ldLoadOwned(listId) {
    const { data } = await sb.from('list_books').select('book_id').eq('list_id', listId).eq('owned', true);
    if (data) {
      _ownedCache[listId] = new Set(data.map(r => String(r.book_id)));
    } else {
      // fallback: localStorage
      try { _ownedCache[listId] = new Set(JSON.parse(localStorage.getItem('tsundoku_owned_'+listId) || '[]')); } catch { _ownedCache[listId] = new Set(); }
    }
  }
  function ldGetOwned(listId) {
    return _ownedCache[listId] ? Array.from(_ownedCache[listId]) : [];
  }
  window._ldGetOwned = ldGetOwned;
  function ldSetOwned(listId, arr) {
    _ownedCache[listId] = new Set(arr.map(String));
    // persist to localStorage as fallback
    try { localStorage.setItem('tsundoku_owned_'+listId, JSON.stringify(arr)); } catch {}
  }
  window._ldSetOwned = ldSetOwned;
  function ldIsOwned(listId, bookId) {
    return (_ownedCache[listId] || new Set()).has(String(bookId));
  }
  window._ldIsOwned = ldIsOwned;

  async function ldToggleOwned(listId, bookId) {
    const id = String(bookId);
    const set = _ownedCache[listId] || new Set();
    const nowOwned = !set.has(id);
    if (nowOwned) set.add(id); else set.delete(id);
    _ownedCache[listId] = set;
    ldSetOwned(listId, Array.from(set));

    // PERMANENT PROMOTION/DEMOTION TO SHELF
    const book = books.find(b => String(b.id) === id);
    if (nowOwned && book && book.total_pages === -1) {
      book.total_pages = 0;
      await sb.from('books').update({ total_pages: 0 }).eq('id', id);
    } else if (!nowOwned && book && book.total_pages === 0 && book.pages_read === 0) {
      book.total_pages = -1;
      await sb.from('books').update({ total_pages: -1 }).eq('id', id);
    }
    
    // Auto-refresh background grids to reflect owned status shift
    if (typeof renderGrid === 'function') renderGrid();
    if (typeof renderShelfGrid === 'function') renderShelfGrid();
    
    // try to persist to DB
    await sb.from('list_books').update({ owned: nowOwned }).eq('list_id', listId).eq('book_id', bookId);
    return nowOwned;
  }

  // ── LISTS OVERLAY ──
  window.openListsOverlay = async function () {
    document.getElementById('loSearchInput').value = '';
    document.getElementById('listsOverlay').classList.add('open');
    await loLoadLists();
    updateListsCount();
    loRenderLists();
    loBuildEmojiRow();
  };
  window.closeListsOverlay = function () {
    document.getElementById('listsOverlay').classList.remove('open');
  };

  function loRenderLists() {
    const q = (document.getElementById('loSearchInput').value || '').toLowerCase().trim();
    const scroll = document.getElementById('loScroll');
    const filtered = q ? loLists.filter(l => l.name.toLowerCase().includes(q)) : loLists;

    if (!filtered.length) {
      scroll.innerHTML = `<div class="lo-empty">
        <div class="lo-empty-icon">📋</div>
        <p class="lo-empty-text">${q ? 'No lists match your search.' : 'No lists yet.<br>Tap <strong style="color:var(--accent)">+</strong> to create one.'}</p>
      </div>`;
      return;
    }

    scroll.innerHTML = filtered.map((list, i) => `
      <div class="lo-card" data-id="${list.id}" style="animation:loFadeIn 0.28s ease ${Math.min(i,8)*0.04}s both">
        <div class="lo-card-inner">
          <div class="lo-cover-stack">${loThumbStackFor(list)}</div>
          <div class="lo-card-info">
            <div class="lo-card-name">${escapeHtml(list.emoji || '')} ${escapeHtml(list.name)}</div>
            <div class="lo-card-meta">
              <span>${(list._books||[]).length} ${(list._books||[]).length === 1 ? 'book' : 'books'}</span>
              <span class="lo-card-dot"></span>
              <span>${timeSince(list.updated_at || list.created_at)}</span>
            </div>
          </div>
          <svg class="lo-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`).join('');

    scroll.querySelectorAll('.lo-card').forEach(card => {
      const id = card.dataset.id;
      let didLong = false;
      let touchStartX = 0, touchStartY = 0;

      card.addEventListener('touchstart', e => {
        didLong = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        card.style.transition = 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)';
        card.style.transform = 'scale(1.04)';
        loLongTimer = setTimeout(() => {
          didLong = true;
          if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
          try { const hap = new (window.AudioContext || window.webkitAudioContext)(); const o = hap.createOscillator(); const g = hap.createGain(); o.connect(g); g.connect(hap.destination); o.frequency.value = 1200; g.gain.setValueAtTime(0.12, hap.currentTime); g.gain.exponentialRampToValueAtTime(0.001, hap.currentTime + 0.08); o.start(); o.stop(hap.currentTime + 0.08); } catch(e) {}
          card.style.transform = 'scale(1.0)';
          loOpenQM(id, card);
        }, 480);
      }, { passive: true });

      card.addEventListener('touchend', e => {
        clearTimeout(loLongTimer);
        card.style.transform = '';
        card.style.transition = '';
        if (didLong) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          e.preventDefault();
          openListDetail(id);
        }
      });

      card.addEventListener('touchcancel', () => {
        clearTimeout(loLongTimer);
        card.style.transform = '';
        card.style.transition = '';
        didLong = true;
      });

      card.addEventListener('click', e => {
        if (!didLong) openListDetail(id);
      });
    });
  }

  document.getElementById('loSearchInput').addEventListener('input', loRenderLists);

  // ── LISTS QM ──
  function loOpenQM(id, card) {
    loQMTargetId = id;
    const qm = document.getElementById('loQM');
    const overlay = document.getElementById('listsOverlay');
    const or = overlay.getBoundingClientRect();
    const qmW = 200;
    const qmH = 140;
    const cr = card.getBoundingClientRect();
    const left = (or.width - qmW) / 2;
    let top = cr.bottom - or.top + 10;
    if (top + qmH > or.height - 24) top = (cr.top - or.top) - qmH - 10;
    qm.style.width = qmW + 'px';
    qm.style.top = top + 'px'; qm.style.left = left + 'px';
    qm.classList.add('visible');
    document.getElementById('loDim').classList.add('on');
  }
  function loCloseQM() { document.getElementById('loQM').classList.remove('visible'); loQMTargetId = null; }

  window.loCloseDim = function () { loCloseQM(); document.getElementById('loDim').classList.remove('on'); };
  window.loQMOpen = function () {
    const id = loQMTargetId;
    loCloseQM();
    document.getElementById('loDim').classList.remove('on');
    setTimeout(() => openListDetail(id), 50);
  };
  window.loQMRename = function () {
    const list = loLists.find(l => String(l.id) === String(loQMTargetId)); loCloseQM();
    if (!list) return;
    loSheetEditingId = list.id; loSelectedEmoji = list.emoji || LO_EMOJIS[0];
    document.getElementById('loSheetTitle').textContent = 'Rename list';
    document.getElementById('loListNameInput').value = list.name;
    document.getElementById('loSheetSaveBtn').textContent = 'Save changes';
    loRefreshEmojiRow(); loOpenSheet();
  };
  window.loQMDelete = async function () {
    const id = loQMTargetId; loCloseQM(); document.getElementById('loDim').classList.remove('on');
    if (await loDeleteList(id)) { loLists = loLists.filter(l => String(l.id) !== String(id)); updateListsCount(); loRenderLists(); showToast('List deleted'); }
  };

  // ── SHEET ──
  function loBuildEmojiRow() {
    const row = document.getElementById('loEmojiRow');
    row.innerHTML = LO_EMOJIS.map(e =>
      `<div class="lo-emoji-opt${e === loSelectedEmoji ? ' selected' : ''}" data-emoji="${e}">${e}</div>`).join('');
    row.querySelectorAll('.lo-emoji-opt').forEach(el => {
      el.addEventListener('click', () => { loSelectedEmoji = el.dataset.emoji; loRefreshEmojiRow(); });
    });
  }
  function loRefreshEmojiRow() {
    document.querySelectorAll('.lo-emoji-opt').forEach(el => el.classList.toggle('selected', el.dataset.emoji === loSelectedEmoji));
  }
  function loOpenSheet() {
    document.getElementById('loSheetOverlay').classList.add('visible');
    setTimeout(() => document.getElementById('loListNameInput').focus(), 320);
  }
  window.loCloseSheet = function () {
    document.getElementById('loSheetOverlay').classList.remove('visible');
    loSheetEditingId = null; loSelectedEmoji = LO_EMOJIS[0];
    document.getElementById('loSheetTitle').textContent = 'New list';
    document.getElementById('loListNameInput').value = '';
    document.getElementById('loSheetSaveBtn').textContent = 'Create list';
    loRefreshEmojiRow();
  };
  window.loSaveList = async function () {
    const name = document.getElementById('loListNameInput').value.trim();
    const inp = document.getElementById('loListNameInput');
    if (!name) { inp.style.borderColor = 'var(--accent)'; return; }
    inp.style.borderColor = '';
    const btn = document.getElementById('loSheetSaveBtn'); btn.disabled = true; btn.textContent = 'Saving…';
    if (loSheetEditingId) {
      const ok = await loUpdateList(loSheetEditingId, { name, emoji: loSelectedEmoji });
      if (ok) { const l = loLists.find(x => String(x.id) === String(loSheetEditingId)); if (l) { l.name = name; l.emoji = loSelectedEmoji; } showToast('List updated ✓'); }
    } else {
      const newList = await loCreateList(name, loSelectedEmoji);
      if (newList) { loLists.unshift(newList); updateListsCount(); showToast('List created ✓'); }
    }
    btn.disabled = false; btn.textContent = 'Create list';
    loCloseSheet(); loRenderLists();
  };

  document.getElementById('loNewBtn').addEventListener('click', () => {
    loSheetEditingId = null; loSelectedEmoji = LO_EMOJIS[0];
    document.getElementById('loSheetTitle').textContent = 'New list';
    document.getElementById('loListNameInput').value = '';
    document.getElementById('loSheetSaveBtn').textContent = 'Create list';
    loRefreshEmojiRow(); loOpenSheet();
  });

  // ── LIST DETAIL ──
  window.openListDetail = async function (listId) {
    const list = loLists.find(l => String(l.id) === String(listId)); if (!list) return;
    ldCurrentListId = listId;
    ldCurrentFilter = 'all';
    ldCurrentSort = 'recent';
    ldasAddedIds = new Set();

    // 1. Instant Cache Render
    ldBooks = list._books || [];
    document.getElementById('ldHeaderTitle').textContent = list.name;
    document.getElementById('ldHeroEmoji').textContent   = list.emoji || '📚';
    document.getElementById('ldHeroName').textContent    = list.name;
    document.getElementById('ldHeroCount').textContent   = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
    document.getElementById('ldHeroUpdated').textContent = `updated ${timeSince(list.updated_at || list.created_at)}`;
    document.getElementById('ldFanStack').innerHTML = fanCoversFor(list);

    // If _ownedCache is somewhat populated from previous visits, this gives an instant progress reading
    ldUpdateProgress();

    // Reset filter chips
    document.querySelectorAll('#ldFilterRow .ld-chip').forEach(c => c.classList.toggle('active', c.dataset.f === 'all'));
    // Reset sort
    document.querySelectorAll('#ldSortMenu .qm-item').forEach(i => i.classList.toggle('current-status', i.dataset.ldsort === 'recent'));
    // Reset view
    ldSetView('list');
    ldCurrentView = 'list';

    ldRenderList();
    ldBuildAlphaBar();

    const ld = document.getElementById('listDetailOverlay');
    requestAnimationFrame(() => ld.classList.add('open'));

    // 2. Background Sync
    await Promise.allSettled([
      sb.from('list_books').select('books(*)').eq('list_id', listId).then(res => {
        if (res.data) {
          ldBooks = res.data.map(r => r.books).filter(Boolean);
          list._books = ldBooks;
        }
      }),
      ldLoadOwned(listId)
    ]);

    // 3. Silent Re-render with Fresh Data
    if (document.getElementById('listDetailOverlay').classList.contains('open') && ldCurrentListId === listId) {
      document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
      document.getElementById('ldFanStack').innerHTML = fanCoversFor(list);
      ldUpdateProgress();
      ldRenderList();
      ldBuildAlphaBar();
    }
  };

  window.closeListDetail = function () {
    const ld = document.getElementById('listDetailOverlay');
    ld.classList.remove('open');
    ldCloseAddSheet();
    setTimeout(() => { document.getElementById('ldProgressFill').style.width = '0%'; }, 350);
    loRenderLists();
  };

  function ldUpdateProgress() {
    const ownedIds = ldGetOwned(ldCurrentListId);
    const total = ldBooks.length;
    const ownedCount = ldBooks.filter(b => ownedIds.includes(String(b.id))).length;
    const pct = total ? Math.round(ownedCount / total * 100) : 0;
    document.getElementById('ldProgressLabel').textContent = `${ownedCount} of ${total} owned`;
    document.getElementById('ldProgressPct').textContent = `${pct}%`;
    setTimeout(() => { document.getElementById('ldProgressFill').style.width = pct + '%'; }, 120);
  }

  // Filter chips
  document.getElementById('ldFilterRow').addEventListener('click', e => {
    const chip = e.target.closest('.ld-chip'); if (!chip) return;
    ldCurrentFilter = chip.dataset.f;
    document.querySelectorAll('#ldFilterRow .ld-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    ldRenderList();
    ldBuildAlphaBar();
  });

  // View toggle
  // View toggle
  function ldSetView(view) {
    ldCurrentView = view;
    const btn = document.getElementById('ldViewToggleBtn');
    btn.classList.add('active');
    document.querySelectorAll('#ldViewMenu .qm-item').forEach(i => i.classList.toggle('current-status', i.dataset.ldview === view));
    // update icon to reflect current view
    if (view === 'list') {
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
    } else {
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
    }
    if (view !== 'list') document.getElementById('ldAlphaBar').classList.remove('visible');
  }
  document.getElementById('ldViewToggleBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    const menu = document.getElementById('ldViewMenu');
    const overlay = document.getElementById('listDetailOverlay');
    const or = overlay.getBoundingClientRect();
    const br = this.getBoundingClientRect();
    const menuWidth = 160; const margin = 8;
    const left = Math.min(br.right - or.left - menuWidth, or.width - menuWidth - margin);
    menu.style.top = (br.bottom - or.top + 6) + 'px';
    menu.style.left = Math.max(margin, left) + 'px';
    menu.style.right = 'auto';
    menu.classList.toggle('visible');
  });
  document.getElementById('ldViewMenu').addEventListener('click', e => {
    const btn = e.target.closest('[data-ldview]'); if (!btn) return;
    document.getElementById('ldViewMenu').classList.remove('visible');
    ldSetView(btn.dataset.ldview);
    ldRenderList();
    if (btn.dataset.ldview === 'list') ldBuildAlphaBar();
  });
  document.getElementById('ldViewMenu').addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', e => {
    if (!e.target.closest('.ld-view-toggle') && !e.target.closest('#ldViewMenu')) document.getElementById('ldViewMenu')?.classList.remove('visible');
  });

  // Sort menu
  document.getElementById('ldSortBtn').addEventListener('click', function () {
    const menu = document.getElementById('ldSortMenu');
    const overlay = document.getElementById('listDetailOverlay');
    const or = overlay.getBoundingClientRect();
    const br = this.getBoundingClientRect();
    menu.style.top = (br.bottom - or.top + 6) + 'px';
    menu.style.right = '8px';
    menu.style.left = 'auto';
    const dim = document.getElementById('ldDim');
    dim.classList.add('on');
    menu.classList.add('visible');
  });

  document.getElementById('ldSortMenu').addEventListener('click', e => {
    const btn = e.target.closest('[data-ldsort]'); if (!btn) return;
    ldCurrentSort = btn.dataset.ldsort;
    document.querySelectorAll('#ldSortMenu .qm-item').forEach(i => i.classList.toggle('current-status', i.dataset.ldsort === ldCurrentSort));
    document.getElementById('ldSortMenu').classList.remove('visible');
    document.getElementById('ldDim').classList.remove('on');
    ldRenderList();
    ldBuildAlphaBar();
  });

  function ldGetFiltered() {
    const ownedIds = ldGetOwned(ldCurrentListId);
    let list = [...ldBooks];
    if (ldCurrentFilter === 'owned') list = list.filter(b => ownedIds.includes(String(b.id)));
    else if (ldCurrentFilter === 'not-owned') list = list.filter(b => !ownedIds.includes(String(b.id)));
    list.sort((a, b) => {
      if (ldCurrentSort === 'title') return (a.title||'').localeCompare(b.title||'');
      if (ldCurrentSort === 'author') {
        const cmp = (a.author||'').localeCompare(b.author||'');
        return cmp !== 0 ? cmp : (a.title||'').localeCompare(b.title||'');
      }
      return 0; // recent = insertion order (already ordered from DB)
    });
    return list;
  }

  function ldRenderList() {
    const scroll = document.getElementById('ldListScroll');
    const filtered = ldGetFiltered();
    const ownedIds = ldGetOwned(ldCurrentListId);

    if (!filtered.length) {
      scroll.innerHTML = `<div class="ld-empty">
        <div class="ld-empty-icon-wrap"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        <div class="ld-empty-label">Nothing here</div>
        <div class="ld-empty-sub">Tap "Add book" to get started.</div>
      </div>`;
      return;
    }

    if (ldCurrentView === 'grid3' || ldCurrentView === 'grid4') {
      const cols = ldCurrentView === 'grid4' ? 4 : 3;
      scroll.innerHTML = `<div class="ld-book-grid" style="grid-template-columns:repeat(${cols},1fr)">${filtered.map((b, i) => {
        const owned = ownedIds.includes(String(b.id));
        const palIdx = (function(str){let s=String(str||'');let h=0;for(let c of s)h=(h*31+c.charCodeAt(0))>>>0;return h%10;})(b.id);
        const p = loPal(palIdx);
        const coverInner = b.cover_url
          ? `<img src="${escapeAttr(b.cover_url)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none" draggable="false"/>`
          : `<div style="width:100%;height:100%;background:linear-gradient(160deg,${p[0]} 0%,${p[1]}55 100%);display:flex;align-items:center;justify-content:center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${p[1]}" opacity="0.5" stroke="${p[1]}" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none"/></svg>
            </div>`;
        return `<div class="ld-book-grid-card" data-id="${b.id}" data-title="${escapeAttr(b.title||'')}" data-author="${escapeAttr(b.author||'')}" style="animation:bookIn 0.3s ease ${Math.min(i,12)*0.035}s both">
          <div class="ld-book-grid-cover">
            ${coverInner}
            <div class="ld-grid-dot" style="background:${owned ? 'var(--green)' : 'var(--text-muted)'}"></div>
          </div>
          <div class="ld-book-grid-info">
            <div class="ld-book-grid-title">${escapeHtml(b.title)}</div>
            <div class="ld-book-grid-author">${escapeHtml(b.author||'')}</div>
          </div>
        </div>`;
      }).join('')}</div>`;

      scroll.querySelectorAll('.ld-book-grid-card').forEach(card => {
        let didLong = false;
        const id = card.dataset.id;
        card.addEventListener('touchstart', () => {
          didLong = false;
          ldLongTimer = setTimeout(() => { didLong = true; ldOpenQM(id, card); }, 500);
        }, { passive: true });
        card.addEventListener('touchend', () => { clearTimeout(ldLongTimer); });
        card.addEventListener('touchcancel', () => { clearTimeout(ldLongTimer); });
        card.addEventListener('click', () => { if (!didLong) openDetailModal(id); });
      });
      return;
    }

    // List view
    scroll.innerHTML = filtered.map((b, i) => {
      const owned = ownedIds.includes(String(b.id));
      const ownedBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:100px;font-size:10px;font-weight:500;background:${owned ? 'rgba(90,138,106,0.14)' : 'rgba(122,112,104,0.1)'};color:${owned ? 'var(--green)' : 'var(--text-muted)'}">
        <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>${owned ? 'Owned' : 'Not owned'}
      </span>`;
      return `<div class="ld-book-row" data-id="${b.id}" data-title="${escapeAttr(b.title||'')}" data-author="${escapeAttr(b.author||'')}" style="animation-delay:${Math.min(i,10)*0.042}s">
        <div class="ld-drag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg></div>
        <div class="ld-cover">${ldCoverHtml(b)}</div>
        <div class="ld-book-info">
          <div class="ld-book-title">${escapeHtml(b.title)}</div>
          <div class="ld-book-author">${escapeHtml(b.author || '')}</div>
          ${ownedBadge}
        </div>
        <div class="ld-row-chevron"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>`;
    }).join('');

    scroll.querySelectorAll('.ld-book-row').forEach(row => {
      const id = row.dataset.id;
      let didLong = false;
      row.addEventListener('touchstart', () => {
        didLong = false; row.classList.add('pressing');
        ldLongTimer = setTimeout(() => { didLong = true; row.classList.remove('pressing'); ldOpenQM(id, row); }, 500);
      }, { passive: true });
      row.addEventListener('touchend', () => { clearTimeout(ldLongTimer); row.classList.remove('pressing'); });
      row.addEventListener('touchcancel', () => { clearTimeout(ldLongTimer); row.classList.remove('pressing'); });
      row.addEventListener('mousedown', () => { didLong = false; ldLongTimer = setTimeout(() => { didLong = true; ldOpenQM(id, row); }, 500); });
      row.addEventListener('mouseup', () => clearTimeout(ldLongTimer));
      row.addEventListener('mouseleave', () => clearTimeout(ldLongTimer));
      row.addEventListener('click', () => { if (!didLong) openDetailModal(id); });
    });

    if (typeof alphaBarRefresh === 'function') setTimeout(() => ldBuildAlphaBar(), 80);
  }

  // ── A–Z for list detail ──
  function ldBuildAlphaBar() {
    if (ldCurrentView !== 'list') { document.getElementById('ldAlphaBar').classList.remove('visible'); return; }
    if (ldCurrentSort === 'recent') { document.getElementById('ldAlphaBar').classList.remove('visible'); return; }

    const ALL_LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
    const cards = Array.from(document.getElementById('ldListScroll').querySelectorAll('.ld-book-row[data-title]'));
    if (cards.length < 5) { document.getElementById('ldAlphaBar').classList.remove('visible'); return; }

    const field = ldCurrentSort === 'author' ? 'data-author' : 'data-title';
    const seen = new Set();
    cards.forEach(c => {
      const v = (c.getAttribute(field) || '').trim();
      const ch = v[0] ? v[0].toUpperCase() : '#';
      seen.add(/[A-Z]/.test(ch) ? ch : '#');
    });

    const track = document.getElementById('ldAlphaTrack');
    track.innerHTML = '';
    ALL_LETTERS.forEach(letter => {
      const el = document.createElement('div');
      el.className = 'alpha-letter' + (seen.has(letter) ? '' : ' dim');
      el.textContent = letter;
      el.dataset.letter = letter;
      track.appendChild(el);
    });

    const bar = document.getElementById('ldAlphaBar');
    const scroll = document.getElementById('ldListScroll');
    const scrRect = scroll.getBoundingClientRect();
    const overlayRect = document.getElementById('listDetailOverlay').getBoundingClientRect();
    bar.style.top = (scrRect.top - overlayRect.top) + 'px';
    bar.style.bottom = (overlayRect.bottom - scrRect.bottom) + 'px';
    bar.classList.add('visible');

    // Touch handlers
    function letterFromY(clientY) {
      const active = Array.from(track.querySelectorAll('.alpha-letter:not(.dim)'));
      for (const el of active) {
        const r = el.getBoundingClientRect();
        if (clientY >= r.top && clientY <= r.bottom) return el.dataset.letter;
      }
      return null;
    }
    function activateLd(letter, clientY) {
      track.querySelectorAll('.alpha-letter').forEach(el => el.classList.toggle('active', el.dataset.letter === letter));
      const bubble = document.getElementById('ldAlphaBubble');
      const bH = 52;
      const clampedY = Math.max(60, Math.min(window.innerHeight - bH - 16, clientY - bH / 2));
      bubble.style.top = clampedY + 'px';
      bubble.textContent = letter;
      bubble.classList.add('show');
      // Scroll
      const rowToScroll = Array.from(cards).find(c => {
        const v = (c.getAttribute(field) || '').trim();
        const ch = v[0] ? v[0].toUpperCase() : '#';
        const l = /[A-Z]/.test(ch) ? ch : '#';
        return l === letter;
      });
      if (rowToScroll) {
        const top = scroll.scrollTop + rowToScroll.getBoundingClientRect().top - scrRect.top - 8;
        scroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
      if (navigator.vibrate) navigator.vibrate(8);
    }

    bar.addEventListener('touchstart', e => {
      const l = letterFromY(e.touches[0].clientY); if (l) activateLd(l, e.touches[0].clientY);
    }, { passive: true });
    bar.addEventListener('touchmove', e => {
      const l = letterFromY(e.touches[0].clientY); if (l) activateLd(l, e.touches[0].clientY);
    }, { passive: true });
    bar.addEventListener('touchend', () => setTimeout(() => { document.getElementById('ldAlphaBubble').classList.remove('show'); track.querySelectorAll('.alpha-letter').forEach(el => el.classList.remove('active')); }, 600));
    bar.addEventListener('mousedown', e => {
      e.preventDefault();
      const l = letterFromY(e.clientY); if (l) activateLd(l, e.clientY);
      const mm = ev => { const l2 = letterFromY(ev.clientY); if (l2) activateLd(l2, ev.clientY); };
      const mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); setTimeout(() => { document.getElementById('ldAlphaBubble').classList.remove('show'); track.querySelectorAll('.alpha-letter').forEach(el => el.classList.remove('active')); }, 400); };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
    });
  }

  // ── QM for list detail ──
  function ldOpenQM(id, row) {
    ldQMTargetId = id;
    const qm = document.getElementById('ldQM');
    const overlay = document.getElementById('listDetailOverlay');
    const or = overlay.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    let top = rr.bottom - or.top + 2;
    if (top + 130 > or.height - 16) top = (rr.top - or.top) - 136;
    let left = rr.left - or.left;
    if (left + 160 > or.width - 8) left = or.width - 168;
    if (left < 8) left = 8;
    qm.style.top = top + 'px'; qm.style.left = left + 'px'; qm.style.right = 'auto';
    // Update toggle-owned label based on current state
  const isOwned = ldIsOwned(ldCurrentListId, id);
  const toggleBtn = qm.querySelector('[onclick*="toggle-owned"]');
  if (toggleBtn) toggleBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${isOwned ? 'Mark as not owned' : 'Mark as owned'}`;
  qm.classList.add('visible');
  document.getElementById('ldDim').classList.add('on');
  }
  window.ldCloseQM = function () {
    document.getElementById('ldQM').classList.remove('visible');
    document.getElementById('ldDim').classList.remove('on');
    // also close sort menu
    document.getElementById('ldSortMenu').classList.remove('visible');
    ldQMTargetId = null;
  };

  // ── LIST BOOK DETAIL (read-only, no status change) ──
let lbdBookId = null;
function openListBookDetail(id) {
  const book = ldBooks.find(b => String(b.id) === String(id));
  if (!book) return;
  lbdBookId = id;
  
  // Cover
  const coverEl = document.getElementById('lbdCoverEl');
  coverEl.innerHTML = book.cover_url
    ? `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:contain;background:var(--surface2)">`
    : makePlaceholder(book, 14);
  
  document.getElementById('lbdTitleEl').textContent = book.title;
  document.getElementById('lbdAuthorEl').textContent = book.author || '';
  
  lbdRefreshOwnedState();
  document.getElementById('listBookDetailModal').classList.add('visible');
}

function lbdRefreshOwnedState() {
  const owned = ldIsOwned(ldCurrentListId, lbdBookId);
  const badge = document.getElementById('lbdOwnedBadge');
  badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:100px;font-size:12px;font-weight:500;background:${owned ? 'rgba(90,138,106,0.15)' : 'rgba(122,112,104,0.1)'};color:${owned ? 'var(--green)' : 'var(--text-muted)'}">
    <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block"></span>
    ${owned ? 'Owned' : 'Not owned'}
  </span>`;
  const btn = document.getElementById('lbdToggleOwnedBtn');
  btn.textContent = owned ? 'Mark as not owned' : 'Mark as owned';
}

async function lbdToggleOwned() {
  const nowOwned = await ldToggleOwned(ldCurrentListId, lbdBookId);
  lbdRefreshOwnedState();
  ldUpdateProgress();
  ldRenderList();
  showToast(nowOwned ? 'Marked as owned ✓' : 'Marked as not owned');
}

function closeListBookDetail() {
  document.getElementById('listBookDetailModal').classList.remove('visible');
  lbdBookId = null;
}
  
  window.ldQMAction = async function (action) {
    if (action === 'view') { ldCloseQM(); openListBookDetail(ldQMTargetId); return; }
    if (action === 'toggle-owned') {
      const id = ldQMTargetId; ldCloseQM();
      const now = await ldToggleOwned(ldCurrentListId, id);
      ldUpdateProgress();
      ldRenderList();
      showToast(now ? 'Marked as owned ✓' : 'Marked as not owned');
      return;
    }
    if (action === 'remove') {
      const id = ldQMTargetId; ldCloseQM();
      if (await ldRemoveBook(ldCurrentListId, id)) {
        ldBooks = ldBooks.filter(b => b.id !== id);
        ldUpdateProgress();
        ldRenderList();
        ldBuildAlphaBar();
        document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
        showToast('Removed from list');
      }
    }
  };

  // ── MORE BUTTON (rename) ──
  document.getElementById('ldMoreBtn').addEventListener('click', () => {
    const list = loLists.find(l => String(l.id) === String(ldCurrentListId)); if (!list) return;
    loSheetEditingId = list.id;
    loSelectedEmoji = list.emoji || '📚';
    document.getElementById('loSheetTitle').textContent = 'Rename list';
    document.getElementById('loListNameInput').value = list.name;
    document.getElementById('loSheetSaveBtn').textContent = 'Save changes';
    loRefreshEmojiRow();
    document.getElementById('loSheetOverlay').classList.add('visible');
    setTimeout(() => document.getElementById('loListNameInput').focus(), 320);
  });

  // ── ADD BOOK SHEET ──
  function ldOpenAddSheet() {
    ldasCurrentTab = 'search';
    ldasAddedIds = new Set();
    ldSwitchAddTab('search');
    document.getElementById('ldasSearchInput').value = '';
    document.getElementById('ldasResults').innerHTML = '<div class="bs-state"><p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">Type to search books</p></div>';
    document.getElementById('ldAddSheet').classList.add('open');
    document.getElementById('ldAddSheetDim').classList.add('on');
    setTimeout(() => document.getElementById('ldasSearchInput').focus(), 340);
  }
  window.ldCloseAddSheet = function () {
    document.getElementById('ldAddSheet').classList.remove('open');
    document.getElementById('ldAddSheetDim').classList.remove('on');
    clearTimeout(ldasSearchTimer);
    ldasCurrentTab = 'search';
  };

  function ldSwitchAddTab(tab) {
    ldasCurrentTab = tab;
    document.querySelectorAll('.ldas-tab').forEach(t => t.classList.toggle('active', t.dataset.ldastab === tab));
    const searchWrap = document.getElementById('ldasSearchWrap');
    const results = document.getElementById('ldasResults');
    const footer = document.getElementById('ldAddSheet').querySelector('.ldas-footer');

    if (tab === 'search') {
      searchWrap.style.display = '';
      footer.style.display = '';
      document.getElementById('ldasManualBtn').style.display = '';
      ldasRenderSearchResults([]);
    } else if (tab === 'shelf') {
      searchWrap.style.display = '';
      footer.style.display = 'none';
      document.getElementById('ldasSearchInput').placeholder = 'Filter my shelf…';
      ldasRenderShelf(document.getElementById('ldasSearchInput').value);
    } else if (tab === 'manual') {
      searchWrap.style.display = 'none';
      footer.style.display = 'none';
      ldasRenderManual();
    }
  }

  document.querySelectorAll('.ldas-tab').forEach(tab => {
    tab.addEventListener('click', () => ldSwitchAddTab(tab.dataset.ldastab));
  });

  document.getElementById('ldasSearchInput').addEventListener('input', () => {
    clearTimeout(ldasSearchTimer);
    const q = document.getElementById('ldasSearchInput').value.trim();
    if (ldasCurrentTab === 'shelf') { ldasRenderShelf(q); return; }
    if (!q) {
      document.getElementById('ldasResults').innerHTML = '<div class="bs-state"><p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">Type to search books</p></div>';
      return;
    }
    document.getElementById('ldasResults').innerHTML = '<div class="bs-state"><div class="loading-spinner" style="margin:0 auto"></div></div>';
    ldasSearchTimer = setTimeout(() => ldasFetchSearch(q), 500);
  });

  async function ldasFetchSearch(query) {
    try {
      const [gRes, olRes] = await Promise.allSettled([
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=30&langRestrict=en`).then(r => r.json()),
        fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=title,author_name,cover_i`).then(r => r.json())
      ]);
      const gBooks = gRes.status === 'fulfilled'
        ? (gRes.value.items || []).map(item => {
            const v = item.volumeInfo || {};
            let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '';
            if (cover) cover = cover.replace(/^http:/, 'https:').replace('zoom=1','zoom=2').replace('&edge=curl','');
            return { title: v.title || '', author: (v.authors||[])[0] || '', cover, fromShelf: false };
          }) : [];
      const seen = new Set(gBooks.map(b => (b.title+b.author).toLowerCase().replace(/\s/g,'')));
      const olBooks = olRes.status === 'fulfilled'
        ? (olRes.value.docs || []).filter(d => d.title).map(d => ({
            title: d.title, author: (d.author_name||[])[0] || '',
            cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
            fromShelf: false
          })).filter(b => { const k = (b.title+b.author).toLowerCase().replace(/\s/g,''); if (seen.has(k)) return false; seen.add(k); return true; })
        : [];
      ldasRenderSearchResults([...gBooks, ...olBooks]);
    } catch {
      document.getElementById('ldasResults').innerHTML = '<div class="bs-state"><p style="color:var(--text-muted);font-size:13px">Search failed. Check your connection.</p></div>';
    }
  }

  function ldasRenderSearchResults(items) {
    const el = document.getElementById('ldasResults');
    if (!items.length) {
      el.innerHTML = '<div class="bs-state"><p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">No results. Try different keywords.</p></div>';
      return;
    }
    const existingIds = new Set(ldBooks.map(b => b.id));
    el.innerHTML = items.map((b, i) => {
      const addedClass = ldasAddedIds.has(i) ? ' added' : '';
      const addedIcon = ldasAddedIds.has(i) ? '✓' : '+';
      return `<div class="ldas-result" data-ldas-i="${i}">
        <div class="ldas-result-cover">${b.cover ? `<img src="${escapeAttr(b.cover)}" onerror="this.parentElement.innerHTML=''">` : ''}</div>
        <div class="ldas-result-info">
          <div class="ldas-result-title">${escapeHtml(b.title || 'Unknown')}</div>
          <div class="ldas-result-author">${escapeHtml(b.author || 'Unknown author')}</div>
        </div>
        <button class="ldas-result-add${addedClass}" data-ldas-add="${i}">${addedIcon}</button>
      </div>`;
    }).join('');
    el._ldItems = items;

    el.querySelectorAll('[data-ldas-add]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const i = +btn.dataset.ldasAdd;
        const item = el._ldItems[i];
        if (!item) return;
        btn.disabled = true; btn.textContent = '…';
        // Add book to main books list via dbAdd
        const newBook = await dbAdd({ title: item.title, author: item.author, status: 'unread', cover_url: item.cover || null, pages_read: 0, total_pages: -1 });
        if (!newBook) { btn.disabled = false; btn.textContent = '+'; return; }
        books.unshift(newBook);
        // Link to list
        const { error } = await sb.from('list_books').insert({ list_id: ldCurrentListId, book_id: newBook.id });
        if (error) { showToast('Could not add to list'); btn.disabled = false; btn.textContent = '+'; return; }
        ldBooks.unshift(newBook);
        ldasAddedIds.add(i);
        btn.classList.add('added'); btn.textContent = '✓';
        btn.disabled = false;
        ldUpdateProgress();
        document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
        renderGrid();
        showToast('Added ✓');
      });
    });
  }

  function ldasRenderShelf(q) {
    const el = document.getElementById('ldasResults');
    let filtered = [...books];
    const existingInList = new Set(ldBooks.map(b => String(b.id)));
    if (q) filtered = filtered.filter(b => (b.title||'').toLowerCase().includes(q.toLowerCase()) || (b.author||'').toLowerCase().includes(q.toLowerCase()));
    if (!filtered.length) {
      el.innerHTML = '<div class="bs-state"><p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">Nothing found on your shelf.</p></div>';
      return;
    }
    el.innerHTML = filtered.map((b, i) => {
      const inList = existingInList.has(String(b.id));
      return `<div class="ldas-result" data-ldas-shelf="${b.id}">
        <div class="ldas-result-cover">${b.cover_url ? `<img src="${escapeAttr(b.cover_url)}">` : ''}</div>
        <div class="ldas-result-info">
          <div class="ldas-result-title">${escapeHtml(b.title)}</div>
          <div class="ldas-result-author">${escapeHtml(b.author||'')}</div>
          <div class="ldas-result-meta" style="color:${b.status==='reading'?'var(--accent)':b.status==='read'?'var(--green)':'var(--text-muted)'}">${b.status}</div>
        </div>
        <button class="ldas-result-add${inList ? ' added' : ''}" data-ldas-shelf-add="${b.id}" ${inList ? 'disabled' : ''}>${inList ? '✓' : '+'}</button>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-ldas-shelf-add]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const bookId = btn.dataset.ldasShelfAdd;
        if (existingInList.has(String(bookId))) { showToast('Already in this list'); return; }
        btn.disabled = true; btn.textContent = '…';
        const { error } = await sb.from('list_books').insert({ list_id: ldCurrentListId, book_id: bookId });
        if (error) { showToast('Could not add to list'); btn.disabled = false; btn.textContent = '+'; return; }
        const book = books.find(b => String(b.id) === String(bookId));
        if (book) { ldBooks.unshift(book); existingInList.add(String(bookId)); }
        // mark as owned automatically when adding from shelf
        const ownedArr = ldGetOwned(ldCurrentListId);
        if (!ownedArr.includes(String(bookId))) { ownedArr.push(String(bookId)); ldSetOwned(ldCurrentListId, ownedArr); }
        btn.classList.add('added'); btn.textContent = '✓';
        ldUpdateProgress();
        document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
        showToast('Added ✓');
      });
    });
  }

  function ldasRenderManual() {
    const el = document.getElementById('ldasResults');
    el.innerHTML = `<div style="padding:16px 0">
      <p class="field-label" style="margin-bottom:8px">Book Title</p>
      <input type="text" class="text-input" id="ldasManTitle" placeholder="e.g. The Midnight Library" style="margin-bottom:14px" />
      <p class="field-label" style="margin-bottom:8px">Author</p>
      <input type="text" class="text-input" id="ldasManAuthor" placeholder="e.g. Matt Haig" style="margin-bottom:14px" />
      <button class="modal-btn" id="ldasManSave">Add to list</button>
    </div>`;
    document.getElementById('ldasManSave').addEventListener('click', async () => {
      const title = (document.getElementById('ldasManTitle').value || '').trim();
      if (!title) { document.getElementById('ldasManTitle').style.borderColor = 'var(--accent)'; return; }
      const author = (document.getElementById('ldasManAuthor').value || '').trim();
      const btn = document.getElementById('ldasManSave');
      btn.disabled = true; btn.textContent = 'Adding…';
      const newBook = await dbAdd({ title, author, status: 'unread', cover_url: null, pages_read: 0, total_pages: -1 });
      if (!newBook) { btn.disabled = false; btn.textContent = 'Add to list'; return; }
      books.unshift(newBook);
      const { error } = await sb.from('list_books').insert({ list_id: ldCurrentListId, book_id: newBook.id });
      if (error) { showToast('Could not add to list'); btn.disabled = false; btn.textContent = 'Add to list'; return; }
      ldBooks.unshift(newBook);
      ldUpdateProgress();
      document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
      renderGrid();
      ldRenderList();
      ldCloseAddSheet();
      showToast('Book added ✓');
    });
  }

  document.getElementById('ldasManualBtn').addEventListener('click', () => ldSwitchAddTab('manual'));
  document.getElementById('ldAddSheetDim').addEventListener('click', ldCloseAddSheet);

  // ── ADD BOOK BUTTON ──
  document.getElementById('ldAddBtn').addEventListener('click', ldOpenAddSheet);

})();
// ── END MY LISTS ────────────────────────────────────────────────────────────
  // ── END A–Z SCROLLBAR ─────────────────────────────────────────────────────
