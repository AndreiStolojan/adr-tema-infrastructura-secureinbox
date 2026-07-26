#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/restore-mongodb.sh <backup.archive.gz> --confirm-replace

Example:
  ./scripts/restore-mongodb.sh \
    backups/secureinbox_demo-2026-07-26_192025Z.archive.gz \
    --confirm-replace

The command validates the backup, stops the backend, replaces the current
application database with the archive contents, verifies document counts,
and starts the backend again if it was running before the restore.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "$#" -ne 2 || "${2}" != "--confirm-replace" ]]; then
  usage >&2
  echo >&2
  echo "Error: restore refused. The --confirm-replace flag is required." >&2
  exit 1
fi

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

archive_input="${1}"

if [[ "${archive_input}" = /* ]]; then
  archive_path="${archive_input}"
else
  archive_path="${PROJECT_ROOT}/${archive_input}"
fi

if [[ ! -f "${archive_path}" ]]; then
  echo "Error: backup archive not found: ${archive_path}" >&2
  exit 1
fi

manifest_path="${archive_path}.manifest.json"

if [[ ! -f "${manifest_path}" ]]; then
  echo "Error: backup manifest not found: ${manifest_path}" >&2
  exit 1
fi

database_name="$(
  docker compose exec -T mongodb sh -lc \
    'printf "%s" "$MONGO_INITDB_DATABASE"'
)"

manifest_database="$(
  sed -nE \
    's/^[[:space:]]*"database":[[:space:]]*"([^"]+)",?$/\1/p' \
    "${manifest_path}"
)"

if [[ -z "${database_name}" || "${manifest_database}" != "${database_name}" ]]; then
  echo "Error: the backup database does not match the configured database." >&2
  echo "Configured: ${database_name:-<empty>}" >&2
  echo "Backup: ${manifest_database:-<empty>}" >&2
  exit 1
fi

case "${database_name}" in
  admin|config|local)
    echo "Error: refusing to replace MongoDB internal database ${database_name}." >&2
    exit 1
    ;;
esac

expected_checksum="$(
  sed -nE \
    's/^[[:space:]]*"sha256":[[:space:]]*"([0-9a-fA-F]+)",?$/\1/p' \
    "${manifest_path}"
)"

if command -v sha256sum >/dev/null 2>&1; then
  actual_checksum="$(sha256sum "${archive_path}" | awk '{print $1}')"
else
  actual_checksum="$(shasum -a 256 "${archive_path}" | awk '{print $1}')"
fi

if [[ -z "${expected_checksum}" || "${actual_checksum}" != "${expected_checksum}" ]]; then
  echo "Error: backup checksum verification failed." >&2
  echo "Expected: ${expected_checksum:-<missing>}" >&2
  echo "Actual: ${actual_checksum}" >&2
  exit 1
fi

expected_users="$(
  sed -nE 's/.*"users":[[:space:]]*([0-9]+).*/\1/p' "${manifest_path}"
)"
expected_emails="$(
  sed -nE 's/.*"emails":[[:space:]]*([0-9]+).*/\1/p' "${manifest_path}"
)"
expected_scans="$(
  sed -nE 's/.*"scans":[[:space:]]*([0-9]+).*/\1/p' "${manifest_path}"
)"

if [[ -z "${expected_users}" || -z "${expected_emails}" || -z "${expected_scans}" ]]; then
  echo "Error: expected document counts are missing from the manifest." >&2
  exit 1
fi

echo "Checksum verified: ${actual_checksum}"
echo "Validating archive with mongorestore --dryRun..."

docker compose exec -T mongodb sh -lc \
  'exec mongorestore \
    --quiet \
    --dryRun \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --nsInclude "${MONGO_INITDB_DATABASE}.*" \
    --archive \
    --gzip' < "${archive_path}"

backend_was_running=false
database_dropped=false
restore_completed=false

cleanup() {
  if [[ "${backend_was_running}" != "true" ]]; then
    return
  fi

  if [[ "${database_dropped}" == "false" || "${restore_completed}" == "true" ]]; then
    echo "Starting backend..."
    docker compose start backend >/dev/null || true
  else
    echo "Restore did not complete; backend was left stopped for safety." >&2
    echo "The validated backup remains at: ${archive_path}" >&2
  fi
}

trap cleanup EXIT

if docker compose ps --status running --services | grep -qx "backend"; then
  backend_was_running=true
  echo "Stopping backend before replacing ${database_name}..."
  docker compose stop backend >/dev/null
fi

echo "Dropping application database ${database_name}..."

docker compose exec -T mongodb sh -lc \
  'mongosh --quiet \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --eval '"'"'
      const result = db
        .getSiblingDB(process.env.MONGO_INITDB_DATABASE)
        .dropDatabase();

      if (!result.ok) {
        throw new Error("dropDatabase failed");
      }
    '"'"

database_dropped=true

remaining_collections="$(
  docker compose exec -T mongodb sh -lc \
    'mongosh --quiet \
      --username "$MONGO_INITDB_ROOT_USERNAME" \
      --password "$MONGO_INITDB_ROOT_PASSWORD" \
      --authenticationDatabase admin \
      --eval '"'"'
        const appDb = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE);
        print(appDb.getCollectionNames().length);
      '"'"
)"

if [[ "${remaining_collections}" != "0" ]]; then
  echo "Error: database still has collections after drop." >&2
  exit 1
fi

echo "Database is empty. Restoring ${database_name} from backup..."

docker compose exec -T mongodb sh -lc \
  'exec mongorestore \
    --quiet \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --nsInclude "${MONGO_INITDB_DATABASE}.*" \
    --archive \
    --gzip' < "${archive_path}"

actual_counts="$(
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

expected_counts="{\"users\":${expected_users},\"emails\":${expected_emails},\"scans\":${expected_scans}}"

if [[ "${actual_counts}" != "${expected_counts}" ]]; then
  echo "Error: restored document counts do not match the backup manifest." >&2
  echo "Expected: ${expected_counts}" >&2
  echo "Actual: ${actual_counts}" >&2
  exit 1
fi

restore_completed=true

echo "Restore completed and verified successfully."
echo "Database: ${database_name}"
echo "Document counts: ${actual_counts}"

if [[ "${backend_was_running}" == "true" ]]; then
  echo "Starting backend..."
  docker compose start backend >/dev/null
  backend_was_running=false

  if command -v curl >/dev/null 2>&1; then
    for _attempt in $(seq 1 15); do
      if curl --fail --silent \
        "http://localhost:${APP_PORT:-8080}/api/v1/ready" >/dev/null; then
        echo "Backend readiness check passed."
        exit 0
      fi

      sleep 1
    done

    echo "Warning: restore succeeded, but the backend readiness check timed out." >&2
  fi
fi

