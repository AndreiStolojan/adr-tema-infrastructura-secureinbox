#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

[[ -f .env ]] || { echo "Eroare: lipsește fișierul .env." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Eroare: Docker nu rulează." >&2; exit 1; }
docker compose ps --status running --services | grep -qx mongodb || { echo "Eroare: MongoDB nu rulează." >&2; exit 1; }

set -a
source .env
set +a

mkdir -p backups
umask 077

timestamp="$(date -u +'%Y-%m-%d_%H%M%SZ')"
archive="backups/${MONGO_DATABASE}-${timestamp}.archive.gz"
partial="${archive}.partial"
manifest="${archive}.manifest.json"
backend_was_running=false
backup_completed=false

checksum() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi
}

cleanup() {
  rm -f "${partial}"
  if [[ "${backup_completed}" == "false" ]]; then rm -f "${archive}" "${manifest}"; fi
  if [[ "${backend_was_running}" == "true" ]]; then docker compose start backend >/dev/null; fi
}
trap cleanup EXIT

# Oprim scrierile pentru ca arhiva și numărul documentelor să descrie aceeași stare.
if docker compose ps --status running --services | grep -qx backend; then
  backend_was_running=true
  echo "Opresc temporar backendul..."
  docker compose stop backend >/dev/null
fi

counts="$(
  docker compose exec -T mongodb mongosh --quiet \
    --username "${MONGO_ROOT_USERNAME}" --password "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin \
    --eval "const d=db.getSiblingDB('${MONGO_DATABASE}'); print(JSON.stringify({users:d.users.countDocuments({}),emails:d.emails.countDocuments({}),scans:d.scans.countDocuments({})}));"
)"

echo "Creez backupul bazei ${MONGO_DATABASE}..."
docker compose exec -T mongodb mongodump --quiet \
  --username "${MONGO_ROOT_USERNAME}" --password "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin \
  --db "${MONGO_DATABASE}" --archive --gzip > "${partial}"

[[ -s "${partial}" ]] || { echo "Eroare: arhiva este goală." >&2; exit 1; }
mv "${partial}" "${archive}"

echo "Verific arhiva..."
docker compose exec -T mongodb mongorestore --quiet --dryRun \
  --username "${MONGO_ROOT_USERNAME}" --password "${MONGO_ROOT_PASSWORD}" --authenticationDatabase admin \
  --nsInclude "${MONGO_DATABASE}.*" --archive --gzip < "${archive}"

sha256="$(checksum "${archive}")"
cat > "${manifest}" <<EOF
{
  "database": "${MONGO_DATABASE}",
  "createdAt": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "archive": "$(basename "${archive}")",
  "sizeBytes": $(wc -c < "${archive}" | tr -d ' '),
  "sha256": "${sha256}",
  "counts": ${counts}
}
EOF

backup_completed=true
if [[ "${backend_was_running}" == "true" ]]; then
  docker compose start backend >/dev/null
  backend_was_running=false
fi

echo "Backup creat: ${archive}"
echo "Manifest: ${manifest}"
echo "Documente: ${counts}"
echo "SHA-256: ${sha256}"
