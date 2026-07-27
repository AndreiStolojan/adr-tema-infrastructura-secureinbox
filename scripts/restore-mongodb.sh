#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

usage() {
  echo "Utilizare: ./scripts/restore-mongodb.sh <backup.archive.gz> --confirm-replace"
}

fail() { printf 'Eroare: %s\n' "$1" >&2; exit 1; }
checksum() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi
}
restore_archive() {
  docker compose exec -T mongodb mongorestore --quiet "$@" \
    --username "${MONGO_ROOT_USERNAME}" --password "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin \
    --nsInclude "${MONGO_DATABASE}.*" --archive --gzip
}

[[ "${1:-}" == "--help" || "${1:-}" == "-h" ]] && { usage; exit 0; }
[[ "$#" -eq 2 && "${2}" == "--confirm-replace" ]] || { usage >&2; fail "Confirmarea --confirm-replace este obligatorie."; }
[[ -f .env ]] || fail "Lipsește fișierul .env."
docker info >/dev/null 2>&1 || fail "Docker nu rulează."
docker compose ps --status running --services | grep -qx mongodb || fail "MongoDB nu rulează."

set -a
source .env
set +a

if [[ "${1}" = /* ]]; then archive="${1}"; else archive="${ROOT}/${1}"; fi
manifest="${archive}.manifest.json"
[[ -f "${archive}" ]] || fail "Arhiva nu există: ${archive}"
[[ -f "${manifest}" ]] || fail "Manifestul nu există: ${manifest}"

manifest_database="$(sed -nE 's/^[[:space:]]*"database":[[:space:]]*"([^"]+)",?$/\1/p' "${manifest}")"
expected_sha="$(sed -nE 's/^[[:space:]]*"sha256":[[:space:]]*"([0-9a-fA-F]+)",?$/\1/p' "${manifest}")"
expected_users="$(sed -nE 's/.*"users":[[:space:]]*([0-9]+).*/\1/p' "${manifest}")"
expected_emails="$(sed -nE 's/.*"emails":[[:space:]]*([0-9]+).*/\1/p' "${manifest}")"
expected_scans="$(sed -nE 's/.*"scans":[[:space:]]*([0-9]+).*/\1/p' "${manifest}")"

[[ "${manifest_database}" == "${MONGO_DATABASE}" ]] || fail "Backupul aparține altei baze de date."
[[ ! "${MONGO_DATABASE}" =~ ^(admin|config|local)$ ]] || fail "O bază internă MongoDB nu poate fi înlocuită."
[[ -n "${expected_sha}" && -n "${expected_users}" && -n "${expected_emails}" && -n "${expected_scans}" ]] || fail "Manifestul este incomplet."
[[ "$(checksum "${archive}")" == "${expected_sha}" ]] || fail "Suma SHA-256 nu corespunde."

echo "Verific arhiva fără să modific baza..."
restore_archive --dryRun < "${archive}"

backend_was_running=false
database_dropped=false
restore_completed=false

cleanup() {
  [[ "${backend_was_running}" == "true" ]] || return 0
  if [[ "${database_dropped}" == "false" || "${restore_completed}" == "true" ]]; then
    docker compose start backend >/dev/null || true
  else
    echo "Restaurarea a eșuat după ștergerea bazei; backendul rămâne oprit." >&2
  fi
}
trap cleanup EXIT

if docker compose ps --status running --services | grep -qx backend; then
  backend_was_running=true
  echo "Opresc backendul..."
  docker compose stop backend >/dev/null
fi

echo "Șterg baza ${MONGO_DATABASE} și restaurez backupul..."
docker compose exec -T mongodb mongosh --quiet \
  --username "${MONGO_ROOT_USERNAME}" --password "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin \
  --eval "const r=db.getSiblingDB('${MONGO_DATABASE}').dropDatabase(); if(!r.ok) throw new Error('dropDatabase failed');"
database_dropped=true

restore_archive < "${archive}"

actual_counts="$(
  docker compose exec -T mongodb mongosh --quiet \
    --username "${MONGO_ROOT_USERNAME}" --password "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin \
    --eval "const d=db.getSiblingDB('${MONGO_DATABASE}'); print(JSON.stringify({users:d.users.countDocuments({}),emails:d.emails.countDocuments({}),scans:d.scans.countDocuments({})}));"
)"
expected_counts="{\"users\":${expected_users},\"emails\":${expected_emails},\"scans\":${expected_scans}}"
[[ "${actual_counts}" == "${expected_counts}" ]] || fail "Numărul documentelor restaurate nu corespunde manifestului."

restore_completed=true
if [[ "${backend_was_running}" == "true" ]]; then
  docker compose start backend >/dev/null
  backend_was_running=false

  for _ in {1..15}; do
    if curl --fail --silent "http://127.0.0.1:${APP_PORT:-8080}/api/v1/ready" >/dev/null 2>&1; then
      echo "Restore finalizat: ${actual_counts}"
      exit 0
    fi
    sleep 1
  done
  fail "Baza a fost restaurată, dar backendul nu a devenit disponibil."
fi

echo "Restore finalizat: ${actual_counts}. Backendul a rămas oprit deoarece era oprit înainte."
