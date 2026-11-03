(function () {
  const G = [
    { name: "Literary Fiction", group: "Fiction", aliases: ["Literary Novel", "Serious Fiction", "Artistic Fiction"], subgenres: ["Contemporary Literary Fiction", "Modernist Fiction", "Postmodern Fiction", "Philosophical Fiction", "Psychological Fiction", "Social Realism"] },
    { name: "Science Fiction", group: "Fiction", aliases: ["Sci-Fi", "SF", "Speculative Fiction"], subgenres: ["Space Opera", "Cyberpunk", "Hard Science Fiction", "Military Science Fiction", "Time Travel", "Post-Apocalyptic"] },
    { name: "Fantasy", group: "Fiction", aliases: ["Speculative Fantasy", "Fantastical Fiction"], subgenres: ["Epic Fantasy", "High Fantasy", "Dark Fantasy", "Urban Fantasy", "Low Fantasy", "Mythic Fantasy", "Cozy Fantasy"] },
    { name: "Horror", group: "Fiction", aliases: ["Horror Fiction", "Scary Fiction"], subgenres: ["Gothic Horror", "Psychological Horror", "Cosmic Horror", "Supernatural Horror", "Folk Horror", "Body Horror", "Slasher"] },
    { name: "Mystery", group: "Fiction", aliases: ["Detective Fiction", "Whodunit", "Mystery Fiction"], subgenres: ["Cozy Mystery", "Police Procedural", "Hardboiled Mystery", "Locked-Room Mystery", "Amateur Sleuth", "Historical Mystery"] },
    { name: "Thriller", group: "Fiction", aliases: ["Suspense", "Thriller Fiction", "Suspense Fiction"], subgenres: ["Psychological Thriller", "Political Thriller", "Legal Thriller", "Medical Thriller", "Spy Thriller", "Domestic Thriller", "Action Thriller"] },
    { name: "Romance", group: "Fiction", aliases: ["Romantic Fiction", "Love Stories"], subgenres: ["Contemporary Romance", "Historical Romance", "Paranormal Romance", "Romantic Suspense", "Dark Romance", "Romantic Comedy", "Fantasy Romance"] },
    { name: "Historical Fiction", group: "Fiction", aliases: ["Historical Novel", "Period Fiction"], subgenres: ["Ancient Historical Fiction", "Medieval Fiction", "Victorian Fiction", "Regency Fiction", "World War Fiction", "Alternate History"] },
    { name: "Contemporary Fiction", group: "Fiction", aliases: ["General Fiction", "Modern Fiction", "Mainstream Fiction"], subgenres: ["Coming-of-Age", "Family Saga", "Domestic Fiction", "Campus Novel", "Slice of Life", "Women's Fiction"] },
    { name: "Crime", group: "Fiction", aliases: ["Crime Fiction", "Criminal Fiction"], subgenres: ["Noir", "Gangster Fiction", "Heist Fiction", "Organized Crime", "Serial Killer Fiction", "Courtroom Crime"] },
    { name: "Adventure", group: "Fiction", aliases: ["Adventure Fiction", "Action-Adventure"], subgenres: ["Survival Adventure", "Exploration", "Treasure Hunt", "Swashbuckling", "Wilderness Adventure", "Expedition Fiction"] },
    { name: "Classics", group: "Fiction", aliases: ["Literary Classics", "Classic Literature", "Classic Fiction"], subgenres: ["Ancient Classics", "Greek Classics", "Roman Classics", "19th-Century Classics", "20th-Century Classics", "Modern Classics"] },
    { name: "Dystopian Fiction", group: "Fiction", aliases: ["Dystopian Literature", "Anti-Utopian Fiction"], subgenres: ["Political Dystopia", "Post-Apocalyptic Dystopia", "Environmental Dystopia", "Technological Dystopia", "Social Dystopia", "Totalitarian Fiction"] },
    { name: "Mythology & Folklore", group: "Fiction", aliases: ["Mythological Fiction", "Folklore", "Myth And Legend"], subgenres: ["Greek Mythology", "Norse Mythology", "Hindu Mythology", "Egyptian Mythology", "Japanese Mythology", "African Mythology", "Fairy Tales"] },
    { name: "Western", group: "Fiction", aliases: ["Western Fiction", "Cowboy Fiction"], subgenres: ["Classic Western", "Revisionist Western", "Contemporary Western", "Weird Western", "Frontier Fiction", "Western Romance"] },
    { name: "Humor", group: "Fiction", aliases: ["Humour", "Comedy", "Humorous Fiction", "Comic Fiction"], subgenres: ["Satire", "Dark Comedy", "Absurdist Fiction", "Parody", "Farce", "Comic Novel"] },
    { name: "Short Stories", group: "Fiction", aliases: ["Short Fiction", "Story Collections"], subgenres: ["Literary Short Stories", "Flash Fiction", "Microfiction", "Horror Short Stories", "Fantasy Short Stories", "Science Fiction Short Stories"] },
    { name: "Young Adult", group: "Fiction", aliases: ["YA", "Young Adult Fiction", "Teen Fiction"], subgenres: ["YA Contemporary", "YA Fantasy", "YA Romance", "YA Mystery", "YA Science Fiction", "YA Dystopian", "YA Coming-of-Age"] },
    { name: "New Adult", group: "Fiction", aliases: ["NA Fiction", "New Adult Fiction"], subgenres: ["College Romance", "New Adult Contemporary", "New Adult Fantasy", "New Adult Drama", "New Adult LGBTQ+"] },
    { name: "Graphic Novels & Comics", group: "Fiction", aliases: ["Comics & Graphic Novels", "Graphic Literature", "Comics", "Graphic Fiction"], subgenres: ["Superhero Comics", "Literary Graphic Novels", "Memoir Comics", "Manga", "Manhwa", "Manhua", "Webtoons"] },
    { name: "Memoir", group: "Nonfiction", aliases: ["Autobiography", "Personal Memoir", "Life Memoir", "Memoirs"], subgenres: ["Coming-of-Age Memoir", "Travel Memoir", "Family Memoir", "Grief Memoir", "Recovery Memoir", "Celebrity Memoir", "Spiritual Memoir"] },
    { name: "Biography", group: "Nonfiction", aliases: ["Biography & Autobiography", "Life Stories"], subgenres: ["Political Biography", "Historical Biography", "Literary Biography", "Celebrity Biography", "Scientific Biography"] },
    { name: "History", group: "Nonfiction", aliases: ["Historical Nonfiction", "History Books"], subgenres: ["Ancient History", "Medieval History", "Modern History", "World History", "Indian History", "Military History", "Social History"] },
    { name: "Philosophy", group: "Nonfiction", aliases: ["Philosophical Works", "Philosophy Books"], subgenres: ["Existentialism", "Stoicism", "Ethics", "Metaphysics", "Epistemology", "Political Philosophy", "Eastern Philosophy"] },
    { name: "Psychology", group: "Nonfiction", aliases: ["Psychological Nonfiction", "Psychology Books"], subgenres: ["Cognitive Psychology", "Social Psychology", "Behavioral Psychology", "Developmental Psychology", "Positive Psychology", "Neuropsychology", "Psychoanalysis"] },
    { name: "Science", group: "Nonfiction", aliases: ["Popular Science", "Scientific Nonfiction"], subgenres: ["Physics", "Biology", "Chemistry", "Astronomy", "Neuroscience", "Evolution", "Quantum Physics"] },
    { name: "Business", group: "Nonfiction", aliases: ["Business And Management", "Business Books"], subgenres: ["Entrepreneurship", "Leadership", "Management", "Marketing", "Startups", "Strategy", "Organizational Behavior"] },
    { name: "Self-Help", group: "Nonfiction", aliases: ["Personal Development", "Personal Growth", "Self-Improvement"], subgenres: ["Productivity", "Habit Building", "Motivation", "Emotional Intelligence", "Confidence", "Mindfulness", "Time Management"] },
    { name: "Politics", group: "Nonfiction", aliases: ["Political Science", "Political Nonfiction"], subgenres: ["Political Theory", "Democracy", "Geopolitics", "International Relations", "Public Policy", "Political Ideologies", "Governance"] },
    { name: "Economics", group: "Nonfiction", aliases: ["Economic Theory", "Economics Books"], subgenres: ["Macroeconomics", "Microeconomics", "Behavioral Economics", "Development Economics", "Financial Economics", "International Economics", "Economic History"] },
    { name: "True Crime", group: "Nonfiction", aliases: ["True Crime Books", "Criminal Nonfiction"], subgenres: ["Serial Killers", "Cold Cases", "Criminal Investigation", "Forensic Science", "Crime History", "Criminal Justice"] },
    { name: "Travel", group: "Nonfiction", aliases: ["Travel Writing", "Travel Literature", "Travel Guides"], subgenres: ["Adventure Travel", "Cultural Travel", "Nature Travel", "Road Trips"] },
    { name: "Nature", group: "Nonfiction", aliases: ["Nature Writing", "Natural History"], subgenres: ["Wildlife", "Ecology", "Environmentalism", "Climate Change", "Conservation", "Botany", "Animal Behavior"] },
    { name: "Religion & Spirituality", group: "Nonfiction", aliases: ["Religion", "Spirituality", "Religious Studies"], subgenres: ["Hinduism", "Buddhism", "Christianity", "Islam", "Sikhism", "Meditation", "Mysticism"] },
    { name: "Essays", group: "Nonfiction", aliases: ["Essay Collections", "Nonfiction Essays"], subgenres: ["Personal Essays", "Philosophical Essays", "Political Essays", "Literary Essays", "Cultural Essays", "Nature Essays"] },
    { name: "Poetry", group: "Nonfiction", aliases: ["Poems", "Poetry Collections", "Verse"], subgenres: ["Free Verse", "Sonnet", "Haiku", "Ghazal", "Ode", "Elegy", "Spoken Word"] },
    { name: "Art & Design", group: "Nonfiction", aliases: ["Art Books", "Design Books", "Visual Arts"], subgenres: ["Art History", "Drawing", "Painting", "Photography", "Graphic Design", "Architecture", "Typography"] },
    { name: "Technology", group: "Nonfiction", aliases: ["Technology Books", "Computing", "Information Technology"], subgenres: ["Artificial Intelligence", "Programming", "Computer Science", "Cybersecurity", "Data Science", "Robotics", "Digital Culture"] },
    { name: "Education", group: "Nonfiction", aliases: ["Educational Books", "Learning", "Study Guides"], subgenres: ["Learning Science", "Teaching Methods", "Study Skills", "Language Learning", "Education Theory", "Exam Preparation"] },
    { name: "Cooking", group: "Nonfiction", aliases: ["Cookbooks", "Food And Cooking", "Culinary Arts"], subgenres: ["Baking", "Indian Cuisine", "World Cuisine", "Vegetarian Cooking", "Vegan Cooking", "Food History", "Desserts"] },
    { name: "Health & Fitness", group: "Nonfiction", aliases: ["Health", "Fitness", "Wellness"], subgenres: ["Nutrition", "Exercise", "Mental Health", "Yoga", "Sleep", "Medicine", "Healthy Living"] },
    { name: "Sports", group: "Nonfiction", aliases: ["Sports Books", "Athletics", "Sport"], subgenres: ["Football", "Cricket", "Basketball", "Tennis", "Olympics", "Sports Biography", "Sports Psychology"] },
    { name: "Children's Books", group: "Children's", aliases: ["Children's Literature", "Kids' Books", "Juvenile Literature"], subgenres: ["Picture Books", "Board Books", "Early Readers", "Middle Grade", "Chapter Books", "Children's Fantasy", "Children's Adventure"] },
    { name: "Other", group: "Other", aliases: [], subgenres: [] }
  ];

  // "&" and "and" are treated the same, so "Religion And Spirituality" still resolves
  const norm = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
  const GENERIC = new Set(['fiction', 'nonfiction', 'non fiction', 'general', 'novel', 'novels', 'books', 'literature', 'stories']);
  const mainMap = new Map(), subParent = new Map(), subCanon = new Map();
  G.forEach(g => {
    mainMap.set(norm(g.name), g.name);
    g.aliases.forEach(a => { if (!mainMap.has(norm(a))) mainMap.set(norm(a), g.name); });
    g.subgenres.forEach(s => { subParent.set(norm(s), g.name); subCanon.set(norm(s), s); });
  });

  window.GENRE_TAXONOMY = G;

  // main genre name for a name or alias, else null
  window.gtResolve = x => mainMap.get(norm(x)) || null;

  // Gemini output -> [main, sub1, sub2] or [] if nothing usable
  window.gtNormalize = function (arr) {
    if (!Array.isArray(arr)) return [];
    const items = arr.map(x => String(x || '').trim()).filter(Boolean);
    let main = null, mi = -1;
    for (let i = 0; i < items.length; i++) {
      const r = mainMap.get(norm(items[i]));
      if (r) { main = r; mi = i; break; }
    }
    if (!main) for (const it of items) { const p = subParent.get(norm(it)); if (p) { main = p; break; } }
    if (!main) return [];
    const out = [main], seen = new Set([norm(main)]);
    items.forEach((it, i) => {
      const k = norm(it);
      if (i === mi || !k || seen.has(k) || mainMap.has(k) || GENERIC.has(k)) return;
      seen.add(k);
      out.push(subCanon.get(k) || it);
    });
    return out.slice(0, 3);
  };

  // one line per genre for the Gemini prompt
  window.gtPromptLines = () => G.map(g => g.subgenres.length ? `${g.name}: ${g.subgenres.join(', ')}` : g.name).join('\n');
})();
