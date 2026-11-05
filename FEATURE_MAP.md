# Tsundoku — Feature → File Map

> **Why this file exists:** an index so any AI (or human) fixing a bug can jump straight
to the right file instead of grepping 750+ KB of code. Read this first, then open only
the files the feature lives in.
> Last verified against `main` (Nov 2026). Regenerate when adding features.

---

## 0. How the app is wired (30-second orientation)

- **The whole app is one SPA shell: `app.html`.** It contains *all* screen markup
  (overlays/modals) and loads, in this order:
  `core/motion.js` → `core/app.js` (the 372 KB brain) → `features/*` → `core/genres.js`.
- **Three files cooperate on almost every feature:**
  - `app.html` — the DOM (overlay containers, element IDs)
  - `core/app.js` — all logic for features that don't have their own file
  - `core/styles.css` — all styles (224 KB, prefixed per feature, see §3)
- Features big enough to own a file live in `features/<name>/<name>.js`
  (self-contained: they attach to IDs in `app.html` and add their own listeners).
- **Data:** Supabase (`@supabase/supabase-js` CDN) + Google Books API
  (`window.BOOKS_API_KEY` set inline in `app.html`).
- **Prefix = feature.** Almost every CSS class, element ID and JS function uses the
  feature's prefix (e.g. everything list-detail starts with `ld`). Grep the prefix and
  you've found the whole feature (see the dictionary in §3).

---

## 1. The map

```mermaid
flowchart LR
    subgraph app.html["app.html — SPA shell (all screens' markup)"]
        BS[Book search overlay
#bs-]
        LO[My Lists screen
#lo-]
        LD[List detail
#ld-]
        WLP[Paste a list
#wl-paste-]
        AL[Authors list
#al-]
        GEN[Genres list + detail
#gen-]
        AO[Author page
#author-]
        LBD[List book detail modal
#lbd-]
        LX[Loader
#lx-]
        DS[Desktop shell + sidebar
#ds- / desk-]
    end

    subgraph core["core/"]
        APPJS["app.js — everything without its own file:
shelf, book CRUD, search, lists, paste-a-list,
authors, genres, auth, settings, backfill"]
        CSS["styles.css — all CSS"]
        MOTION["motion.js — animation helpers"]
        GENRESJS["genres.js — genre taxonomy/backfill data"]
    end

    subgraph features["features/ (self-contained modules)"]
        AM[author-modal
/author_modal.js]
        DSHT[detail-sheet
/detail_sheet.js]
        GP[genre-pie
/genrepie.js]
        HB[habit-tracker
/habit_tracker.js]
        OB[omnibus
/omnibus.js]
        SE[series
/series.js + series.css]
        SC[share-card
/share_card.js]
        SM[shelf-motion
/shelf_motion.js]
        TR[tab-reorder
/tab_reorder.js]
    end

    subgraph pages["Standalone pages (NOT part of the app — don't debug app bugs here)"]
        IDX[index.html landing]
        IDXV2[index-v2.html]
        LAND[landing/* modules]
        GS[get-started.html]
        BOARD[board.html]
        GRAPH[graph.html]
        PROG[progress.html]
        JOUR[tsundoku-journey.html]
    end

    subgraph infra["Infra / tooling"]
        SW[sw.js — service worker
(Android shell cache)]
        MAN[manifest.json — PWA]
        TOOLS[tools/ — backfill utilities +
desktop mockup]
        DOCS[docs/ — notes + patches]
    end

    app.html --> APPJS
    APPJS --> CSS
    features --> app.html
    SW --> app.html
```

---

## 2. Feature → file table

| Feature | UI lives in (markup) | Logic lives in | Styles (prefix) |
|---|---|---|---|
| Loading animation | `app.html` (`#loadingScreen`, inline `<script>`) | inline in `app.html` + `core/motion.js` | `lx-` |
| Auth (email/Google, OTP, reset) | `app.html` (`#authScreen`, forgot/confirm panels) | `core/app.js` (`handleAuth`, `switchAuthTab`, …) | `auth-` |
| Home shelf (grid, sorting, floating bar, add-book popup) | `app.html` | `core/app.js` | `shelf`-ish / shared |
| **Book detail sheet** (open a book) | `app.html` | `features/detail-sheet/detail_sheet.js` | mixed, `detail-` |
| **Add a book — search sheet** (Google Books, quick actions, borrow toggle, manual) | `app.html` (`#bookSearchOverlay`) | `core/app.js` (`openBookSearch`, `closeBookSearch`, `onBsInput`, `selectBsResult`) | `bs-` |
| **My Lists** (lists screen, create/edit list sheet, FAB) | `app.html` (`#listsOverlay`, `#loSheet`) | `core/app.js` — data layer `window._wl`, `loLoadLists`, `loSaveList`, `wlRender`, `wlFab`, `wlPick` | `lo-`, `wl-` |
| **List detail** (hero, progress bars, filter chips, sort/view menus, alpha bar, Add book popup + add sheet) | `app.html` (`#listDetailOverlay`) | `core/app.js` (`openListDetail`/`closeListDetail`, `ldAddPopupSelect`, `ldas*` add-sheet flow) | `ld-`, `ldas-` |
| **List book detail modal** (tap a book inside a list) | `app.html` (`#listBookDetailModal`) | `core/app.js` (`closeListBookDetail`, `lbdEditBook`, …) | `lbd-` |
| **Paste a list** (entry link in add-book sheet → form → auto-match → summary + "needs a look" review) | `app.html` (`#wlPasteOverlay`) | **`core/app.js`, END of file** (`wlPasteOpen`, `wlPasteFix`, `renderSummary`, save/match IIFE) | `wl-paste-` |
| Authors list overlay | `app.html` (`#authorsListOverlay`) | `core/app.js` (`renderAuthorsList`, `setAlView`, …) | `al-` |
| Genres list overlay + genre detail | `app.html` (`#genresListOverlay`, `#genreDetailOverlay`) | `core/app.js` + `core/genres.js` (taxonomy/backfill) | `gen-` / `al-` shared |
| **Author page** (hero, bio, stats, library) | `app.html` (`#authorOverlay`) | `features/author-modal/author_modal.js` + `core/app.js` glue | `author-` |
| **Author photo modal** | `app.html` | `features/author-modal/author_modal.js` | `author-` |
| **Series tracking** | `app.html` | `features/series/series.js` (+ own `series.css`) | `se-`/series |
| **Omnibus / collected editions** | `app.html` | `features/omnibus/omnibus.js` | `ob-` |
| **Genre pie chart** | `app.html` | `features/genre-pie/genrepie.js` | `gp-` |
| **Habit tracker** | `app.html` | `features/habit-tracker/habit_tracker.js` | `hb-` |
| **Reading/share card image** | `app.html` | `features/share-card/share_card.js` | `sc-` |
| **Shelf motion/animations** | — | `features/shelf-motion/shelf_motion.js` + `core/motion.js` | `sm-` |
| **Tab reordering** (bottom nav) | `app.html` | `features/tab-reorder/tab_reorder.js` | `tr-` |
| Public shelf share links (`?shelf=`) | — | `core/app.js` (share UI near top of file) + `features/share-card/share_card.js` | `share-` |
| Backfill jobs (genre/theme/bio progress modal) | `app.html` (`#backfillModal`) | `core/app.js` (`bf*`), taxonomy in `core/genres.js` | `bf-` |
| Desktop shell, sidebar, hamburger | `app.html` (`#deskHamburger`, `#dsbBackdrop`) | `core/app.js` + inline script in `app.html` | `ds-`, `dsb-`, `desk-` |
| App icon picker | inline `<script>` in `app.html` (`setAppIcon`) | same inline script | `app-icon-` |
| Theme (dark/light) | inline `<script>` in `<head>` of `app.html` | `localStorage 'tsundoku_theme'` + `core/app.js` | `data-theme` |
| PWA / install / offline | `manifest.json`, `icons/` | `sw.js` (service worker, Android-only registration in `app.html`) | — |
| Toasts | `app.html` (`#toast`) | `core/app.js` | `toast` |

---

## 3. Prefix dictionary (grep these to find a whole feature)

| Prefix | Feature | Main file(s) |
|---|---|---|
| `lx-` | Loader animation | `app.html` |
| `bs-` | Add-book search sheet | `app.html` + `core/app.js` (~line 2.8–3.4k) |
| `lo-` / `wl-` | My Lists (data layer: `window._wl`) | `core/app.js` + `app.html` |
| `ld-` | List detail | `core/app.js` + `app.html` |
| `ldas-` | List-detail add sheet | `core/app.js` + `app.html` |
| `lbd-` | List book detail modal | `core/app.js` + `app.html` |
| `wl-paste-` | Paste a list | `core/app.js` **end of file** + `app.html` + `styles.css` |
| `al-` | Authors list | `core/app.js` + `app.html` |
| `gen-` | Genres list/detail | `core/app.js`, `core/genres.js` |
| `author-` | Author page & photo modal | `features/author-modal/author_modal.js` |
| `se-` / series | Series | `features/series/` |
| `ob-` | Omnibus | `features/omnibus/omnibus.js` |
| `gp-` | Genre pie | `features/genre-pie/genrepie.js` |
| `hb-` | Habit tracker | `features/habit-tracker/habit_tracker.js` |
| `sc-` | Share card | `features/share-card/share_card.js` |
| `sm-` | Shelf motion | `features/shelf-motion/shelf_motion.js` + `core/motion.js` |
| `tr-` | Tab reorder | `features/tab-reorder/tab_reorder.js` |
| `ds-` / `desk-` / `dsb-` | Desktop shell/sidebar | `app.html` + `core/app.js` |
| `qm-` | Quick menus (sort/view) | `app.html` + `core/app.js` |
| `bf-` | Backfill modal | `core/app.js` + `core/genres.js` |

---

## 4. Where NOT to look for app bugs

| File/dir | What it actually is |
|---|---|
| `index.html`, `index-v2.html`, `landing/*`, `get-started.html`, `tsundoku-journey.html` | Marketing/landing site — separate from the app |
| `board.html`, `graph.html`, `progress.html` | Standalone stats/visualization pages |
| `tools/` | One-off utilities (author-bio backfill, data backfill, desktop mockup) |
| `docs/` | Notes & patch files (`project-context` is a separate AI-context doc — complementary to this one) |
| `assets/`, `icons/`, `favicon*` | Static media only |

---

## 5. Bug-hunting cheat sheet (worked example)

> "Tapping a book in paste-a-list review opens the list instead of the search."

1. Feature = **paste a list** → prefix `wl-paste-`, file `core/app.js` (end), overlay `#wlPasteOverlay` in `app.html`.
2. The review step is `renderSummary`; the tap handler is `wlPasteFix`.
3. It navigates via `navPop(ov, document.getElementById('bookSearchOverlay'))` — the `bs-` overlay.
4. So the suspect code spans two features in ONE file (`core/app.js`), and the fix likely
touches `wlPasteFix` + `wlPasteOpen` + `wlPasteBack` only.

General rule: **markup bug → `app.html`; behavior bug → `core/app.js` (or the owning
`features/` file); look broken → `core/styles.css`.** Most fixes touch exactly one of
these three; paste-a-list-style navigation bugs touch only `core/app.js`.
