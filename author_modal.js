// Curated canonical bibliographies for well-known authors
// Used as authoritative override when APIs return noise
const CURATED_BIBLIOGRAPHIES = {
  'albert camus': [
    { title: 'The Stranger', year: '1942' },
    { title: 'The Myth of Sisyphus', year: '1942' },
    { title: 'Caligula', year: '1944' },
    { title: 'The Misunderstanding', year: '1944' },
    { title: 'The Plague', year: '1947' },
    { title: 'State of Siege', year: '1948' },
    { title: 'The Just Assassins', year: '1949' },
    { title: 'The Rebel', year: '1951' },
    { title: 'Summer', year: '1954' },
    { title: 'The Fall', year: '1956' },
    { title: 'Exile and the Kingdom', year: '1957' },
    { title: 'Resistance, Rebellion, and Death', year: '1960' },
    { title: 'A Happy Death', year: '1971' },
    { title: 'The First Man', year: '1994' },
  ],
  'fyodor dostoevsky': [
    { title: 'Poor Folk', year: '1846' },
    { title: 'The Double', year: '1846' },
    { title: 'White Nights', year: '1848' },
    { title: 'Notes from Underground', year: '1864' },
    { title: 'Crime and Punishment', year: '1866' },
    { title: 'The Idiot', year: '1869' },
    { title: 'Demons', year: '1872' },
    { title: 'The Adolescent', year: '1875' },
    { title: 'The Brothers Karamazov', year: '1880' },
  ],
  'leo tolstoy': [
    { title: 'Childhood', year: '1852' },
    { title: 'The Cossacks', year: '1863' },
    { title: 'War and Peace', year: '1869' },
    { title: 'Anna Karenina', year: '1878' },
    { title: 'The Death of Ivan Ilyich', year: '1886' },
    { title: 'The Kreutzer Sonata', year: '1889' },
    { title: 'Resurrection', year: '1899' },
    { title: 'Hadji Murat', year: '1912' },
  ],
  'franz kafka': [
    { title: 'The Metamorphosis', year: '1915' },
    { title: 'In the Penal Colony', year: '1919' },
    { title: 'The Trial', year: '1925' },
    { title: 'The Castle', year: '1926' },
    { title: 'Amerika', year: '1927' },
    { title: 'A Hunger Artist', year: '1922' },
  ],
  'gabriel garcia marquez': [
    { title: 'Leaf Storm', year: '1955' },
    { title: 'No One Writes to the Colonel', year: '1961' },
    { title: 'In Evil Hour', year: '1962' },
    { title: 'One Hundred Years of Solitude', year: '1967' },
    { title: 'The Autumn of the Patriarch', year: '1975' },
    { title: 'Chronicle of a Death Foretold', year: '1981' },
    { title: 'Love in the Time of Cholera', year: '1985' },
    { title: 'The General in His Labyrinth', year: '1989' },
    { title: 'Of Love and Other Demons', year: '1994' },
  ],
  'virginia woolf': [
    { title: 'The Voyage Out', year: '1915' },
    { title: 'Night and Day', year: '1919' },
    { title: 'Jacob\'s Room', year: '1922' },
    { title: 'Mrs Dalloway', year: '1925' },
    { title: 'To the Lighthouse', year: '1927' },
    { title: 'Orlando', year: '1928' },
    { title: 'The Waves', year: '1931' },
    { title: 'The Years', year: '1937' },
    { title: 'Between the Acts', year: '1941' },
  ],
  'james joyce': [
    { title: 'Dubliners', year: '1914' },
    { title: 'A Portrait of the Artist as a Young Man', year: '1916' },
    { title: 'Ulysses', year: '1922' },
    { title: 'Finnegans Wake', year: '1939' },
  ],
  'george orwell': [
    { title: 'Burmese Days', year: '1934' },
    { title: 'A Clergyman\'s Daughter', year: '1935' },
    { title: 'Keep the Aspidistra Flying', year: '1936' },
    { title: 'Coming Up for Air', year: '1939' },
    { title: 'Animal Farm', year: '1945' },
    { title: 'Nineteen Eighty-Four', year: '1949' },
  ],
  'ernest hemingway': [
    { title: 'The Sun Also Rises', year: '1926' },
    { title: 'A Farewell to Arms', year: '1929' },
    { title: 'To Have and Have Not', year: '1937' },
    { title: 'For Whom the Bell Tolls', year: '1940' },
    { title: 'Across the River and Into the Trees', year: '1950' },
    { title: 'The Old Man and the Sea', year: '1952' },
    { title: 'A Moveable Feast', year: '1964' },
    { title: 'Islands in the Stream', year: '1970' },
  ],
  'jane austen': [
    { title: 'Sense and Sensibility', year: '1811' },
    { title: 'Pride and Prejudice', year: '1813' },
    { title: 'Mansfield Park', year: '1814' },
    { title: 'Emma', year: '1815' },
    { title: 'Northanger Abbey', year: '1817' },
    { title: 'Persuasion', year: '1817' },
  ],
  'toni morrison': [
    { title: 'The Bluest Eye', year: '1970' },
    { title: 'Sula', year: '1973' },
    { title: 'Song of Solomon', year: '1977' },
    { title: 'Tar Baby', year: '1981' },
    { title: 'Beloved', year: '1987' },
    { title: 'Jazz', year: '1992' },
    { title: 'Paradise', year: '1997' },
    { title: 'Love', year: '2003' },
    { title: 'A Mercy', year: '2008' },
    { title: 'Home', year: '2012' },
    { title: 'God Help the Child', year: '2015' },
  ],
};

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

// ── WORK-TYPE CONFIG ────────────────────────────────────────────────────
const WORK_TYPE_SHOW = new Set([
  'Q7725634',  // literary work / novel
  'Q8261',     // novel
  'Q49084',    // short story
  'Q5185279',  // prose
  'Q25379',    // play
  'Q46248',    // philosophical work
  'Q11410',    // game (plays)
  'Q571',      // book
  'Q7366',     // song (catch-all fallback)
  'Q2831984',  // drama
  'Q660518',   // short story collection
  'Q1424460',  // novella
]);

const WORK_TYPE_HIDE = new Set([
  'Q5707594',  // newspaper article
  'Q191067',   // article
  'Q17329259', // encyclopaedic article
  'Q13433827', // journal article
  'Q1261026',  // collection of letters
  'Q149537',   // letter
  'Q179461',   // correspondence
  'Q11826511', // collection
  'Q1980247',  // omnibus
  'Q101433',   // biography
  'Q277759',   // book series
  'Q24017414', // book chapter
  'Q573202',   // foreword
  'Q1194235',  // preface
  'Q1376369',  // introduction
  'Q107402516',// anthology
  'Q108',      // interview
  'Q15621286', // intellectual work (too broad fallback)
]);

const OMNIBUS_WORDS = /\b(collected|complete|selected|anthology|omnibus|volume|vol\.|reader|box set|classics collection|works of|the essential)\b/i;
const SECONDARY_WORDS = /\b(biography|companion|study guide|critical essays|reader.s guide|introduction to|about|life of|letters|correspondence|notebooks|travel journal|journal)\b/i;
const JOURNALISM_WORDS = /\b(combat|editorials|newspaper|chronicles|articles|journalism)\b/i;

// Canonical English title overrides for well-known foreign-language works
const CANONICAL_TITLES = {
  'létranger': 'The Stranger',
  'letranger': 'The Stranger',
  'la peste': 'The Plague',
  'lapeste': 'The Plague',
  'la chute': 'The Fall',
  'lachute': 'The Fall',
  'le mythe de sisyphe': 'The Myth of Sisyphus',
  'lemythede sisyphe': 'The Myth of Sisyphus',
  'lemythede sisyphus': 'The Myth of Sisyphus',
  'le premier homme': 'The First Man',
  'lepremierhomme': 'The First Man',
  'la mort heureuse': 'A Happy Death',
  'lamort heureuse': 'A Happy Death',
  'le mythe de sisyphus': 'The Myth of Sisyphus',
  'lhomme revolte': 'The Rebel',
  'lhomme révolté': 'The Rebel',
  'lexil et le royaume': 'Exile and the Kingdom',
  'lexilet le royaume': 'Exile and the Kingdom',
  'caligula': 'Caligula',
  'le malentendu': 'The Misunderstanding',
  'letat de siege': 'State of Siege',
  'létat de siège': 'State of Siege',
  'les justes': 'The Just Assassins',
  'noces': 'Nuptials',
  'le mythe de sisyphe': 'The Myth of Sisyphus',
};

function _canonicalTitle(raw) {
  if (!raw) return raw;
  const key = raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  return CANONICAL_TITLES[key] || raw;
}

// In-memory cover cache: authorKey → { normalizedTitle → coverUrl }
const _wikiCoverCache = {};

async function _loadWikiCoversFromDB(authorKey) {
  if (_wikiCoverCache[authorKey]) return;
  try {
    const { data } = await sb.from('authors').select('wiki_covers').eq('name_key', authorKey).maybeSingle();
    _wikiCoverCache[authorKey] = data?.wiki_covers || {};
  } catch {
    _wikiCoverCache[authorKey] = {};
  }
}

async function _saveWikiCoverToDB(authorKey, titleKey, coverUrl) {
  try {
    _wikiCoverCache[authorKey][titleKey] = coverUrl;
    await sb.from('authors').update({ wiki_covers: _wikiCoverCache[authorKey] }).eq('name_key', authorKey);
  } catch {}
}

async function _fetchCoverForWork(title, authorName) {
  // 1. Try Google Books — best cover quality
  try {
    const q = encodeURIComponent(`intitle:"${title}" inauthor:"${authorName}"`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items(volumeInfo(imageLinks))`);
    if (res.ok) {
      const data = await res.json();
      const links = data?.items?.[0]?.volumeInfo?.imageLinks;
      const url = links?.thumbnail || links?.smallThumbnail;
      if (url) return url.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=2');
    }
  } catch {}

  // 2. Fallback: Open Library cover search
  try {
    const q = encodeURIComponent(`${title} ${authorName}`);
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1&fields=cover_i`);
    if (res.ok) {
      const data = await res.json();
      const coverId = data?.docs?.[0]?.cover_i;
      if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    }
  } catch {}

  return '';
}

async function _enrichWorksWithCovers(works, authorName) {
  // Fetch covers in parallel, max 6 concurrent to avoid rate limits
  const BATCH = 6;
  const enriched = [...works];
  for (let i = 0; i < enriched.length; i += BATCH) {
    const batch = enriched.slice(i, i + BATCH);
    await Promise.all(batch.map(async (work) => {
      if (!work.cover) {
        work.cover = await _fetchCoverForWork(work.title, authorName);
      }
    }));
  }
  return enriched;
}

async function fetchWikipediaWorks(authorName) {
  // Primary: curated list for well-known authors — zero noise
  const curatedKey = normalizeAuthorText(authorName);
  let works = CURATED_BIBLIOGRAPHIES[curatedKey] 
    ? [...CURATED_BIBLIOGRAPHIES[curatedKey]]
    : null;

  if (!works) {
    // Secondary: Wikidata SPARQL
    const wikidataWorks = await _fetchWikidataWorks(authorName);
    if (wikidataWorks.length >= 3) {
      works = wikidataWorks;
    } else {
      // Fallback: Open Library works endpoint
      const olWorks = await _fetchOpenLibraryWorks(authorName);
      works = olWorks;
    }
  }

  if (!works.length) return [];

  // Enrich with covers in background — render rows first, then update
  return works;
}

async function _fetchWikidataWorks(authorName) {
  try {
    // Step 1: resolve Wikidata QID for this author
    const searchRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(authorName)}&language=en&type=item&limit=5&format=json&origin=*`
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const candidates = (searchData.search || []).filter(e =>
      /author|writer|novelist|poet|playwright|philosopher/i.test(e.description || '')
    );
    const entity = candidates[0] || searchData.search?.[0];
    if (!entity?.id) return [];

    const qid = entity.id; // e.g. Q34670

    // Step 2: SPARQL — get all works where author = this QID
    const sparql = `
      SELECT ?work ?workLabel ?typeLabel ?pubDate ?type WHERE {
        ?work wdt:P50 wd:${qid} .
        OPTIONAL { ?work wdt:P31 ?type . }
        OPTIONAL { ?work wdt:P577 ?pubDate . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,de,es". }
      }
      ORDER BY ?pubDate
      LIMIT 120
    `.trim();

    const sparqlRes = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`,
      { headers: { 'Accept': 'application/sparql-results+json' } }
    );
    if (!sparqlRes.ok) return [];
    const sparqlData = await sparqlRes.json();
    const bindings = sparqlData?.results?.bindings || [];

    // Aggregate: one entry per work QID, collect all type QIDs
    const workMap = new Map();
    for (const b of bindings) {
      const workId = b.work?.value?.split('/').pop();
      if (!workId) continue;
      const typeId = b.type?.value?.split('/').pop() || '';
      const label = b.workLabel?.value || '';
      const year = b.pubDate?.value ? b.pubDate.value.substring(0, 4) : '';
      if (!workMap.has(workId)) {
        workMap.set(workId, { label, year, types: new Set() });
      }
      const entry = workMap.get(workId);
      if (typeId) entry.types.add(typeId);
      // Prefer earliest year
      if (year && (!entry.year || year < entry.year)) entry.year = year;
    }

    const works = [];
    const seenTitles = new Set();

    for (const [, entry] of workMap) {
      const { label, year, types } = entry;
      if (!label || label.startsWith('Q')) continue; // no label resolved

      // Type filtering
      const hasHiddenType = [...types].some(t => WORK_TYPE_HIDE.has(t));
      if (hasHiddenType) continue;

      // Apply title-level noise filters
      if (OMNIBUS_WORDS.test(label)) continue;
      if (SECONDARY_WORDS.test(label)) continue;
      if (JOURNALISM_WORDS.test(label)) continue;

      // Canonical English title
      const title = _canonicalTitle(label);

      // Deduplicate by normalised title
      const key = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      works.push({ title, year });
    }

    return works.sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  } catch (e) {
    console.warn('[wikidata]', e.message);
    return [];
  }
}

async function _fetchOpenLibraryWorks(authorName) {
  try {
    // Resolve OL author key
    const authRes = await fetch(
      `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}&limit=3`
    );
    if (!authRes.ok) return [];
    const authData = await authRes.json();
    const normalKey = normalizeAuthorText(authorName);
    const doc = (authData.docs || []).find(d =>
      normalizeAuthorText(d.name) === normalKey
    ) || authData.docs?.[0];
    if (!doc?.key) return [];

    const olid = doc.key.replace('/authors/', '');
    const worksRes = await fetch(
      `https://openlibrary.org/authors/${olid}/works.json?limit=100`
    );
    if (!worksRes.ok) return [];
    const worksData = await worksRes.json();
    const entries = worksData.entries || [];

    const works = [];
    const seenTitles = new Set();

    for (const w of entries) {
      const rawTitle = w.title || '';
      if (!rawTitle) continue;
      if (OMNIBUS_WORDS.test(rawTitle)) continue;
      if (SECONDARY_WORDS.test(rawTitle)) continue;
      if (JOURNALISM_WORDS.test(rawTitle)) continue;

      const title = _canonicalTitle(rawTitle);
      const key = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const year = w.first_publish_date
        ? String(w.first_publish_date).match(/\d{4}/)?.[0] || ''
        : '';
      works.push({ title, year });
    }

    return works.sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  } catch (e) {
    console.warn('[openlibrary works]', e.message);
    return [];
  }
}

function getVisibleAuthorRows() {
  let rows = [..._authorRows];
  if (_authorFilter === 'wishlist') {
    rows = rows.filter(row => row.status === 'not-owned');
    // Wikipedia rows first (unowned/undiscovered), then manually added not-owned
    rows.sort((a, b) => {
      if (a.source === 'wikipedia' && b.source !== 'wikipedia') return -1;
      if (a.source !== 'wikipedia' && b.source === 'wikipedia') return 1;
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

  // Enrich wishlist (wikipedia-sourced) rows with covers progressively
  const wikiRows = freshRows.filter(r => r.source === 'wikipedia' && !r.cover);
  if (wikiRows.length) {
    const authorKey = normalizeAuthorText(authorName);

    // Load saved covers from DB first — avoids redundant API calls
    await _loadWikiCoversFromDB(authorKey);
    const savedCovers = _wikiCoverCache[authorKey] || {};

    // Apply cached covers immediately — no API call
    const needsFetch = [];
    for (const row of wikiRows) {
      const titleKey = row.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (savedCovers[titleKey]) {
        row.cover = savedCovers[titleKey];
        const rowEl = document.querySelector(`[data-wiki-title="${CSS.escape(row.title)}"] .author-book-cover`);
        if (rowEl) rowEl.innerHTML = `<img src="${escapeAttr(row.cover)}" alt="" onerror="this.parentElement.innerHTML=''">`;
      } else {
        needsFetch.push(row);
      }
    }

    // Only hit APIs for titles not yet cached
    if (needsFetch.length) {
      const BATCH = 3;
      const _delay = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < needsFetch.length; i += BATCH) {
        if (normalizeAuthorText(_activeAuthorName) !== normalizeAuthorText(authorName)) break;
        if (i > 0) await _delay(600);
        const batch = needsFetch.slice(i, i + BATCH);
        await Promise.all(batch.map(async (row) => {
          const cover = await _fetchCoverForWork(row.title, authorName);
          if (cover) {
            row.cover = cover;
            const titleKey = row.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            await _saveWikiCoverToDB(authorKey, titleKey, cover);
            const rowEl = document.querySelector(`[data-wiki-title="${CSS.escape(row.title)}"] .author-book-cover`);
            if (rowEl) rowEl.innerHTML = `<img src="${escapeAttr(cover)}" alt="" onerror="this.parentElement.innerHTML=''">`;
          }
        }));
      }
    }
  }
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
