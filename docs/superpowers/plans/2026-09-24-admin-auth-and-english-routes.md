# Admin Authentication and English Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect the administration UI and API with one fixed backend account and an eight-hour signed cookie session, while moving every frontend route to its approved English path.

**Architecture:** The Go HTTP delivery layer verifies a fixed bcrypt credential, issues an HMAC-SHA-256 session cookie, enforces session and origin middleware, and leaves article domain/application packages unchanged. Next.js keeps public pages and admin shells server-rendered, forwards only the admin cookie for server-side admin API reads, and uses small client islands for login, logout, and the existing editor. Route helpers provide one source for public/admin URLs; removed Vietnamese paths have no compatibility redirects.

**Tech Stack:** Go 1.27, Gin 1.11, `golang.org/x/crypto/bcrypt`, HMAC-SHA-256, Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, shadcn/Base UI, Vitest 4, Playwright 1.59, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-24-admin-auth-and-english-routes-design.md`

## Global Constraints

- Read `PLAN.md` before every task and update it before product code relies on the new architecture.
- Keep Clean Architecture dependencies `delivery/adapters -> application -> domain`; domain and application must not import Gin, pgx, cookies, or HTTP concerns.
- The fixed credential is username `admin` and the bcrypt hash of password `Hieu1234@@`; plaintext password must not appear in production backend source.
- Sessions last exactly eight hours and use the `admin_session` cookie with `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`, and configurable `Secure`.
- `ADMIN_SESSION_SECRET` is runtime-only, at least 32 bytes, and absence or insufficient length must prevent API startup.
- Every article and Markdown-preview endpoint under `/api/v1/admin` requires a valid session; login and idempotent logout are the only unauthenticated admin POST endpoints.
- Every non-preflight admin `POST`, `PUT`, and `DELETE`, including login/logout, requires `Origin` to equal `CORS_ALLOWED_ORIGIN`.
- Production web and `/api/v1` share one public origin; local ports may be cross-origin and therefore require explicit credentialed CORS.
- Frontend routes are `/`, `/articles/[slug]`, `/tags/[slug]`, `/about`, `/admin/login`, `/admin/articles`, `/admin/articles/new`, and `/admin/articles/[id]`.
- Removed Vietnamese frontend routes return `404`; do not add redirects or rewrites for them.
- UI copy remains Vietnamese, public pages remain Server Components, and only login/logout/editor interactions create client boundaries.
- Do not modify `deploy/nginx/minimal-blog.conf`.
- Preserve unrelated untracked files and changes. Before each commit inspect `git status --short`, `git diff --cached --check`, and the staged diff; stage only the current task.
- Use Conventional Commits and create one commit per completed task after its focused validation and review pass. Do not push, create a PR, amend, squash, or rebase.
- All implementers and reviewers use `gpt-6-luna` with reasoning effort `xhigh`. Implementers must not spawn subagents.
- The Go skill `cc-skills-golang:golang-how-to` required by `AGENTS.md` is unavailable in this environment; record that limitation and follow the repository's Go rules directly.

## Review Focus

- A tampered, truncated, expired, wrong-version, or wrong-user session cookie must produce the same `401 unauthorized` response and never panic; Task 2 pins these cases.
- `next` values such as `https://evil.example`, `//evil.example`, `/admin/login?next=...`, `/administrator`, and malformed encodings must fall back to `/admin/articles`; Task 5 pins them.
- Public API requests and public SSR fetches must never receive the admin cookie; Task 5 verifies cookie forwarding is limited to admin helpers.
- Cross-origin local login must receive credentialed CORS only for the exact configured origin, while an unsafe request with a missing or mismatched origin must receive `403`; Task 3 pins this behavior.
- Removed Vietnamese paths must return `404` and must not appear in canonical URLs, sitemap, RSS, robots, or rendered links; Tasks 4 and 6 pin this behavior.

## Persistent Progress Ledger

- [x] Task 1: Source of truth and API contract
- [x] Task 2: Backend credential and signed-session core
- [x] Task 3: Backend auth HTTP flow, middleware, and runtime configuration
- [x] Task 4: English frontend route migration
- [x] Task 5: Frontend login, session guard, logout, and authenticated API calls
- [x] Task 6: E2E migration, deployment documentation, and final validation
- [x] Final whole-branch audit

Append one line below after every implementer, review, fix round, validation, and commit. Include the subagent name, commit range, exact command, result, and remaining findings.

- 2026-09-24 | `/root/task2_session_core` | `88ff335..HEAD` (Task 2 commit) | RED: `docker run --rm -v "$PWD/backend:/app" -w /app -v blog-auth-go-mod:/go/pkg/mod -v blog-auth-go-cache:/root/.cache/go-build golang:1.27-alpine go test ./internal/delivery/http -run 'TestAdminAuth(Credentials|Config)' -count=1` and session equivalent both failed to compile on missing auth APIs as expected; GREEN focused tests and `go vet ./internal/delivery/http` passed. No remaining code findings; Go skill unavailable in this environment and repository rules followed directly.
- 2026-09-24 | `/root/task2_session_core` | `88ff335..HEAD` | Validation: `docker run --rm -v "$PWD/backend:/app" -w /app -v blog-auth-go-mod:/go/pkg/mod -v blog-auth-go-cache:/root/.cache/go-build golang:1.27-alpine go test ./...` passed; focused `go vet`, `gofmt` check, and `git diff --check` passed. No remaining code findings.
- 2026-09-24 | `/root/task5_frontend_auth` | `6b79651685b34813bb2ae58ba2403cba722c3c38..HEAD` | RED/GREEN: `docker run --rm -v "$PWD/frontend:/app" -w /app node:24-alpine npm test -- --run tests/admin_auth.test.ts` first failed on the missing auth module; cookie-forwarding tests failed on missing `getAdminSession`; proxy tests failed on the missing proxy; browser-call tests failed on missing client auth helpers. The focused tests passed after each implementation. Final validation: `docker run --rm -v "$PWD/frontend:/app" -w /app node:24-alpine sh -lc 'npm test -- --run tests/admin_auth.test.ts tests/api.test.ts tests/routes.test.ts && npm run check && npm run build'` passed; full `npm test` passed 39/39; `git diff --check` passed. Task 5 commit: `feat: add admin login and session guard`. No remaining findings.
- 2026-09-24 | `/root/task6_e2e` | `0174e39..59ee842` | Added authenticated E2E coverage and migrated lifecycle, typography, and TOC specs to English routes; `59ee842 test: cover authenticated admin workflow`. Static esbuild parse and `git diff --check` passed; the four legacy paths appeared only in explicit 404 assertions. Initial local Playwright execution was unavailable because npm was missing and Docker socket access was denied; controller later ran the suite on a disposable stack.
- 2026-09-24 | `/root/task6_e2e` | `59ee842..afe7d9a` | Controller's first real run showed all 7 admin-auth tests passing, while lifecycle (47.5s) and typography (52.3s) exceeded the 45s timeout. Added 90s timeouts scoped to those two test callbacks only; esbuild parse and `git diff --check` passed. The initial full run used a stale `task6-e2e-web` image with `PUBLIC_API_URL=http://api:8080`; rebuilding the correct E2E image fixed the environment.
- 2026-09-24 | README updates | `0174e39 docs: document admin authentication deployment`, `89c8501 fix: document local auth configuration` | Deployment and local auth guidance recorded; no Nginx sample changes.
- 2026-09-24 | Controller final validation | `afe7d9a..HEAD` | Go Docker `gofmt -w cmd/api/main.go internal/delivery/http/*.go && go vet ./... && go test ./...` exited 0. Frontend Docker `npm run check && npm test && npm run build` exited 0 with 41/41 tests and English/admin-login route build. `docker compose config --quiet`, `scripts/validate-production-compose.sh`, `scripts/test-deploy-production.sh`, and `docker compose build api web` all exited 0. A clean disposable `task6-e2e` stack passed the Playwright Chromium suite 10/10 in 1.9m after the image rebuild and scoped timeout fix. Route scan found only the four explicit old-route 404 assertions; backend non-test password scan had no matches; `git diff --check` passed and controller observed a clean status. No remaining validation failures.

### Task 1: Update the Source of Truth and API Contract

**Files:**
- Modify: `PLAN.md`
- Modify: `backend/openapi/openapi.yaml`
- Modify: `docs/superpowers/specs/2026-09-24-admin-auth-and-english-routes-design.md`
- Modify: `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`

**Interfaces:**
- Consumes: the approved design document.
- Produces: the exact auth endpoints, cookie scheme, errors, route names, and acceptance criteria used by Tasks 2–6.

- [x] **Step 1: Rewrite the conflicting product decisions in `PLAN.md`**

Replace the public/admin route lists with the approved English paths. Replace the unauthenticated-admin banner and “future middleware” statements with the fixed-account login, eight-hour signed cookie, protected API group, logout, and no-user-table decisions. Add the three auth endpoints and `401`/`403` behavior. Keep “reader accounts” and database-backed users outside V1, but remove authentication itself from the out-of-scope list. Extend frontend/backend/E2E acceptance criteria with login, logout, session expiry, CSRF origin validation, English URLs, and `404` for old Vietnamese routes.

- [x] **Step 2: Update OpenAPI before implementation**

Set the API description to authenticated administration. Add:

```yaml
components:
  securitySchemes:
    adminSession:
      type: apiKey
      in: cookie
      name: admin_session
  schemas:
    LoginRequest:
      type: object
      required: [username, password]
      properties:
        username: { type: string, example: admin }
        password: { type: string, format: password }
    AdminSession:
      type: object
      required: [username, expires_at]
      properties:
        username: { type: string, const: admin }
        expires_at: { type: string, format: date-time }
  responses:
    Unauthorized:
      description: Missing or invalid admin session
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorResponse' }
    Forbidden:
      description: Origin validation failed
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorResponse' }
```

Define `POST /admin/auth/login`, `GET /admin/auth/session`, and `POST /admin/auth/logout` exactly as the spec states. Apply `security: [{ adminSession: [] }]` and `401` to each protected admin operation; add `403` to unsafe operations including login and logout.

Login returns `204` and sets an eight-hour `admin_session` cookie with `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`, and `Secure` when configured. Invalid credentials return the generic `401 unauthorized` envelope. Session lookup returns `200` with `data.username = "admin"` and UTC ISO-8601 `data.expires_at`; logout returns `204` and expires the same cookie even when it is missing or expired. A missing or mismatched `Origin` on any non-preflight admin `POST`, `PUT`, or `DELETE` returns `403 csrf_failed`; malformed login input returns `422 validation_error`.

- [x] **Step 3: Mark the design as approved and implementation active**

Change the design status from “Implementation has not started” to “Approved; implementation tracked in `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`.” Do not mark any implementation task complete.

- [x] **Step 4: Validate the documentation diff**

Run:

```bash
git diff --check
rg -n "intentionally unauthenticated|chưa có xác thực|/quan-tri|/bai-viet|/the/|/gioi-thieu" PLAN.md backend/openapi/openapi.yaml
```

Expected: `git diff --check` exits 0; any Vietnamese path matches in `PLAN.md` are explicitly described as removed paths or test expectations, and OpenAPI contains none of the old unauthenticated description.

- [x] **Step 5: Commit the approved contract**

Stage only the four task files, inspect the staged diff, and commit:

```bash
git commit -m "docs: define admin authentication contract"
```

### Task 2: Build the Backend Credential and Signed-Session Core

**Files:**
- Create: `backend/internal/delivery/http/auth.go`
- Create: `backend/internal/delivery/http/auth_test.go`
- Modify: `backend/go.mod`
- Modify: `backend/go.sum`
- Modify: `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`

**Interfaces:**
- Consumes: username `admin`, bcrypt hash `$2b$12$M2x1.Uei/N/F8nKzWIoT7eoGwZpBF/hRdYPasq//df2ftNgyk5Wde`, runtime signing secret, secure-cookie flag, eight-hour TTL, and an injected clock.
- Produces: `NewAdminAuth(secret string, secure bool, allowedOrigin string, now func() time.Time) (*AdminAuth, error)`, `(*AdminAuth).validCredentials(username, password string) bool`, `(*AdminAuth).issueCookie() (*http.Cookie, AdminSession, error)`, `(*AdminAuth).clearCookie() *http.Cookie`, and `(*AdminAuth).sessionFromRequest(*http.Request) (AdminSession, error)`.

- [x] **Step 1: Write failing table-driven tests for credentials and constructor validation**

Create `auth_test.go` with cases equivalent to:

```go
func TestAdminAuthCredentials(t *testing.T) {
	tests := []struct {
		name, username, password string
		want                     bool
	}{
		{"valid", "admin", "Hieu1234@@", true},
		{"wrong username", "Admin", "Hieu1234@@", false},
		{"wrong password", "admin", "Hieu1234@", false},
		{"empty", "", "", false},
	}
	// Construct with a 32-byte test secret and fixed clock, then compare each result.
}
```

Add constructor cases for 31-byte secret rejection, 32-byte acceptance, and nil clock rejection. Assert errors without logging the supplied values.

- [x] **Step 2: Run the focused test and confirm red state**

Run `cd backend && go test ./internal/delivery/http -run 'TestAdminAuth(Credentials|Config)' -count=1`.

Expected: FAIL because `NewAdminAuth` and `AdminAuth` do not exist.

- [x] **Step 3: Add the minimal credential/config implementation**

Promote `golang.org/x/crypto` to a direct dependency and use `bcrypt.CompareHashAndPassword`. Define:

```go
const (
	adminUsername     = "admin"
	adminPasswordHash = "$2b$12$M2x1.Uei/N/F8nKzWIoT7eoGwZpBF/hRdYPasq//df2ftNgyk5Wde"
	adminCookieName   = "admin_session"
	adminSessionTTL   = 8 * time.Hour
)

type AdminSession struct {
	Username  string    `json:"username"`
	ExpiresAt time.Time `json:"expires_at"`
}

type AdminAuth struct {
	secret        []byte
	secure        bool
	allowedOrigin string
	now           func() time.Time
}
```

`NewAdminAuth` copies the secret bytes, requires at least 32 bytes, requires a non-nil clock, and trims/rejects an empty allowed origin. `validCredentials` always performs bcrypt comparison and combines it with a constant-time username comparison so an unknown username does not bypass the expensive password check.

- [x] **Step 4: Add failing session round-trip and rejection tests**

Use a fixed UTC clock. Test that `issueCookie` creates a cookie with `Name=admin_session`, `Path=/`, `HttpOnly=true`, `SameSite=http.SameSiteLaxMode`, `MaxAge=28800`, exact UTC expiry, and the configured `Secure` value. Convert the cookie into a request and verify the session. Add table rows that mutate the payload, signature, version, username, expiry, separator count, and base64 encoding; all must return the same sentinel `errInvalidSession` without panicking. Verify `clearCookie` uses the same name/path/security attributes and `MaxAge=-1`.

- [x] **Step 5: Run the focused session tests and confirm red state**

Run `cd backend && go test ./internal/delivery/http -run 'TestAdmin(Session|Cookie)' -count=1`.

Expected: FAIL because cookie issue/verification is incomplete.

- [x] **Step 6: Implement the minimal signed-session codec**

Encode a private payload containing version `1`, username, and Unix expiry as base64url JSON; append a base64url HMAC-SHA-256 signature separated by one dot. Verify using `hmac.Equal`, exact version/username, and `now().Before(expiresAt)`. Map every parse/signature/expiry failure to `errInvalidSession`. Never include the password hash or signing secret in the payload or an error.

- [x] **Step 7: Format and validate the backend core**

Run:

```bash
cd backend
gofmt -w internal/delivery/http/auth.go internal/delivery/http/auth_test.go
go mod tidy
go test ./internal/delivery/http -run 'TestAdmin(Auth|Session|Cookie)' -count=1
go vet ./internal/delivery/http
```

Expected: all focused tests and vet pass.

- [x] **Step 8: Commit the backend auth core**

Stage only the auth files, module files, and updated progress ledger; inspect the staged diff and commit:

```bash
git commit -m "feat: add signed admin sessions"
```

### Task 3: Protect the Backend HTTP API and Wire Runtime Configuration

**Files:**
- Create: `backend/internal/delivery/http/auth_http.go`
- Create: `backend/internal/delivery/http/auth_http_test.go`
- Modify: `backend/internal/delivery/http/router.go`
- Modify: `backend/internal/delivery/http/router_test.go`
- Modify: `backend/internal/delivery/http/router_public_test.go`
- Modify: `backend/cmd/api/main.go`
- Create: `backend/cmd/api/main_test.go`
- Modify: `.env.example`
- Modify: `compose.yaml`
- Modify: `deploy/runtime.env.example`
- Modify: `deploy/compose.production.yaml`
- Modify: `scripts/validate-production-compose.sh`
- Modify: `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`

**Interfaces:**
- Consumes: `AdminAuth` from Task 2 and `CORS_ALLOWED_ORIGIN`, `ADMIN_SESSION_SECRET`, `ADMIN_COOKIE_SECURE` runtime values.
- Produces: auth handlers/middleware, `NewRouter(articles ArticleUseCases, ready func(context.Context) error, auth *AdminAuth, corsOrigin string, logger *slog.Logger) *gin.Engine`, protected admin API behavior, and runtime config passed through both Compose files.

- [x] **Step 1: Write failing HTTP and bootstrap configuration tests**

Create `auth_http_test.go` with a test router using a fixed clock and 32-byte secret. Create `main_test.go` with an injected environment reader and clock; cover a missing or short session secret, invalid `ADMIN_COOKIE_SECURE`, empty or malformed `CORS_ALLOWED_ORIGIN`, and valid configuration.

Cover these HTTP cases:

```go
func TestAdminLoginAndSession(t *testing.T)       {}
func TestAdminLoginRejectsCredentials(t *testing.T) {}
func TestAdminLogoutClearsCookie(t *testing.T)    {}
func TestAdminRoutesRequireSession(t *testing.T)  {}
func TestAdminUnsafeRoutesRequireOrigin(t *testing.T) {}
```

For login, send the exact configured `Origin`, JSON credentials, assert `204`, capture `Set-Cookie`, then call session and assert `200`, username `admin`, and the fixed expiry. Wrong username/password must both return the same `401` envelope and no cookie. Table-drive every protected route: list, create, get, update, delete, and Markdown preview; without a cookie each returns `401` before invoking the article fake. Login/logout with missing or wrong origin and authenticated article mutations with missing or wrong origin return `403 csrf_failed`. Public routes stay accessible.

- [x] **Step 2: Run HTTP and configuration tests and confirm red state**

Run `cd backend && go test ./internal/delivery/http -run 'TestAdmin(Login|Logout|Routes|Unsafe)' -count=1` and `go test ./cmd/api -run '^TestLoadRuntimeConfig$' -count=1`.

Expected: FAIL because routes/middleware and the bootstrap configuration helper are not installed.

- [x] **Step 3: Implement handlers and middleware**

Add `login`, `session`, `logout`, `requireSession`, and `requireAdminOrigin` in `auth_http.go`. Use the existing error envelope:

```go
c.JSON(http.StatusUnauthorized, errorEnvelope("unauthorized", "Phiên đăng nhập không hợp lệ", nil))
c.JSON(http.StatusForbidden, errorEnvelope("csrf_failed", "Nguồn yêu cầu không hợp lệ", nil))
```

Register the router in this order:

```go
admin := api.Group("/admin")
admin.Use(auth.requireAdminOrigin())
admin.POST("/auth/login", auth.login)
admin.POST("/auth/logout", auth.logout)
protected := admin.Group("")
protected.Use(auth.requireSession())
protected.GET("/auth/session", auth.session)
// Register every existing article and Markdown preview route on protected.
```

Origin middleware skips `GET`, `HEAD`, `OPTIONS`; it rejects every other admin method unless the single `Origin` value exactly equals `allowedOrigin`. CORS preflight remains handled globally before the admin group.

- [x] **Step 4: Update existing router tests and credentialed CORS tests**

Change test router construction to inject `AdminAuth`. Extend `TestCORSAllowsConfiguredOriginOnly` to assert `Access-Control-Allow-Credentials: true` for the configured origin, no credentials header for another origin, and successful `OPTIONS` with allowed methods/headers. Ensure `Vary` includes `Origin`. Keep public response tests unauthenticated.

- [x] **Step 5: Parse runtime auth configuration in `main.go`**

Read `ADMIN_SESSION_SECRET`; parse `ADMIN_COOKIE_SECURE` with `strconv.ParseBool`, defaulting only an empty value to `false`. Construct `AdminAuth` with `time.Now` and `CORS_ALLOWED_ORIGIN`. On invalid secret, secure flag, or origin, log only the configuration key and safe error description, then exit before opening the database/server. Pass auth into `NewRouter`.

- [x] **Step 6: Add runtime variables to development and production Compose**

Require `ADMIN_SESSION_SECRET` for the API service in both Compose files. Use `${ADMIN_COOKIE_SECURE:-false}` locally and `${ADMIN_COOKIE_SECURE:?ADMIN_COOKIE_SECURE is required}` in production. Add empty/change-required placeholders to `.env.example`; add `ADMIN_COOKIE_SECURE=true` and a non-secret placeholder to `deploy/runtime.env.example`. Update `scripts/validate-production-compose.sh` sample environment with a 32-byte test-only secret and `ADMIN_COOKIE_SECURE=true`, then assert both variables appear under the rendered API service.

- [x] **Step 7: Format and run backend/deployment validation**

Run:

```bash
cd backend
gofmt -w cmd/api/main.go cmd/api/main_test.go internal/delivery/http/auth_http.go internal/delivery/http/auth_http_test.go internal/delivery/http/router.go internal/delivery/http/router_test.go internal/delivery/http/router_public_test.go
go test ./internal/delivery/http ./cmd/api -count=1
go test ./...
go vet ./...
cd ..
ADMIN_SESSION_SECRET=local-test-session-secret-32-bytes-minimum docker compose config --quiet
bash scripts/validate-production-compose.sh
```

Expected: all commands pass.

- [x] **Step 8: Commit protected backend API and runtime config**

Stage only Task 3 files and the ledger, inspect the staged diff, and commit:

```bash
git commit -m "feat: protect admin API with session auth"
```

### Task 4: Migrate Every Frontend Route to English

**Files:**
- Create: `frontend/src/lib/routes.ts`
- Create: `frontend/tests/routes.test.ts`
- Move: `frontend/src/app/(public)/bai-viet/[slug]/page.tsx` to `frontend/src/app/(public)/articles/[slug]/page.tsx`
- Move: `frontend/src/app/(public)/the/[slug]/page.tsx` to `frontend/src/app/(public)/tags/[slug]/page.tsx`
- Move: `frontend/src/app/(public)/gioi-thieu/page.tsx` to `frontend/src/app/(public)/about/page.tsx`
- Move: `frontend/src/app/(admin)/quan-tri/bai-viet/page.tsx` to `frontend/src/app/(admin)/admin/articles/page.tsx`
- Move: `frontend/src/app/(admin)/quan-tri/bai-viet/moi/page.tsx` to `frontend/src/app/(admin)/admin/articles/new/page.tsx`
- Move: `frontend/src/app/(admin)/quan-tri/bai-viet/[id]/page.tsx` to `frontend/src/app/(admin)/admin/articles/[id]/page.tsx`
- Modify: `frontend/src/components/PublicChrome.tsx`
- Modify: `frontend/src/components/NotFound.tsx`
- Modify: `frontend/src/components/ArticleList.tsx`
- Modify: `frontend/src/features/editor/ArticleEditor.tsx`
- Modify: `frontend/src/app/(admin)/layout.tsx`
- Modify: `frontend/src/app/sitemap.xml/route.ts`
- Modify: `frontend/src/app/rss.xml/route.ts`
- Modify: `frontend/src/app/robots.txt/route.ts`
- Modify: `frontend/tests/pagination.test.ts`
- Modify: `frontend/tests/pagination_query.test.ts`
- Modify: `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`

**Interfaces:**
- Consumes: the approved route table.
- Produces: `routes.home`, `routes.about`, `routes.adminLogin`, `routes.adminArticles`, `routes.adminNewArticle`, `routes.article(slug)`, `routes.tag(slug)`, and `routes.adminArticle(id)` used by Task 5 and all route-dependent output.

- [x] **Step 1: Write failing route helper tests**

Create `routes.test.ts`:

```ts
expect(routes.home).toBe("/")
expect(routes.about).toBe("/about")
expect(routes.adminLogin).toBe("/admin/login")
expect(routes.adminArticles).toBe("/admin/articles")
expect(routes.adminNewArticle).toBe("/admin/articles/new")
expect(routes.article("xin chào")).toBe("/articles/xin%20ch%C3%A0o")
expect(routes.tag("go/web")).toBe("/tags/go%2Fweb")
expect(routes.adminArticle("id/1")).toBe("/admin/articles/id%2F1")
```

- [x] **Step 2: Run the route test and confirm red state**

Run `cd frontend && npm test -- --run tests/routes.test.ts`.

Expected: FAIL because `src/lib/routes.ts` does not exist.

- [x] **Step 3: Implement the central route helper**

Create a server/client-safe module with immutable string constants and `encodeURIComponent` in each dynamic builder. Do not include the API endpoint paths in this module because they already use English and are not frontend routes.

- [x] **Step 4: Move route pages and replace every rendered/internal URL**

Move the six page files to the exact English directories above. Replace links and programmatic navigation in public chrome, not-found UI, article lists, tag/article pages, admin layout/list/editor, pagination, metadata, JSON-LD, sitemap, RSS, and robots with the new helper. `robots.txt` must use `Disallow: /admin/`. Preserve Vietnamese visible labels.

- [x] **Step 5: Update unit expectations and prove no old route remains in runtime source**

Change pagination expectations to `/tags/golang` and `/admin/articles?status=draft`. Run:

```bash
cd frontend
npm test -- --run tests/routes.test.ts tests/pagination.test.ts tests/pagination_query.test.ts
rg -n '(/quan-tri|/bai-viet|/the/|/gioi-thieu)' src
```

Expected: tests pass and `rg` returns no match under `src`.

- [x] **Step 6: Type-check and build the migrated route tree**

Run:

```bash
cd frontend
npm run check
npm run build
```

Expected: type-check and production build pass; build route output contains `/about`, `/articles/[slug]`, `/tags/[slug]`, `/admin/articles`, `/admin/articles/new`, and `/admin/articles/[id]`, with none of the removed Vietnamese route directories.

- [x] **Step 7: Commit the route migration**

Stage only Task 4 files and the ledger, inspect staged rename detection/diff, and commit:

```bash
git commit -m "feat: migrate frontend routes to English"
```

### Task 5: Add Frontend Login, Session Guard, Logout, and Authenticated Calls

**Files:**
- Create: `frontend/src/lib/admin-auth.ts`
- Create: `frontend/src/lib/browser-api.ts`
- Create: `frontend/src/proxy.ts`
- Create: `frontend/src/features/auth/LoginForm.tsx`
- Create: `frontend/src/features/auth/LogoutButton.tsx`
- Create: `frontend/src/app/(admin-auth)/admin/login/page.tsx`
- Create: `frontend/tests/admin_auth.test.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/features/editor/ArticleEditor.tsx`
- Modify: `frontend/src/app/(admin)/layout.tsx`
- Modify: `frontend/src/app/(admin)/admin/articles/new/page.tsx`
- Modify: `frontend/src/app/(admin)/admin/articles/[id]/page.tsx`
- Modify: `frontend/tests/api.test.ts`
- Modify: `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`

**Interfaces:**
- Consumes: backend auth endpoints from Task 3 and route helpers from Task 4.
- Produces: `ADMIN_SESSION_COOKIE`, `safeAdminNext(value?: string | null): string`, `browserAPIBase(): string`, `getAdminSession(): Promise<{ data: AdminSession }>`, optimistic proxy routing, login/logout UI, SSR admin guard, and credentialed editor mutations.

- [x] **Step 1: Write failing safe-destination tests**

Create `admin_auth.test.ts` with:

```ts
it.each([
  [undefined, "/admin/articles"],
  ["", "/admin/articles"],
  ["https://evil.example/admin/articles", "/admin/articles"],
  ["//evil.example/admin/articles", "/admin/articles"],
  ["/administrator", "/admin/articles"],
  ["/admin/login?next=/admin/articles", "/admin/articles"],
  ["/admin/articles/new?draft=1", "/admin/articles/new?draft=1"],
])("normalizes next=%s", (value, expected) => {
  expect(safeAdminNext(value)).toBe(expected)
})
```

Add malformed URL encodings and backslash-based external forms to the fallback rows.

- [x] **Step 2: Run the destination test and confirm red state**

Run `cd frontend && npm test -- --run tests/admin_auth.test.ts`.

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement pure auth/navigation helpers and browser API config**

Define `ADMIN_SESSION_COOKIE = "admin_session"`. Parse candidate destinations with `new URL(value, "http://admin.local")`; accept only the same synthetic origin, a pathname beginning `/admin/`, and a pathname other than `/admin/login`. Return normalized pathname plus search; discard fragments. Move `apiBaseForBrowser` from `lib/api.ts` into `browser-api.ts` as `browserAPIBase`, preserving the current `PUBLIC_API_URL` fallback.

- [x] **Step 4: Write failing server API cookie-forwarding tests**

Mock `next/headers` so `cookies().get("admin_session")` returns a known value. Assert `getAdminSession`, `listAdminArticles`, and `getAdminArticle` send exactly `Cookie: admin_session=<encoded value>` to the internal API. Assert `listArticles`, `getArticle`, and `listTags` omit `Cookie`. Add a `401` response case that remains an `APIError` with status `401`.

- [x] **Step 5: Implement admin-only cookie forwarding**

Keep the public `request` helper cookie-free. Add an `adminRequest` helper that reads `ADMIN_SESSION_COOKIE` using async `cookies()`, constructs a `Headers` object, forwards only that cookie to the trusted `API_URL`, and delegates error parsing to the existing request logic. Route `listAdminArticles`, `getAdminArticle`, and new `getAdminSession` through `adminRequest`. Define the `AdminSession` TypeScript shape with `username: "admin"` and `expires_at: string`.

- [x] **Step 6: Add optimistic Proxy routing and the authoritative server layout check**

In `proxy.ts`, match `/admin/:path*`, allow `/admin/login`, redirect requests without the cookie to `/admin/login?next=<pathname+search>`, and place the validated current path in an internal `x-admin-return-to` request header when a cookie is present. In the async admin layout, call `getAdminSession`; on `401`, read that header, pass it through `safeAdminNext`, and redirect to login. Re-throw non-auth API errors. Remove the old warning banner and render `LogoutButton` in the header.

- [x] **Step 7: Build the accessible login and logout client islands**

The login page exports `noindex` metadata, validates its `next` search parameter server-side, and passes it plus `browserAPIBase()` to `LoginForm`. The form uses existing `Label`, `Input`, `Button`, and `Alert` components; labels remain visible; inputs use `autoComplete="username"` and `autoComplete="current-password"`; submission sends JSON with `credentials: "include"`. On `204`, navigate with `window.location.assign(nextPath)`; on failure show one generic Vietnamese message and restore the enabled submit button.

`LogoutButton` posts with `credentials: "include"`; on `204`, navigate to `/admin/login`. On failure, show a compact accessible error status without silently reporting success.

- [x] **Step 8: Authenticate browser editor requests and handle expiry**

Update editor fetches to use `credentials: "include"`. If a response is `401`, compute `window.location.pathname + window.location.search`, normalize it as a local `/admin/` path, and navigate to `/admin/login?next=<encoded>`. Update create/edit pages to import `browserAPIBase` from the client-safe module. Keep all backend API endpoint strings unchanged.

- [x] **Step 9: Run focused frontend tests, type-check, and build**

Run:

```bash
cd frontend
npm test -- --run tests/admin_auth.test.ts tests/api.test.ts tests/routes.test.ts
npm run check
npm run build
```

Expected: all tests, type-check, and production build pass. Build output includes `/admin/login`; public pages remain server-rendered.

- [x] **Step 10: Commit frontend authentication**

Stage only Task 5 files and the ledger, inspect the staged diff, and commit:

```bash
git commit -m "feat: add admin login and session guard"
```

### Task 6: Update E2E, Deployment Documentation, and Run Final Validation

**Files:**
- Create: `frontend/e2e/helpers/admin-auth.ts`
- Create: `frontend/e2e/admin-auth.spec.ts`
- Modify: `frontend/e2e/article-lifecycle.spec.ts`
- Modify: `frontend/e2e/stitch-typography.spec.ts`
- Modify: `frontend/e2e/toc-sticky.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-09-24-admin-auth-and-english-routes.md`

**Interfaces:**
- Consumes: completed backend/frontend auth and English routes.
- Produces: authenticated E2E helpers, regression coverage for the full browser/API flow, deployment instructions for the existing reverse proxy, and final verification evidence.

- [x] **Step 1: Add a shared authenticated Playwright helper**

Implement helpers that derive the web origin from `BASE_URL`, post to `${E2E_API_BASE_URL}/admin/auth/login` with credentials `admin`/`Hieu1234@@` and the exact `Origin` header, assert `204`, and reuse the page-associated request context so `Set-Cookie` reaches subsequent page requests. Add a helper that supplies the exact `Origin` header to direct unsafe admin setup/cleanup calls.

- [x] **Step 2: Write the auth E2E cases**

In `admin-auth.spec.ts`, cover:

- visiting `/admin/articles/new` without a cookie redirects to `/admin/login?next=%2Fadmin%2Farticles%2Fnew`;
- wrong credentials show the generic error and remain on login;
- valid credentials return to the requested page;
- `GET /api/v1/admin/articles` without a cookie returns `401 unauthorized`;
- an unsafe authenticated API request with a wrong or missing origin returns `403 csrf_failed`;
- logout followed by `/admin/articles` redirects to login;
- `https://evil.example` and `//evil.example` supplied as `next` end at `/admin/articles` after login.

- [x] **Step 3: Migrate existing E2E paths and authenticated setup/cleanup**

Replace all Vietnamese frontend paths with the route table from Task 4. Authenticate before direct admin API creation/deletion and supply the correct origin on unsafe calls. Preserve every existing lifecycle, typography, responsive, theme, TOC, metadata, and delete-confirmation assertion. Add explicit `404` assertions for `/bai-viet/example`, `/the/example`, `/gioi-thieu`, and `/quan-tri/bai-viet`; assert the English paths appear in canonical, JSON-LD, sitemap, RSS, robots, and rendered anchors.

- [x] **Step 4: Rewrite README authentication and route guidance**

Remove statements that the admin area is unauthenticated and remove reliance on the repository's sample Nginx allowlist. Document the English routes, fixed username, the fact that changing the password requires generating/replacing its bcrypt hash and rebuilding, `ADMIN_SESSION_SECRET` generation with a cryptographically secure tool, `ADMIN_COOKIE_SECURE=true` for HTTPS, eight-hour expiry, same-origin production routing, and reverse-proxy rate limiting for `POST /api/v1/admin/auth/login`. Do not print the working password in general deployment examples; identify it only in the explicit initial-credential section requested for this installation.

- [x] **Step 5: Run all repository validation**

Run in order:

```bash
cd backend
gofmt -w cmd/api/main.go internal/delivery/http/*.go
go vet ./...
go test ./...
cd ../frontend
npm run check
npm test
npm run build
cd ..
ADMIN_SESSION_SECRET=local-test-session-secret-32-bytes-minimum docker compose config --quiet
bash scripts/validate-production-compose.sh
bash scripts/test-deploy-production.sh
docker compose build api web
```

Start the disposable local stack with a non-production signing secret and run `cd frontend && npm run test:e2e`. If container/network access prevents a command, record the exact command and error in the ledger; do not claim it passed and do not commit Task 6 until the task's required validation can run successfully under the repository rules.

- [x] **Step 6: Scan for route and secret regressions**

Run:

```bash
rg -n '(/quan-tri|/bai-viet|/the/|/gioi-thieu)' frontend/src frontend/e2e
rg -n 'Hieu1234@@' backend --glob '!**/*_test.go'
git diff --check
git status --short
```

Expected: old-route matches exist only in explicit E2E `404` assertions; the plaintext password does not appear in non-test backend code; the diff has no whitespace errors; unrelated pre-existing files remain unstaged.

- [x] **Step 7: Commit E2E and operational documentation**

Stage only Task 6 files and the updated ledger, inspect the staged diff, and commit:

```bash
git commit -m "test: cover authenticated admin workflow"
```

- [x] **Step 8: Run the final whole-branch audit**

Give a fresh `gpt-6-luna`/`xhigh` reviewer the spec, this plan, progress ledger, commit list, and full diff from the pre-feature base. Require separate verdicts for spec compliance and code quality/security. Route every Critical or Important finding through the bounded fix-and-re-review loop before completion. Record deferred Minor findings and every orchestrator ruling in the ledger.

- [x] **Step 9: Report completion without pushing**

Report the task commits, exact validation commands and results, any unavailable checks, remaining risks, deferred Minor findings, and all recorded rulings. Leave the branch local; do not push or create a pull request.

### Final audit and verification record — 2026-09-24

- Two independent `gpt-6-luna` reviewers at `xhigh` audited spec compliance and code quality/security. Both initial Important findings were fixed and re-reviewed. Later Minor findings covering configuration documentation and exact session-expiry precision were also fixed and re-reviewed. The final audits found no remaining spec findings or Critical/Important findings.
- Two deferred Minor findings remain: signed-session JSON parsing accepts unknown or duplicate fields, and CORS origin validation excludes unusual valid host forms such as IPv4-mapped IPv6 literals and trailing-dot DNS names.
- Fresh HEAD `38771dc` validation passed: `cd backend && gofmt -w cmd/api/main.go internal/delivery/http/*.go && go vet ./... && go test ./...`; `cd frontend && npm run check && npm test && npm run build` (44/44 tests). The exact `task6-e2e` API and web images were rebuilt from final source, then the clean-stack Playwright suite passed 10/10 in 1.7 minutes.
- No push, pull request, or merge was performed.
