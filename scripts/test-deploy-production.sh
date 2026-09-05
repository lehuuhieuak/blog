#!/usr/bin/env bash

# Exercises deployment state transitions with a fake Docker CLI. No containers,
# network, registry, or database are required.
set -Eeuo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d)"
cleanup() {
  rm -rf -- "$test_root"
}
trap cleanup EXIT

state_dir="${test_root}/state"
runtime_env="${test_root}/runtime.env"
fake_bin="${test_root}/bin"
mkdir -p "$state_dir" "$fake_bin"
touch "$runtime_env"

cat > "${fake_bin}/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

state_dir="${FAKE_DOCKER_STATE_DIR:?}"

if [[ "$1" == 'inspect' ]]; then
  [[ "${!#}" == bad-* ]] && { printf 'unhealthy\n'; exit 0; }
  printf 'healthy\n'
  exit 0
fi

[[ "$1" == 'compose' ]] || exit 1
shift
release_file=''
while (( $# > 0 )); do
  case "$1" in
    --env-file)
      release_file="$2"
      shift 2
      ;;
    --project-name|--file)
      shift 2
      ;;
    version)
      exit 0
      ;;
    pull|run|up|ps|logs)
      command="$1"
      shift
      break
      ;;
    *)
      shift
      ;;
  esac
done

case "$command" in
  pull|logs)
    exit 0
    ;;
  run)
    grep -q '^MIGRATE_IMAGE=.*@sha256:cccc' "$release_file" && exit 1
    exit 0
    ;;
  up)
    service="${!#}"
    if grep -q '^API_IMAGE=.*@sha256:bbbb' "$release_file" && [[ "$service" == 'api' ]]; then
      printf 'bad-%s\n' "$service" > "${state_dir}/${service}"
    else
      printf 'good-%s\n' "$service" > "${state_dir}/${service}"
    fi
    exit 0
    ;;
  ps)
    service="${!#}"
    [[ -f "${state_dir}/${service}" ]] && cat "${state_dir}/${service}"
    exit 0
    ;;
esac
EOF
chmod +x "${fake_bin}/docker"

sha_good='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
sha_bad='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
digest_a='sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
digest_b='sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
digest_c='sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
image() {
  printf 'ghcr.io/example/minimal-blog/%s@%s' "$1" "$2"
}
run_deploy() {
  PATH="${fake_bin}:$PATH" \
  FAKE_DOCKER_STATE_DIR="$state_dir" \
  APP_DIR="${repo_root}/deploy" \
  RUNTIME_ENV="$runtime_env" \
  STATE_DIR="$state_dir" \
  HEALTHCHECK_ATTEMPTS=1 \
  HEALTHCHECK_INTERVAL_SECONDS=0 \
  bash "${repo_root}/deploy/deploy-production.sh" "$@"
}

# A successful deployment persists the three immutable image references.
run_deploy \
  "$sha_good" \
  "$(image api "$digest_a")" \
  "$(image migrate "$digest_a")" \
  "$(image web "$digest_a")"
grep -qx "RELEASE_SHA=${sha_good}" "${state_dir}/current.env"
grep -qx 'good-api' "${state_dir}/api"
grep -qx 'good-web' "${state_dir}/web"

# A new unhealthy API restores the existing manifest and running application.
if run_deploy \
  "$sha_bad" \
  "$(image api "$digest_b")" \
  "$(image migrate "$digest_b")" \
  "$(image web "$digest_b")"; then
  echo 'unhealthy application unexpectedly deployed' >&2
  exit 1
fi
grep -qx "RELEASE_SHA=${sha_good}" "${state_dir}/current.env"
grep -qx 'good-api' "${state_dir}/api"
grep -qx 'good-web' "${state_dir}/web"

# A failed migration never replaces the running application or manifest.
if run_deploy \
  "$sha_bad" \
  "$(image api "$digest_a")" \
  "$(image migrate "$digest_c")" \
  "$(image web "$digest_a")"; then
  echo 'failed migration unexpectedly deployed' >&2
  exit 1
fi
grep -qx "RELEASE_SHA=${sha_good}" "${state_dir}/current.env"
grep -qx 'good-api' "${state_dir}/api"
grep -qx 'good-web' "${state_dir}/web"

echo 'Deployment rollback contract is valid.'
