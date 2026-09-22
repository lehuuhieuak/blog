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
