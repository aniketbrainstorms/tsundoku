# tsundoku (積ん読)

> a calm home for unread books

**tsundoku** is a minimalist personal bookshelf for people who buy more books than they finish.
instead of turning reading into a productivity metric, it celebrates the joy of collecting,
remembering, and reading at your own pace — *buying books and reading books are two different hobbies.*

**live app → [aniketbrainstorms.github.io/tsundoku](https://aniketbrainstorms.github.io/tsundoku/)**

---

## why tsundoku exists

reading apps usually become productivity tools: streaks, yearly goals, ratings, social feeds.
tsundoku is designed to be a place — like walking into your own library, seeing books you love,
and remembering why you bought them. *not guilty.*

it is intentionally the opposite of goodreads:

- no ratings
- no reviews
- no social feed
- no reading challenges
- no streaks or guilt metrics

just **your shelf.**

## features

- **your shelf** — a cover-first grid. the books are the interface.
- **three statuses** — `unread` / `reading` / `read`. nothing else.
- **add books fast** — search [google books](https://books.google.com/), import from a shelf file, or add manually
- **custom covers** — upload your own cover art
- **quick actions** — click on desktop, long-press on mobile to change status in two taps
- **lists** — group books into personal collections with owned/read progress
- **authors** — author pages with photos, bios, and your library per author
- **genres & themes** — automatic genre detection and exploration
- **series tracking** — keep series and omnibus editions in order
- **habit tracker** — gentle reading-habit logging, no pressure
- **share cards** — beautiful cards of your shelf to share anywhere
- **public shelf links** — share a read-only view of your shelf (`?shelf=…`)
- **search & filters** — by title, author, status
- **pwa** — installable, offline-friendly, dark-mode-first
- **sync** — accounts via supabase (email or google)

## tech

no frameworks. no build step. no dependencies to install.

| layer | choice |
|---|---|
| ui | vanilla html / css / js |
| auth & data | [supabase](https://supabase.com/) (email + google oauth) |
| book metadata | [google books api](https://developers.google.com/books) |
| hosting | github pages (`.github/workflows/deploy.yml`) |
| app | progressive web app (`manifest.json` + `sw.js`) |

## getting started

it's a static site — serve the folder with any web server:

```bash
git clone https://github.com/aniketbrainstorms/tsundoku.git
cd tsundoku
python3 -m http.server 8000
# open http://localhost:8000/app.html
```

> **note:** sign-in is powered by supabase. to run auth locally, point the app at your own
> supabase project (credentials live in `core/app.js`). book search uses a google books api key
> embedded in `app.html` — for your own deployment, create your own key and restrict it by
> http referrer.

## project structure

```
tsundoku/
├── app.html              # the app shell (entry point, PWA)
├── index.html            # landing page
├── board.html / graph.html / progress.html / get-started.html
├── manifest.json  sw.js  # PWA manifest + service worker
├── core/
│   ├── app.js            # main application logic
│   ├── styles.css        # design system + all app styles
│   ├── genres.js         # genre/theme data
│   └── motion.js         # animation utilities
├── features/             # one folder per feature
│   ├── author-modal/  detail-sheet/  genre-pie/  habit-tracker/
│   ├── omnibus/  series/  share-card/  shelf-motion/  tab-reorder/
├── landing/              # marketing page assets
├── tools/                # one-off dev utilities (backfills, mockups)
├── docs/
│   ├── project-context   # full product vision & philosophy
│   └── impeccable.md     # design system & principles
└── .github/workflows/
    └── deploy.yml        # deploys to github pages on push
```

## design

warm dark, literary, personal — a dimly lit bookstore, not a dashboard.

- palette: `#0f0d0b` background, terracotta `#c9714a` accent, paper-tone surfaces
- type: dm sans (300/400/500), lowercase labels everywhere
- covers are the hero; everything else recedes into negative space
- spring easing `cubic-bezier(0.16,1,0.3,1)` — physical, not mechanical

see [docs/impeccable.md](docs/impeccable.md) for the full design system, and
[docs/project-context](docs/project-context) for the product philosophy.

## product principles

1. **the shelf is the soul** — every decision protects the cover grid
2. **adhd-first** — every flow completes in the fewest possible taps
3. **no guilt ui** — never surface metrics that could shame a reader
4. **speed over features** — adding a book should feel instant
5. **if it doesn't improve reading, remove it**

when suggesting features, ask: *does this make someone's personal bookshelf feel more useful,
more beautiful, or more personal?* if not, it probably doesn't belong.

## roadmap

directions being explored, all in service of the four pillars — *collect, organize, remember, read*:

- collections, tags, favorites
- notes, highlights, favorite quotes
- recommendation inbox, isbn scanner, save-from-web
- ai answers to "what should i read next?" — without replacing the simplicity of the shelf
- positive-only stats (books owned, authors explored, genres collected)
- premium: unlimited shelves, ai recommendations, cloud backup, export

## contributing

this is a personal project, but ideas and issues are welcome. when contributing, keep the
philosophy intact: no gamification, no social pressure, no feature bloat.

## license

tbd — this repo currently has no license. if you intend it to be open source, add one
(mit is a common choice for personal projects like this).
