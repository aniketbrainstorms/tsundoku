const { createClient } = supabase;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybnJ5c3pndmN0eGFpbnF5dXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODg3NTcsImV4cCI6MjA5MDQ2NDc1N30.GkGvfR_ZlGIupbwOOl1BL5gb58M-E2LD5sD7pVl4tso';
const sb = createClient(
  'https://rrnryszgvctxainqyuyr.supabase.co',
  SUPABASE_ANON_KEY
);

// ── NAV STACK ──
const _LAYER2_IDS = ['profileModal', 'shelfOverlay', 'bookSearchOverlay', 'shelfSearchOverlay', 'readNotOwnedOverlay', 'listsOverlay', 'authorsListOverlay', 'authorOverlay', 'listDetailOverlay', 'genresListOverlay', 'genreDetailOverlay'];

function navPush(prevEl, nextEl) {
  if (prevEl) prevEl.classList.add('nav-behind');
  nextEl.classList.remove('nav-behind');
  nextEl.classList.add('open');
}

function navPop(currentEl, prevEl) {
  currentEl.classList.remove('open');
  if (prevEl) prevEl.classList.remove('nav-behind');
}

function _updateAppRecede() {
  const anyOpen = _LAYER2_IDS.some(id => {
    const el = document.getElementById(id);
    return el && (el.classList.contains('open') || el.classList.contains('nav-behind'));
  });
  const appScreen = document.getElementById('appScreen');
  if (appScreen) appScreen.classList.toggle('nav-receded', anyOpen);
}

// ── STATE ──
let books = [], currentFilter = 'reading';
let addStatus = 'unread', editStatus = 'unread';
let addOwnership = 'owned';
let addCoverFile = null, addCoverUrl = null;
let editCoverFile = null, editCoverUrl = null, editingId = null;
let qmBookId = null, longPressTimer = null, isPressing = false, didLongPress = false;
let authMode = 'login';
let currentUser = null;
let bookSearchTimer = null;
let progressBookId = null;
let bsSearchCategory = 'all';
let addContext = 'shelf';
let currentSort = 'recent';
let scannerStream = null, scannerInterval = null;

// ── SHARE STATE ──
let userProfile = null;
let publicBooks = [];
let publicSort = 'title';

// ── THEME ──
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('tsundoku_theme', theme); } catch {}
  const isDark = theme === 'dark';
  const iconEl = document.getElementById('themeToggleIcon');
  const textEl = document.getElementById('themeToggleText');
  const btnLight = document.getElementById('themeBtnLight');
  const btnDark = document.getElementById('themeBtnDark');
  if (iconEl) iconEl.innerHTML = isDark
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  if (textEl) textEl.textContent = isDark ? 'Dark Mode' : 'Light Mode';
  if (btnLight) btnLight.classList.toggle('active', !isDark);
  if (btnDark) btnDark.classList.toggle('active', isDark);
}

(function applyStoredTheme() {
  try {
    const stored = localStorage.getItem('tsundoku_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', stored);
  } catch {}
})();

// ── DEVICE DETECTION ──
const isTouch = () => window.matchMedia('(hover:none)').matches;

function updateHintBar() {
  const hint = document.getElementById('hintBar');
  if (!hint) return;
  const msgs = {
    reading: 'in progress. just like me.',
    read: 'the rare case of ownership and completion.',
    unread: 'read it? i own it, but no i have not read it'
  };
  hint.textContent = msgs[currentFilter] || msgs.reading;
}

// ── PALETTES ──
const palettes = [
  ['#4a3728', '#c9714a'], ['#1e2d3d', '#5a8fa8'], ['#2d3a2e', '#6a9a72'],
  ['#3a2040', '#9a6ac0'], ['#3d2a1e', '#c0814a'], ['#1e1e2d', '#6a72c0'],
  ['#2d1e1e', '#c06a6a'], ['#1e2d2a', '#6ac0b8'], ['#3a3020', '#b0963c'], ['#2a1e2d', '#a06ab8']
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
  return (str || '').replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
function getUserInitials(email) {
  if (!email) return '?';
  const local = email.split('@')[0];
  const parts = local.split(/[._\-+]/);
  return parts.slice(0, 2).map(p => (p[0] || '').toUpperCase()).filter(Boolean).join('') || email[0].toUpperCase();
}

// ── PUBLIC SHELF URL CHECK ──
function getShelfParam() {
  return new URLSearchParams(window.location.search).get('shelf');
}

// ── INIT ──
(async function init() {
  const slug = getShelfParam();
  const _loadingStart = Date.now();
  function hideLoadingScreen() {
    const elapsed = Date.now() - _loadingStart;
    const remaining = Math.max(0, 2800 - elapsed);
    setTimeout(() => document.getElementById('loadingScreen').classList.add('hidden'), remaining);
  }

  if (slug) {
    document.getElementById('loadingScreen').classList.add('hidden');
    await loadPublicShelf(slug);
    return;
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'TOKEN_REFRESHED' && !session) {
      await sb.auth.signOut();
      return;
    }
    hideLoadingScreen();
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
  document.getElementById('authSubmitBtn').textContent = mode === 'login' ? 'sign in' : 'create account';
  document.getElementById('authConfirmWrap').style.display = mode === 'signup' ? 'block' : 'none';
  document.getElementById('authForgotLink').style.display = mode === 'login' ? 'flex' : 'none';
  document.getElementById('authError').textContent = '';
}
function toggleAuthPw() {
  const input = document.getElementById('authPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
}
function showForgotPanel() {
  document.getElementById('authPanel').style.display = 'none';
  document.getElementById('authForgotPanel').style.display = 'block';
  document.getElementById('authResetError').textContent = '';
  document.getElementById('authResetEmail').value = document.getElementById('authEmail').value;
}
function hideForgotPanel() {
  document.getElementById('authForgotPanel').style.display = 'none';
  document.getElementById('authPanel').style.display = 'block';
}
function hideConfirmPanel() {
  document.getElementById('authConfirmPanel').style.display = 'none';
  document.getElementById('authPanel').style.display = 'block';
}
async function handleForgotPassword() {
  const email = document.getElementById('authResetEmail').value.trim();
  const errEl = document.getElementById('authResetError');
  const btn = document.getElementById('authResetBtn');
  if (!email) { errEl.style.color = '#c06060'; errEl.textContent = 'please enter your email.'; return; }
  btn.disabled = true; btn.textContent = 'sending…'; errEl.textContent = '';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://aniketbrainstorms.github.io/tsundoku/' });
  btn.disabled = false; btn.textContent = 'send reset link';
  if (error) { errEl.style.color = '#c06060'; errEl.textContent = error.message; return; }
  errEl.style.color = 'var(--green)'; errEl.textContent = 'reset link sent — check your inbox';
}
async function handleGoogleAuth() {
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://aniketbrainstorms.github.io/tsundoku/' } });
  if (error) showToast(error.message);
}
async function handleResend() {
  const email = document.getElementById('authConfirmEmailPill').textContent;
  const btn = document.querySelector('.auth-resend-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'sending…'; }
  await sb.auth.resend({ type: 'signup', email });
  if (btn) { btn.disabled = false; btn.textContent = 'resend email'; }
  showToast('confirmation email resent');
}
async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('authSubmitBtn');
  const errEl = document.getElementById('authError');
  if (!email || !password) { errEl.style.color = '#c06060'; errEl.textContent = 'please fill in all fields.'; return; }
  if (authMode === 'signup') {
    const confirm = document.getElementById('authConfirmPassword').value;
    if (password !== confirm) { errEl.style.color = '#c06060'; errEl.textContent = 'passwords don\'t match.'; return; }
  }
  btn.disabled = true; btn.textContent = authMode === 'login' ? 'signing in…' : 'creating account…'; errEl.textContent = '';
  const { error } = authMode === 'login'
    ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password });
  btn.disabled = false; btn.textContent = authMode === 'login' ? 'sign in' : 'create account';
  if (error) { errEl.style.color = '#c06060'; errEl.textContent = error.message; return; }
  if (authMode === 'signup') {
    document.getElementById('authConfirmEmailPill').textContent = email;
    document.getElementById('authPanel').style.display = 'none';
    document.getElementById('authConfirmPanel').style.display = 'block';
  }
}
async function signOut() {
  closeModal('profileModal');
  try { await sb.auth.signOut(); } catch (e) { }
}

// ── DB ──
async function loadBooks() {
  const cacheKey = 'tsundoku_books_' + currentUser.id;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Bust cache if ai_summary columns aren't present yet
      const hasMeta = parsed.length === 0 || ('ai_summary' in parsed[0] && parsed.every(b => b.total_pages !== -1 || b.status === 'not-owned'));
      if (hasMeta) {
        books = parsed;
        renderGrid();
      } else {
        localStorage.removeItem(cacheKey);
        renderSkeleton();
      }
    } else {
      renderSkeleton();
    }
  } catch { renderSkeleton(); }
  const { data, error } = await sb.from('books').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  if (error) { showToast('Failed to load books'); return; }
  books = data || [];
  try { localStorage.setItem(cacheKey, JSON.stringify(books)); } catch { }
  renderGrid();
  backfillOwnedForShelfBooks();
}

async function backfillOwnedForShelfBooks() {
  const migKey = 'tsundoku_owned_backfill_v1_' + currentUser.id;
  if (!localStorage.getItem(migKey)) {
    try {
      const shelfIds = books.filter(b => b.status !== 'not-owned').map(b => b.id);
      if (shelfIds.length) {
        await sb.from('list_books')
          .update({ owned: true })
          .in('book_id', shelfIds)
          .eq('owned', false);
      }
      localStorage.setItem(migKey, '1');
    } catch (e) { /* silent */ }
  }

  // v2: migrate total_pages = -1 books to status = 'not-owned' in local books array
  const migKeyV2 = 'tsundoku_status_migration_v2_' + currentUser.id;
  if (!localStorage.getItem(migKeyV2)) {
    try {
      const toMigrate = books.filter(b => b.total_pages === -1 && b.status !== 'not-owned');
      if (toMigrate.length) {
        // DB was already updated by SQL migration; update local state
        toMigrate.forEach(b => { b.status = 'not-owned'; });
        // Bust cache so next load reads fresh
        try { localStorage.removeItem('tsundoku_books_' + currentUser.id); } catch {}
      }
      localStorage.setItem(migKeyV2, '1');
    } catch (e) { /* silent */ }
  }
}
async function dbAdd(book) {
  const { data: { user } } = await sb.auth.getUser();
  const { data, error } = await sb.from('books').insert({ user_id: user.id, ...book }).select().single();
  if (error) { console.error('dbAdd err:', error); showToast(error.message || 'Could not save book'); return null; }
  return data;
}
async function dbUpdate(id, updates) {
  const { error } = await sb.from('books').update(updates).eq('id', id);
  if (error) { console.error('dbUpdate err:', error); showToast(error.message || 'Could not update book'); return false; }
  // Keep localStorage cache in sync so ai_summary persists across reloads
  try {
    const cacheKey = 'tsundoku_books_' + currentUser.id;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const idx = parsed.findIndex(b => String(b.id) === String(id));
      if (idx !== -1) {
        Object.assign(parsed[idx], updates);
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
      }
    }
  } catch { }
  return true;
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

  // Desktop share UI sync
  const dUrlEl = document.getElementById('deskShareUrl');
  const dToggle = document.getElementById('deskShareToggle');
  const dCopyBtn = document.getElementById('deskShareCopy');
  if (dUrlEl) {
    if (slug) {
      const displayUrl = `${location.host}${location.pathname}?shelf=${slug}`;
      dUrlEl.textContent = displayUrl;
      if (dToggle) {
        dToggle.classList.toggle('on', isPublic);
        dToggle.disabled = false;
        dToggle.style.opacity = '1';
        const knob = dToggle.querySelector('.share-knob');
        if (knob) knob.style.transform = isPublic ? 'translateX(14px)' : 'translateX(0)';
      }
      if (dCopyBtn) dCopyBtn.style.display = isPublic ? 'flex' : 'none';
    } else {
      dUrlEl.textContent = 'Set name in settings';
      if (dToggle) {
        dToggle.classList.remove('on');
        dToggle.disabled = true;
        dToggle.style.opacity = '0.5';
        const knob = dToggle.querySelector('.share-knob');
        if (knob) knob.style.transform = 'translateX(0)';
      }
      if (dCopyBtn) dCopyBtn.style.display = 'none';
    }
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
  let list = publicBooks.filter(b => b.status !== 'not-owned');
  if (q) list = list.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));

  list.sort((a, b) => {
    if (publicSort === 'author') {
      const cmp = (a.author || '').localeCompare(b.author || '');
      return cmp !== 0 ? cmp : (a.title || '').localeCompare(b.title || '');
    }
    return (a.title || '').localeCompare(b.title || '');
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
    <div class="pub-book-card" data-id="${b.id}" data-title="${escapeAttr(b.title || '')}" data-author="${escapeAttr(b.author || '')}" style="animation-delay:${window._swipeNoStagger ? 0 : Math.min(i, 12) * 0.035}s">
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
  return b.status === 'not-owned';
}
function getSortedFiltered() {
  let list = books.filter(b => b.status === currentFilter);
  list = list.filter(b => !isHiddenFromShelf(b));
  list.sort((a, b) => {
    if (currentSort === 'title') return (a.title || '').localeCompare(b.title || '');
    if (currentSort === 'author') {
      const authorCmp = (a.author || '').trim().toLowerCase().localeCompare((b.author || '').trim().toLowerCase());
      if (authorCmp !== 0) return authorCmp;
      return (a.title || '').localeCompare(b.title || '');
    }
    if (currentSort === 'genre') {
      const genreCmp = (a.primary_genre || 'zzz').trim().toLowerCase().localeCompare((b.primary_genre || 'zzz').trim().toLowerCase());
      if (genreCmp !== 0) return genreCmp;
      return (a.title || '').localeCompare(b.title || '');
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
  return list;
}
function updateTabCounts() {
  const el = id => document.getElementById(id);
  const visible = books.filter(b => !isHiddenFromShelf(b));
  const reading = visible.filter(b => b.status === 'reading').length;
  const read = visible.filter(b => b.status === 'read').length;
  const unread = visible.filter(b => b.status === 'unread').length;
  if (el('count-reading')) el('count-reading').textContent = reading;
  if (el('count-read')) el('count-read').textContent = read;
  if (el('count-unread')) el('count-unread').textContent = unread;
  if (el('deskCountReading')) el('deskCountReading').textContent = reading;
  if (el('deskCountRead')) el('deskCountRead').textContent = read;
  if (el('deskCountUnread')) el('deskCountUnread').textContent = unread;
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
  return `<div class="reading-card" data-id="${book.id}" style="animation-delay:${window._swipeNoStagger ? 0 : Math.min(i, 12) * 0.035}s">
    <div class="rc-cover">${coverContent}</div>
    <div class="rc-info">
      <div class="rc-title">${escapeHtml(book.title)}</div>
      <div class="rc-author">${escapeHtml(book.author || '')}</div>
      ${book.borrowed_from ? `<div class="rc-borrowed-chip">↩ borrowed from ${escapeHtml(book.borrowed_from)}</div>` : (book.borrowed_from === '' ? '<div class="rc-borrowed-chip">↩ borrowed</div>' : '')}
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
    if (e.target.closest('.rc-edit-btn')) return;
    if (isTouch()) {
      openDetailModal(id);
    } else {
      if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
      else openQuickMenu(id, card);
    }
  });
}
function _renderGridIntoEl(grid, filter) {
  const useDesktopShelfGrid = window.matchMedia('(min-width: 1024px)').matches;
  const savedFilter = currentFilter;
  currentFilter = filter;
  const filtered = getSortedFiltered();
  currentFilter = savedFilter;

  if (!filtered.length) {
    grid.classList.remove('reading-mode');
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span>
      <p>Nothing here yet.<br>Tap <strong style="color:var(--accent)">+</strong> to search and add a book.</p></div>`;
    return;
  }
  if (filter === 'reading' && !useDesktopShelfGrid) {
    grid.classList.add('reading-mode');
    grid.innerHTML = filtered.map((b, i) => readingCardHtml(b, i)).join('');
    grid.querySelectorAll('.reading-card').forEach(attachReadingCardEvents);
  } else {
    grid.classList.remove('reading-mode');
    grid.innerHTML = filtered.map((b, i) => `
      <div class="book-card" data-id="${b.id}" data-title="${escapeAttr(b.title || '')}" data-author="${escapeAttr(b.author || '')}" style="animation-delay:${window._swipeNoStagger ? 0 : Math.min(i, 12) * 0.035}s">
        ${coverHtml(b)}<div class="status-dot ${b.status}"></div>
      </div>`).join('');
    grid.querySelectorAll('.book-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('touchstart', e => startPress(e, id, card), { passive: true });
      card.addEventListener('touchend', e => { e.stopPropagation(); endPress(e, id, card); });
      card.addEventListener('touchcancel', () => { if (!didLongPress) cancelPress(card); });
      card.addEventListener('click', e => {
        if (isTouch()) { openDetailModal(id); return; }
        if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
        else openQuickMenu(id, card);
      });
    });
  }
}

function renderGrid() {
  updateTabCounts();
  updateDeskHeader();
  _swipeDirty = true;
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

  if (isDesktop) {
    // Desktop: single pane, use legacy #bookGrid alias
    const grid = document.getElementById('bookGrid');
    _renderGridIntoEl(grid, currentFilter);
    // show only active pane on desktop
    document.querySelectorAll('.swipe-pane').forEach(p => p.classList.remove('active'));
    const activePane = document.getElementById('pane-' + currentFilter);
    if (activePane) {
      activePane.classList.add('active');
      const g = activePane.querySelector('.book-grid');
      if (g) _renderGridIntoEl(g, currentFilter);
    }
    if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
    return;
  }

  // Mobile: render all three panes so swipe sees real content
  const FILTERS = ['reading', 'read', 'unread'];
  FILTERS.forEach(f => {
    const pane = document.getElementById('pane-' + f);
    if (!pane) return;
    const grid = pane.querySelector('.book-grid');
    if (grid) _renderGridIntoEl(grid, f);
  });

  // Position strip to current tab instantly (no animation)
  _swipeStripSnapTo(currentFilter, false);

  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
}

// ── SHELF SEARCH BOTTOM SHEET ──
const SBS_RECENTS_KEY = 'tsundoku_shelf_recents';

function sbsGetRecents() {
  try { return JSON.parse(localStorage.getItem(SBS_RECENTS_KEY) || '[]'); } catch { return []; }
}
function sbsAddRecent(q) {
  if (!q || q.length < 2) return;
  let recents = sbsGetRecents().filter(r => r.toLowerCase() !== q.toLowerCase());
  recents.unshift(q);
  recents = recents.slice(0, 8);
  try { localStorage.setItem(SBS_RECENTS_KEY, JSON.stringify(recents)); } catch { }
}
function sbsClearRecents() {
  try { localStorage.removeItem(SBS_RECENTS_KEY); } catch { }
  renderShelfSearchResults('');
}

function openShelfSearch() {
  const sheet = document.getElementById('shelfSearchOverlay');
  const backdrop = document.getElementById('shelfSearchBackdrop');

  sheet.classList.add('open');
  backdrop.classList.add('open');

  _renderSbsResults('');
  _sbsInitDrag();

  setTimeout(() => {
    const input = document.getElementById('shelfSearchInput');
    if (input) input.focus();
  }, 380);
}

function closeShelfSearch() {
  const sheet = document.getElementById('shelfSearchOverlay');
  const backdrop = document.getElementById('shelfSearchBackdrop');
  const input = document.getElementById('shelfSearchInput');

  if (input) input.blur();

  sheet.classList.remove('open');
  backdrop.classList.remove('open');

  setTimeout(() => {
    if (input) input.value = '';
    const clearBtn = document.getElementById('shelfSearchClearBtn');
    if (clearBtn) { clearBtn.style.opacity = '0'; clearBtn.style.pointerEvents = 'none'; }
    _renderSbsResults('');
  }, 340);
}

function clearShelfSearch() {
  const input = document.getElementById('shelfSearchInput');
  if (input) { input.value = ''; input.focus(); }
  const clearBtn = document.getElementById('shelfSearchClearBtn');
  if (clearBtn) { clearBtn.style.opacity = '0'; clearBtn.style.pointerEvents = 'none'; }
  _renderSbsResults('');
}

function onShelfOverlaySearch() {
  const val = document.getElementById('shelfSearchInput').value;
  const clearBtn = document.getElementById('shelfSearchClearBtn');
  if (clearBtn) {
    clearBtn.style.opacity = val.length > 0 ? '1' : '0';
    clearBtn.style.pointerEvents = val.length > 0 ? 'auto' : 'none';
  }
  _renderSbsResults(val.trim());
}

function _renderSbsResults(q) {
  const el = document.getElementById('shelfSearchResults');
  if (!el) return;

  if (!q) {
    el.innerHTML = `<div class="search-library-state">
      <div class="search-library-icon">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M48 72 C48 72 24 64 16 56 L16 28 C24 36 48 44 48 44 L48 72Z" fill="#2c2823" stroke="#4a4540" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M48 72 C48 72 72 64 80 56 L80 28 C72 36 48 44 48 44 L48 72Z" fill="#332e28" stroke="#4a4540" stroke-width="1.5" stroke-linejoin="round"/>
          <line x1="48" y1="44" x2="48" y2="72" stroke="#5a5248" stroke-width="1.5"/>
          <line x1="24" y1="42" x2="44" y2="47" stroke="#5a5248" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="24" y1="48" x2="44" y2="52" stroke="#5a5248" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="24" y1="54" x2="40" y2="57" stroke="#5a5248" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="66" cy="38" r="14" fill="#1a1814" stroke="var(--accent)" stroke-width="2.5"/>
          <circle cx="66" cy="38" r="8" fill="rgba(201,113,74,0.08)" stroke="rgba(201,113,74,0.5)" stroke-width="1.5"/>
          <line x1="76.8" y1="48.8" x2="85" y2="57" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
          <circle cx="18" cy="66" r="2.5" fill="var(--accent)" opacity="0.3"/>
          <circle cx="12" cy="50" r="1.8" fill="var(--accent)" opacity="0.18"/>
        </svg>
      </div>
      <p class="search-library-title">Search books in your library</p>
      <p class="search-library-sub">Find titles, authors, or keywords from your reading, read, and unread lists</p>
    </div>`;
    return;
  }

  function highlight(text, query) {
    if (!text) return '';
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx))
      + `<span class="sbs-highlight">${escapeHtml(text.slice(idx, idx + query.length))}</span>`
      + escapeHtml(text.slice(idx + query.length));
  }

  const ql = q.toLowerCase();

  // Author hit: find a unique author whose name matches the query
  const authorMatches = [...new Map(
    books
      .filter(b => !isHiddenFromShelf(b) && (b.author || '').toLowerCase().includes(ql))
      .map(b => [b.author.toLowerCase(), b.author])
  ).values()];
  const authorHit = authorMatches.length >= 1
    ? (authorMatches.find(a => a.toLowerCase() === ql) || authorMatches[0])
    : null;

  let results = books
    .filter(b => !isHiddenFromShelf(b))
    .filter(b =>
      (b.title || '').toLowerCase().includes(ql) ||
      (b.author || '').toLowerCase().includes(ql)
    );

  if (!results.length && !authorHit) {
    el.innerHTML = `<div style="padding:48px 0;text-align:center">
      <p style="color:var(--text-muted);font-size:14px;line-height:1.6">No results for "<strong style="color:var(--text-dim)">${escapeHtml(q)}</strong>"</p>
    </div>`;
    return;
  }

  const _sbsAuthorKey = authorHit ? (authorHit || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : null;
  const _sbsCachedAuthor = _sbsAuthorKey && typeof _authorCache !== 'undefined' ? _authorCache[_sbsAuthorKey] : null;
  const _sbsAuthorImg = _sbsCachedAuthor?.image || null;
  const _sbsAuthorInitials = authorHit ? authorHit.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('') || '?' : '?';

  const authorRowHtml = authorHit ? `
    <div class="bs-author-row" id="sbsAuthorRow" data-author="${escapeAttr(authorHit)}">
      <div class="bs-author-photo" id="sbsAuthorPhoto">${_sbsAuthorImg ? `<img src="${escapeAttr(_sbsAuthorImg)}" onerror="this.parentElement.innerHTML='<span class=bs-author-initials>${escapeAttr(_sbsAuthorInitials)}</span>'" />` : `<span class="bs-author-initials">${escapeAttr(_sbsAuthorInitials)}</span>`}</div>
      <div class="bs-author-info">
        <div class="bs-author-name">${highlight(authorHit, q)}</div>
        <div class="bs-author-label">Author</div>
      </div>
      <svg class="bs-author-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
    <div class="bs-author-sep"></div>` : '';

  el.innerHTML = authorRowHtml + results.map((b, i) => `
    <div class="sbs-result-row" data-id="${b.id}" style="animation-delay:${Math.min(i, 10) * 0.028}s">
      <div class="sbs-result-cover">${coverHtml(b, 10)}</div>
      <div class="sbs-result-info">
        <div class="sbs-result-title">${highlight(b.title || '', q)}</div>
        <div class="sbs-result-author">${highlight(b.author || '', q)}</div>
      </div>
      <div class="sbs-result-dot ${b.status}"></div>
    </div>`).join('');

  const sbsAuthorRowEl = document.getElementById('sbsAuthorRow');
  if (sbsAuthorRowEl) {
    sbsAuthorRowEl.addEventListener('click', () => {
      closeShelfSearch();
      setTimeout(() => openAuthorPage(sbsAuthorRowEl.dataset.author, document.getElementById('shelfSearchOverlay')), 80);
    });
    // Hydrate photo from DB if not already cached
    if (!_sbsAuthorImg && authorHit && currentUser) {
      const _sbsKey = (authorHit || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      sb.from('authors').select('image').eq('name_key', _sbsKey).maybeSingle().then(({ data }) => {
        if (data?.image) {
          const photoEl = document.getElementById('sbsAuthorPhoto');
          if (photoEl) {
            const initials = authorHit.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('') || '?';
            photoEl.innerHTML = `<img src="${escapeAttr(data.image)}" onerror="this.parentElement.innerHTML='<span class=bs-author-initials>${escapeAttr(initials)}</span>'" />`;
          }
          // Warm the in-memory cache so next render is instant
          if (typeof _authorCache !== 'undefined') _authorCache[_sbsKey] = { image: data.image, name: authorHit };
        }
      }).catch(() => {});
    }
  }

  el.querySelectorAll('.sbs-result-row').forEach(row => {
    row.addEventListener('click', () => {
      DS._callerRestore = () => openShelfSearch();
      closeShelfSearch();
      setTimeout(() => openDetailModal(row.dataset.id), 140);
    });
  });
}

// ── DRAG TO DISMISS ──
function _sbsInitDrag() {
  const sheet = document.getElementById('shelfSearchOverlay');
  const handle = document.getElementById('sbsDragHandle');
  if (!handle || !sheet) return;
  let startY = 0, currentY = 0, dragging = false;

  const onTouchStart = e => {
    startY = e.touches[0].clientY;
    currentY = 0; dragging = true;
    sheet.style.transition = 'none';
  };
  const onTouchMove = e => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy < 0) return;
    currentY = dy;
    sheet.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)';
    if (currentY > 120) {
      closeShelfSearch();
    } else {
      sheet.style.transform = 'translateY(0)';
    }
  };

  // Remove any previous listeners by cloning the handle
  const newHandle = handle.cloneNode(true);
  handle.parentNode.replaceChild(newHandle, handle);
  newHandle.addEventListener('touchstart', onTouchStart, { passive: true });
  newHandle.addEventListener('touchmove', onTouchMove, { passive: true });
  newHandle.addEventListener('touchend', onTouchEnd, { passive: true });
}

// ── PRESS ──
let _pressStartX = 0, _pressStartY = 0;
function startPress(e, id, card) {
  isPressing = true; didLongPress = false; card.classList.add('pressing');
  _pressStartX = e.touches ? e.touches[0].clientX : 0;
  _pressStartY = e.touches ? e.touches[0].clientY : 0;
  _peekTimer = setTimeout(() => { if (isPressing) { didLongPress = true; card.classList.remove('pressing'); openPeek(id); } }, 300);
}
function endPress(e, id, card) {
  if (!isPressing) return; isPressing = false; clearTimeout(_peekTimer); closePeek();
  card.classList.remove('pressing', 'long-pressed');
  if (!didLongPress) {
    const touch = e.changedTouches ? e.changedTouches[0] : null;
    const dx = touch ? Math.abs(touch.clientX - _pressStartX) : 0;
    const dy = touch ? Math.abs(touch.clientY - _pressStartY) : 0;
    // Threshold for sloppy taps on mobile — but let 'click' handle the actual opening
    if (dx > 12 || dy > 12) { didLongPress = false; return; }
  } else {
    // If it was a long press, prevent the subsequent 'click' event
    if (e && e.cancelable) e.preventDefault();
  }
  // Detail modal is now handled in 'click' for better reliability
  setTimeout(() => { didLongPress = false; }, 10);
}
function cancelPress(card) {
  isPressing = false; clearTimeout(_peekTimer); closePeek();
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
  
  // Desktop sidebar sort label sync
  const sortMap = { recent: 'recently added', title: 'title (a–z)', author: 'author (a–z)', genre: 'genre (a–z)' };
  const dSortVal = document.getElementById('deskSortVal');
  if (dSortVal) dSortVal.textContent = sortMap[sortType] || sortType;

  closeSortMenu();
  renderGrid();
  updateHintBar();
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
        } catch (e) { }
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
  if (video._zxingReader) { try { video._zxingReader.reset(); } catch (e) { } video._zxingReader = null; }
  clearInterval(scannerInterval); scannerInterval = null;
  if (scannerStream) { scannerStream.getTracks().forEach(t => t.stop()); scannerStream = null; }
  video.srcObject = null;
}

// ── QUICK ACTIONS ──
async function quickSetStatus(status) {
  const id = qmBookId; closeQuickMenu();
  const book = books.find(b => b.id === id); if (!book) return;
  if (status === 'read' && book.borrowed_from != null) {
    openFinishBorrowedSheet(id);
    return;
  }
  const prevStatus = book.status;
  book.status = status; renderGrid();
  const ok = await dbUpdate(id, { status });
  if (!ok) { book.status = prevStatus; renderGrid(); showToast('Could not update status'); }
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
        <span style="font-size:11px;color:var(--text-muted);flex-shrink:0">${(list._books || []).length} books</span>
      </button>`).join('');
  }

  document.getElementById('addToListModal').classList.add('visible');
}
function addToListFromMenu_forBook(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  const loLists = window._getLoLists ? window._getLoLists() : [];
  const content = document.getElementById('addToListContent');
  document.getElementById('addToListBookTitle').textContent = book.title;
  if (!loLists.length) {
    content.innerHTML = `<p style="color:var(--text-muted);font-size:14px;text-align:center;padding:16px 0">No lists yet.<br>Create one from Profile → My Lists.</p>`;
  } else {
    content.innerHTML = loLists.map(list => `
      <button onclick="confirmAddToList('${list.id}','${bookId}')"
        style="display:flex;align-items:center;gap:12px;width:100%;background:var(--surface2);border:1.5px solid var(--border);border-radius:12px;padding:13px 14px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;text-align:left;transition:border-color 0.2s"
        onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <span style="font-size:20px;flex-shrink:0">${escapeHtml(list.emoji || '📚')}</span>
        <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtml(list.name)}</span>
        <span style="font-size:11px;color:var(--text-muted);flex-shrink:0">${(list._books || []).length} books</span>
      </button>`).join('');
  }
  document.getElementById('addToListModal').classList.add('visible');
}
async function confirmAddToList(listId, bookId) {
  closeModal('addToListModal');
  // Avoid duplicates
  const { data: existing } = await sb.from('list_books').select('id').eq('list_id', listId).eq('book_id', bookId).maybeSingle();
  if (existing) { showToast('Already in that list'); return; }
  // Books added from shelf are always owned
  const book = books.find(b => String(b.id) === String(bookId));
  const isOnShelf = book && book.status !== 'not-owned';
  const { error } = await sb.from('list_books').insert({ list_id: listId, book_id: bookId, owned: isOnShelf });
  if (error) { showToast('Could not add to list'); return; }
  // Update local _books cache so cover stacks refresh
  const list = (window._getLoLists ? window._getLoLists() : []).find(l => String(l.id) === String(listId));
  if (list && book) list._books = [...(list._books || []), book];
  if (isOnShelf && window._ldGetOwned && window._ldSetOwned) {
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
function setEditStatusFromDropdown(status) {
  editStatus = status;
  updateDetailBadge(status);
  closeStatusDropdown();
  document.querySelectorAll('#editStatusSeg .ef-seg-btn, #editStatusSeg .es-seg-btn').forEach(btn => {
    btn.classList.toggle('ef-seg-active', btn.dataset.seg === status);
    btn.classList.toggle('es-seg-active', btn.dataset.seg === status);
  });
  const ratingSection = document.getElementById('editRatingSection');
  const input = document.getElementById('starRatingInput');
  const show = editStatus === 'read';
  if (ratingSection) ratingSection.style.display = show ? 'block' : 'none';
  if (input) input.style.display = show ? 'flex' : 'none';
  setUserRating(_userRating);
  document.querySelectorAll('.ef-star-btn, .star-btn').forEach(btn => {
    btn.onclick = () => setUserRating(+btn.dataset.star);
  });
}
function handleDetailOverlayClick(e) {
  if (e.target === document.getElementById('detailModal')) { closeModal('detailModal'); return; }
  const dropdown = document.getElementById('statusDropdown');
  if (dropdown.classList.contains('open') && !dropdown.contains(e.target) && e.target !== document.getElementById('statusChevronBtn'))
    closeStatusDropdown();
}
async function confirmEdit() {
  const titleInput = document.getElementById('editTitle');
  const title = titleInput.value.trim();
  if (!title) { titleInput.style.borderColor = 'var(--accent)'; return; }

  const saveBtn = document.getElementById('saveEditBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'saving…';

  const _editGenresArr = document.getElementById('editGenres').value.split(',').map(s => s.trim()).filter(Boolean);
  const _editThemesArr = document.getElementById('editThemes').value.split(',').map(s => s.trim()).filter(Boolean);
  const updates = {
    title,
    author: document.getElementById('editAuthor').value.trim() || '',
    status: editStatus,
    year: document.getElementById('editYear').value.trim() || null,
    genres: _editGenresArr,
    themes: _editThemesArr,
    primary_genre: _editGenresArr.length ? _editGenresArr[0] : null,
    genre: _editGenresArr.length ? _editGenresArr.join(', ') : null,
    page_count: parseInt(document.getElementById('editPageCount').value) || null,
    rating: editStatus === 'read' ? (_userRating || null) : null,
  };

  if (editCoverFile) {
    const url = await uploadCover(editCoverFile, editingId);
    if (url) updates.cover_url = url;
  } else if (editCoverUrl) {
    updates.cover_url = editCoverUrl;
  } else {
    const existing = books.find(b => b.id === editingId);
    if (existing?.cover_url) updates.cover_url = existing.cover_url;
  }

  const ok = await dbUpdate(editingId, updates);
  if (!ok) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
    showToast('Could not save — try again');
    return;
  }
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  const book = books.find(b => String(b.id) === String(editingId));
  if (book) {
    Object.assign(book, updates);
    book.rating = updates.rating;
  }

  // Close edit sheet, then refresh detail sheet
  if (window._editingListBookMode) {
    const statusSeg = document.getElementById('editStatusSeg');
    if (statusSeg) statusSeg.style.display = '';
    document.querySelectorAll('.es-section-label').forEach(el => {
      if (el.textContent.trim() === 'Status') el.style.display = '';
    });
    window._editingListBookMode = false;
  }
  saveBtn.textContent = '✓ saved';
  if (typeof closeEditSheet === 'function') closeEditSheet();
  setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }, 400);
  if (typeof window.dsRefreshDetailSheet === 'function') window.dsRefreshDetailSheet();

  // Refresh grid in background
  renderGrid();
  showToast('Changes saved ✓');
}
async function removeOrHideBook(id) {
  const lists = window._getLoLists ? window._getLoLists() : [];
  let inList = false;
  for (const l of lists) {
    if ((l._books || []).some(b => String(b.id) === String(id))) { inList = true; break; }
  }
  if (inList) {
    const book = books.find(b => String(b.id) === String(id));
    if (book) { book.status = 'not-owned'; }
    // Revert owned=false for ALL lists this book belongs to (spec: remove from shelf → revert to not-owned)
    for (const l of lists) {
      if ((l._books || []).some(b => String(b.id) === String(id))) {
        await sb.from('list_books').update({ owned: false }).eq('list_id', l.id).eq('book_id', id);
        try { if (window._ownedCache && window._ownedCache[l.id]) window._ownedCache[l.id].delete(String(id)); } catch (e) { }
        try {
          const stored = JSON.parse(localStorage.getItem('tsundoku_owned_' + l.id) || '[]');
          const updated = stored.filter(bid => String(bid) !== String(id));
          localStorage.setItem('tsundoku_owned_' + l.id, JSON.stringify(updated));
        } catch (e) { }
      }
    }
    await sb.from('books').update({ status: 'not-owned' }).eq('id', id);
    renderGrid();
    if (typeof renderShelfGrid === 'function') renderShelfGrid();
    showToast('Book removed from shelf');
  } else {
    // Not in any list — hard delete, book stays gone everywhere
    books = books.filter(b => String(b.id) !== String(id));
    renderGrid();
    if (typeof renderShelfGrid === 'function') renderShelfGrid();
    await dbDelete(id);
    showToast('Book removed');
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
  const isComplete = tp > 0 && pr >= tp;

  const bar = document.getElementById('progressPreviewBar');
  bar.style.width = pct + '%';
  bar.style.background = isComplete ? 'var(--green)' : 'var(--accent)';

  const pctEl = document.getElementById('progressPreviewPct');
  pctEl.textContent = pct + '%';
  pctEl.style.color = isComplete ? 'var(--green)' : 'var(--accent)';

  document.getElementById('progressPreviewPages').textContent = `${pr} / ${tp > 0 ? tp : '?'} pages`;

  const hint = document.getElementById('progressFinishHint');
  if (hint) hint.style.display = isComplete ? 'flex' : 'none';

  const btn = document.getElementById('saveProgressBtn');
  btn.textContent = isComplete ? 'finish book' : 'Save Progress';
}
async function confirmProgress() {
  let pagesRead = Math.max(0, parseInt(document.getElementById('progressPagesRead').value) || 0);
  const totalPages = Math.max(0, parseInt(document.getElementById('progressTotalPages').value) || 0);
  if (totalPages > 0) pagesRead = Math.min(pagesRead, totalPages);
  const isComplete = totalPages > 0 && pagesRead >= totalPages;

  const btn = document.getElementById('saveProgressBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const updates = { pages_read: pagesRead, total_pages: totalPages };

  const progBook = books.find(b => b.id === progressBookId);
  const prevPagesRead = progBook ? (progBook.pages_read || 0) : 0;
  if (isComplete && progBook?.borrowed_from != null) {
    const ok = await dbUpdate(progressBookId, updates);
    btn.disabled = false; btn.textContent = 'finish book';
    if (!ok) { showToast('Could not save — check connection'); return; }
    if (progBook) { progBook.pages_read = pagesRead; progBook.total_pages = totalPages; }
    closeModal('progressModal');
    renderGrid();
    openFinishBorrowedSheet(progressBookId);
    return;
  }

  if (isComplete) {
    updates.status = 'read';
    updates.created_at = new Date().toISOString();
  }

  const ok = await dbUpdate(progressBookId, updates);
  btn.disabled = false; btn.textContent = isComplete ? 'finish book' : 'Save Progress';
  if (!ok) { showToast('Could not save — check connection'); return; }

  const book = books.find(b => b.id === progressBookId);
  if (book) {
    book.pages_read = pagesRead;
    book.total_pages = totalPages;
    if (isComplete) book.status = 'read';
  }

  const delta = pagesRead - prevPagesRead;
  if (delta > 0 && currentUser) {
    const today = new Date().toISOString().slice(0, 10);
    sb.from('reading_log').upsert(
      { user_id: currentUser.id, book_id: progressBookId, date: today, pages_read: delta },
      { onConflict: 'user_id,book_id,date' }
    ).then(() => {}).catch(() => {});
  }
  
  closeModal('progressModal');
  renderGrid();
  showToast(isComplete ? 'moved to read ✓' : 'Progress saved ✓');
}

// ── PROFILE ──
function openProfileModal() {
  const email = currentUser?.email || '—';
  const initials = getUserInitials(email);
  document.getElementById('profileAvatarLarge').textContent = initials;
  document.getElementById('profileEmailDisplay').textContent = email;
  const countEl = document.getElementById('shelfTotalCount');
  const shelfBooks = books.filter(b => b.status !== 'not-owned');
  if (countEl) countEl.textContent = shelfBooks.length === 1 ? '1 book' : `${shelfBooks.length} books`;
  updateShareUI();
  if (typeof updateListsCount === 'function') updateListsCount();
  const authorsCountEl = document.getElementById('authorsCount');
  if (authorsCountEl) {
    const uniqueAuthors = new Set(books.filter(b => b.status !== 'not-owned' && b.author).map(b => b.author.trim())).size;
    authorsCountEl.textContent = uniqueAuthors ? `${uniqueAuthors} authors` : '';
  }
  const rnoBooks = books.filter(b => b.status === 'not-owned' && b.borrowed_from != null);
  const rnoBtn = document.getElementById('readNotOwnedBtn');
  if (rnoBtn) {
    rnoBtn.style.display = rnoBooks.length ? '' : 'none';
    const rnoCount = document.getElementById('readNotOwnedProfileCount');
    if (rnoCount) rnoCount.textContent = rnoBooks.length === 1 ? '1 book' : `${rnoBooks.length} books`;
  }
  const profileModal = document.getElementById('profileModal');
  profileModal.classList.add('visible');
  navPush(null, profileModal);
  _updateAppRecede();
}

// ── AUTHORS LIST OVERLAY ──
let alSort = 'az'; // 'az' | 'count'
let alView = 'list'; // 'list' | 'card'
function _alSetAvatarImg(el, imageUrl, authorName) {
  if (!el) return;
  const initials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
  el.innerHTML = `<img src="${escapeAttr(imageUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent='${escapeAttr(initials)}'" />`;
}

// Serial queue — avoids hammering Open Library
const _alFetchQueue = [];
let _alFetchRunning = false;

function _alEnqueueFetch(authorName, cacheKey, avatarEl) {
  _alFetchQueue.push({ authorName, cacheKey, avatarEl });
  if (!_alFetchRunning) _alDrainQueue();
}

async function _alDrainQueue() {
  _alFetchRunning = true;
  while (_alFetchQueue.length) {
    const { authorName, cacheKey, avatarEl } = _alFetchQueue.shift();
    await _alFetchOneAuthorImage(authorName, cacheKey, avatarEl);
        await new Promise(r => setTimeout(r, 1000)); // throttle: 1 req/s to respect Open Library rate limits
  }
  _alFetchRunning = false;
}

async function _alFetchOneAuthorImage(authorName, cacheKey, avatarEl) {
  try {
    // 1. Wikipedia — search for page title, then fetch photo directly
    let imageUrl = null;
    try {
      const wikiSearch = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(authorName + ' author')}&srlimit=1&format=json&origin=*`);
      if (wikiSearch.ok) {
        const wikiSearchData = await wikiSearch.json();
        const pageTitle = wikiSearchData?.query?.search?.[0]?.title;
        if (pageTitle) {
          const wikiImg = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&redirects=1&prop=pageimages&pithumbsize=500&format=json&origin=*`);
          if (wikiImg.ok) {
            const wikiImgData = await wikiImg.json();
            const pages = wikiImgData?.query?.pages || {};
            const page = Object.values(pages)[0];
            imageUrl = page?.thumbnail?.source || null;
          }
        }
      }
    } catch {}
    
    if (imageUrl) {
      const valid = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 10);
        img.onerror = () => resolve(false);
        img.src = imageUrl;
      });
      if (valid) {
        if (typeof _authorCache !== 'undefined') {
          _authorCache[cacheKey] = { ...(_authorCache[cacheKey] || {}), image: imageUrl, name: authorName };
        }
        _alSetAvatarImg(avatarEl, imageUrl, authorName);
        if (currentUser) {
          sb.from('authors').upsert({
            name_key: cacheKey,
            name: authorName,
            image: imageUrl,
            user_id: currentUser.id
          }, { onConflict: 'name_key' }).then(() => {}).catch(() => {});
        }
        return;
      }
    }

    // 2. Fallback to Open Library
    let olImageUrl = null;
    try {
      const r = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}&limit=3`);
      if (r.ok) {
        const d = await r.json();
        const doc = (d.docs || []).find(a => {
          const docName = (a.name || '').toLowerCase();
          const cleanSearch = authorName.toLowerCase();
          return docName === cleanSearch || docName.includes(cleanSearch) || cleanSearch.includes(docName);
        }) || (d.docs || [])[0];
        if (doc?.key) {
          const olid = doc.key.replace('/authors/', '');
          const candidateUrl = `https://covers.openlibrary.org/a/olid/${olid}-M.jpg`;
          const valid = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth > 10);
            img.onerror = () => resolve(false);
            img.src = candidateUrl;
          });
          if (valid) {
            olImageUrl = candidateUrl;
          }
        }
        }
    } catch {}

    if (olImageUrl) {
      if (typeof _authorCache !== 'undefined') {
        _authorCache[cacheKey] = { ...(_authorCache[cacheKey] || {}), image: olImageUrl, name: authorName };
      }
      _alSetAvatarImg(avatarEl, olImageUrl, authorName);
      if (currentUser) {
        sb.from('authors').upsert({
          name_key: cacheKey,
          name: authorName,
          image: olImageUrl,
          user_id: currentUser.id
        }, { onConflict: 'name_key' }).then(() => {}).catch(() => {});
      }
    } else {
      // Neither API found a valid photo. Save empty status to Supabase and cache.
      if (typeof _authorCache !== 'undefined') {
        _authorCache[cacheKey] = { ...(_authorCache[cacheKey] || {}), image: '', name: authorName };
      }
      if (currentUser) {
        sb.from('authors').upsert({
          name_key: cacheKey,
          name: authorName,
          image: '',
          user_id: currentUser.id
        }, { onConflict: 'name_key' }).then(() => {}).catch(() => {});
      }
    }
  } catch { /* silent */ }
}
function openAuthorsOverlay() {
  renderAuthorsList();
  navPush(document.getElementById('profileModal'), document.getElementById('authorsListOverlay'));
}
function closeAuthorsOverlay() {
  navPop(document.getElementById('authorsListOverlay'), document.getElementById('profileModal'));
}
function toggleAlSort() {
  alSort = alSort === 'az' ? 'count' : 'az';
  document.getElementById('alSortLabel').textContent = alSort === 'az' ? 'Sort A–Z' : 'Sort by count';
  renderAuthorsList();
}
function setAlView(view) {
  alView = view === 'card' ? 'card' : 'list';
  document.querySelectorAll('[data-al-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.alView === alView);
  });
  renderAuthorsList();
}
function renderAuthorsList() {
  const q = (document.getElementById('alSearchInput')?.value || '').toLowerCase().trim();
  const shelfBooks = books.filter(b => b.status !== 'not-owned' && b.author);

  // Build author map: name → count
  const authorMap = new Map();
  shelfBooks.forEach(b => {
    const a = (b.author || '').trim();
    if (!a) return;
    authorMap.set(a, (authorMap.get(a) || 0) + 1);
  });

  let entries = Array.from(authorMap.entries()); // [name, count]
  if (q) entries = entries.filter(([name]) => name.toLowerCase().includes(q));
  if (alSort === 'az') entries.sort((a, b) => a[0].localeCompare(b[0]));
  else entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const sub = document.getElementById('alShelfSub');
  if (sub) sub.textContent = `All authors in your shelf.`;

  const authorsCount = document.getElementById('authorsCount');
  if (authorsCount) authorsCount.textContent = `${authorMap.size} authors`;

  const scroll = document.getElementById('alScroll');
  if (!scroll) return;
  scroll.classList.toggle('al-card-view', alView === 'card');

  if (!entries.length) {
    scroll.innerHTML = `<div class="al-empty">📭<br>${q ? 'No authors match your search.' : 'No authors yet.'}</div>`;
    return;
  }

  scroll.innerHTML = entries.map(([name, count], i) => {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    const bookWord = count === 1 ? 'book' : 'books';
    if (alView === 'card') {
      return `<div class="al-author-card" data-author="${escapeAttr(name)}" style="animation-delay:${Math.min(i, 14) * 0.028}s">
      <div class="al-author-avatar al-author-card-avatar" id="al-av-${i}">${escapeHtml(initials)}</div>
      <div class="al-author-card-name">${escapeHtml(name)}</div>
      <div class="al-author-count">${count} ${bookWord}</div>
    </div>`;
    }
    return `<div class="al-author-row" data-author="${escapeAttr(name)}" style="animation-delay:${Math.min(i, 14) * 0.028}s">
      <div class="al-author-avatar" id="al-av-${i}">${escapeHtml(initials)}</div>
      <div class="al-author-info">
        <div class="al-author-name">${escapeHtml(name)}</div>
        <div class="al-author-count">${count} ${bookWord}</div>
      </div>
      <svg class="al-author-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');

  // ── Batch hydration: one Supabase query for all authors ──
  const allRows = Array.from(scroll.querySelectorAll('.al-author-row, .al-author-card'));
  allRows.forEach(row => {
    row.addEventListener('click', () => {
        const author = row.dataset.author;
        if (typeof openAuthorPage === 'function') openAuthorPage(author, document.getElementById('authorsListOverlay'));
      });
  });

  // Collect authors needing images (not in memory cache)
  const needsLookup = [];
  allRows.forEach((row, i) => {
    const authorName = row.dataset.author;
    const cacheKey = (authorName || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const avatarEl = document.getElementById('al-av-' + i);
    if (!avatarEl) return;
    const cached = typeof _authorCache !== 'undefined' && _authorCache[cacheKey];
    if (cached?.image) {
      _alSetAvatarImg(avatarEl, cached.image, authorName);
    } else {
      needsLookup.push({ authorName, cacheKey, avatarEl });
    }
  });

  // One batch Supabase query for all missing authors
  if (needsLookup.length && currentUser) {
    const keys = needsLookup.map(x => x.cacheKey);
    sb.from('authors').select('name_key, image').in('name_key', keys)
      .then(({ data }) => {
        const found = new Map((data || []).map(r => [r.name_key, r.image]));
        needsLookup.forEach(({ authorName, cacheKey, avatarEl }) => {
          if (found.has(cacheKey)) {
            const imgUrl = found.get(cacheKey) || '';
            if (typeof _authorCache !== 'undefined') {
              _authorCache[cacheKey] = { ...(_authorCache[cacheKey] || {}), image: imgUrl, name: authorName };
            }
            if (imgUrl) {
              _alSetAvatarImg(avatarEl, imgUrl, authorName);
            }
          } else {
            // Not in Supabase — queue OL fetch (serialized, throttled)
            _alEnqueueFetch(authorName, cacheKey, avatarEl);
          }
        });
      }).catch(() => {
        // Fallback: enqueue all for OL
        needsLookup.forEach(({ authorName, cacheKey, avatarEl }) =>
          _alEnqueueFetch(authorName, cacheKey, avatarEl));
      });
  }
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('authors');
}

// ── GENRES ──
function getBookGenres(book) {
  if (Array.isArray(book.genres) && book.genres.length) return book.genres.map(g => (g || '').trim()).filter(Boolean);
  if (book.genre) return book.genre.split(',').map(g => g.trim()).filter(Boolean);
  if (book.primary_genre) return [book.primary_genre.trim()];
  return [];
}
function buildGenreMap() {
  const map = new Map();
  books.filter(b => !isHiddenFromShelf(b)).forEach(b => {
    getBookGenres(b).forEach(g => {
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(b);
    });
  });
  return map;
}
let genSort = 'az';
let genreDetailName = null;
function openGenresOverlay() {
  renderGenresList();
  navPush(document.getElementById('profileModal'), document.getElementById('genresListOverlay'));
}
function closeGenresOverlay() {
  navPop(document.getElementById('genresListOverlay'), document.getElementById('profileModal'));
}
function toggleGenSort() {
  genSort = genSort === 'az' ? 'count' : 'az';
  document.getElementById('genSortLabel').textContent = genSort === 'az' ? 'Sort A–Z' : 'Sort by count';
  renderGenresList();
}
function renderGenresList() {
  const q = (document.getElementById('genSearchInput')?.value || '').toLowerCase().trim();
  const map = buildGenreMap();
  let entries = Array.from(map.entries());
  if (q) entries = entries.filter(([name]) => name.toLowerCase().includes(q));
  if (genSort === 'az') entries.sort((a, b) => a[0].localeCompare(b[0]));
  else entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const sub = document.getElementById('genShelfSub');
  if (sub) sub.textContent = 'All genres in your shelf.';
  const genresProfileCountEl = document.getElementById('genresProfileCount');
  if (genresProfileCountEl) genresProfileCountEl.textContent = map.size ? `${map.size} genres` : '';

  const scroll = document.getElementById('genScroll');
  if (!scroll) return;
  if (!entries.length) {
    scroll.innerHTML = `<div class="al-empty">📭<br>${q ? 'No genres match your search.' : 'No genres yet.'}</div>`;
    return;
  }
  scroll.innerHTML = entries.map(([name, arr], i) => {
    const bookWord = arr.length === 1 ? 'book' : 'books';
    return `<div class="al-author-row" data-genre="${escapeAttr(name)}" style="animation-delay:${Math.min(i, 14) * 0.028}s">
      <div class="al-author-avatar" style="font-size:16px">📚</div>
      <div class="al-author-info">
        <div class="al-author-name">${escapeHtml(name)}</div>
        <div class="al-author-count">${arr.length} ${bookWord}</div>
      </div>
      <svg class="al-author-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');
  scroll.querySelectorAll('.al-author-row[data-genre]').forEach(row => {
    row.addEventListener('click', () => openGenreDetail(row.dataset.genre));
  });
}
function openGenreDetail(genreName) {
  genreDetailName = genreName;
  document.getElementById('genreDetailTitle').textContent = genreName;
  renderGenreDetailGrid();
  navPush(document.getElementById('genresListOverlay'), document.getElementById('genreDetailOverlay'));
}
function closeGenreDetail() {
  navPop(document.getElementById('genreDetailOverlay'), document.getElementById('genresListOverlay'));
}
function renderGenreDetailGrid() {
  const grid = document.getElementById('genreDetailGrid');
  const countEl = document.getElementById('genreDetailCount');
  const map = buildGenreMap();
  const list = (map.get(genreDetailName) || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  if (countEl) countEl.textContent = list.length === 1 ? '1 book' : `${list.length} books`;
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>No books in this genre.</p></div>`;
    return;
  }
  grid.classList.remove('reading-mode');
  grid.innerHTML = list.map((b, i) => `
    <div class="book-card" data-id="${b.id}" data-title="${escapeAttr(b.title || '')}" data-author="${escapeAttr(b.author || '')}" style="animation-delay:${Math.min(i, 12) * 0.035}s">
      ${coverHtml(b)}<div class="status-dot ${b.status}"></div>
    </div>`).join('');
  grid.querySelectorAll('.book-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('touchstart', e => startPress(e, id, card), { passive: true });
    card.addEventListener('touchend', e => { e.stopPropagation(); endPress(e, id, card); });
    card.addEventListener('touchcancel', () => { if (!didLongPress) cancelPress(card); });
    card.addEventListener('click', e => {
      if (isTouch()) { openDetailModal(id); return; }
      if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
      else openQuickMenu(id, card);
    });
  });
}

// ── MY SHELF VIEW ──
let shelfSort = 'recent';
let shelfGenreFilter = null;
function renderShelfGenreChips() {
  const row = document.getElementById('shelfGenreChipRow');
  if (!row) return;
  const map = buildGenreMap();
  if (!map.size) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  const sorted = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const chips = [`<button class="ld-chip${shelfGenreFilter === null ? ' active' : ''}" data-genre="">All</button>`]
    .concat(sorted.map(([name, arr]) => `<button class="ld-chip${shelfGenreFilter === name ? ' active' : ''}" data-genre="${escapeAttr(name)}">${escapeHtml(name)} <span style="opacity:0.65">${arr.length}</span></button>`));
  row.innerHTML = chips.join('');
  row.querySelectorAll('.ld-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      shelfGenreFilter = chip.dataset.genre || null;
      renderShelfGenreChips();
      renderShelfGrid();
    });
  });
}
function updateShelfStats() {
  const visible = books.filter(b => !isHiddenFromShelf(b));
  ['reading', 'read', 'unread'].forEach(s => {
    const el = document.getElementById('shelfStatNum-' + s);
    if (el) el.textContent = visible.filter(b => b.status === s).length;
  });
}
function openShelfView() {
  const si = document.getElementById('shelfSearchInput');
  if (si) { si.value = ''; document.getElementById('shelfSearchClear').classList.remove('visible'); }
  updateShelfStats();
  renderShelfGrid();
  navPush(null, document.getElementById('shelfOverlay'));
  _updateAppRecede();
}
function closeShelfView() {
  navPop(document.getElementById('shelfOverlay'), null);
  _updateAppRecede();
}

// ── BORROWED ADD ──
function openBorrowedAdd() {
  addOwnership = 'borrowed';
  const bfGroup = document.getElementById('borrowedFromGroup');
  if (bfGroup) bfGroup.style.display = '';
  const addBookBtn = document.getElementById('addBookBtn');
  if (addBookBtn) addBookBtn.textContent = 'Start Reading';
  setTimeout(() => document.getElementById('addModal').classList.add('visible'), 80);
}

// ── FINISH BORROWED SHEET ──
let _finishBorrowedId = null;
function openFinishBorrowedSheet(id) {
  _finishBorrowedId = id;
  const book = books.find(b => b.id === id); if (!book) return;
  const coverEl = document.getElementById('finishBorrowedCover');
  if (coverEl) coverEl.innerHTML = book.cover_url ? `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:5px"/>` : makePlaceholder(book, 14);
  const titleEl = document.getElementById('finishBorrowedTitle');
  if (titleEl) titleEl.textContent = book.title;
  const authorEl = document.getElementById('finishBorrowedAuthor');
  if (authorEl) authorEl.textContent = book.author || '';
  const fromEl = document.getElementById('finishBorrowedFrom');
  if (fromEl) fromEl.textContent = book.borrowed_from ? `↩ borrowed from ${book.borrowed_from}` : '↩ borrowed';
  document.getElementById('finishBorrowedSheet').classList.add('visible');
}
function closeFinishBorrowedSheet() {
  document.getElementById('finishBorrowedSheet').classList.remove('visible');
  _finishBorrowedId = null;
}
async function addToReadNotOwned() {
  const id = _finishBorrowedId; closeFinishBorrowedSheet();
  const book = books.find(b => b.id === id); if (!book) return;
  book.status = 'not-owned';
  renderGrid();
  await dbUpdate(id, { status: 'not-owned' });
  openProfileModal();  // refresh count badge
  closeModal('profileModal');
  showToast('added to read but not owned ✓');
}
async function skipToReadNotOwned() {
  const id = _finishBorrowedId; closeFinishBorrowedSheet();
  const book = books.find(b => b.id === id); if (!book) return;
  book.status = 'read';
  renderGrid();
  await dbUpdate(id, { status: 'read' });
  showToast('moved to read ✓');
}

// ── READ BUT NOT OWNED OVERLAY ──
function openReadNotOwnedOverlay() {
  renderReadNotOwnedList();
  navPush(document.getElementById('profileModal'), document.getElementById('readNotOwnedOverlay'));
  _updateAppRecede();
}
function closeReadNotOwnedOverlay() {
  navPop(document.getElementById('readNotOwnedOverlay'), document.getElementById('profileModal'));
  _updateAppRecede();
}
function renderReadNotOwnedList() {
  const list = books.filter(b => b.status === 'not-owned' && b.borrowed_from != null);
  const countEl = document.getElementById('readNotOwnedCount');
  if (countEl) countEl.textContent = list.length === 1 ? '1 book' : `${list.length} books`;
  const emptyEl = document.getElementById('readNotOwnedEmpty');
  const listEl = document.getElementById('readNotOwnedList');
  if (!list.length) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  const rows = list.map(b => {
    const date = b.updated_at ? new Date(b.updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    return `<div class="rno-book-row" data-id="${b.id}">
      <div class="rno-cover">${b.cover_url ? `<img src="${escapeAttr(b.cover_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:5px"/>` : makePlaceholder(b, 12)}</div>
      <div class="rno-info">
        <div class="rno-title">${escapeHtml(b.title)}</div>
        <div class="rno-author">${escapeHtml(b.author || '')}</div>
        ${b.borrowed_from ? `<div class="rno-from-chip">↩ from ${escapeHtml(b.borrowed_from)}</div>` : ''}
        ${date ? `<div class="rno-date">finished ${date}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  listEl.innerHTML = (emptyEl ? emptyEl.outerHTML : '') + rows;
  listEl.querySelectorAll('.rno-book-row').forEach(row => {
    row.addEventListener('click', () => openDetailModal(row.dataset.id));
  });
}
function clearShelfViewSearch() {
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
  renderShelfGenreChips();
  const grid = document.getElementById('shelfGrid');
  const countEl = document.getElementById('shelfOverlayCount');
  const q = (document.getElementById('shelfSearchInput')?.value || '').toLowerCase().trim();
  let all = books.filter(b => !isHiddenFromShelf(b));
  if (q) all = all.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
  if (shelfGenreFilter) all = all.filter(b => getBookGenres(b).includes(shelfGenreFilter));
  document.getElementById('shelfSearchClear')?.classList.toggle('visible', q.length > 0);
  all.sort((a, b) => {
    if (shelfSort === 'title') return (a.title || '').localeCompare(b.title || '');
    if (shelfSort === 'author') {
      const cmp = (a.author || '').localeCompare(b.author || '');
      return cmp !== 0 ? cmp : (a.title || '').localeCompare(b.title || '');
    }
    if (shelfSort === 'genre') {
      const cmp = (a.primary_genre || 'zzz').trim().toLowerCase().localeCompare((b.primary_genre || 'zzz').trim().toLowerCase());
      return cmp !== 0 ? cmp : (a.title || '').localeCompare(b.title || '');
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
    <div class="book-card" data-id="${b.id}" data-title="${escapeAttr(b.title || '')}" data-author="${escapeAttr(b.author || '')}" style="animation-delay:${Math.min(i, 12) * 0.035}s">
      ${coverHtml(b)}<div class="status-dot ${b.status}"></div>
    </div>`).join('');
  grid.querySelectorAll('.book-card').forEach(card => {
    const id = card.dataset.id;
    card.addEventListener('touchstart', e => startPress(e, id, card), { passive: true });
    card.addEventListener('touchend', e => { e.stopPropagation(); endPress(e, id, card); });
    card.addEventListener('touchcancel', () => { if (!didLongPress) cancelPress(card); });
    card.addEventListener('click', e => {
      if (isTouch()) {
        openDetailModal(id);
        return;
      }
      if (qmBookId === id && document.getElementById('quickMenu').classList.contains('visible')) closeQuickMenu();
      else openQuickMenu(id, card);
    });
  });
  // refresh A–Z bar after DOM settles
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('shelf');
}

// ── BOOK SEARCH ──
function toggleAddPopup() {
  const popup = document.getElementById('addPopup');
  const btn = document.getElementById('addBtn');
  const isOpen = popup.classList.contains('open');
  if (isOpen) {
    closeAddPopup();
  } else {
    popup.classList.add('open');
    btn.classList.add('open');
    document.getElementById('qmDismiss').classList.add('active');
  }
}
function closeAddPopup() {
  document.getElementById('addPopup').classList.remove('open');
  document.getElementById('addBtn').classList.remove('open');
  if (!document.getElementById('quickMenu').classList.contains('visible') &&
      !document.getElementById('sortMenu').classList.contains('visible')) {
    document.getElementById('qmDismiss').classList.remove('active');
  }
}
function setAddContext(context) {
  addContext = context === 'list' ? 'list' : 'shelf';
  const app = document.getElementById('app');
  if (app) app.classList.toggle('list-add-context', addContext === 'list');
  const modal = document.getElementById('addModal');
  if (!modal) return;
  modal.classList.toggle('list-add-mode', addContext === 'list');
  const title = modal.querySelector('.edit-sheet-title');
  if (title) title.textContent = 'Add a book';
  const btn = document.getElementById('addBookBtn');
  if (btn) btn.textContent = addContext === 'list' ? 'Add to List' : 'Add to Shelf';
}
function openBookSearch(context = 'shelf') {
  setAddContext(context);
  const bsOverlay = document.getElementById('bookSearchOverlay');
  navPush(null, bsOverlay);
  _updateAppRecede();
  const bar = document.getElementById('floatingBar');
  if (bar) bar.style.display = 'none';
  setTimeout(() => document.getElementById('bsInput').focus(), 380);
}
function closeBookSearch() {
  const bsOverlay = document.getElementById('bookSearchOverlay');
  navPop(bsOverlay, null);
  _updateAppRecede();
  if (addContext !== 'list') document.getElementById('floatingBar').style.display = '';
  document.getElementById('bsInput').value = '';
  document.getElementById('bsResults').innerHTML = '<div class="bs-state"><p>Type a title, author, or ISBN to search</p></div>';
  clearTimeout(bookSearchTimer);
  setBsCategory('all');
}
function openAuthorPageFromSearch(authorName) {
  if (typeof openAuthorPage === 'function') openAuthorPage(authorName, document.getElementById('bookSearchOverlay'));
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
  if (q.length < 3) { document.getElementById('bsResults').innerHTML = '<div class="bs-state"><p>Keep typing…</p></div>'; return; }
  document.getElementById('bsResults').innerHTML = '<div class="bs-state"><div class="loading-spinner"></div></div>';
  bookSearchTimer = setTimeout(() => fetchBookSearch(q), 500);
}

async function fetchBookSearch(query) {
  const resultsEl = document.getElementById('bsResults');
  const isIsbn = /^[\d\-]{9,17}$/.test(query.replace(/\s/g, ''));

  async function searchGoogle(q, cat) {
    let qParam = encodeURIComponent(q);
    if (cat === 'intitle') qParam = `intitle:${qParam}`;
    else if (cat === 'inauthor') qParam = `inauthor:${qParam}`;
    else if (isIsbn) qParam = `isbn:${qParam}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${qParam}&maxResults=40&langRestrict=en&key=${window.BOOKS_API_KEY}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(item => {
      const v = item.volumeInfo || {};
      let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '';
      if (cover) cover = cover.replace(/^http:/, 'https:').replace('zoom=1', 'zoom=2').replace('&edge=curl', '');
      return {
        title: v.title || '',
        author: (v.authors || [])[0] || '',
        cover,
        source: 'google',
        year: v.publishedDate ? v.publishedDate.slice(0, 4) : '',
        publisher: v.publisher || '',
        genre: (v.categories || [])[0] || '',
        pageCount: v.pageCount ? String(v.pageCount) : '',
        _description: v.description || '',
      };
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
      author: (d.author_name || [])[0] || '',
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
    const seen = new Set(g.map(b => (b.title + b.author).toLowerCase().replace(/\s/g, '')));
    const merged = [...g, ...ol.filter(b => {
      const key = (b.title + b.author).toLowerCase().replace(/\s/g, '');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    })];
    // Extract author hit: use the most common author among top results
    let authorHit = null;
    if (bsSearchCategory !== 'intitle' && merged.length) {
      const freq = {};
      merged.slice(0, 15).forEach(b => { if (b.author) freq[b.author] = (freq[b.author] || 0) + 1; });
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
      const q = document.getElementById('bsInput').value.trim().toLowerCase();
      const authorWords = top ? top[0].toLowerCase().split(/\s+/) : [];
      const queryWords = q.split(/\s+/);
      const queryMatchesAuthor = top && queryWords.every(qw => authorWords.some(aw => aw.startsWith(qw) || aw.includes(qw)));
      if (top && top[1] >= 1 && queryMatchesAuthor) {
        authorHit = { name: top[0], photo: null };
        // Try to fetch author photo from Open Library
        (async () => {
          try {
            const r = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(top[0])}&limit=1`);
            const d = await r.json();
            const key = d.docs?.[0]?.key;
            if (key) {
              const olid = key.replace('/authors/', '');
              const photoUrl = `https://covers.openlibrary.org/a/olid/${olid}-M.jpg`;
              authorHit.photo = photoUrl;
              authorHit.olid = olid;
              // Re-render with photo once loaded
              const img = new Image();
              img.onload = () => {
                const photoEl = document.querySelector('.bs-author-photo');
                if (photoEl) photoEl.innerHTML = `<img src="${photoUrl}" />`;
              };
              img.src = photoUrl;
            }
          } catch { }
        })();
      }
    }
    renderBsResults(merged, authorHit);
  } catch (e) {
    resultsEl.innerHTML = '<div class="bs-state"><p>Search failed.<br>Check your connection or add manually.</p></div>';
  }
}

function renderBsResults(items, authorHit) {
  const el = document.getElementById('bsResults');
  if (!items.length && !authorHit) {
    el.innerHTML = '<div class="bs-state"><p>No results found.<br>Try a different keyword or add manually.</p></div>';
    return;
  }

  const authorRow = authorHit ? `
    <div class="bs-author-row" id="bsAuthorRow" data-author="${escapeAttr(authorHit.name)}">
      <div class="bs-author-photo">${authorHit.photo ? `<img src="${escapeAttr(authorHit.photo)}" onerror="this.parentElement.innerHTML='<span class=bs-author-initials>${escapeAttr(authorHit.name[0]||'?')}</span>'" />` : `<span class="bs-author-initials">${escapeAttr(authorHit.name[0]||'?')}</span>`}</div>
      <div class="bs-author-info">
        <div class="bs-author-name">${escapeHtml(authorHit.name)}</div>
        <div class="bs-author-label">Author</div>
      </div>
      <svg class="bs-author-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
    <div class="bs-author-sep"></div>` : '';

  el.innerHTML = authorRow + items.map((book, i) => {
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
      if (book) selectBsResult(book.title, book.author, book.cover, book);
    });
  });
  const authorRowEl = document.getElementById('bsAuthorRow');
  if (authorRowEl) {
    authorRowEl.addEventListener('click', () => {
      closeBookSearch();
      setTimeout(() => openAuthorPageFromSearch(authorRowEl.dataset.author), 80);
    });
  }
}

function selectBsResult(title, author, coverUrl, meta) {
  window._pendingDescription = meta?._description || null;
  closeBookSearch();
  addCoverFile = null; addCoverUrl = coverUrl || null;
  document.getElementById('addTitle').value = title || '';
  document.getElementById('addAuthor').value = author || '';
  document.getElementById('addCoverUrlInput').value = coverUrl || '';
  const addYear = document.getElementById('addYear');
  const addGenres = document.getElementById('addGenres');
  const addPageCount = document.getElementById('addPageCount');
  if (addYear && meta?.year) addYear.value = meta.year;
  if (addGenres && meta?.genre) addGenres.value = meta.genre;
  if (addPageCount && meta?.pageCount) addPageCount.value = meta.pageCount;
  if (coverUrl) {
    const thumb = document.getElementById('addCoverThumb');
    if (thumb) thumb.innerHTML = `<img src="${escapeAttr(coverUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.remove()"/>`;
    const ready = document.getElementById('addCoverReadyMsg');
    if (ready) ready.style.display = 'flex';
  }
  setTimeout(() => document.getElementById('addModal').classList.add('visible'), 80);
}

function openManualAdd(context = 'shelf') {
  setAddContext(context);
  closeBookSearch();
  const bar = document.getElementById('floatingBar');
  if (bar) bar.style.display = 'none';
  setTimeout(() => document.getElementById('addModal').classList.add('visible'), 80);
}

async function confirmAdd() {
  const title = document.getElementById('addTitle').value.trim();
  if (!title) { document.getElementById('addTitle').style.borderColor = 'var(--accent)'; return; }
  const btn = document.getElementById('addBookBtn'); btn.disabled = true; btn.textContent = 'Adding…';
  const isListAdd = addContext === 'list';
  const isBorrowed = !isListAdd && addOwnership === 'borrowed';
  const borrowedFrom = isBorrowed ? (document.getElementById('borrowedFromInput')?.value.trim() || '') : null;
  const _addGenresArr = (document.getElementById('addGenres')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const _addThemesArr = (document.getElementById('addThemes')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const newBook = await dbAdd({
    title,
    author: document.getElementById('addAuthor').value.trim() || '',
    status: isListAdd ? 'not-owned' : (isBorrowed ? 'reading' : addStatus),
    cover_url: null,
    pages_read: 0,
    total_pages: isListAdd ? null : 0,
    year: document.getElementById('addYear')?.value.trim() || null,
    genres: _addGenresArr,
    themes: _addThemesArr,
    primary_genre: _addGenresArr.length ? _addGenresArr[0] : null,
    genre: _addGenresArr.length ? _addGenresArr.join(', ') : null,
    page_count: parseInt(document.getElementById('addPageCount')?.value) || null,
    description: window._pendingDescription || null,
    borrowed_from: borrowedFrom,
  });
  if (newBook) {
    let finalUrl = null;
    if (addCoverFile) finalUrl = await uploadCover(addCoverFile, newBook.id);
    else if (addCoverUrl) finalUrl = addCoverUrl;
    if (finalUrl) { await dbUpdate(newBook.id, { cover_url: finalUrl }); newBook.cover_url = finalUrl; }
    books.unshift(newBook);
    try {
      const _ck = 'tsundoku_books_' + currentUser.id;
      const _cc = localStorage.getItem(_ck);
      if (_cc) { const _cp = JSON.parse(_cc); _cp.unshift(newBook); localStorage.setItem(_ck, JSON.stringify(_cp)); }
    } catch {}
    if (isListAdd && window.ldAddBookToCurrentList) {
      const ok = await window.ldAddBookToCurrentList(newBook, false);
      if (!ok) {
        btn.disabled = false; btn.textContent = 'Add to List';
        return;
      }
    }
    closeModal('addModal'); renderGrid(); showToast('Book added ✓');
  }
  btn.disabled = false; btn.textContent = addContext === 'list' ? 'Add to List' : 'Add to Shelf';
}

async function fetchAddIsbn() {
  const isbn = document.getElementById('addIsbn')?.value.trim();
  if (!isbn) { showToast('Enter an ISBN first'); return; }
  const btn = document.querySelector('#addIsbn + button') || document.querySelector('[onclick="fetchAddIsbn()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Fetching…'; }
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`);
    const data = await res.json();
    const v = data[`ISBN:${isbn}`] || data[Object.keys(data)[0]];
    if (!v) { showToast('No book found for that ISBN'); return; }
    if (v.title) document.getElementById('addTitle').value = v.title;
    if (v.authors?.[0]?.name) document.getElementById('addAuthor').value = v.authors[0].name;
    if (v.publish_date) document.getElementById('addYear').value = v.publish_date.slice(-4);
    if (v.subjects?.[0]?.name) document.getElementById('addGenres').value = v.subjects[0].name;
    if (v.number_of_pages) document.getElementById('addPageCount').value = v.number_of_pages;
    let cover = v.cover?.large || v.cover?.medium || '';
    if (cover) {
      cover = cover.replace(/^http:/, 'https:');
      addCoverUrl = cover;
      const thumb = document.getElementById('addCoverThumb');
      if (thumb) thumb.innerHTML = `<img src="${escapeAttr(cover)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.remove()"/>`;
      const ready = document.getElementById('addCoverReadyMsg');
      if (ready) ready.style.display = 'flex';
    }
    showToast('Book details filled ✓');
  } catch { showToast('Fetch failed — check connection'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Fetch'; } }
}

async function fetchEditIsbn() {
  const isbn = document.getElementById('editIsbn')?.value.trim();
  if (!isbn) { showToast('Enter an ISBN first'); return; }
  const btn = document.querySelector('[onclick="fetchEditIsbn()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Fetching…'; }
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`);
    const data = await res.json();
    const v = data[`ISBN:${isbn}`] || data[Object.keys(data)[0]];
    if (!v) { showToast('No book found for that ISBN'); return; }
    if (v.title) document.getElementById('editTitle').value = v.title;
    if (v.authors?.[0]?.name) document.getElementById('editAuthor').value = v.authors[0].name;
    if (v.publish_date) document.getElementById('editYear').value = v.publish_date.slice(-4);
    if (v.subjects?.[0]?.name) document.getElementById('editGenres').value = v.subjects[0].name;
    if (v.number_of_pages) document.getElementById('editPageCount').value = v.number_of_pages;
    let cover = v.cover?.large || v.cover?.medium || '';
    if (cover) {
      cover = cover.replace(/^http:/, 'https:');
      editCoverUrl = cover;
      const thumb = document.getElementById('editCoverThumbWrap');
      if (thumb) thumb.innerHTML = `<img src="${escapeAttr(cover)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>`;
      const ready = document.getElementById('editCoverReadyMsg');
      if (ready) ready.style.display = 'flex';
    }
    showToast('Book details filled ✓');
  } catch { showToast('Fetch failed — check connection'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Fetch'; } }
}

// ── SHARED HELPERS ──
function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('visible');
  if (id === 'profileModal') {
    navPop(el, null);
    _updateAppRecede();
  }
  if (id === 'addModal') {
    const wasListAdd = addContext === 'list';
    resetAddModal();
    setAddContext('shelf');
    if (!wasListAdd) document.getElementById('floatingBar').style.display = '';
  }
  if (id === 'detailModal') closeStatusDropdown();
}
function handleOverlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}
function setPillStatus(ctx, status) {
  if (ctx === 'add') addStatus = status; else editStatus = status;
  // support both old pills and new segmented control
  const containerId = ctx === 'add' ? 'addPills' : 'editStatusSeg';
  document.querySelectorAll(`#${containerId} .pill, #${containerId} .ef-seg-btn`).forEach(p => {
    const val = p.dataset.status || p.dataset.seg;
    p.classList.toggle('active', val === status);
    p.classList.toggle('ef-seg-active', val === status);
  });
}
function handleCoverUpload(e, ctx) {
  const file = e.target.files[0]; if (!file) return;
  if (ctx === 'add') { addCoverFile = file; addCoverUrl = null; document.getElementById('addCoverUrlInput').value = ''; }
  else { editCoverFile = file; editCoverUrl = null; document.getElementById('editCoverUrlInput').value = ''; }
  const reader = new FileReader();
  reader.onload = ev => {
    const src = ev.target.result;
    const thumbId = ctx === 'add' ? 'addCoverThumb' : 'editCoverThumbWrap';
    const readyId = ctx === 'add' ? 'addCoverReadyMsg' : 'editCoverReadyMsg';
    const thumb = document.getElementById(thumbId);
    if (thumb) thumb.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>`;
    const ready = document.getElementById(readyId);
    if (ready) ready.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}
function updateDeskHeader() {
  const titleEl = document.getElementById('viewTitle');
  const countEl = document.getElementById('viewCount');
  if (!titleEl || !countEl) return;
  const visible = books.filter(b => !isHiddenFromShelf(b));
  const n = visible.filter(b => b.status === currentFilter).length;
  titleEl.textContent = currentFilter;
  countEl.textContent = `${n} ${n === 1 ? 'book' : 'books'}`;
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
  document.querySelectorAll('#deskShelfSub .sb-sub-item').forEach(el => el.classList.toggle('active', el.dataset.filter === filter));
  document.getElementById('deskNavShelf')?.classList.add('active');
  document.getElementById('deskNavLists')?.classList.remove('active');
  document.getElementById('deskNavAuthors')?.classList.remove('active');
  // Sync swipe dots
  document.querySelectorAll('.swipe-dot').forEach(d => d.classList.toggle('active', d.dataset.filter === filter));
  updateDeskHeader();
  renderGrid();
  updateHintBar();
  if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
}

function closeDesktopNavPanels() {
  ['listsOverlay', 'authorsListOverlay', 'genresListOverlay', 'profileModal'].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.remove('open', 'nav-behind');
  });
  _updateAppRecede();
}

function setDesktopNavActive(activeId) {
  ['deskNavShelf', 'deskNavLists', 'deskNavAuthors', 'deskNavGenres'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active', id === activeId);
  });
  if (activeId !== 'deskNavShelf') {
    document.querySelectorAll('#deskShelfSub .sb-sub-item').forEach(el => el.classList.remove('active'));
  }
}

function toggleDeskAccountPanel() {
  const panel = document.getElementById('deskAccountPanel');
  const pill = document.getElementById('deskProfilePill');
  if (!panel) return;
  const nowOpen = !panel.classList.contains('open');
  panel.classList.toggle('open', nowOpen);
  pill?.classList.toggle('active', nowOpen);
}

function initDesktopNav() {
  const bind = (id, handler) => {
    const node = document.getElementById(id);
    if (!node || node.dataset.bound === 'true') return;
    node.dataset.bound = 'true';
    node.addEventListener('click', handler);
  };

  bind('deskNavShelf', () => {
    closeDesktopNavPanels();
    setDesktopNavActive('deskNavShelf');
    renderGrid();
  });

  document.querySelectorAll('#deskShelfSub .sb-sub-item').forEach(item => {
    if (item.dataset.bound === 'true') return;
    item.dataset.bound = 'true';
    item.addEventListener('click', () => {
      closeDesktopNavPanels();
      setDesktopNavActive('deskNavShelf');
      setFilter(item.dataset.filter);
    });
  });

  bind('deskSortRow', e => openSortMenu(e.currentTarget));
  bind('deskNavLists', async () => {
    closeDesktopNavPanels();
    setDesktopNavActive('deskNavLists');
    if (typeof window.openListsOverlay === 'function') await window.openListsOverlay();
  });
  bind('deskNavAuthors', () => {
    closeDesktopNavPanels();
    setDesktopNavActive('deskNavAuthors');
    if (typeof openAuthorsOverlay === 'function') openAuthorsOverlay();
  });
  bind('deskNavGenres', () => {
    closeDesktopNavPanels();
    setDesktopNavActive('deskNavGenres');
    if (typeof openGenresOverlay === 'function') openGenresOverlay();
  });
  bind('deskSearchBar', openShelfSearch);
  bind('deskAddBtn', () => openBookSearch('shelf'));
  bind('deskProfilePill', () => {});
  bind('deskSettingsRow', () => showToast('Settings coming soon'));
  bind('deskLogoutBtn', signOut);
  bind('deskShareShelfRow', e => {
    e.stopPropagation();
    const pop = document.getElementById('deskSharePop');
    if (pop) pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', e => {
    const panel = document.getElementById('deskAccountPanel');
    if (!panel || !panel.classList.contains('open')) return;
    if (e.target.closest('#deskAccountPanel') || e.target.closest('#deskProfilePill')) return;
    panel.classList.remove('open');
    document.getElementById('deskProfilePill')?.classList.remove('active');
  });

  bind('deskShareBtn', e => {
    e.stopPropagation();
    const pop = document.getElementById('deskSharePop');
    if (pop) pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
  });
  bind('deskShareToggle', e => {
    e.stopPropagation();
    toggleShelfPublic();
  });
  bind('deskShareCopy', e => {
    e.stopPropagation();
    copyShelfLink();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDesktopNav);
} else {
  initDesktopNav();
}

// ── DESKTOP KEYBOARD SHORTCUTS (additive only — no existing functions modified) ──
(function () {
  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
  const isTypingTarget = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  const anyOverlayOpen = () => document.querySelector('.nav-panel.open, .modal-overlay.visible, .sbs-sheet.open');

  document.addEventListener('keydown', e => {
    if (!isDesktop()) return;

    // "/" or ⌘K / Ctrl+K → open shelf search
    const wantsSearch = e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k');
    if (wantsSearch) {
      if (isTypingTarget(document.activeElement)) return;
      if (anyOverlayOpen()) return;
      e.preventDefault();
      if (typeof openShelfSearch === 'function') openShelfSearch();
      return;
    }

    // Esc → close whatever desktop-only popup is open
    if (e.key === 'Escape') {
      const addPopup = document.getElementById('addPopup');
      const quickMenu = document.getElementById('quickMenu');
      const sortMenu = document.getElementById('sortMenu');
      if (addPopup && addPopup.classList.contains('open') && typeof closeAddPopup === 'function') closeAddPopup();
      if (quickMenu && quickMenu.classList.contains('visible') && typeof closeQuickMenu === 'function') closeQuickMenu();
      if (sortMenu && sortMenu.classList.contains('visible') && typeof closeSortMenu === 'function') closeSortMenu();
    }
  });
})();
function resetAddModal() {
  document.getElementById('addTitle').value = '';
  document.getElementById('addAuthor').value = '';
  document.getElementById('addTitle').style.borderColor = '';
  const addIsbn = document.getElementById('addIsbn'); if (addIsbn) addIsbn.value = '';
  const addYear = document.getElementById('addYear'); if (addYear) addYear.value = '';
  const addGenres = document.getElementById('addGenres'); if (addGenres) addGenres.value = '';
  const addThemes = document.getElementById('addThemes'); if (addThemes) addThemes.value = '';
  const addPageCount = document.getElementById('addPageCount'); if (addPageCount) addPageCount.value = '';
  addCoverFile = null; addCoverUrl = null;
  window._pendingDescription = null;
  addStatus = 'unread'; setPillStatus('add', 'unread');
  addOwnership = 'owned';
  const bfGroup = document.getElementById('borrowedFromGroup');
  if (bfGroup) bfGroup.style.display = 'none';
  const bfInput = document.getElementById('borrowedFromInput');
  if (bfInput) bfInput.value = '';
  const addBookBtn = document.getElementById('addBookBtn');
  if (addBookBtn) addBookBtn.textContent = addContext === 'list' ? 'Add to List' : 'Add to Shelf';
  const addThumb = document.getElementById('addCoverThumb');
  if (addThumb) addThumb.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
  const addReady = document.getElementById('addCoverReadyMsg');
  if (addReady) addReady.style.display = 'none';
  document.getElementById('addCoverUrlInput').value = '';
  document.getElementById('addBookBtn').disabled = false;
  document.getElementById('addBookBtn').textContent = 'Add to Shelf';
}
function handleCoverUrlPaste(e, ctx) {
  const url = e.target.value.trim(); if (!url) return;
  // Capture URL immediately — don't gate on img.onload (CORS/redirects can block it)
  if (ctx === 'add') { addCoverFile = null; addCoverUrl = url; }
  else { editCoverFile = null; editCoverUrl = url; }
  const img = new Image();
  img.onload = () => {
    if (ctx === 'add') { addCoverFile = null; addCoverUrl = url; }
    else { editCoverFile = null; editCoverUrl = url; }
    const thumbId = ctx === 'add' ? 'addCoverThumb' : 'editCoverThumbWrap';
    const readyId = ctx === 'add' ? 'addCoverReadyMsg' : 'editCoverReadyMsg';
    const thumb = document.getElementById(thumbId);
    if (thumb) thumb.innerHTML = `<img src="${escapeAttr(url)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>`;
    const ready = document.getElementById(readyId);
    if (ready) ready.style.display = 'flex';
  };
  img.src = url;
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function exportLibraryMarkdown() {
  const shelfBooks = books.filter(b => b.status !== 'not-owned');
  const rows = shelfBooks
    .map(b => ({ author: (b.author || 'Unknown').trim(), title: b.title || 'Untitled' }))
    .sort((a, b) => a.author.localeCompare(b.author) || a.title.localeCompare(b.title));

  const existing = document.getElementById('libraryTableModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'libraryTableModal';
  modal.className = 'modal-overlay visible';
  modal.innerHTML = `
    <div class="modal-sheet" style="max-width:520px;width:92%;max-height:80vh;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border)">
        <div style="font-weight:600;font-size:15px">My Library (${rows.length})</div>
        <button onclick="document.getElementById('libraryTableModal').remove()" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;line-height:1">&times;</button>
      </div>
      <div style="overflow-y:auto;padding:0 18px 18px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="position:sticky;top:0;background:var(--surface,#1a1814)">
              <th style="text-align:left;padding:10px 8px;border-bottom:1px solid var(--border);width:44px">Sl.No.</th>
              <th style="text-align:left;padding:10px 8px;border-bottom:1px solid var(--border)">Author Name</th>
              <th style="text-align:left;padding:10px 8px;border-bottom:1px solid var(--border)">Book Name</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td style="padding:8px;border-bottom:1px solid var(--border)">${i + 1}</td>
                <td style="padding:8px;border-bottom:1px solid var(--border)">${escapeHtml(r.author)}</td>
                <td style="padding:8px;border-bottom:1px solid var(--border)">${escapeHtml(r.title)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ── BOOK PEEK PREVIEW ──────────────────────────────────────────────────────
let _peekTimer = null;
let _peekActive = false;

function _ensurePeekPortal() {
  if (document.getElementById('bookPeekPortal')) return;
  const portal = document.createElement('div');
  portal.id = 'bookPeekPortal';
  portal.innerHTML = `
    <div id="bookPeekOverlay"></div>
    <div id="bookPeekCard">
      <div id="bookPeekCover"></div>
      <div id="bookPeekMeta">
        <div id="bookPeekTitle"></div>
        <div id="bookPeekAuthor"></div>
      </div>
    </div>`;
  document.body.appendChild(portal);
  document.getElementById('bookPeekPortal').addEventListener('pointerdown', closePeek);
}

function openPeek(bookId) {
  _ensurePeekPortal();
  const book = books.find(b => String(b.id) === String(bookId));
  if (!book) return;
  _peekActive = true;

  document.getElementById('bookPeekCover').innerHTML = book.cover_url
    ? `<img src="${escapeAttr(book.cover_url)}" alt="" draggable="false"/>`
    : makePlaceholder(book, 28);
  document.getElementById('bookPeekTitle').textContent = book.title || '';
  document.getElementById('bookPeekAuthor').textContent = book.author || '';

  const portal = document.getElementById('bookPeekPortal');
  portal.classList.add('peek-visible');

  if (navigator.vibrate) navigator.vibrate(18);
}

function closePeek() {
  if (!_peekActive) return;
  _peekActive = false;
  clearTimeout(_peekTimer);
  const portal = document.getElementById('bookPeekPortal');
  if (portal) portal.classList.remove('peek-visible');
}

// ── AI LIBRARIAN ──
const aiCache = new Map();

async function fetchAiLibrarian(title, author, storedDescription) {
  if (!title) return null;
  const cacheKey = `${title}-${author || ''}`;
  if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

  // Step 1: get description from Google Books if not already stored
  let description = storedDescription || '';
  if (!description) {
    try {
      const q = encodeURIComponent(`${title} ${author || ''}`.trim());
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=8&langRestrict=en`);
      if (res.ok) {
        const data = await res.json();
        for (const item of (data.items || [])) {
          const v = item.volumeInfo || {};
          const lang = v.language || '';
          const desc = v.description || '';
          const isEn = lang === 'en' || (lang === '' && isEnglishText(desc));
          if (desc.length >= 40 && isEn) { description = desc; break; }
        }
      }
    } catch { }
  }

  // Step 2: call Gemini with title + author + description
  const prompt = `You are an AI librarian. Given this book's information, respond ONLY with a valid JSON object (no markdown, no backticks) with exactly these keys:
- "ai_summary": a full, engaging 2-3 sentence summary of the book that makes someone want to read it
- "genre": the primary specific sub-genre or two (e.g. "Magical Realism", "Cyberpunk", "Historical Thriller"). NEVER use the words "Fiction" or "Novel" alone.
- "page_count": an estimated or known integer for the number of pages
- "mood": a single evocative word for the vibe (e.g. "melancholic", "electric", "propulsive")

Title: ${title}
Author: ${author || 'Unknown'}
Description: ${description || 'No description available.'}`;

  try {
    const session = (await sb.auth.getSession()).data.session;
    const res = await fetch(
      'https://rrnryszgvctxainqyuyr.supabase.co/functions/v1/gemini-proxy',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ prompt })
      }
    );
    if (!res.ok) {
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 15000));
        return fetchAiLibrarian(title, author, storedDescription);
      }
      return null;
    }
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    aiCache.set(cacheKey, parsed);
    return parsed;
  } catch { return null; }
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
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { }
  }

  const CONTEXTS = {
    main: {
      barId: 'mainAlphaBar',
      trackId: 'mainAlphaTrack',
      bubbleId: 'mainAlphaBubble',
      gridId: 'bookGrid',
      containerId: 'mainGridContainer',
      getSort: () => currentSort,
    },
    shelf: {
      barId: 'shelfAlphaBar',
      trackId: 'shelfAlphaTrack',
      bubbleId: 'shelfAlphaBubble',
      gridId: 'shelfGrid',
      containerId: 'shelfGridContainer',
      getSort: () => shelfSort,
    },
    public: {
      barId: 'publicAlphaBar',
      trackId: 'publicAlphaTrack',
      bubbleId: 'publicAlphaBubble',
      gridId: 'publicBookGrid',
      containerId: 'publicShelfContent',
      getSort: () => publicSort,
    },
    authors: {
      barId: 'authorsAlphaBar',
      trackId: 'authorsAlphaTrack',
      bubbleId: 'authorsAlphaBubble',
      gridId: 'alScroll',
      containerId: 'alScroll',
      getSort: () => alSort === 'az' ? 'author' : 'recent',
    },
  };

  const lastLetter = { main: null, shelf: null, public: null };
  const mouseState = { main: false, shelf: false, public: false };

  // ── Position the bar so it sits exactly over the grid area ──
  function positionBar(ctx) {
    const cfg = CONTEXTS[ctx];
    const bar = document.getElementById(cfg.barId);
    const container = document.getElementById(cfg.containerId);
    if (!bar || !container) return;
    const rect = container.getBoundingClientRect();
    bar.style.top = rect.top + 'px';
    bar.style.bottom = (window.innerHeight - rect.bottom) + 'px';
  }

  function getCards(ctx) {
    const grid = document.getElementById(CONTEXTS[ctx].gridId);
    if (!grid) return [];
    if (ctx === 'authors') return Array.from(grid.querySelectorAll('.al-author-row[data-author]'));
    return Array.from(grid.querySelectorAll('.book-card[data-id], .pub-book-card[data-id]'));
  }

  function getActiveLetters(ctx) {
    const sort = CONTEXTS[ctx].getSort();
    const field = sort === 'author' ? 'data-author' : 'data-title';
    const seen = new Set();
    getCards(ctx).forEach(card => seen.add(firstLetter(card.getAttribute(field) || '')));
    return seen;
  }

  function buildBar(ctx) {
    const cfg = CONTEXTS[ctx];
    const bar = document.getElementById(cfg.barId);
    const track = document.getElementById(cfg.trackId);
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
      el.className = 'alpha-letter' + (activeLetters.has(letter) ? '' : ' dim');
      el.textContent = letter;
      el.dataset.letter = letter;
      track.appendChild(el);
    });

    bar.classList.add('visible');
  }

  function hideBubble(ctx) {
    const cfg = CONTEXTS[ctx];
    const bubble = document.getElementById(cfg.bubbleId);
    const track = document.getElementById(cfg.trackId);
    if (bubble) bubble.classList.remove('show');
    if (track) track.querySelectorAll('.alpha-letter').forEach(el => el.classList.remove('active'));
    lastLetter[ctx] = null;
  }

  function activateLetter(ctx, letter, clientY) {
    if (!letter) return;
    const cfg = CONTEXTS[ctx];
    const track = document.getElementById(cfg.trackId);
    const bubble = document.getElementById(cfg.bubbleId);
    if (!track || !bubble) return;

    // Highlight active letter in strip
    track.querySelectorAll('.alpha-letter').forEach(el =>
      el.classList.toggle('active', el.dataset.letter === letter));

    // Position bubble — always uses viewport clientY since bubble is position:fixed
    const bubbleH = 52;
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
    const cfg = CONTEXTS[ctx];
    const sort = cfg.getSort();
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
        const cTop = container.getBoundingClientRect().top;
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
    const lastRect = all[all.length - 1].getBoundingClientRect();
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
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
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

  const _alphaBarTimers = {};
  window.alphaBarRefresh = function (ctx) {
    const key = ctx || 'all';
    clearTimeout(_alphaBarTimers[key]);
    _alphaBarTimers[key] = setTimeout(() => {
      if (ctx === 'main' || !ctx) buildBar('main');
      if (ctx === 'shelf' || !ctx) buildBar('shelf');
      if (ctx === 'public' || !ctx) buildBar('public');
      if (ctx === 'authors' || !ctx) buildBar('authors');
    }, 80);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const authorsOverlay = document.getElementById('authorsListOverlay');
    if (authorsOverlay) {
      const barEl = document.createElement('div');
      barEl.className = 'alpha-bar';
      barEl.id = 'authorsAlphaBar';
      barEl.innerHTML = '<div class="alpha-track" id="authorsAlphaTrack"></div>';
      authorsOverlay.appendChild(barEl);
      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'alpha-bubble';
      bubbleEl.id = 'authorsAlphaBubble';
      document.body.appendChild(bubbleEl);
    }
    setupTouchEvents('main');
    setupMouseEvents('main');
    setupTouchEvents('shelf');
    setupMouseEvents('shelf');
    setupTouchEvents('public');
    setupMouseEvents('public');
    setupTouchEvents('authors');
    setupMouseEvents('authors');

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
; (function () {
  const LO_EMOJIS = ['📚', '🔖', '⭐', '🌙', '🔥', '💭', '🌿', '🗺️', '🧠', '🎭', '🌊', '🏔️', '🎯', '✨', '🕯️'];
  const LO_PALETTES = [
    ['#4a3728', '#c9714a'], ['#1e2d3d', '#5a8fa8'], ['#2d3a2e', '#6a9a72'],
    ['#3a2040', '#9a6ac0'], ['#3d2a1e', '#c0814a'], ['#1e1e2d', '#6a72c0'],
    ['#2d1e1e', '#c06a6a'], ['#1e2d2a', '#6ac0b8'], ['#3a3020', '#b0963c'], ['#2a1e2d', '#a06ab8']
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
    const palIdx = (function (str) { let s = String(str || ''); let h = 0; for (let c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 10; })(book.id);
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
      ? list.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
      : (list.id || 0);
    return base.map((b, idx) => {
      const palIdx = b ? (function (s) { let st = String(s || ''); let h = 0; for (let c of st) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 10; })(b.id) : (listIdNum + idx) % 10;
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
      ? list.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
      : (list.id || 0);
    return base.map((b, idx) => {
      const palIdx = b
        ? (function (s) { let st = String(s || ''); let h = 0; for (let c of st) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 10; })(b.id)
        : (listIdNum + idx) % 10;
      if (b && b.cover_url) return `<div class="lo-thumb"><img src="${escapeAttr(b.cover_url)}" style="width:100%;height:100%;object-fit:cover"/></div>`;
      return loThumbHtml(palIdx);
    }).join('');
  }

  function timeSince(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
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
  window._ownedCache = _ownedCache;

  async function ldLoadOwned(listId) {
    const { data } = await sb.from('list_books').select('book_id').eq('list_id', listId).eq('owned', true);
    if (data) {
      _ownedCache[listId] = new Set(data.map(r => String(r.book_id)));
    } else {
      // fallback: localStorage
      try { _ownedCache[listId] = new Set(JSON.parse(localStorage.getItem('tsundoku_owned_' + listId) || '[]')); } catch { _ownedCache[listId] = new Set(); }
    }
  }
  function ldGetOwned(listId) {
    return _ownedCache[listId] ? Array.from(_ownedCache[listId]) : [];
  }
  window._ldGetOwned = ldGetOwned;
  function ldSetOwned(listId, arr) {
    _ownedCache[listId] = new Set(arr.map(String));
    // persist to localStorage as fallback
    try { localStorage.setItem('tsundoku_owned_' + listId, JSON.stringify(arr)); } catch { }
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
    if (nowOwned && book && book.status === 'not-owned') {
      const newStatus = (book.borrowed_from != null) ? 'read' : 'unread';
      book.status = newStatus;
      await sb.from('books').update({ status: newStatus }).eq('id', id);
    } else if (!nowOwned && book && book.status !== 'not-owned' && book.pages_read === 0) {
      book.status = 'not-owned';
      await sb.from('books').update({ status: 'not-owned' }).eq('id', id);
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
    navPush(document.getElementById('profileModal'), document.getElementById('listsOverlay'));
    await loLoadLists();
    updateListsCount();
    loRenderLists();
    loBuildEmojiRow();
  };
  window.closeListsOverlay = function () {
    navPop(document.getElementById('listsOverlay'), document.getElementById('profileModal'));
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
      <div class="lo-card" data-id="${list.id}" style="animation:loFadeIn 0.28s ease ${Math.min(i, 8) * 0.04}s both">
        <div class="lo-card-inner">
          <div class="lo-cover-stack">${loThumbStackFor(list)}</div>
          <div class="lo-card-info">
            <div class="lo-card-name">${escapeHtml(list.emoji || '')} ${escapeHtml(list.name)}</div>
            <div class="lo-card-meta">
              <span>${(list._books || []).length} ${(list._books || []).length === 1 ? 'book' : 'books'}</span>
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
          try { const hap = new (window.AudioContext || window.webkitAudioContext)(); const o = hap.createOscillator(); const g = hap.createGain(); o.connect(g); g.connect(hap.destination); o.frequency.value = 1200; g.gain.setValueAtTime(0.12, hap.currentTime); g.gain.exponentialRampToValueAtTime(0.001, hap.currentTime + 0.08); o.start(); o.stop(hap.currentTime + 0.08); } catch (e) { }
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
    const floatingBar = document.getElementById('floatingBar');
    if (floatingBar) floatingBar.style.display = 'none';
    ldCurrentSort = 'recent';
    ldasAddedIds = new Set();

    // 1. Instant Cache Render
    ldBooks = list._books || [];
    document.getElementById('ldHeroEmoji').textContent = list.emoji || '📚';
    const ldHeroName = document.getElementById('ldHeroName'); if (ldHeroName) ldHeroName.textContent = list.name;
    document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
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
    requestAnimationFrame(() => navPush(null, ld));

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
    navPop(document.getElementById('listDetailOverlay'), null);
    ldCloseAddSheet();
    const floatingBar = document.getElementById('floatingBar');
    if (floatingBar) floatingBar.style.display = '';
    setTimeout(() => { document.getElementById('ldProgressFill').style.width = '0%'; }, 350);
    loRenderLists();
  };

  window.ldAddBookToCurrentList = async function (book, owned = false) {
    if (!ldCurrentListId || !book?.id) return false;
    const { error } = await sb.from('list_books').insert({
      list_id: ldCurrentListId,
      book_id: book.id,
      owned
    });
    if (error) {
      showToast('Could not add to list');
      return false;
    }

    if (!ldBooks.some(b => String(b.id) === String(book.id))) {
      ldBooks.unshift(book);
    }
    const list = loLists.find(l => String(l.id) === String(ldCurrentListId));
    if (list) {
      list._books = ldBooks;
      list.updated_at = new Date().toISOString();
      document.getElementById('ldFanStack').innerHTML = fanCoversFor(list);
    }
    if (owned) {
      const ownedArr = ldGetOwned(ldCurrentListId);
      if (!ownedArr.includes(String(book.id))) {
        ownedArr.push(String(book.id));
        ldSetOwned(ldCurrentListId, ownedArr);
      }
    }
    document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
    ldUpdateProgress();
    ldRenderList();
    ldBuildAlphaBar();
    return true;
  };

  function ldUpdateProgress() {
    const ownedIds = ldGetOwned(ldCurrentListId);
    const total = ldBooks.length;
    const ownedCount = ldBooks.filter(b => ownedIds.includes(String(b.id))).length;
    const readCount = ldBooks.filter(b => {
      const shelfBook = books.find(sb => String(sb.id) === String(b.id));
      return shelfBook && shelfBook.status === 'read';
    }).length;
    const ownedPct = total ? Math.round(ownedCount / total * 100) : 0;
    const readPct  = total ? Math.round(readCount  / total * 100) : 0;
    const ownedLabel = document.getElementById('ldProgressLabel');
    const readLabel  = document.getElementById('ldProgressReadLabel');
    const pctLabel   = document.getElementById('ldProgressPct');
    const readPctLabel = document.getElementById('ldProgressReadPct');
    if (ownedLabel) ownedLabel.textContent = `${ownedCount} of ${total} owned`;
    if (readLabel)  readLabel.textContent  = `${readCount} of ${total} read`;
    if (pctLabel)   pctLabel.textContent   = `${ownedPct}%`;
    if (readPctLabel) readPctLabel.textContent = `${readPct}%`;
    setTimeout(() => {
      const ownedFill = document.getElementById('ldProgressFill');
      const readFill  = document.getElementById('ldProgressReadFill');
      if (ownedFill) ownedFill.style.width = ownedPct + '%';
      if (readFill)  readFill.style.width  = readPct + '%';
    }, 120);
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
  document.getElementById('ldViewToggleBtn').addEventListener('click', function (e) {
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
      if (ldCurrentSort === 'title') return (a.title || '').localeCompare(b.title || '');
      if (ldCurrentSort === 'author') {
        const cmp = (a.author || '').localeCompare(b.author || '');
        return cmp !== 0 ? cmp : (a.title || '').localeCompare(b.title || '');
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
        const palIdx = (function (str) { let s = String(str || ''); let h = 0; for (let c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 10; })(b.id);
        const p = loPal(palIdx);
        const coverInner = b.cover_url
          ? `<img src="${escapeAttr(b.cover_url)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none" draggable="false"/>`
          : `<div style="width:100%;height:100%;background:linear-gradient(160deg,${p[0]} 0%,${p[1]}55 100%);display:flex;align-items:center;justify-content:center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${p[1]}" opacity="0.5" stroke="${p[1]}" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none"/></svg>
            </div>`;
        return `<div class="ld-book-grid-card" data-id="${b.id}" data-title="${escapeAttr(b.title || '')}" data-author="${escapeAttr(b.author || '')}" style="animation:bookIn 0.3s ease ${Math.min(i, 12) * 0.035}s both">
          <div class="ld-book-grid-cover">
            ${coverInner}
            <div class="ld-grid-dot" style="background:${owned ? 'var(--green)' : 'var(--text-muted)'}"></div>
          </div>
          <div class="ld-book-grid-info">
            <div class="ld-book-grid-title">${escapeHtml(b.title)}</div>
            <div class="ld-book-grid-author">${escapeHtml(b.author || '')}</div>
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
        card.addEventListener('click', () => {
          if (!didLong) {
            openDetailModal(id);
          }
        });
      });
      return;
    }

    // List view
    scroll.innerHTML = filtered.map((b, i) => {
      const owned = ownedIds.includes(String(b.id));
      const ownedBadge = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:100px;font-size:10px;font-weight:500;background:${owned ? 'rgba(90,138,106,0.14)' : 'rgba(122,112,104,0.1)'};color:${owned ? 'var(--green)' : 'var(--text-muted)'}">
        <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>${owned ? 'Owned' : 'Not owned'}
      </span>`;
      return `<div class="ld-book-row" data-id="${b.id}" data-title="${escapeAttr(b.title || '')}" data-author="${escapeAttr(b.author || '')}" style="animation-delay:${Math.min(i, 10) * 0.042}s">
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
       row.addEventListener('click', () => {
        if (!didLong) {
          openDetailModal(id);
        }
      });
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
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
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

    const isOwned = ldIsOwned(ldCurrentListId, id);
    const shelfBook = books.find(b => String(b.id) === String(id) && b.status !== 'not-owned');

    // Build menu HTML dynamically based on ownership state
    const svgCheck = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    const svgEye   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const svgTrash = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
    const svgEdit  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const svgList  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
    const svgDot   = c => `<span class="qm-dot" style="background:${c}"></span>`;

    let items = '';

    if (!isOwned) {
      // Not owned state
      items = `
        <span class="qm-label">Not owned</span>
        <button class="qm-item" onclick="ldQMAction('mark-owned')">${svgCheck}Mark as owned</button>
        <button class="qm-item" onclick="ldQMAction('edit-list-book')">${svgEdit}Edit book</button>
        <div class="qm-sep"></div>
        <button class="qm-item delete-item" onclick="ldQMAction('remove')">${svgTrash}Remove from list</button>`;
    } else {
      // Owned / on shelf state
      items = `
        <span class="qm-label">Move to</span>
        <button class="qm-item${shelfBook?.status === 'reading' ? ' current-status' : ''}" onclick="ldQMAction('reading')">${svgDot('var(--accent)')}Reading</button>
        <button class="qm-item${shelfBook?.status === 'read' ? ' current-status' : ''}" onclick="ldQMAction('read')">${svgDot('var(--green)')}Read</button>
        <button class="qm-item${shelfBook?.status === 'unread' ? ' current-status' : ''}" onclick="ldQMAction('unread')">${svgDot('var(--text-muted)')}Unread</button>
        <div class="qm-sep"></div>
        <button class="qm-item" onclick="ldQMAction('edit')">${svgEdit}Edit details</button>
        <button class="qm-item" onclick="ldQMAction('add-to-list')">${svgList}Add to list</button>
        <div class="qm-sep"></div>
        <button class="qm-item delete-item" onclick="ldQMAction('remove')">${svgTrash}Remove from list</button>
        <button class="qm-item delete-item" onclick="ldQMAction('remove-from-shelf')">${svgTrash}Remove from shelf</button>`;
    }

    qm.innerHTML = items;

    // Position
    const menuEstHeight = isOwned ? 290 : 120;
    let top = rr.bottom - or.top + 2;
    if (top + menuEstHeight > or.height - 16) top = (rr.top - or.top) - menuEstHeight - 8;
    let left = rr.left - or.left;
    if (left + 160 > or.width - 8) left = or.width - 168;
    if (left < 8) left = 8;
    qm.style.top = top + 'px'; qm.style.left = left + 'px'; qm.style.right = 'auto';
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
    let book = ldBooks.find(b => String(b.id) === String(id));
    if (!book) {
      // Called from outside list context (e.g. author page)
      book = books.find(b => String(b.id) === String(id));
      if (!book) return;
      // Find which list this book belongs to and set context
      const allLists = window._getLoLists ? window._getLoLists() : [];
      const owningList = allLists.find(l => (l._books || []).some(b => String(b.id) === String(id)));
      if (owningList) ldCurrentListId = owningList.id;
    }
    lbdBookId = id;

    const coverEl = document.getElementById('lbdCoverEl');
    coverEl.innerHTML = book.cover_url
      ? `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`
      : makePlaceholder(book, 22);

    document.getElementById('lbdTitleEl').textContent = book.title;
    document.getElementById('lbdAuthorEl').textContent = book.author || '';

    const yearPub = document.getElementById('lbdYearPub');
    if (yearPub) yearPub.textContent = book.year || '';

    // Meta grid
    const pagesEl = document.getElementById('lbdPagesEl');
    const summaryEl = document.getElementById('lbdSummaryEl');
    if (pagesEl) pagesEl.textContent = book.page_count ? `${book.page_count} pages` : '—';
    if (summaryEl) summaryEl.textContent = book.description || '';
    const lbdGenresRow = document.getElementById('lbdGenresRow');
    const lbdGenresPills = document.getElementById('lbdGenresPills');
    const lbdGenresArr = Array.isArray(book.genres) && book.genres.length ? book.genres : (book.genre ? [book.genre] : []);
    if (lbdGenresRow && lbdGenresPills) {
      if (lbdGenresArr.length) { lbdGenresPills.innerHTML = lbdGenresArr.map(dsPillHtml).join(''); lbdGenresRow.style.display = 'block'; }
      else lbdGenresRow.style.display = 'none';
    }
    const lbdThemesRow = document.getElementById('lbdThemesRow');
    const lbdThemesPills = document.getElementById('lbdThemesPills');
    const lbdThemesArr = Array.isArray(book.themes) ? book.themes : [];
    if (lbdThemesRow && lbdThemesPills) {
      if (lbdThemesArr.length) { lbdThemesPills.innerHTML = lbdThemesArr.map(dsPillHtml).join(''); lbdThemesRow.style.display = 'block'; }
      else lbdThemesRow.style.display = 'none';
    }
    // Hide summary section if no content
    const sumSection = document.getElementById('lbdSummaryContent')?.parentElement;
    if (sumSection) sumSection.style.display = (book.description || lbdGenresArr.length) ? '' : 'none';

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
    const cta = document.getElementById('lbdCTAArea');
    const svgCheck = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    const svgTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;
    if (owned) {
      cta.innerHTML = `
        <button class="modal-btn" style="background:var(--surface2);border:1.5px solid var(--border);color:var(--text-dim);margin-bottom:0" onclick="lbdToggleOwned()">Mark as not owned</button>`;
    } else {
      cta.innerHTML = `
        <button class="modal-btn" style="background:#3d6b4a;border:none;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600" onclick="lbdToggleOwned()">${svgCheck} Mark as Owned</button>
        <button class="modal-btn" style="background:transparent;border:1.5px solid var(--border);color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:0" onclick="lbdDeleteFromList()">${svgTrash} Remove from List</button>`;
    }
  }

  window.lbdToggleOwned = async function lbdToggleOwned() {
    const nowOwned = await ldToggleOwned(ldCurrentListId, lbdBookId);
    lbdRefreshOwnedState();
    ldUpdateProgress();
    ldRenderList();
    showToast(nowOwned ? 'Marked as owned ✓' : 'Marked as not owned');
  }

  window.lbdDeleteFromList = async function lbdDeleteFromList() {
    const id = lbdBookId;
    closeListBookDetail();
    if (await ldRemoveBook(ldCurrentListId, id)) {
      ldBooks = ldBooks.filter(b => String(b.id) !== String(id));
      ldUpdateProgress();
      ldRenderList();
      ldBuildAlphaBar();
      document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
      showToast('Removed from list');
    }
  }

   window.closeListBookDetail = function closeListBookDetail() {
    document.getElementById('listBookDetailModal').classList.remove('visible');
    lbdBookId = null;
  };

  window.lbdEditBook = function lbdEditBook() {
    const id = lbdBookId;
    closeListBookDetail();
    setTimeout(() => openEditSheetForListBook(id), 80);
  };

  window.openEditSheetForListBook = function openEditSheetForListBook(id) {
    const book = ldBooks.find(b => String(b.id) === String(id)) || books.find(b => String(b.id) === String(id));
    if (!book) return;
    editingId = id;
    editStatus = book.status || 'unread';
    editCoverFile = null;
    editCoverUrl = null;

    const thumb = document.getElementById('editCoverThumbWrap');
    if (thumb) thumb.innerHTML = book.cover_url
      ? `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>`
      : makePlaceholder(book, 18);

    const ready = document.getElementById('editCoverReadyMsg');
    if (ready) ready.style.display = 'none';

    document.getElementById('editTitle').value = book.title || '';
    document.getElementById('editAuthor').value = book.author || '';
    const yr = document.getElementById('editYear'); if (yr) yr.value = book.year || '';
    const pc = document.getElementById('editPageCount'); if (pc) pc.value = book.page_count || '';
    const gn = document.getElementById('editGenres'); if (gn) gn.value = Array.isArray(book.genres) && book.genres.length ? book.genres.join(', ') : (book.genre || '');
    const th = document.getElementById('editThemes'); if (th) th.value = Array.isArray(book.themes) ? book.themes.join(', ') : '';
    const isn = document.getElementById('editIsbn'); if (isn) isn.value = '';

    const ratingSection = document.getElementById('editRatingSection');
    if (ratingSection) ratingSection.style.display = 'none';
    const starInput = document.getElementById('starRatingInput');
    if (starInput) starInput.style.display = 'none';

    // Hide status segment — not-owned books have no shelf status to change
    const statusSeg = document.getElementById('editStatusSeg');
    if (statusSeg) statusSeg.style.display = 'none';
    // Hide the Status section label too
    document.querySelectorAll('.es-section-label').forEach(el => {
      if (el.textContent.trim() === 'Status') el.style.display = 'none';
    });

    document.getElementById('editSheetOverlay').classList.add('visible');
    window._editingListBookMode = true;
  };

  window.ldQMAction = async function (action) {
    if (action === 'view') { ldCloseQM(); openListBookDetail(ldQMTargetId); return; }

    // Status moves (only for owned/shelf books)
    if (['reading','read','unread'].includes(action)) {
      const id = ldQMTargetId; ldCloseQM();
      const book = books.find(b => String(b.id) === String(id));
      if (!book) return;
      book.status = action;
      renderGrid();
      ldUpdateProgress();
      ldRenderList();
      await dbUpdate(id, { status: action });
      showToast(`Moved to ${action} ✓`);
      return;
    }

    if (action === 'mark-owned') {
      const id = ldQMTargetId; ldCloseQM();
      // Check if book already exists on shelf (total_pages === -1 means hidden)
      let book = books.find(b => String(b.id) === String(id));
      if (book && book.status === 'not-owned') {
        // Re-surface it — borrowed reads go to 'read', others go to 'unread'
        const newStatus = (book.borrowed_from != null) ? 'read' : 'unread';
        book.status = newStatus;
        await dbUpdate(id, { status: newStatus });
      } else if (!book) {
        // Shouldn't happen (list books are always DB records), but guard
        showToast('Book not found on shelf');
        return;
      }
      // Mark owned in list
      const ownedArr = ldGetOwned(ldCurrentListId);
      if (!ownedArr.includes(String(id))) {
        ownedArr.push(String(id));
        ldSetOwned(ldCurrentListId, ownedArr);
        await sb.from('list_books').update({ owned: true }).eq('list_id', ldCurrentListId).eq('book_id', id);
      }
      renderGrid();
      ldUpdateProgress();
      ldRenderList();
      showToast('Marked as owned — added to shelf ✓');
      return;
    }

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
      return;
    }

    if (action === 'remove-from-shelf') {
      const id = ldQMTargetId; ldCloseQM();
      await removeOrHideBook(id);
      // Revert owned state in this list
      const set = _ownedCache[ldCurrentListId] || new Set();
      set.delete(String(id));
      _ownedCache[ldCurrentListId] = set;
      ldSetOwned(ldCurrentListId, Array.from(set));
      await sb.from('list_books').update({ owned: false }).eq('list_id', ldCurrentListId).eq('book_id', id);
      ldUpdateProgress();
      ldRenderList();
      return;
    }

    if (action === 'edit') {
      const id = ldQMTargetId; ldCloseQM();
      openDetailModal(id);
      return;
    }

    if (action === 'add-to-list') {
      const id = ldQMTargetId; ldCloseQM();
      addToListFromMenu_forBook(id);
      return;
    }

    if (action === 'edit-list-book') {
      const id = ldQMTargetId; ldCloseQM();
      setTimeout(() => openEditSheetForListBook(id), 80);
      return;
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
          if (cover) cover = cover.replace(/^http:/, 'https:').replace('zoom=1', 'zoom=2').replace('&edge=curl', '');
          return { title: v.title || '', author: (v.authors || [])[0] || '', cover, fromShelf: false };
        }) : [];
      const seen = new Set(gBooks.map(b => (b.title + b.author).toLowerCase().replace(/\s/g, '')));
      const olBooks = olRes.status === 'fulfilled'
        ? (olRes.value.docs || []).filter(d => d.title).map(d => ({
          title: d.title, author: (d.author_name || [])[0] || '',
          cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
          fromShelf: false
        })).filter(b => { const k = (b.title + b.author).toLowerCase().replace(/\s/g, ''); if (seen.has(k)) return false; seen.add(k); return true; })
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
        const newBook = await dbAdd({ title, author, status: 'not-owned', cover_url: null, pages_read: 0, total_pages: null });
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
        ldRenderList();
        ldBuildAlphaBar();
        showToast('Added ✓');
      });
    });
  }

  function ldasRenderShelf(q) {
    const el = document.getElementById('ldasResults');
    let filtered = books.filter(b => b.status !== 'not-owned');
    const existingInList = new Set(ldBooks.map(b => String(b.id)));
    if (q) filtered = filtered.filter(b => (b.title || '').toLowerCase().includes(q.toLowerCase()) || (b.author || '').toLowerCase().includes(q.toLowerCase()));
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
          <div class="ldas-result-author">${escapeHtml(b.author || '')}</div>
          <div class="ldas-result-meta" style="color:${b.status === 'reading' ? 'var(--accent)' : b.status === 'read' ? 'var(--green)' : 'var(--text-muted)'}">${b.status}</div>
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
        await sb.from('list_books').update({ owned: true }).eq('list_id', ldCurrentListId).eq('book_id', bookId);
        btn.classList.add('added'); btn.textContent = '✓';
        ldUpdateProgress();
        document.getElementById('ldHeroCount').textContent = `${ldBooks.length} ${ldBooks.length === 1 ? 'book' : 'books'}`;
        ldRenderList();
        ldBuildAlphaBar();
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
      const newBook = await dbAdd({ title, author, status: 'not-owned', cover_url: null, pages_read: 0, total_pages: null });
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

// ── ADD BOOK POPUP ──
  function ldOpenAddPopup() {
    document.getElementById('ldAddPopup').classList.add('open');
  }
  function ldCloseAddPopup() {
    document.getElementById('ldAddPopup').classList.remove('open');
  }
  window.ldAddPopupSelect = function(tab) {
    ldCloseAddPopup();
    if (tab === 'search') {
      openBookSearch('list');
      return;
    }
    if (tab === 'manual') {
      openManualAdd('list');
      return;
    }
    // reset & open the sheet on the chosen tab
    ldasAddedIds = new Set();
    document.getElementById('ldasSearchInput').value = '';
    document.getElementById('ldasResults').innerHTML = '<div class="bs-state"><p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">Type to search books</p></div>';
    ldSwitchAddTab(tab);
    document.getElementById('ldAddSheet').classList.add('open');
    document.getElementById('ldAddSheetDim').classList.add('on');
    if (tab === 'search' || tab === 'shelf') {
      setTimeout(() => document.getElementById('ldasSearchInput').focus(), 340);
    }
  };

  // ── ADD BOOK BUTTON ──
  document.getElementById('ldAddBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    const popup = document.getElementById('ldAddPopup');
    if (popup.classList.contains('open')) {
      ldCloseAddPopup();
    } else {
      ldOpenAddPopup();
    }
  });

  // Close popup on outside tap
  document.getElementById('listDetailOverlay').addEventListener('click', function(e) {
    if (document.getElementById('ldAddPopup').classList.contains('open')) {
      if (!e.target.closest('#ldAddPopup') && !e.target.closest('#ldAddBtn')) {
        ldCloseAddPopup();
      }
    }
  });

  document.getElementById('ldAddSheetDim').addEventListener('click', ldCloseAddSheet);

})();
// ── END MY LISTS ────────────────────────────────────────────────────────────
// ── END A–Z SCROLLBAR ─────────────────────────────────────────────────────

// ── RESTORE EDIT SHEET STATE on close ─────────────────────────────────────
document.getElementById('editSheetOverlay').addEventListener('transitionend', function() {
  if (!this.classList.contains('visible') && window._editingListBookMode) {
    const statusSeg = document.getElementById('editStatusSeg');
    if (statusSeg) statusSeg.style.display = '';
    document.querySelectorAll('.es-section-label').forEach(el => {
      if (el.textContent.trim() === 'Status') el.style.display = '';
    });
    window._editingListBookMode = false;
  }
});

// ── FLOATING BAR — keyboard lift ──────────────────────────────────────────
  (function () {
  const bar = document.getElementById('floatingBar');
  if (!bar) return;
  const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  document.documentElement.classList.toggle('standalone-webapp', standalone);
  if (!window.visualViewport) return;
  const vv = window.visualViewport;

  function update() {
    const active = document.activeElement;
    const keyboardTarget = active && (
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable ||
      (active.tagName === 'INPUT' && !active.readOnly)
    );
    const kbHeight = Math.max(0, window.innerHeight - vv.height);
    if (keyboardTarget && kbHeight > 80) {
      bar.style.bottom = (kbHeight + 10) + 'px';
    } else {
      bar.style.bottom = '';
    }
  }

  vv.addEventListener('resize', update);
  window.addEventListener('focusin', update);
  window.addEventListener('focusout', () => setTimeout(update, 60));
  update();
})();

// ── SWIPE TAB NAVIGATION ──────────────────────────────────────────────────
const _SWIPE_FILTERS = ['reading', 'read', 'unread'];
let _swipeRendered = false;
let _swipeDirty = false; // set true whenever book data changes; cleared after pre-render
function _swipeStripSnapTo(filter, animate) {
  const strip = document.getElementById('swipeStrip');
  if (!strip) return;
  const idx = _SWIPE_FILTERS.indexOf(filter);
  if (idx < 0) return;
  const W = (document.getElementById('mainGridContainer') || document.body).offsetWidth;
  const x = -(idx * W);
  strip.style.transition = animate
    ? 'transform 320ms cubic-bezier(0.25,1,0.5,1)'
    : 'none';
  strip.style.transform = `translateX(${x}px)`;
}

function _swipePreRenderAll(force) {
  if (window.matchMedia('(min-width: 1024px)').matches) return;
  if (_swipeRendered && !_swipeDirty && !force) return; // nothing changed — skip, no blink
  window._swipeNoStagger = true;
  const strip = document.getElementById('swipeStrip');
  if (strip) strip.classList.add('no-anim');
  _SWIPE_FILTERS.forEach(f => {
    const pane = document.getElementById('pane-' + f);
    if (!pane) return;
    const grid = pane.querySelector('.book-grid');
    if (grid) _renderGridIntoEl(grid, f);
  });
  _swipeRendered = true;
  _swipeDirty = false;
  window._swipeNoStagger = false;
  if (strip) requestAnimationFrame(() => strip.classList.remove('no-anim'));
}

;(function () {
  const N            = 3;
  const SETTLE_MS    = 320;
  const SETTLE_EASE  = 'cubic-bezier(0.25,1,0.5,1)';
  const FLICK_VEL    = 0.3;   // px/ms
  const DRAG_PCT     = 0.22;  // fraction of W

  const isDesktop = () => window.innerWidth >= 1024;
  const container = document.getElementById('mainGridContainer');
  if (!container) return;

  let currentX  = 0;
  let W         = 0;
  let down      = false;
  let startClientX  = 0;
  let startClientY  = 0;
  let startPageX    = 0;
  let dirDecided    = false;
  let isHoriz       = false;
  let velHistory    = [];
  let _rafPending   = false;
  let _tabBtnsCache    = null;
  let _swipeDotsCache  = null;
  let _sbSubItemsCache = null;

  function _refreshSwipeNodeCache() {
    _tabBtnsCache    = document.querySelectorAll('.filter-tabs .tab-btn');
    _swipeDotsCache  = document.querySelectorAll('.swipe-dot');
    _sbSubItemsCache = document.querySelectorAll('#deskShelfSub .sb-sub-item');
  }

  function getW() { W = container.offsetWidth || window.innerWidth; }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function rubberBand(raw) {
    const minX = -(N - 1) * W;
    if (raw > 0)    return  Math.pow(raw,            0.68) * 0.35;
    if (raw < minX) return minX - Math.pow(-(raw - minX), 0.68) * 0.35;
    return raw;
  }

  function currentIdx() { return _SWIPE_FILTERS.indexOf(currentFilter); }

  function _flushSwipeVisuals() {
    _rafPending = false;
    const inkBar = document.querySelector('.tab-ink');
    if (!inkBar) return;
    const t = W > 0 ? (-currentX / W) : 0;
    inkBar.style.transform = `translateX(${t * 100}%)`;

    if (!_tabBtnsCache) _refreshSwipeNodeCache();

    _tabBtnsCache.forEach((el, i) => {
      const d = clamp(1 - Math.abs(t - i), 0, 1);
      el.classList.toggle('active', d > 0.5);
    });

    const near = Math.round(clamp(W > 0 ? -currentX / W : 0, 0, N - 1));
    _swipeDotsCache.forEach((el, i) => {
      el.classList.toggle('active', i === near);
    });
    _sbSubItemsCache.forEach(el => {
      el.classList.toggle('active', el.dataset.filter === _SWIPE_FILTERS[near]);
    });
  }

  function applyTranslate(x, animate) {
    const strip  = document.getElementById('swipeStrip');
    const inkBar = document.querySelector('.tab-ink');
    if (!strip) return;
    currentX = x;

    strip.style.transition  = animate ? `transform ${SETTLE_MS}ms ${SETTLE_EASE}` : 'none';
    strip.style.transform   = `translateX(${x}px)`;

    if (inkBar) {
      inkBar.style.transition = animate ? `transform ${SETTLE_MS}ms ${SETTLE_EASE}` : 'none';
      if (!_rafPending) {
        _rafPending = true;
        requestAnimationFrame(_flushSwipeVisuals);
      }
    }
  }

  function snapTo(i) {
    const idx = clamp(i, 0, N - 1);
    currentFilter = _SWIPE_FILTERS[idx];
    getW();
    applyTranslate(-idx * W, true);
    if (!_tabBtnsCache) _refreshSwipeNodeCache();
    _tabBtnsCache.forEach(b =>
      b.classList.toggle('active', b.dataset.filter === currentFilter));
    _swipeDotsCache.forEach(d =>
      d.classList.toggle('active', d.dataset.filter === currentFilter));
    _sbSubItemsCache.forEach(el =>
      el.classList.toggle('active', el.dataset.filter === currentFilter));
    updateHintBar();
    if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
    const ib = document.querySelector('.tab-ink');
    if (ib) setTimeout(() => { ib.style.willChange = ''; }, SETTLE_MS + 30);
  }

  // ── Pointer events (mouse + touch + stylus) ──
  container.addEventListener('pointerdown', e => {
    if (isDesktop()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Don't intercept taps on interactive children
    if (e.target.closest('button, a, input, .rc-edit-btn')) return;

    const anyOverlay = document.querySelector(
      '.nav-panel.open, .modal-overlay.visible, .sbs-sheet.open, .book-search-overlay.open'
    );
    if (anyOverlay) return;

    if (!_swipeRendered) _swipePreRenderAll();

    getW();
    _refreshSwipeNodeCache();
    strip_el().style.transition  = 'none';
    const ib = document.querySelector('.tab-ink');
    if (ib) { ib.style.transition = 'none'; ib.style.willChange = 'transform'; }

    down         = true;
    dirDecided   = false;
    isHoriz      = false;
    startClientX = e.clientX;
    startClientY = e.clientY;
    startPageX   = currentX;
    velHistory   = [{ x: e.clientX, t: performance.now() }];
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', e => {
    if (!down || isDesktop()) return;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;

    if (!dirDecided) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      dirDecided = true;
      isHoriz    = Math.abs(dx) > Math.abs(dy) * 1.1;
    }
    if (!isHoriz) return;

    e.preventDefault();
    velHistory.push({ x: e.clientX, t: performance.now() });
    if (velHistory.length > 12) velHistory.shift();

    applyTranslate(rubberBand(startPageX + dx), false);
  });

  function onRelease() {
    if (!down) return;
    down = false;
    if (!isHoriz) { snapTo(currentIdx()); return; }

    const dx  = currentX - startPageX;
    const pct = W > 0 ? dx / W : 0;

    let vel = 0;
    if (velHistory.length >= 2) {
      // Use only the most recent ~80ms of samples so a slow-then-flick
      // gesture isn't diluted by stale early-drag samples.
      const now = velHistory[velHistory.length - 1].t;
      const recent = velHistory.filter(s => now - s.t <= 80);
      const sample = recent.length >= 2 ? recent : velHistory;
      const a = sample[0], b = sample[sample.length - 1];
      const dt = b.t - a.t;
      if (dt > 4) vel = (b.x - a.x) / dt;
    }

    let target = currentIdx();
    if      (vel < -FLICK_VEL || pct < -DRAG_PCT) target = Math.min(target + 1, N - 1);
    else if (vel >  FLICK_VEL || pct >  DRAG_PCT) target = Math.max(target - 1, 0);

    snapTo(target);
    // Panes already hold correct data from the last renderGrid()/_swipePreRenderAll() pass —
    // do NOT force a re-render here, that's what caused the post-swipe blink.
  }

  container.addEventListener('pointerup',     onRelease);
  container.addEventListener('pointercancel', () => { down = false; snapTo(currentIdx()); });

  function strip_el() { return document.getElementById('swipeStrip') || { style: {} }; }

  // ── Resize: re-snap in px space ──
  window.addEventListener('resize', () => {
    if (isDesktop()) return;
    getW();
    const strip = document.getElementById('swipeStrip');
    if (strip) { strip.style.transition = 'none'; }
    const ib = document.querySelector('.tab-ink');
    if (ib) ib.style.transition = 'none';
    applyTranslate(-currentIdx() * W, false);
    if (typeof alphaBarRefresh === 'function') alphaBarRefresh('main');
  });

  // ── Init ──
  getW();
  applyTranslate(-currentIdx() * W, false);
})();
// ── END SWIPE TAB NAVIGATION ───────────────────────────────────────────────

// ─── DESKTOP DETAIL PANEL ──────────────────────────────────────────────────
;(function () {
  const isDesktopLayout = () => window.innerWidth >= 1024;
  let ddpSelectedId = null;

  // ── Hamburger (tablet) ──
  const hamburger = document.getElementById('deskHamburger');
  const backdrop  = document.getElementById('dsbBackdrop');
  const sidebar   = document.querySelector('.header');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('dsb-open');
    if (backdrop) backdrop.classList.add('open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('dsb-open');
    if (backdrop) backdrop.classList.remove('open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  }
  if (hamburger) {
    hamburger.addEventListener('click', () =>
      sidebar.classList.contains('dsb-open') ? closeSidebar() : openSidebar());
  }
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // ── Detail panel ──
  const panel   = document.getElementById('deskDetailPanel');
  const closeBtn = document.getElementById('ddpClose');
  const bookGrid = document.getElementById('bookGrid');

  function openDDP(book) {
    if (!panel || !isDesktopLayout()) return;
    ddpSelectedId = book.id;

    // Cover
    const coverEl = document.getElementById('ddpCover');
    coverEl.innerHTML = book.cover_url
      ? `<img src="${escapeAttr(book.cover_url)}" alt="">`
      : makePlaceholder(book, 22);

    document.getElementById('ddpTitle').textContent  = book.title || '—';
    document.getElementById('ddpAuthor').textContent = book.author || '—';
    document.getElementById('ddpYear').textContent   = [book.year, book.publisher].filter(Boolean).join(' · ') || '';

    // Badge
    const badgeMap = { reading: 'Reading', read: 'Read', unread: 'Unread', 'not-owned': 'Not owned' };
    document.getElementById('ddpBadgeLabel').textContent = badgeMap[book.status] || book.status;

    // Meta
    document.getElementById('ddpPages').textContent = book.page_count ? book.page_count + ' pg' : '—';
    const ddpGenresRow = document.getElementById('ddpGenresRow');
    const ddpGenresPills = document.getElementById('ddpGenresPills');
    const ddpGenresArr = Array.isArray(book.genres) && book.genres.length ? book.genres : (book.genre ? [book.genre] : []);
    if (ddpGenresRow && ddpGenresPills) {
      if (ddpGenresArr.length) { ddpGenresPills.innerHTML = ddpGenresArr.map(dsPillHtml).join(''); ddpGenresRow.style.display = 'block'; }
      else ddpGenresRow.style.display = 'none';
    }
    const ddpThemesRow = document.getElementById('ddpThemesRow');
    const ddpThemesPills = document.getElementById('ddpThemesPills');
    const ddpThemesArr = Array.isArray(book.themes) ? book.themes : [];
    if (ddpThemesRow && ddpThemesPills) {
      if (ddpThemesArr.length) { ddpThemesPills.innerHTML = ddpThemesArr.map(dsPillHtml).join(''); ddpThemesRow.style.display = 'block'; }
      else ddpThemesRow.style.display = 'none';
    }

    // Progress
    const pw = document.getElementById('ddpProgressWrap');
    if (book.status === 'reading' && book.total_pages > 0) {
      const pct = Math.round((book.pages_read || 0) / book.total_pages * 100);
      document.getElementById('ddpProgressPages').textContent = `${book.pages_read || 0} / ${book.total_pages} pages`;
      document.getElementById('ddpProgressPct').textContent   = pct + '%';
      document.getElementById('ddpBarFill').style.width = pct + '%';
      pw.style.display = '';
    } else {
      pw.style.display = 'none';
    }

    // Summary
    document.getElementById('ddpSummary').textContent = book.description || book.ai_summary || '—';

    // CTAs
    const primary   = document.getElementById('ddpPrimary');
    const secondary = document.getElementById('ddpSecondary');
    const statusNext = { reading: ['read', 'Mark as read'], unread: ['reading', 'Start reading'], read: ['reading', 'Re-read'] };
    const statusSec  = { reading: ['unread', 'Move to unread'], unread: ['read', 'Mark as read'], read: ['unread', 'Move to unread'] };
    const [pStatus, pLabel] = statusNext[book.status] || ['reading', 'Start reading'];
    const [sStatus, sLabel] = statusSec[book.status]  || ['unread', 'Move to unread'];
    primary.textContent   = pLabel;
    secondary.textContent = sLabel;
    primary.onclick = async () => { await ddpSetStatus(book.id, pStatus); };
    secondary.onclick = async () => { await ddpSetStatus(book.id, sStatus); };

    // Open
    panel.classList.add('ddp-open');
    if (bookGrid) bookGrid.classList.add('grid-narrow');
    document.querySelectorAll('.book-card').forEach(c => c.classList.remove('ddp-selected'));
    const card = bookGrid?.querySelector(`.book-card[data-id="${book.id}"]`);
    if (card) card.classList.add('ddp-selected');
  }

  function closeDDP() {
    if (!panel) return;
    panel.classList.remove('ddp-open');
    if (bookGrid) bookGrid.classList.remove('grid-narrow');
    document.querySelectorAll('.book-card').forEach(c => c.classList.remove('ddp-selected'));
    ddpSelectedId = null;
  }

  async function ddpSetStatus(id, status) {
    const book = books.find(b => String(b.id) === String(id));
    if (!book) return;
    book.status = status;
    renderGrid();
    await dbUpdate(id, { status });
    showToast('Status updated ✓');
    // refresh panel CTAs
    openDDP(book);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeDDP);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDDP(); closeSidebar(); }
  });

  // ── Desktop clicks — event delegation (survives every renderGrid call) ──
  bookGrid?.addEventListener('click', e => {
    if (!isDesktopLayout()) return;
    const card = e.target.closest('.book-card');
    if (!card) return;
    e.stopPropagation();
    const book = books.find(b => String(b.id) === String(card.dataset.id));
    if (book) openDDP(book);
  }, true);

  bookGrid?.addEventListener('contextmenu', e => {
    if (!isDesktopLayout()) return;
    e.preventDefault();
    const card = e.target.closest('.book-card');
    if (!card) return;
    openQuickMenu(card.dataset.id, card);
  });

  // ── Redirect openDetailModal → DDP on desktop (deferred until detail_sheet.js loads) ──
  window.addEventListener('load', () => {
    const _orig = window.openDetailModal;
    window.openDetailModal = function(id) {
      if (isDesktopLayout()) {
        const book = books.find(b => String(b.id) === String(id));
        if (book) { openDDP(book); return; }
      }
      if (_orig) _orig.call(this, id);
    };
  });

// ── Resize: clean up if viewport drops below 768px ──
  window.addEventListener('resize', () => {
    if (!isDesktopLayout()) { closeDDP(); closeSidebar(); }
    if (currentFilter === 'reading') renderGrid();
  });
})();

// ── LUCKY ENVELOPE — random unread book picker ──────────────────────────
;(function () {
  let currentPick = null;

  function getUnreadBooks() {
    return books.filter(b => b.status === 'unread' && !isHiddenFromShelf(b));
  }

  window.updateEnvelopeVisibility = function updateEnvelopeVisibility() {
    const btn = document.getElementById('envelopeTriggerBtn');
    if (!btn) return;
    const show = currentFilter === 'unread' && getUnreadBooks().length > 0;
    btn.style.display = show ? 'flex' : 'none';
  };

  function pickRandomUnread() {
    const pool = getUnreadBooks();
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function leCoverHtml(book) {
    return book.cover_url
      ? `<img src="${escapeAttr(book.cover_url)}" style="width:100%;height:100%;object-fit:cover;display:block"/>`
      : makePlaceholder(book, 22);
  }

  window.openLuckyEnvelope = function openLuckyEnvelope() {
    currentPick = pickRandomUnread();
    if (!currentPick) { showToast('No unread books to pick from'); return; }

    const modal = document.getElementById('luckyEnvelopeModal');
    const envWrap = document.getElementById('leEnvelopeWrap');
    const flap = document.getElementById('leFlap');
    const peek = document.getElementById('lePeekCover');
    const revealCard = document.getElementById('leRevealCard');
    const revealCoverBtn = document.getElementById('leRevealCoverBtn');

    envWrap.style.display = 'block';
    envWrap.classList.remove('fade-out');
    flap.classList.remove('open');
    peek.classList.remove('rise');
    peek.style.position = ''; peek.style.left = ''; peek.style.top = '';
    peek.style.width = ''; peek.style.height = ''; peek.style.transform = '';
    peek.style.opacity = ''; peek.style.transition = ''; peek.style.zIndex = '';
    peek.style.display = ''; peek.style.margin = ''; peek.style.borderRadius = '';
    revealCard.classList.remove('show', 'textin');
    revealCoverBtn.classList.remove('landed');
    if (peek.parentElement !== envWrap) envWrap.appendChild(peek);

    modal.classList.add('visible');

    requestAnimationFrame(() => {
      setTimeout(() => {
        flap.classList.add('open');
        peek.innerHTML = leCoverHtml(currentPick);
        setTimeout(() => { peek.classList.add('rise'); }, 150);
        setTimeout(() => { leFlyToRevealSlot(); }, 1550);
      }, 100);
    });
  };

  function leFlyToRevealSlot() {
    const envWrap = document.getElementById('leEnvelopeWrap');
    const peek = document.getElementById('lePeekCover');
    const revealCard = document.getElementById('leRevealCard');
    const revealCoverBtn = document.getElementById('leRevealCoverBtn');
    const revealImg = document.getElementById('leRevealCoverImg');
    const revealTitle = document.getElementById('leRevealTitle');
    const revealAuthor = document.getElementById('leRevealAuthor');

    revealTitle.textContent = currentPick.title;
    revealAuthor.textContent = currentPick.author || '';
    revealCard.classList.add('show');

    const startRect = peek.getBoundingClientRect();
    const targetRect = revealCoverBtn.getBoundingClientRect();

    document.body.appendChild(peek);
    peek.style.position = 'fixed';
    peek.style.margin = '0';
    peek.style.transform = 'none';
    peek.style.opacity = '1';
    peek.style.left = startRect.left + 'px';
    peek.style.top = startRect.top + 'px';
    peek.style.width = startRect.width + 'px';
    peek.style.height = startRect.height + 'px';
    peek.style.zIndex = '999';
    peek.style.transition = 'none';
    peek.offsetHeight;

    envWrap.classList.add('fade-out');

    requestAnimationFrame(() => {
      peek.style.transition =
        'left .55s cubic-bezier(.3,.9,.3,1), top .55s cubic-bezier(.3,.9,.3,1), ' +
        'width .55s cubic-bezier(.3,.9,.3,1), height .55s cubic-bezier(.3,.9,.3,1), ' +
        'border-radius .55s ease';
      peek.style.left = targetRect.left + 'px';
      peek.style.top = targetRect.top + 'px';
      peek.style.width = targetRect.width + 'px';
      peek.style.height = targetRect.height + 'px';
      peek.style.borderRadius = '8px';

      setTimeout(() => {
        revealImg.innerHTML = leCoverHtml(currentPick);
        revealCoverBtn.classList.add('landed');
        peek.style.display = 'none';
        revealCard.classList.add('textin');
        envWrap.style.display = 'none';
      }, 570);
    });
  }

  window.leShuffleAgain = function leShuffleAgain() {
    const next = pickRandomUnread();
    if (!next) { showToast('No unread books to pick from'); return; }
    currentPick = next;
    const revealCoverBtn = document.getElementById('leRevealCoverBtn');
    const revealImg = document.getElementById('leRevealCoverImg');
    const revealTitle = document.getElementById('leRevealTitle');
    const revealAuthor = document.getElementById('leRevealAuthor');
    const revealCard = document.getElementById('leRevealCard');

    revealCoverBtn.classList.remove('landed');
    revealCard.classList.remove('textin');
    setTimeout(() => {
      revealImg.innerHTML = leCoverHtml(currentPick);
      revealTitle.textContent = currentPick.title;
      revealAuthor.textContent = currentPick.author || '';
      revealCoverBtn.classList.add('landed');
      revealCard.classList.add('textin');
    }, 160);
  };

  window.leStartReading = async function leStartReading() {
    if (!currentPick) return;
    const id = currentPick.id;
    closeModal('luckyEnvelopeModal');
    const book = books.find(b => String(b.id) === String(id));
    if (!book) return;
    book.status = 'reading';
    renderGrid();
    await dbUpdate(id, { status: 'reading' });
    showToast(`moved "${book.title}" to reading ✓`);
  };

  // Wrap renderGrid additively — keeps envelope visibility synced with
  // unread count / active tab without touching the original function body.
  window.addEventListener('load', () => {
    const _origRenderGrid = window.renderGrid;
    if (typeof _origRenderGrid === 'function') {
      window.renderGrid = function () {
        _origRenderGrid.apply(this, arguments);
        updateEnvelopeVisibility();
      };
    }
  });
})();
