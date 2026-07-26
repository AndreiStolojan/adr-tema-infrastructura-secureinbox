#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

cd "${PROJECT_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is not installed or is not available in PATH." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: the Docker engine is not running." >&2
  exit 1
fi

if ! docker compose ps --status running --services | grep -qx "mongodb"; then
  echo "Error: the MongoDB Compose service is not running." >&2
  echo "Start it with: docker compose up -d mongodb" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
umask 077

database_name="$(
  docker compose exec -T mongodb sh -lc \
    'printf "%s" "$MONGO_INITDB_DATABASE"'
)"

if [[ -z "${database_name}" ]]; then
  echo "Error: MONGO_INITDB_DATABASE is empty inside the MongoDB container." >&2
  exit 1
fi

timestamp="$(date -u +"%Y-%m-%d_%H%M%SZ")"
created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
backup_name="${database_name}-${timestamp}.archive.gz"
backup_path="${BACKUP_DIR}/${backup_name}"
partial_path="${backup_path}.partial"
manifest_path="${backup_path}.manifest.json"
backend_was_running=false

cleanup() {
  rm -f "${partial_path}"

  if [[ "${backend_was_running}" == "true" ]]; then
    echo "Restarting backend after backup attempt..."
    docker compose start backend >/dev/null
  fi
}

trap cleanup EXIT

if docker compose ps --status running --services | grep -qx "backend"; then
  backend_was_running=true
  echo "Stopping backend briefly for a consistent backup..."
  docker compose stop backend >/dev/null
fi

counts_json="$(
  docker compose exec -T mongodb sh -lc \
    'mongosh --quiet \
      --username "$MONGO_INITDB_ROOT_USERNAME" \
      --password "$MONGO_INITDB_ROOT_PASSWORD" \
      --authenticationDatabase admin \
      --eval '"'"'
        const appDb = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE);
        print(JSON.stringify({
          users: appDb.users.countDocuments({}),
          emails: appDb.emails.countDocuments({}),
          scans: appDb.scans.countDocuments({})
        }));
      '"'"
)"

echo "Creating backup for database ${database_name}..."

docker compose exec -T mongodb sh -lc \
  'exec mongodump \
    --quiet \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db "$MONGO_INITDB_DATABASE" \
    --archive \
    --gzip' > "${partial_path}"

if [[ ! -s "${partial_path}" ]]; then
  echo "Error: mongodump produced an empty archive." >&2
  exit 1
fi

mv "${partial_path}" "${backup_path}"

echo "Validating that mongorestore can read the archive..."

docker compose exec -T mongodb sh -lc \
  'exec mongorestore \
    --quiet \
    --dryRun \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --nsInclude "${MONGO_INITDB_DATABASE}.*" \
    --archive \
    --gzip' < "${backup_path}"

if command -v sha256sum >/dev/null 2>&1; then
  archive_checksum="$(sha256sum "${backup_path}" | awk '{print $1}')"
else
  archive_checksum="$(shasum -a 256 "${backup_path}" | awk '{print $1}')"
fi

archive_size="$(wc -c < "${backup_path}" | tr -d ' ')"

cat > "${manifest_path}" <<EOF
{
  "database": "${database_name}",
  "createdAt": "${created_at}",
  "archive": "${backup_name}",
  "sizeBytes": ${archive_size},
  "sha256": "${archive_checksum}",
  "counts": ${counts_json}
}
EOF

if [[ "${backend_was_running}" == "true" ]]; then
  echo "Restarting backend..."
  docker compose start backend >/dev/null
  backend_was_running=false
fi

echo "Backup completed successfully."
echo "Archive: ${backup_path}"
echo "Manifest: ${manifest_path}"
echo "Document counts: ${counts_json}"
echo "SHA-256: ${archive_checksum}"

