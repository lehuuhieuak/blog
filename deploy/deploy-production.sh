#!/usr/bin/env bash

# Deploy only immutable GHCR images. The database is deliberately never rolled
# back: every migration must follow the backward-compatible expand/contract rule.
set -Eeuo pipefail
umask 077

APP_DIR="${APP_DIR:-/opt/minimal-blog}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_DIR}/compose.production.yaml}"
RUNTIME_ENV="${RUNTIME_ENV:-/etc/minimal-blog/runtime.env}"
STATE_DIR="${STATE_DIR:-/var/lib/minimal-blog}"
PROJECT_NAME="${PROJECT_NAME:-minimal-blog-production}"
CURRENT_RELEASE="${STATE_DIR}/current.env"
PREVIOUS_RELEASE="${STATE_DIR}/previous.env"
CANDIDATE_RELEASE=""
DEPLOYMENT_STARTED=0
HEALTHCHECK_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-60}"
HEALTHCHECK_INTERVAL_SECONDS="${HEALTHCHECK_INTERVAL_SECONDS:-2}"

usage() {
  printf 'Usage: %s <git-sha> <api-image@sha256:...> <migrate-image@sha256:...> <web-image@sha256:...>\n' "$0" >&2
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

validate_digest_image() {
  [[ "$1" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || fail 'image references must be lowercase ghcr.io references pinned to sha256 digests'
}

compose() {
  local release_file="$1"
  shift
  docker compose \
    --project-name "$PROJECT_NAME" \
    --env-file "$RUNTIME_ENV" \
    --env-file "$release_file" \
    --file "$COMPOSE_FILE" \
    "$@"
}

release_sha() {
  awk -F= '$1 == "RELEASE_SHA" { print $2; exit }' "$1"
}

wait_for_health() {
  local release_file="$1"
  local service="$2"
  local attempts="$HEALTHCHECK_ATTEMPTS"
  local container_id status

  while (( attempts > 0 )); do
    container_id="$(compose "$release_file" ps -q --all "$service")"
    if [[ -n "$container_id" ]]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
      if [[ "$status" == 'healthy' ]]; then
        return 0
      fi
    fi
    attempts=$((attempts - 1))
    sleep "$HEALTHCHECK_INTERVAL_SECONDS"
  done

  printf 'ERROR: %s did not become healthy\n' "$service" >&2
  compose "$release_file" logs --no-color "$service" >&2 || true
  return 1
}

rollback_application() {
  [[ -f "$CURRENT_RELEASE" ]] || return 0

  printf 'Application healthcheck failed; restoring release %s. The database is not rolled back.\n' "$(release_sha "$CURRENT_RELEASE")" >&2
  compose "$CURRENT_RELEASE" up -d --no-deps --force-recreate api
  wait_for_health "$CURRENT_RELEASE" api
  compose "$CURRENT_RELEASE" up -d --no-deps --force-recreate web
  wait_for_health "$CURRENT_RELEASE" web
}

on_error() {
  local exit_code=$?
  trap - ERR
  if (( DEPLOYMENT_STARTED )) && [[ -f "$CURRENT_RELEASE" ]]; then
    rollback_application || printf 'ERROR: automatic application rollback also failed; inspect Docker logs immediately.\n' >&2
  fi
  exit "$exit_code"
}

cleanup() {
  [[ -z "$CANDIDATE_RELEASE" || ! -f "$CANDIDATE_RELEASE" ]] || rm -f -- "$CANDIDATE_RELEASE"
}

trap on_error ERR
trap cleanup EXIT

[[ $# -eq 4 ]] || { usage; exit 2; }
GIT_SHA="$1"
API_IMAGE="$2"
MIGRATE_IMAGE="$3"
WEB_IMAGE="$4"

[[ "$GIT_SHA" =~ ^[a-f0-9]{40}$ ]] || fail 'git SHA must be a 40-character lowercase commit SHA'
validate_digest_image "$API_IMAGE"
validate_digest_image "$MIGRATE_IMAGE"
validate_digest_image "$WEB_IMAGE"
[[ "$HEALTHCHECK_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] || fail 'HEALTHCHECK_ATTEMPTS must be a positive integer'
[[ "$HEALTHCHECK_INTERVAL_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ]] || fail 'HEALTHCHECK_INTERVAL_SECONDS must be zero or a positive number'

command -v docker >/dev/null || fail 'docker is required'
docker compose version >/dev/null || fail 'Docker Compose v2 is required'
[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $COMPOSE_FILE"
[[ -f "$RUNTIME_ENV" ]] || fail "runtime environment file not found: $RUNTIME_ENV"
mkdir -p "$STATE_DIR"

CANDIDATE_RELEASE="$(mktemp "${STATE_DIR}/.candidate.XXXXXXXX")"
printf 'RELEASE_SHA=%s\nAPI_IMAGE=%s\nMIGRATE_IMAGE=%s\nWEB_IMAGE=%s\n' \
  "$GIT_SHA" "$API_IMAGE" "$MIGRATE_IMAGE" "$WEB_IMAGE" > "$CANDIDATE_RELEASE"

printf 'Pulling release %s by digest.\n' "$GIT_SHA"
compose "$CANDIDATE_RELEASE" pull migrate api web

printf 'Running migrations before replacing application containers.\n'
compose "$CANDIDATE_RELEASE" run --rm --no-deps migrate

# A migration failure leaves the existing application untouched. From this
# point, application health failures restore the current image manifest.
DEPLOYMENT_STARTED=1
printf 'Starting API release %s.\n' "$GIT_SHA"
compose "$CANDIDATE_RELEASE" up -d --no-deps --force-recreate api
wait_for_health "$CANDIDATE_RELEASE" api

printf 'Starting web release %s.\n' "$GIT_SHA"
compose "$CANDIDATE_RELEASE" up -d --no-deps --force-recreate web
wait_for_health "$CANDIDATE_RELEASE" web

if [[ -f "$CURRENT_RELEASE" ]]; then
  cp "$CURRENT_RELEASE" "$PREVIOUS_RELEASE"
fi
mv "$CANDIDATE_RELEASE" "$CURRENT_RELEASE"
CANDIDATE_RELEASE=""

printf 'DEPLOYMENT_STATUS=success\n'
printf 'CURRENT_RELEASE=%s\n' "$GIT_SHA"
if [[ -f "$PREVIOUS_RELEASE" ]]; then
  printf 'PREVIOUS_RELEASE=%s\n' "$(release_sha "$PREVIOUS_RELEASE")"
else
  printf 'PREVIOUS_RELEASE=none\n'
fi
