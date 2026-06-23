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

async function _fetchAuthorQuote(authorName) {
  try {
    const searchRes = await fetch(
      `https://en.wikiquote.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(authorName)}&srlimit=3&format=json&origin=*`
    );
    const searchData = await searchRes.json();
    const pages = searchData?.query?.search || [];
    if (!pages.length) return '';
    const match = pages.find(p => p.title.toLowerCase() === authorName.toLowerCase()) || pages[0];
    const parseRes = await fetch(
      `https://en.wikiquote.org/w/api.php?action=parse&page=${encodeURIComponent(match.title)}&prop=text&format=json&origin=*`
    );
    const parseData = await parseRes.json();
    const html = parseData?.parse?.text?.['*'];
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('li ul, li ol, sup, .reference, .mw-editsection').forEach(el => el.remove());
    return [...doc.querySelectorAll('li')]
      .map(li => li.textContent.trim().replace(/\s+/g, ' '))
      .find(t => t.length >= 50 && t.length <= 280 && !/^\[|\{\{|^[0-9]/.test(t)) || '';
  } catch {}
  return '';
}

async function fetchAuthorProfile(authorName) {
  const cacheKey = normalizeAuthorText(authorName);
  // Only use cache if it has a quote — otherwise re-fetch from Supabase
  if (_authorCache[cacheKey]?.quote) return _authorCache[cacheKey];

  // 1. Try Supabase first (wait for auth session to restore)
  try {
    await sb.auth.getSession();
    const { data, error } = await sb.from('authors').select('*').eq('name_key', cacheKey).maybeSingle();
    if (error) console.warn('[author] supabase fetch error:', error.message);
    if (data) {
      const profile = { name: data.name || authorName, image: data.image || '', intro: '', quote: data.quote || '', works: [] };
      if (!profile.quote) {
        profile.quote = await _fetchAuthorQuote(authorName);
        if (profile.quote && currentUser) {
          sb.from('authors').upsert({ name_key: cacheKey, name: profile.name, image: profile.image, quote: profile.quote, user_id: currentUser.id }, { onConflict: 'name_key' }).then(() => {});
        }
      }
      if (profile.quote) _authorCache[cacheKey] = profile;
      return profile;
    }
  } catch (e) { console.warn('[author] supabase exception:', e.message); }

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

  // 3. Fetch quote
  if (!profile.quote) profile.quote = await _fetchAuthorQuote(authorName);

  // 4. Save to Supabase (fire and forget)
  if (currentUser) {
    sb.from('authors').upsert({
      name_key: cacheKey,
      name: profile.name,
      image: profile.image,
      quote: profile.quote,
      user_id: currentUser.id
    }, { onConflict: 'name_key' }).then(() => {});
  }

  if (profile.quote) _authorCache[cacheKey] = profile;
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

async function fetchWikipediaWorks(authorName) {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(authorName + ' novelist author')}&srlimit=3&format=json&origin=*`
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const pages = searchData?.query?.search || [];
    if (!pages.length) return [];

    const match = pages.find(p =>
      p.title.toLowerCase().includes(authorName.toLowerCase().split(' ').pop()) ||
      authorName.toLowerCase().includes(p.title.toLowerCase())
    ) || pages[0];

    const parseRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(match.title)}&prop=sections&format=json&origin=*`
    );
    if (!parseRes.ok) return [];
    const parseData = await parseRes.json();
    const sections = parseData?.parse?.sections || [];

    const bibSection = sections.find(s =>
      /bibliography|works|novels|books|fiction/i.test(s.line)
    );
    if (!bibSection) return [];

    const secRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(match.title)}&prop=wikitext&section=${bibSection.index}&format=json&origin=*`
    );
    if (!secRes.ok) return [];
    const secData = await secRes.json();
    const wikitext = secData?.parse?.wikitext?.['*'] || '';

    // Extract titles and years from wikitext patterns like:
    // * ''[[Title]]'' (1999) or * ''Title'' (1999)
    const works = [];
    const lineRe = /^\*[^*].*$/gm;
    const titleRe = /'{2,3}\[\[([^\]|]+)(?:\|[^\]]*)?\]\]'{2,3}|'{2,3}([^']+)'{2,3}/;
    const yearRe = /\((\d{4})\)/;

    let m;
    while ((m = lineRe.exec(wikitext)) !== null) {
      const line = m[0];
      const titleMatch = titleRe.exec(line);
      const yearMatch = yearRe.exec(line);
      if (!titleMatch) continue;
      const title = (titleMatch[1] || titleMatch[2] || '').replace(/^.*:/, '').trim();
      if (!title || title.length < 2) continue;
      works.push({ title, year: yearMatch ? yearMatch[1] : '' });
    }

    return works;
  } catch {
    return [];
  }
}

function getVisibleAuthorRows() {
  let rows = [..._authorRows];
  if (_authorFilter === 'wishlist') {
    rows = rows.filter(row => row.status === 'not-owned');
    // Wikipedia rows first (unowned/undiscovered), then manually added not-owned
    rows.sort((a, b) => {
      if (a.source === 'wikipedia' && b.source !== 'wikipedia') return 1;
      if (a.source !== 'wikipedia' && b.source === 'wikipedia') return -1;
      return (a.year || '9999').localeCompare(b.year || '9999');
    });
  } else if (_authorFilter === 'all') {
    rows = rows.filter(row => row.status !== 'not-owned');
    rows.sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  } else {
    rows = rows.filter(row => row.status === _authorFilter);
    rows.sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  }
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

  // Deduplicate by normalized title before rendering
  const seen = new Set();
  const dedupedRows = rows.filter(row => {
    const key = normalizeBookTitle(row.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!dedupedRows.length) {
    state.textContent = _authorFilter === 'wishlist' ? 'No wishlist books yet.' : 'No books found yet.';
    timeline.innerHTML = '';
    return;
  }

  state.textContent = '';
  const isWishlistView = _authorFilter === 'wishlist';

  timeline.innerHTML = dedupedRows.map((row, i) => {
    const isWikiEntry = row.source === 'wikipedia';
    const statusClass = row.status === 'not-owned' ? 'not-owned' : (row.status || 'unread');
    // In wishlist view the pill is redundant — only show it in 'all' view
    const showPill = !isWishlistView;
    const statusText = isWikiEntry ? 'wishlist' : (row.status === 'not-owned' ? 'not owned' : (STATUS_LABELS[row.status] || 'unread'));
    const cover = row.cover
      ? `<img src="${escapeAttr(row.cover)}" alt="" onerror="this.parentElement.innerHTML=''">`
      : makePlaceholder({ id: row.title }, 16);
    // Only show description if it's genuinely meaningful (user-added, not filler)
    const desc = (!isWikiEntry && row.description) ? `<p class="author-book-desc">${escapeHtml(row.description)}</p>` : '';
    const meta = [row.year, row.genre || 'Novel'].filter(Boolean).join(' · ');
    // Wiki rows get a subtle tap hint
    const wikiHint = isWikiEntry ? `<span class="author-wiki-hint">tap to add</span>` : '';
    return `<div class="author-book-row${isWikiEntry ? ' author-book-row--wiki' : ''}" data-author-book="${escapeAttr(row.bookId || '')}" data-wiki-title="${isWikiEntry ? escapeAttr(row.title) : ''}" style="animation-delay:${Math.min(i,12)*0.025}s">
      <div class="author-book-cover">${cover}</div>
      <div class="author-book-info">
        <div class="author-book-title">${escapeHtml(row.title)}</div>
        <div class="author-book-meta"><span>${escapeHtml(meta)}</span>${wikiHint}</div>
        ${desc}
      </div>
      ${showPill ? `<span class="author-status-pill ${statusClass}">${statusText}</span>` : ''}
    </div>`;
  }).join('');

  timeline.querySelectorAll('[data-author-book]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.authorBook;
      const wikiTitle = row.dataset.wikiTitle;

      // Wikipedia-sourced wishlist entry — offer to add to shelf
      if (!id && wikiTitle) {
        const authorName = _activeAuthorName;
        showToast(`Adding "${wikiTitle}" to wishlist…`);
        dbAdd({
          title: wikiTitle,
          author: authorName,
          status: 'not-owned',
          cover_url: null,
          pages_read: 0,
          total_pages: null,
        }).then(newBook => {
          if (!newBook) { showToast('Could not add book'); return; }
          books.unshift(newBook);
          // Refresh row to reflect it's now in local books
          const updatedRows = buildAuthorRows(authorName);
          // Keep remaining wiki-only rows that aren't yet saved
          const existingTitles = updatedRows.map(r => r.title);
          _authorRows.forEach(r => {
            if (r.source === 'wikipedia' && !existingTitles.some(t => titlesLikelySame(t, r.title))) {
              updatedRows.push(r);
            }
          });
          _authorRows = updatedRows;
          renderAuthorRows(getVisibleAuthorRows());
          showToast(`"${wikiTitle}" added to wishlist ✓`);
        });
        return;
      }

      if (!id) return;
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

  // Fetch profile and Wikipedia works in parallel
  const [profile, wikiWorks] = await Promise.all([
    fetchAuthorProfile(authorName),
    fetchWikipediaWorks(authorName)
  ]);
  if (normalizeAuthorText(_activeAuthorName) !== normalizeAuthorText(authorName)) return;

  const freshRows = buildAuthorRows(authorName);

  // Merge Wikipedia works as wishlist entries for titles not already on shelf
  if (wikiWorks.length) {
    const existingTitles = freshRows.map(r => r.title);
    wikiWorks.forEach(work => {
      const alreadyOwned = existingTitles.some(t => titlesLikelySame(t, work.title));
      if (!alreadyOwned) {
        freshRows.push({
          title: work.title,
          year: work.year || '',
          cover: '',
          description: '',
          genre: 'Novel',
          owned: false,
          status: 'not-owned',
          bookId: null,
          source: 'wikipedia'
        });
      }
    });
  }

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
  // callerEl = null: author page exits right, nothing springs back (detail sheet is floating)
  setTimeout(() => openAuthorPage(trimmed, null), 220);
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
