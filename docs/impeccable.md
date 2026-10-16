## Design Context

### Users
Primary persona: the ADHD/neurodivergent reader — buys impulsively, reads in bursts, has a pile that grows faster than it shrinks. They open the app quickly and purposefully: to add a book before they forget, to log progress mid-read, to check what's next. The full spectrum of reader types use this (avid, casual, ADHD), but the ADHD reader is the one the design must never fail.

Their headspace: scattered attention, short sessions, no patience for friction. The interface must get out of the way immediately. Every extra tap is a tap they might not make.

Secondary context: desktop for longer browsing, but the emotional core is always the mobile, impulsive moment.

### Brand Personality
Three words: **focused, minimal, personal**

Voice: lowercase, direct, unhurried. No filler. No gamification ("streak", "goal", "achievement"). The name *tsundoku* (積ん読) is already the whole philosophy — a Japanese word for the pile of unread books, worn as a badge of identity rather than shame.

Emotional goal: the user should feel *in control without effort*. The shelf should feel like their own space — curated, calm, immediately legible. No noise. No social pressure. Just the books.

### Aesthetic Direction
**Unique — no external references.** The design should be its own thing: warm dark, literary, personal. It should feel like it couldn't be anything other than a book app built by someone who actually reads.

**Visual language:**
- Warm dark palette — background #0f0d0b / #1a1612, surfaces #242018 / #2e2920
- Accent: terracotta #c9714a — warm, decisive, not alarming
- Border: #3a342a — barely-there, like paper grain
- Text hierarchy: #f0ebe3 → #a09484 → #6b5f52
- Typography: DM Sans 300/400/500 — humanist, not geometric; lowercase labels throughout
- Covers are the hero — the grid *is* the interface; everything else is negative space
- Placeholder gradients use per-book palette seeds — every book feels individual
- Inline SVG icons, regular weight, never filled or heavy
- Spring easing: cubic-bezier(0.16,1,0.3,1) — physical, not mechanical
- Minimal ornamentation — if an element doesn't carry information, remove it

**Theme**: dark only.

**Anti-patterns to actively avoid:**
- Cluttered layouts with competing visual weight
- Social-network metrics (ratings visible in grid, comparison data)
- Gamification surfaces (streaks, badges, goals)
- Heavy drop shadows, glows, or gradients that distract from covers
- Anything that makes the pile feel like a problem to solve

### Design Principles

1. **The shelf is the soul.** Every UI decision must protect the cover grid. Modals, overlays, and bars must recede — books are always the subject.

2. **Focused and minimal.** If something can be removed without loss of function, remove it. Density serves the grid; everywhere else, breathe.

3. **No guilt UI.** Never surface metrics that could shame. No "last opened", no reading velocity, no comparative stats. Progress is private encouragement.

4. **ADHD-first interaction design.** Every flow must complete in the fewest possible taps. The most common actions (add, log progress, change status) must be reachable in two taps from anywhere. Reduce friction before adding features.

5. **Performance is a feature.** PWA on mid-range iOS. No new CSS animations on existing elements. Every transition earns its frame budget. Smoothness over flourish — always.

6. **Lowercase as philosophy.** Labels, buttons, tabs — lowercase signals unhurried and personal. Proper nouns and 積ん読 are the only exceptions.

---

### Token Reference

--bg: #0f0d0b / --bg2: #1a1612
--surface: #242018 / --surface2: #2e2920
--accent: #c9714a (terracotta) / --green: #5a8a6a (read)
--border: #3a342a
--text: #f0ebe3 / --text-dim: #a09484 / --text-muted: #6b5f52
font-family: DM Sans, weights 300/400/500
spacing: 8px grid
easing: cubic-bezier(0.16,1,0.3,1)
radius: 12px cards / 16px sheets / 100px pills

### Platform Constraints

- iOS PWA primary — env(safe-area-inset-*) on all edges, visualViewport for keyboard
- position: fixed for all overlays and floating bars (never absolute inside overflow)
- Touch: passive:true on scroll/move, guard touchcancel with didLongPress flag
- No frameworks, no build step — vanilla JS/HTML/CSS only
- Performance > animation — do not add CSS animations to existing elements
