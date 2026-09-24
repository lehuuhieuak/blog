# Admin Authentication and English Routes Design

## Status

- Design approved in conversation on 2026-09-24.
- Implementation has not started.
- This document changes the decisions in `PLAN.md` that describe the admin area as unauthenticated and use Vietnamese frontend routes. `PLAN.md` must be updated in the same implementation before product code depends on the new contract.

## Goal

Protect the single-author administration area with one backend-owned account and a signed session cookie, without adding a user table. Add an accessible login screen and logout action. Rename every frontend route to English, without redirects from the removed Vietnamese routes.

The fixed username is `admin`. The initial password is `Hieu1234@@`. Backend source stores a bcrypt hash of this password rather than its plaintext value. Changing the username or password requires rebuilding and deploying the backend.

## Scope

The change includes backend authentication endpoints and middleware, frontend login and session-aware administration pages, English public and administration routes, API/OpenAPI updates, environment and deployment documentation, and tests for the affected flows.

No database table, schema migration, reader account, role system, password-management screen, password-reset flow, remember-me option, or server-side session store is added. The sample Nginx configuration is outside this change because production uses a separate reverse proxy.

## Route Changes

The home page remains `/`. Other frontend routes become:

| Current route | New route |
| --- | --- |
| `/bai-viet/[slug]` | `/articles/[slug]` |
| `/the/[slug]` | `/tags/[slug]` |
| `/gioi-thieu` | `/about` |
| `/quan-tri/bai-viet` | `/admin/articles` |
| `/quan-tri/bai-viet/moi` | `/admin/articles/new` |
| `/quan-tri/bai-viet/[id]` | `/admin/articles/[id]` |

The new login route is `/admin/login`. Removed Vietnamese routes return `404`; the application does not define permanent or temporary redirects for them. User-facing interface copy remains Vietnamese. Internal links, canonical URLs, metadata, JSON-LD, sitemap, RSS, robots directives, tests, and documentation use the new routes.

## Backend Authentication

### Credentials

The backend owns an immutable credential verifier with username `admin` and a committed bcrypt hash corresponding to `Hieu1234@@`. Password comparison uses bcrypt and never logs the submitted credential. The domain and article application layers remain unaware of authentication and do not import Gin or infrastructure packages.

### API contract

The backend adds these endpoints:

- `POST /api/v1/admin/auth/login` accepts `{ "username": string, "password": string }`, establishes a session, and returns `204`.
- `GET /api/v1/admin/auth/session` returns `200` with `{ "data": { "username": "admin", "expires_at": <UTC ISO-8601 timestamp> } }` for a valid session and `401` otherwise.
- `POST /api/v1/admin/auth/logout` expires the session cookie and returns `204`. It is safe to call when the cookie is missing or expired.

The login endpoint and idempotent logout endpoint are reachable without an existing session. The session endpoint requires a valid session. Every article and Markdown-preview endpoint under `/api/v1/admin` requires a valid session.

Authentication failures use the existing error envelope with HTTP `401`, code `unauthorized`, and a generic Vietnamese message that does not distinguish an unknown username, wrong password, expired session, or invalid signature. Authenticated unsafe requests with an invalid origin return HTTP `403` and code `csrf_failed`. Malformed login JSON or missing fields returns the existing `422 validation_error` contract.

### Session

The backend issues a compact session value containing a version, the admin identity, and an expiry timestamp. It signs the encoded payload with HMAC-SHA-256 using `ADMIN_SESSION_SECRET`. Verification checks the encoding, version, identity, signature with constant-time comparison, and expiry.

Sessions expire eight hours after login. There is no refresh or remember-me flow. The signing secret must be at least 32 bytes and is supplied only at runtime; the API fails during startup when it is absent or too short. Rotating this secret invalidates every issued session.

The cookie is named `admin_session` and uses `HttpOnly`, `SameSite=Lax`, and `Path=/`. `ADMIN_COOKIE_SECURE=true` is required in production so the cookie also uses `Secure`; local HTTP development may set it to `false`. The cookie does not set `Domain`. Logout expires the same cookie. Because sessions are stateless, logout removes the browser cookie but cannot revoke a copied cookie before expiry; rotating `ADMIN_SESSION_SECRET` is the emergency global revocation mechanism.

### CSRF and CORS

Every non-preflight `POST`, `PUT`, and `DELETE` request under `/api/v1/admin`, including login and logout, validates the `Origin` header against `CORS_ALLOWED_ORIGIN`. A missing or different origin is rejected. Current SSR administration calls are reads; browser code performs mutations.

The backend CORS middleware continues to allow one explicit origin, adds `Access-Control-Allow-Credentials: true`, and never emits a wildcard origin. Browser administration fetches use `credentials: "include"`. Production sends web and API traffic through the same public origin; cross-origin support remains necessary for the existing local development ports.

The application does not implement a login rate limiter. README deployment guidance requires rate limiting for the login endpoint at the existing reverse proxy.

## Frontend Authentication

The login page lives in a route group outside the protected admin layout, preventing redirect loops. It is a Server Component shell with the smallest practical Client Component for interactive submission. The form has labeled username and password fields, keyboard-visible focus, a submit busy state, and one generic error message for invalid credentials. It is excluded from indexing.

The protected admin layout verifies the session server-side before rendering its children. It forwards only the named session cookie from the incoming Next.js request to the trusted internal API URL. Missing or invalid sessions redirect to `/admin/login`. A requested protected URL is preserved in a `next` query parameter. The login flow accepts `next` only when it is a local path under `/admin` and is not `/admin/login`; all other values fall back to `/admin/articles`.

After successful login, the browser navigates to the validated destination. The admin layout removes the unauthenticated warning banner and adds a logout control. Successful logout navigates to `/admin/login` and refreshes server state.

Server-side admin API helpers forward the session cookie and treat `401` as an authentication outcome rather than a generic availability error. Client-side editor calls include credentials. If an editor operation receives `401`, the browser navigates to login with the current internal admin URL as `next`. Public API helpers and public pages never receive or forward the admin cookie.

The backend middleware remains the authority for access control. Frontend redirects provide navigation behavior and do not replace API authorization.

## Source-of-Truth and Documentation Changes

`PLAN.md` must be amended before the authentication implementation is treated as complete. It will replace the statements that V1 intentionally has no authentication, remove the unauthenticated admin banner requirement, describe the fixed account and signed cookie, add the auth endpoints, and replace the Vietnamese frontend route table with the approved English paths.

The OpenAPI document must define the login request, session response, cookie security scheme, `401` and `403` responses, and security requirements for every protected admin operation. Frontend types and callers change in the same task.

`.env.example`, `deploy/runtime.env.example`, Compose files, and README must document `ADMIN_SESSION_SECRET` and `ADMIN_COOKIE_SECURE`. Examples use placeholders and never contain a working signing secret. README documents generating a random secret, the eight-hour lifetime, rebuilding to change the fixed credential, configuring reverse-proxy rate limiting, and routing the web application and `/api/v1` through one production origin.

The repository's sample Nginx configuration is not changed.

## Testing

Backend tests use `httptest`, an injected clock, and no real database, filesystem, network, or HTTP server. Coverage includes:

- successful and failed credential verification;
- malformed login input;
- cookie attributes for secure and local modes;
- valid, expired, malformed, and tampered sessions;
- login, session lookup, and logout response contracts;
- `401` for every article and Markdown-preview route without a session;
- continued public endpoint access without a session;
- accepted and rejected origins for unsafe authenticated requests;
- credentialed CORS and preflight behavior;
- startup configuration validation for the signing secret.

Frontend unit tests cover server-side cookie forwarding, `401` handling, safe `next` validation, and route-dependent URL generation. Existing tests are updated for the English route paths.

Playwright covers an unauthenticated redirect, invalid login, successful login and return to the requested page, authenticated create/preview/publish/edit/unpublish/delete behavior, direct unauthenticated admin API rejection, logout, and public pages at their English URLs. Existing E2E setup and cleanup authenticate before calling admin APIs.

Validation includes `gofmt`, `go vet ./...`, `go test ./...`, frontend type checking, unit tests, production build, affected Playwright tests, `docker compose config`, production Compose validation, and container builds when the environment supports them.

## Implementation Boundaries

Clean Architecture dependencies remain `delivery/adapters -> application -> domain`. Authentication transport and cookie code stays in the HTTP delivery layer or a focused infrastructure-neutral package wired from `cmd/api`; article domain and application code do not depend on it. Constructor injection remains manual.

The implementation does not add authentication providers, JWT libraries, a DI framework, a second Markdown renderer, a client-side public SPA, compatibility redirects, or unrelated refactoring.

## Continuity Record

The implementation plan will live under `docs/superpowers/plans/` and serve as the persistent checklist. Each task will record its status, owning subagent, changed files, validation evidence, review findings, and fix rounds. This allows a later session to resume from the first incomplete checklist item without repeating finished work.
