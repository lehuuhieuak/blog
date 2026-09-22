# Stitch UI checkpoints

Scope: align existing frontend with design/stitch using Geist and Geist Mono, preserving PLAN.md API, SSR, semantic light/dark tokens, editor and TOC behavior. Stitch screenshots with serif fallback are export defects; use the user-selected Geist fonts. Existing unrelated/untracked files are excluded from commits.

## Tasks

1. Font foundation — Next font loader and shared font tokens.
2. Public UI — shared chrome, list/tag pages, article typography/TOC, about and 404.
3. Admin UI — list, create/edit form, preview and delete dialog.
4. Integration audit — browser layout/font/theme checks and existing lifecycle/TOC tests where services are available.

Tasks 2 and 3 run in parallel with disjoint file ownership after task 1. Orchestrator reviews and commits each validated task; no pushes. Checkpoints record validation evidence and commit subjects (use git log for hashes).

## Progress

- Baseline: cf96fde. PLAN.md font choice already updated by user request.
- Initial npm invocation blocked by shell fnm setup; locating installed Node executable before validation.

### Checkpoint 1 — font foundation

- Review: Geist/Geist Mono loader, latin + vietnamese subsets, swap, fallback stacks and CSS variables match PLAN.md; no client boundary added.
- Validation: 15/15 unit tests and TypeScript passed. `npm run build -- --webpack` passed with real Google Font downloads.
- Environment: default Turbopack build failed because its PostCSS worker could not bind a port. Webpack production build used without changing project scripts/configuration.
- Commit: `feat: align typography with Geist font plan`.
- Remaining: public and admin UI (parallel), final browser/E2E audit.

### Integration notes (in progress)

- User changed new subagents to Luna / xhigh. Original Sol implementers reached usage limits after saving partial changes; Luna finishers continue from existing diffs.
- Root review requested editor columns matching create/edit references, removal of misleading private-session and implementation-only UI labels, completion of interrupted 404/about styles, 12px wrapping tag labels, and removal of hardcoded article category.
- Ruling: use Geist consistently even where reference exports fall back to serif; preserve dynamic site/article data instead of mock category, reading-time or draft-stat values. Otherwise screenshots would produce misleading content.
- Ruling: preserve existing nonfixed header and desktop TOC 2rem offset to retain the current keyboard/scrollspy contract; use Stitch header sizing and spacing.
- Baseline browser evidence: TOC E2E passed. Lifecycle reached theme but old exact-class matcher failed on Next font classes; fixed to match the `dark` class token and added finally cleanup. Lifecycle rerun passed (27.3s).
- New typography/browser test failed against baseline 404 because no h1 existed, covering the requested 404 redesign.

### Review fixes before final validation

- Removed CSS reset that overrode admin utility gutters; added browser assertion for at least 16px main gutter.
- Removed duplicate accessible name from the title field wrapper; the input retains its label.
- Consolidated shadcn tag styling in component classes; code block line height is applied to `pre`.
- Fixed published-to-draft status badge after successful save; lifecycle test asserts the displayed draft state.
- Confirmed Chromium reports no direct font glyphs on Chroma's deeply nested `code` wrapper; font test now inspects its actual keyword text node (verified Geist Mono custom glyphs).
- Guarded absent TOC data for short public articles. Existing TOC test now requires HTTP 200 and visible article heading for the no-TOC route, preventing error pages from satisfying the absence-of-TOC assertions.

### Checkpoint 2 — public UI

- Updated public chrome, home/tag lists, article typography and code blocks, TOC panel, about and centered 404 to the Stitch layout with user-selected Geist fonts.
- Preserved public SSR, server-rendered/sanitized Markdown, semantic dark theme and TOC scrollspy behavior. No backend/API changes.
- Root review and screenshot audit: 24 route/viewport combinations (375/768/1440), no horizontal overflow, minimum 16px gutter, Geist headings throughout; inspected dark mode, preview and delete dialog.
- Validation: 15/15 unit tests, TypeScript, Webpack production build and 3/3 integrated E2E passed. TOC regression verifies no-heading article returns 200.
- Commit: `feat: align public blog pages with Stitch design`.
- The legacy editor grid rule remains in this checkpoint's index so the pre-existing editor keeps its layout; removing it belongs to the admin checkpoint that introduces utility-owned grids.
