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

async function fetchAuthorProfile(authorName) {
  const cacheKey = normalizeAuthorText(authorName);
  if (_authorCache[cacheKey]) return _authorCache[cacheKey];

  const fallback = authorFallback(authorName);
  const profile = {
    name: fallback.name || authorName,
    image: fallback.image || '',
    intro: fallback.intro || '',
    quote: fallback.quote || '',
    works: [...(fallback.works || [])]
  };

  try {
    const searchRes = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}`);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const doc = (searchData.docs || []).find(a => normalizeAuthorText(a.name) === cacheKey) || (searchData.docs || [])[0];
      if (doc?.key) {
        profile.name = fallback.name || doc.name || profile.name;
        profile.image = profile.image || `https://covers.openlibrary.org/a/olid/${doc.key}-L.jpg`;

        const [authorRes] = await Promise.allSettled([
          fetch(`https://openlibrary.org/authors/${doc.key}.json`)
        ]);

        if (authorRes.status === 'fulfilled' && authorRes.value.ok) {
          const authorData = await authorRes.value.json();
          const bio = typeof authorData.bio === 'string' ? authorData.bio : authorData.bio?.value;
          if (bio && bio.length > 40) {
            const cleaned = bio.replace(/\s+/g, ' ').trim();
            profile.intro = cleaned.slice(0, 600).trim();
          }
        }
      }
    }
  } catch {}

  if (!profile.intro || profile.intro.length < 40) {
    try {
      const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const extract = wikiData.extract || '';
        if (extract.length > 40) profile.intro = extract.slice(0, 600).trim();
      }
    } catch {}
  }

  _authorCache[cacheKey] = profile;
  return profile;
}

function buildAuthorRows(authorName) {
  const local = getLocalAuthorBooks(authorName);
  return local.map(book => ({
    title: book.title || 'Untitled',
    year: book.year || '',
    cover: book.cover_url || '',
    description: book.description || '',
    genre: cleanGenre(book.genre || 'Novel'),
    owned: !isHiddenFromShelf(book),
    status: book.status || 'unread',
    bookId: book.id,
    source: 'local'
  }));
}

function getVisibleAuthorRows() {
  let rows = [..._authorRows];
  if (_authorFilter !== 'all') rows = rows.filter(row => row.status === _authorFilter);
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
    const statusClass = row.status || 'unread';
    const statusText = STATUS_LABELS[row.status] || 'Unread';
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
        <p class="author-book-desc">${escapeHtml(row.description || 'Saved in your library.')}</p>
      </div>
      <span class="author-status-pill ${statusClass}">${statusText}</span>
    </div>`;
  }).join('');

  timeline.querySelectorAll('[data-author-book]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.authorBook;
      if (!id) return;
      closeAuthorPage();
      setTimeout(() => openDetailModal(id), 220);
    });
  });
}

function hydrateAuthorHeader(profile, rows) {
  document.getElementById('authorName').textContent = profile.name;
  document.getElementById('authorBooksTitle').textContent = `In Your Library`;
  const countText = rows.length === 1 ? `1 book in your library` : `${rows.length} books in your library`;
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

async function openAuthorPage(authorName) {
  if (!authorName) return;
  _activeAuthorName = authorName;
  const overlay = document.getElementById('authorOverlay');
  const scroll = document.getElementById('authorScroll');
  const fallback = authorFallback(authorName);
  const initialRows = buildAuthorRows(authorName);
  _authorRows = initialRows;
  _authorFilter = 'all';
  updateAuthorControls();

  if (scroll) scroll.scrollTop = 0;
  if (overlay) overlay.classList.add('open');
  hydrateAuthorHeader(fallback, initialRows);
  renderAuthorRows(getVisibleAuthorRows());
  document.getElementById('authorState').textContent = '';

  const profile = await fetchAuthorProfile(authorName);
  if (normalizeAuthorText(_activeAuthorName) !== normalizeAuthorText(authorName)) return;
  const rows = buildAuthorRows(authorName);
  _authorRows = rows;
  hydrateAuthorHeader(profile, rows);
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
  if (overlay) overlay.classList.remove('open');
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
