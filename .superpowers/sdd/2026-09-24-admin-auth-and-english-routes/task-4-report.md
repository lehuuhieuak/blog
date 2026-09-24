# Task 4 Report: English Frontend Routes

## Implementation

- Added `frontend/src/lib/routes.ts` with the English route table, including encoded builders for article, tag, and admin article segments. `routes.admin` provides the `/admin/` robots exclusion prefix.
- Moved all six public and admin pages to the approved English App Router directories. Updated internal links, editor navigation, pagination, canonical metadata, JSON-LD, sitemap, RSS, and robots output to use the route table. The homepage also uses `routes.home` for canonical metadata and pagination.
- Updated pagination expectations and marked Task 4 implementation/validation steps complete in `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`.
- Visible Vietnamese labels and Server Component boundaries are preserved. No new client boundary was added.

## TDD evidence

Commands ran in the authorized `node:24-alpine` container, mounting this worktree's `frontend` at `/app`.

1. Added `tests/routes.test.ts`, then ran `npm test -- --run tests/routes.test.ts` before creating `src/lib/routes.ts`. RED: exit 1; Vitest reported `Cannot find package '@/lib/routes'`, as expected for the missing helper.
2. Vitest did not resolve the `@` alias in this test, so its import was changed to the relative `../src/lib/routes`. After implementing the route table, the route test passed (1/1).
3. Added the `/admin` prefix assertion needed by `robots.txt`. RED: the same command failed with `expected undefined to be '/admin'`. Added `routes.admin` and used it for `Disallow`; GREEN: the route test passed (1/1).

## Validation

- Focused: `npm test -- --run tests/routes.test.ts tests/pagination.test.ts tests/pagination_query.test.ts` — 3 files, 15 tests passed.
- Full: `npm test` — 4 files, 16 tests passed.
- `npm run check` initially reported six stale imports in `.next/types/validator.ts` pointing at the removed Vietnamese route files. After the successful production build regenerated Next route types, `npm run check` passed.
- `npm run build` — passed. Route output includes `/about`, `/articles/[slug]`, `/tags/[slug]`, `/admin/articles`, `/admin/articles/new`, and `/admin/articles/[id]`; no removed Vietnamese route directories appear.
- `rg -n '(/quan-tri|/bai-viet|/the/|/gioi-thieu)' src` — exit 1 with no matches in `frontend/src`.
- `git diff --check` — passed.

## Files

- Created: `frontend/src/lib/routes.ts`, `frontend/tests/routes.test.ts`.
- Moved: public article, tag, and about pages; admin article list, new, and edit pages to their English paths.
- Updated: `frontend/src/app/(public)/page.tsx`, `frontend/src/app/(admin)/layout.tsx`, `frontend/src/components/PublicChrome.tsx`, `frontend/src/components/NotFound.tsx`, `frontend/src/components/ArticleList.tsx`, `frontend/src/features/editor/ArticleEditor.tsx`, `frontend/src/app/sitemap.xml/route.ts`, `frontend/src/app/rss.xml/route.ts`, `frontend/src/app/robots.txt/route.ts`, `frontend/tests/pagination.test.ts`, `frontend/tests/pagination_query.test.ts`, and the plan ledger.

## Self-review and concerns

- The removed Vietnamese route strings do not appear in runtime source. API endpoint paths remain unchanged; there are no redirects, rewrites, Nginx changes, E2E changes, or README changes.
- `/admin/login` is in the route helper; its page and authentication flow are delivered by Task 5. E2E coverage remains in Task 6.
- No unresolved implementation concerns.
