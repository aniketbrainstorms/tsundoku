const AUTHOR_EXAMPLES = {
  'haruki murakami': {
    name: 'Haruki Murakami',
    image: 'https://covers.openlibrary.org/a/olid/OL382524A-L.jpg',
    intro: 'Haruki Murakami writes dreamlike novels where lonely city life, music, memory, cats, wells, and parallel worlds quietly fold into one another. His bibliography moves from spare early fiction into large, labyrinthine novels without losing the intimate pulse of a person trying to understand what has disappeared.',
    quote: 'If you only read the books that everyone else is reading, you can only think what everyone else is thinking.',
    works: [
      { title: 'Hear the Wind Sing', year: '1979' },
      { title: 'Pinball, 1973', year: '1980' },
      { title: 'A Wild Sheep Chase', year: '1982' },
      { title: 'Hard-Boiled Wonderland and the End of the World', year: '1985' },
      { title: 'Norwegian Wood', year: '1987' },
      { title: 'Dance Dance Dance', year: '1988' },
      { title: 'South of the Border, West of the Sun', year: '1992' },
      { title: 'The Wind-Up Bird Chronicle', year: '1994' },
      { title: 'Sputnik Sweetheart', year: '1999' },
      { title: 'Kafka on the Shore', year: '2002' },
      { title: 'After Dark', year: '2004' },
      { title: '1Q84', year: '2009' },
      { title: 'Colorless Tsukuru Tazaki and His Years of Pilgrimage', year: '2013' },
      { title: 'Killing Commendatore', year: '2017' },
      { title: 'The City and Its Uncertain Walls', year: '2023' }
    ]
  }
};

let _authorCache = {};
let _activeAuthorName = '';
let _authorRows = [];
let _authorFilter = 'all';
let _authorCallerEl = null;

function normalizeAuthorText(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeBookTitle(str) {
  return (str || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '').trim();
}

function titleTokens(str) {
  const stop = new Set(['the','a','an','and','or','of','to','in','on','for','with','by','volume','vol','book','novel','stories','story','collection','edition']);
  return normalizeAuthorText(str).split(' ').filter(t => t && !stop.has(t));
}

function titlesLikelySame(a, b) {
  const ak = normalizeBookTitle(a);
  const bk = normalizeBookTitle(b);
  if (!ak || !bk) return false;
  if (ak === bk) return true;
  if (ak.length >= 12 && bk.length >= 12 && (ak.includes(bk) || bk.includes(ak))) return true;

  const aTokens = titleTokens(a);
  const bTokens = titleTokens(b);
  if (!aTokens.length || !bTokens.length) return false;
  const aSet = new Set(aTokens);
  const shared = bTokens.filter(t => aSet.has(t)).length;
  const overlap = shared / Math.min(aTokens.length, bTokens.length);
  return shared >= 2 && overlap >= 0.72;
}

function authorInitials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
}

function getLocalAuthorBooks(authorName) {
  const key = normalizeAuthorText(authorName);
  return books.filter(b => normalizeAuthorText(b.author) === key);
}

function authorFallback(authorName) {
  const key = normalizeAuthorText(authorName);
  return AUTHOR_EXAMPLES[key] || {
    name: authorName,
    image: '',
    intro: `${authorName} appears in your shelf. Add or discover more books to build a fuller author timeline here.`,
    works: []
  };
}

// NEW
async function fetchAuthorProfile(authorName) {
  const cacheKey = normalizeAuthorText(authorName);
  if (_authorCache[cacheKey]) return _authorCache[cacheKey];

  // 1. Try Supabase first
  try {
    const { data } = await sb.from('authors').select('*').eq('name_key', cacheKey).maybeSingle();
    if (data) {
      const profile = { name: data.name, image: data.image || '', intro: '', quote: '', works: [] };
      _authorCache[cacheKey] = profile;
      return profile;
    }
  } catch {}

  // 2. Fetch from Open Library
  const fallback = authorFallback(authorName);
  const profile = {
    name: fallback.name || authorName,
    image: fallback.image || '',
    intro: fallback.intro || '',
    quote: fallback.quote || '',
    works: [...(fallback.works || [])]
  };

  // 1. Wikipedia — search for page title, then fetch photo directly
  let wikiCandidate = null;
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
          wikiCandidate = page?.thumbnail?.source || null;
        }
      }
    }
  } catch {}
  const candidate = wikiCandidate;
  if (candidate) {
    const valid = await new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 10);
      img.onerror = () => resolve(false);
      img.src = candidate;
    });
    if (valid) profile.image = candidate;
  }

  // 2. Fallback to Open Library if Wikipedia had nothing
  if (!profile.image) {
    try {
      const searchRes = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const doc = (searchData.docs || []).find(a => {
          const docName = normalizeAuthorText(a.name);
          return docName === cacheKey || docName.includes(cacheKey) || cacheKey.includes(docName);
        }) || (searchData.docs || [])[0];
        if (doc?.key) {
          profile.name = fallback.name || doc.name || profile.name;
          const olid = doc.key.replace('/authors/', '');
          const candidate = `https://covers.openlibrary.org/a/olid/${olid}-L.jpg`;
          const valid = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth > 10);
            img.onerror = () => resolve(false);
            img.src = candidate;
          });
          if (valid) profile.image = candidate;
        }
      }
    } catch {}
  }

  // 3. Save to Supabase (fire and forget)
  if (currentUser) {
    sb.from('authors').upsert({
      name_key: cacheKey,
      name: profile.name,
      image: profile.image,
      user_id: currentUser.id
    }, { onConflict: 'name_key' }).then(() => {});
  }

  _authorCache[cacheKey] = profile;
  return profile;
}

function buildAuthorRows(authorName) {
  const local = getLocalAuthorBooks(authorName);
  return local.map(book => {
    const notOwned = book.status === 'not-owned';
    return {
      title: book.title || 'Untitled',
      year: book.year || '',
      cover: book.cover_url || '',
      description: book.description || '',
      genre: cleanGenre(book.genre || 'Novel'),
      owned: !notOwned,
      status: notOwned ? 'not-owned' : (book.status || 'unread'),
      bookId: book.id,
      source: 'local'
    };
  });
}

function getVisibleAuthorRows() {
  let rows = [..._authorRows];
  if (_authorFilter === 'wishlist') {
    rows = rows.filter(row => row.status === 'not-owned');
  } else if (_authorFilter !== 'all') {
    rows = rows.filter(row => row.status === _authorFilter);
  }
  rows.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  return rows;
}

function renderAuthorPhoto(profile) {
  const el = document.getElementById('authorPhotoWrap');
  if (!el) return;
  const initials = authorInitials(profile.name);
  if (!profile.image) {
    el.innerHTML = `<div class="author-photo-fallback">${escapeHtml(initials)}</div>`;
    return;
  }
  el.innerHTML = `<img src="${escapeAttr(profile.image)}" alt="" onerror="this.parentElement.innerHTML='<div class=&quot;author-photo-fallback&quot;>${escapeAttr(initials)}</div>'">`;
}

function renderAuthorRows(rows) {
  const timeline = document.getElementById('authorTimeline');
  const state = document.getElementById('authorState');
  if (!timeline || !state) return;

  if (!rows.length) {
    state.textContent = 'No books found yet.';
    timeline.innerHTML = '';
    return;
  }

  state.textContent = '';
  timeline.innerHTML = rows.map((row, i) => {
    const statusClass = row.status === 'not-owned' ? 'not-owned' : (row.status || 'unread');
    const statusText = row.status === 'not-owned' ? 'Not Owned' : (STATUS_LABELS[row.status] || 'Unread');
    const cover = row.cover
      ? `<img src="${escapeAttr(row.cover)}" alt="" onerror="this.parentElement.innerHTML=''">`
      : makePlaceholder({ id: row.title }, 16);
    return `<div class="author-book-row" data-author-book="${escapeAttr(row.bookId || '')}" style="animation-delay:${Math.min(i,12)*0.025}s">
      <div class="author-book-cover">${cover}</div>
      <div class="author-book-info">
        <div class="author-book-title">${escapeHtml(row.title)}</div>
        <div class="author-book-meta">
          <span>${escapeHtml(row.year || 'Year unknown')}</span>
          <span class="author-book-dot"></span>
          <span>${escapeHtml(row.genre || 'Novel')}</span>
        </div>
        <p class="author-book-desc">${escapeHtml(row.description || (row.status === 'not-owned' ? 'On your wishlist.' : 'Saved in your library.'))}</p>
      </div>
      <span class="author-status-pill ${statusClass}">${statusText}</span>
    </div>`;
  }).join('');

  timeline.querySelectorAll('[data-author-book]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.authorBook;
      if (!id) return;
      const book = books.find(b => String(b.id) === String(id));
      const isNotOwned = book && book.status === 'not-owned';
      DS._callerRestore = () => openAuthorPage(_activeAuthorName);
      closeAuthorPage();
      setTimeout(() => {
        openDetailModal(id);
      }, 220);
    });
  });
}

function hydrateAuthorHeader(profile, rows) {
  document.getElementById('authorName').textContent = profile.name;
  document.getElementById('authorBooksTitle').textContent = `In Your Library`;
  const ownedRows = rows.filter(r => r.status !== 'not-owned');
  const countText = ownedRows.length === 1 ? `1 book in your library` : `${ownedRows.length} books in your library`;
  document.getElementById('authorLibraryCount').textContent = countText;
  const quoteCard = document.getElementById('authorQuoteCard');
  const quoteText = document.getElementById('authorQuoteText');
  const quoteByline = document.getElementById('authorQuoteByline');
  const quote = profile.quote || authorFallback(profile.name).quote || '';
  if (quoteCard && quoteText && quoteByline) {
    quoteCard.style.display = quote ? 'block' : 'none';
    quoteText.textContent = quote;
    quoteByline.textContent = quote ? `- ${profile.name}` : '';
  }
  renderAuthorPhoto(profile);
}

async function openAuthorPage(authorName, callerEl) {
  if (!authorName || !authorName.trim()) return;
  const rows = buildAuthorRows(authorName);
  if (!rows.length) return;
  _activeAuthorName = authorName;
  _authorCallerEl = callerEl || null;
  const overlay = document.getElementById('authorOverlay');
  const scroll = document.getElementById('authorScroll');
  const fallback = authorFallback(authorName);
  const initialRows = buildAuthorRows(authorName);
  _authorRows = initialRows;
  _authorFilter = 'all';
  updateAuthorControls();

  if (scroll) scroll.scrollTop = 0;
  navPush(_authorCallerEl, overlay);
  hydrateAuthorHeader(fallback, initialRows);
  renderAuthorRows(getVisibleAuthorRows());
  document.getElementById('authorState').textContent = '';

  const profile = await fetchAuthorProfile(authorName);
  if (normalizeAuthorText(_activeAuthorName) !== normalizeAuthorText(authorName)) return;
  const freshRows = buildAuthorRows(authorName);
  _authorRows = freshRows;
  hydrateAuthorHeader(profile, freshRows);
  renderAuthorRows(getVisibleAuthorRows());
}

function openAuthorPageFromDetail() {
  const book = books.find(b => String(b.id) === String(editingId));
  const authorName = book?.author || document.getElementById('detailAuthorEl')?.textContent || '';
  const trimmed = authorName.trim();
  if (!trimmed) return;
  if (typeof dsClose === 'function') dsClose();
  else closeModal('detailModal');
  setTimeout(() => openAuthorPage(trimmed), 220);
}

function closeAuthorPage() {
  const overlay = document.getElementById('authorOverlay');
  navPop(overlay, _authorCallerEl);
  _authorCallerEl = null;
  window._authorOpenedFromList = false;
}
function updateAuthorControls() {
  document.querySelectorAll('[data-author-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.authorFilter === _authorFilter);
  });
}

function setAuthorFilter(filter) {
  _authorFilter = filter;
  updateAuthorControls();
  renderAuthorRows(getVisibleAuthorRows());
}

document.querySelectorAll('[data-author-filter]').forEach(btn => {
  btn.addEventListener('click', () => setAuthorFilter(btn.dataset.authorFilter));
});

// ── AUTHOR PHOTO EDIT MODAL ──────────────────────────────────────────────
function openAuthorPhotoModal() {
  const authorName = _activeAuthorName;
  if (!authorName) return;
  const cacheKey = normalizeAuthorText(authorName);
  const currentProfile = _authorCache[cacheKey] || { name: authorName, image: '' };

  const modal = document.getElementById('authorPhotoModal');
  if (!modal) return;

  // Populate preview
  const preview = document.getElementById('apModalPreview');
  const initials = authorInitials(currentProfile.name);
  preview.innerHTML = currentProfile.image
    ? `<img src="${escapeAttr(currentProfile.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML='<span style=font-size:28px;font-weight:700;color:var(--accent)>${escapeAttr(initials)}</span>'">`
    : `<span style="font-size:28px;font-weight:700;color:var(--accent)">${escapeAttr(initials)}</span>`;

  // Set author name label
  const nameEl = document.getElementById('apModalAuthorName');
  if (nameEl) nameEl.textContent = `Change photo for ${currentProfile.name}`;

  // Clear URL input
  const urlInput = document.getElementById('apUrlInput');
  if (urlInput) urlInput.value = currentProfile.image || '';

  // Reset status
  _apSetStatus('');

  // Sync small preview card
  const previewCard = document.getElementById('apPreviewCard');
  if (previewCard) previewCard.innerHTML = preview.innerHTML;

  modal.classList.add('visible');
}

function closeAuthorPhotoModal() {
  const modal = document.getElementById('authorPhotoModal');
  if (modal) modal.classList.remove('visible');
  document.getElementById('apUrlInput').value = '';
  _apSetStatus('');
}

function _apSetStatus(msg, isError) {
  const el = document.getElementById('apStatusMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#c06060' : 'var(--green)';
  el.style.display = msg ? 'flex' : 'none';
}

async function apSaveUrl() {
  const authorName = _activeAuthorName;
  if (!authorName) return;
  const cacheKey = normalizeAuthorText(authorName);
  const currentProfile = _authorCache[cacheKey] || { name: authorName, image: '' };
  const url = (document.getElementById('apUrlInput').value || '').trim();

  const btn = document.getElementById('apSaveUrlBtn');
  btn.disabled = true; btn.textContent = 'Validating…';
  _apSetStatus('');

  if (!url) {
    // Clear photo
    currentProfile.image = '';
    _authorCache[cacheKey] = currentProfile;
    if (currentUser) {
      try { await sb.from('authors').upsert({ name_key: cacheKey, name: currentProfile.name, image: '', user_id: currentUser.id }, { onConflict: 'name_key' }); } catch {}
    }
    const rows = buildAuthorRows(authorName);
    hydrateAuthorHeader(currentProfile, rows);
    btn.disabled = false; btn.textContent = 'Set URL';
    closeAuthorPhotoModal();
    showToast('Photo removed');
    return;
  }

  const valid = await new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 10);
    img.onerror = () => resolve(false);
    img.src = url;
  });

  if (!valid) {
    _apSetStatus('Could not load that image URL.', true);
    btn.disabled = false; btn.textContent = 'Set URL';
    return;
  }

  currentProfile.image = url;
  _authorCache[cacheKey] = currentProfile;
  if (currentUser) {
    try { await sb.from('authors').upsert({ name_key: cacheKey, name: currentProfile.name, image: url, user_id: currentUser.id }, { onConflict: 'name_key' }); } catch {}
  }

  // Refresh both previews inside modal
  const preview = document.getElementById('apModalPreview');
  const previewCard = document.getElementById('apPreviewCard');
  const initials = authorInitials(currentProfile.name);
  const imgHtml = `<img src="${escapeAttr(url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML='<span style=font-size:28px;font-weight:700;color:var(--accent)>${escapeAttr(initials)}</span>'">`;
  if (preview) preview.innerHTML = imgHtml;
  if (previewCard) previewCard.innerHTML = imgHtml;

  _apSetStatus('Photo ready — image will update when you save');
  btn.disabled = false; btn.textContent = 'Set URL';

  const rows = buildAuthorRows(authorName);
  hydrateAuthorHeader(currentProfile, rows);
  _refreshAuthorListAvatar(cacheKey, url, authorName);
}

async function apUploadFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const authorName = _activeAuthorName;
  if (!authorName) return;
  const cacheKey = normalizeAuthorText(authorName);
  const currentProfile = _authorCache[cacheKey] || { name: authorName, image: '' };

  _apSetStatus('');
  const reader = new FileReader();
  reader.onload = async ev => {
    const dataUrl = ev.target.result;
    // Upload to Supabase storage
    const btn = document.getElementById('apSaveUrlBtn');
    if (btn) { btn.disabled = true; }
    showToast('Uploading photo…');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `authors/${cacheKey}.${ext}`;
      const { error } = await sb.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = sb.storage.from('covers').getPublicUrl(path);
      currentProfile.image = publicUrl;
      _authorCache[cacheKey] = currentProfile;
      if (currentUser) {
        try { await sb.from('authors').upsert({ name_key: cacheKey, name: currentProfile.name, image: publicUrl, user_id: currentUser.id }, { onConflict: 'name_key' }); } catch {}
      }
      const preview = document.getElementById('apModalPreview');
      const initials = authorInitials(currentProfile.name);
      if (preview) preview.innerHTML = `<img src="${escapeAttr(publicUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML='<span style=font-size:28px;font-weight:700;color:var(--accent)>${escapeAttr(initials)}</span>'">`;
      _apSetStatus('Photo ready — image will update when you save');
      const rows = buildAuthorRows(authorName);
      hydrateAuthorHeader(currentProfile, rows);
      _refreshAuthorListAvatar(cacheKey, publicUrl, authorName);
      showToast('Photo uploaded ✓');
    } catch (err) {
      // Fallback: use data URL locally (won't persist after reload)
      currentProfile.image = dataUrl;
      _authorCache[cacheKey] = currentProfile;
      const preview = document.getElementById('apModalPreview');
      if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      _apSetStatus('Photo ready — image will update when you save');
      const rows = buildAuthorRows(authorName);
      hydrateAuthorHeader(currentProfile, rows);
      _refreshAuthorListAvatar(cacheKey, dataUrl, authorName);
      showToast('Photo set locally ✓');
    }
    if (btn) { btn.disabled = false; }
  };
  reader.readAsDataURL(file);
  // Reset file input
  e.target.value = '';
}

async function apRefetch() {
  const authorName = _activeAuthorName;
  if (!authorName) return;
  const cacheKey = normalizeAuthorText(authorName);
  const btn = document.getElementById('apRefetchBtn');
  btn.disabled = true; btn.textContent = 'Searching…';
  _apSetStatus('');
  if (currentUser) {
    try { await sb.from('authors').delete().eq('name_key', cacheKey); } catch {}
  }
  delete _authorCache[cacheKey];
  const newProfile = await fetchAuthorProfile(authorName);
  btn.disabled = false; btn.textContent = 'Search Again';
  if (newProfile.image) {
    const preview = document.getElementById('apModalPreview');
    const previewCard = document.getElementById('apPreviewCard');
    const initials = authorInitials(newProfile.name);
    const imgHtml = `<img src="${escapeAttr(newProfile.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML='<span style=font-size:28px;font-weight:700;color:var(--accent)>${escapeAttr(initials)}</span>'">`;
    if (preview) preview.innerHTML = imgHtml;
    if (previewCard) previewCard.innerHTML = imgHtml;
    const urlInput = document.getElementById('apUrlInput');
    if (urlInput) urlInput.value = newProfile.image;
    _apSetStatus('Photo ready — image will update when you save');
    const rows = buildAuthorRows(authorName);
    hydrateAuthorHeader(newProfile, rows);
    _refreshAuthorListAvatar(cacheKey, newProfile.image, authorName);
  } else {
    _apSetStatus('No photo found on Wikipedia or Open Library.', true);
  }
}

document.getElementById('authorPhotoWrap')?.addEventListener('click', openAuthorPhotoModal);

// ── Sync author list overlay avatar after photo change ──────────────────
function _refreshAuthorListAvatar(cacheKey, imageUrl, authorName) {
  const scroll = document.getElementById('alScroll');
  if (!scroll) return;
  scroll.querySelectorAll('.al-author-row').forEach(row => {
    const rowKey = (row.dataset.author || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (rowKey !== cacheKey) return;
    const avatarEl = row.querySelector('[id^="al-av-"]');
    if (!avatarEl) return;
    if (imageUrl) {
      if (typeof _alSetAvatarImg === 'function') {
        _alSetAvatarImg(avatarEl, imageUrl, authorName);
      }
    } else {
      const initials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
      avatarEl.textContent = initials;
    }
  });
}
