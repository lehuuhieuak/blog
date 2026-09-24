#!/usr/bin/env bash

set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="${repo_root}/deploy/compose.production.yaml"
sample_env="$(mktemp)"
rendered_config="$(mktemp)"
cleanup() {
  rm -f -- "$sample_env" "$rendered_config"
}
trap cleanup EXIT

digest="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
cat > "$sample_env" <<EOF
MIGRATE_IMAGE=ghcr.io/example/minimal-blog/migrate@${digest}
API_IMAGE=ghcr.io/example/minimal-blog/api@${digest}
WEB_IMAGE=ghcr.io/example/minimal-blog/web@${digest}
DATABASE_URL=postgres://blog:example@host.docker.internal:5432/blog?sslmode=disable
CORS_ALLOWED_ORIGIN=https://blog.example.com
ADMIN_SESSION_SECRET=TEST_ONLY_0123456789abcdef0123456789abcdef
ADMIN_COOKIE_SECURE=true
EOF

docker compose --env-file "$sample_env" --file "$compose_file" config --quiet
docker compose --env-file "$sample_env" --file "$compose_file" config > "$rendered_config"

grep -q '^  db:$' "$rendered_config" && { echo 'production Compose must not include a database service' >&2; exit 1; }
[[ "$(grep -Ec 'image: .+@sha256:[a-f0-9]{64}$' "$rendered_config")" -eq 3 ]] || { echo 'all production services must use digest-pinned images' >&2; exit 1; }
grep -q '^    ports:' "$rendered_config" && { echo 'production services must not publish host ports' >&2; exit 1; }
[[ "$(grep -c '^    name: reverse-proxy-networks$' "$rendered_config")" -eq 1 ]] || { echo 'production Compose must use reverse-proxy-networks' >&2; exit 1; }
[[ "$(grep -c '^      reverse-proxy-networks: null$' "$rendered_config")" -eq 2 ]] || { echo 'API and web must attach to reverse-proxy-networks' >&2; exit 1; }
grep -q '^      ADMIN_SESSION_SECRET: TEST_ONLY_0123456789abcdef0123456789abcdef$' "$rendered_config" || { echo 'production API must receive ADMIN_SESSION_SECRET' >&2; exit 1; }
grep -q '^      ADMIN_COOKIE_SECURE: "true"$' "$rendered_config" || { echo 'production API must receive ADMIN_COOKIE_SECURE=true' >&2; exit 1; }

echo 'Production Compose contract is valid.'
