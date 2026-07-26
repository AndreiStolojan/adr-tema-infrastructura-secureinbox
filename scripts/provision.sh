#!/usr/bin/env bash

set -Eeuo pipefail

# Resolvează rădăcina proiectului, indiferent de folderul din care rulăm scriptul.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

log() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

install_docker_on_ubuntu() {
  [[ "${EUID}" -eq 0 ]] || fail "On Ubuntu, run: sudo ./scripts/provision.sh"

  # Dacă Docker și pluginul Compose există deja, ne asigurăm doar că motorul rulează.
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    systemctl enable --now docker
    return
  fi

  source /etc/os-release
  [[ "${ID}" == "ubuntu" ]] || fail "Automatic Docker installation supports Ubuntu only."

  case "${VERSION_ID}" in
    22.04|24.04|26.04) ;;
    *) fail "Supported Ubuntu versions: 22.04, 24.04 and 26.04." ;;
  esac

  log "Installing Docker Engine and Docker Compose from the official repository"

  apt-get update
  apt-get install -y ca-certificates curl openssl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  local architecture ubuntu_codename
  architecture="$(dpkg --print-architecture)"
  ubuntu_codename="${UBUNTU_CODENAME:-${VERSION_CODENAME}}"

  cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${ubuntu_codename}
Components: stable
Architectures: ${architecture}
Signed-By: /etc/apt/keyrings/docker.asc
EOF

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

start_docker_desktop_on_macos() {
  command -v docker >/dev/null 2>&1 || fail "Docker CLI is missing. Install Docker Desktop first."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is missing. Install or update Docker Desktop."

  if docker info >/dev/null 2>&1; then
    return
  fi

  log "Docker Desktop is stopped; starting it"
  open -a Docker >/dev/null 2>&1 || fail "Docker Desktop could not be opened."

  # Docker Desktop are nevoie de câteva secunde pentru a crea motorul și socketul.
  local attempt
  for ((attempt = 1; attempt <= 45; attempt += 1)); do
    if docker info >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done

  fail "Docker Desktop opened, but its engine did not become ready within 90 seconds."
}

prepare_docker() {
  case "$(uname -s)" in
    Linux) install_docker_on_ubuntu ;;
    Darwin) start_docker_desktop_on_macos ;;
    *) fail "Supported operating systems: Ubuntu Linux and macOS." ;;
  esac

  docker info >/dev/null 2>&1 || fail "Docker engine is not available."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not available."
}

generate_env_if_missing() {
  if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    log "Existing .env found; keeping it unchanged"
    return
  fi

  command -v openssl >/dev/null 2>&1 || fail "openssl is required to generate secrets."

  log "Generating local configuration and random secrets"

  local env_tmp mongo_password jwt_secret grafana_password public_app_url
  env_tmp="$(mktemp "${PROJECT_ROOT}/.env.tmp.XXXXXX")"
  mongo_password="$(openssl rand -hex 32)"
  jwt_secret="$(openssl rand -hex 32)"
  grafana_password="$(openssl rand -hex 24)"
  public_app_url="${PUBLIC_APP_URL:-http://localhost:8080}"

  umask 077

  cat > "${env_tmp}" <<EOF
APP_PORT=8080
FRONTEND_APP_URL=${public_app_url}

MONGO_DATABASE=secureinbox_demo
MONGO_ROOT_USERNAME=secureinbox_root
MONGO_ROOT_PASSWORD=${mongo_password}

JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=8h

DEMO_USER_NAME="Demo User"
DEMO_USER_EMAIL=demo@secureinbox.test
DEMO_USER_PASSWORD=Demo123!

GRAFANA_PORT=3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=${grafana_password}
EOF

  chmod 600 "${env_tmp}"
  mv "${env_tmp}" "${PROJECT_ROOT}/.env"

  # Când scriptul este rulat cu sudo, fișierul rămâne accesibil utilizatorului inițial.
  if [[ -n "${SUDO_USER:-}" ]]; then
    chown "${SUDO_USER}:$(id -gn "${SUDO_USER}")" "${PROJECT_ROOT}/.env"
  fi
}

load_env() {
  # Fișierul este generat în sintaxă compatibilă atât cu Compose, cât și cu Bash.
  set -a
  source "${PROJECT_ROOT}/.env"
  set +a
}

wait_for_backend() {
  log "Waiting for the backend and MongoDB connection"

  local attempt
  for ((attempt = 1; attempt <= 45; attempt += 1)); do
    if docker compose exec -T backend wget -qO- http://127.0.0.1:5500/api/v1/ready >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done

  docker compose logs --no-color --tail=100 backend mongodb >&2
  fail "Backend did not become ready within 90 seconds."
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local attempt

  for ((attempt = 1; attempt <= 30; attempt += 1)); do
    if curl --fail --silent "${url}" >/dev/null 2>&1; then
      printf '%-12s %s\n' "${name}:" "OK"
      return
    fi
    sleep 2
  done

  fail "${name} did not become ready: ${url}"
}

main() {
  log "Preparing Docker"
  prepare_docker

  generate_env_if_missing
  load_env

  log "Validating Docker Compose configuration"
  docker compose config --quiet

  log "Building images and starting the complete stack"
  docker compose up -d --build

  wait_for_backend

  log "Creating or reusing the idempotent demo dataset"
  docker compose exec -T backend npm run seed

  log "Verifying public services"
  wait_for_http "Application" "http://localhost:${APP_PORT}/api/v1/ready"
  wait_for_http "Prometheus" "http://localhost:9090/-/ready"
  wait_for_http "Grafana" "http://localhost:${GRAFANA_PORT}/api/health"

  log "Running services"
  docker compose ps

  cat <<EOF

SecureInbox provisioning completed successfully.

Application: http://localhost:${APP_PORT}
Prometheus:  http://localhost:9090
Grafana:     http://localhost:${GRAFANA_PORT}

Demo user:     ${DEMO_USER_EMAIL}
Demo password: ${DEMO_USER_PASSWORD}
Grafana credentials are stored in .env.
EOF
}

main "$@"
