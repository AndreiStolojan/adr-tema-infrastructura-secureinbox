#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

log() { printf '\n==> %s\n' "$1"; }
fail() { printf 'Eroare: %s\n' "$1" >&2; exit 1; }

prepare_docker() {
  case "$(uname -s)" in
    Darwin)
      command -v docker >/dev/null 2>&1 || fail "Docker lipsește. Instalează Docker Desktop."
      docker compose version >/dev/null 2>&1 || fail "Docker Compose lipsește. Instalează sau actualizează Docker Desktop."
      docker info >/dev/null 2>&1 || fail "Docker nu rulează. Deschide Docker Desktop și rulează din nou scriptul."
      ;;
    Linux)
      [[ "${EUID}" -eq 0 ]] || fail "Pe Linux rulează: sudo ./scripts/provision.sh"

      if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
        source /etc/os-release
        [[ "${ID}" == "ubuntu" ]] || fail "Instalarea automată Docker este disponibilă numai pe Ubuntu."

        log "Instalez Docker Engine și Docker Compose"
        apt-get update
        apt-get install -y ca-certificates curl openssl
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
        chmod a+r /etc/apt/keyrings/docker.asc

        cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-${VERSION_CODENAME}}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      fi

      systemctl enable --now docker
      if ! command -v curl >/dev/null 2>&1 || ! command -v openssl >/dev/null 2>&1; then apt-get update && apt-get install -y curl openssl; fi
      ;;
    *) fail "Sunt suportate doar Ubuntu și macOS." ;;
  esac
}

create_env() {
  if [[ -f .env ]]; then
    log "Păstrez fișierul .env existent"
    return
  fi

  command -v openssl >/dev/null 2>&1 || fail "OpenSSL este necesar pentru generarea parolelor."
  log "Generez configurația și parolele în .env"

  local temporary_file mongo_password jwt_secret grafana_password
  temporary_file="$(mktemp "${ROOT}/.env.tmp.XXXXXX")"
  mongo_password="$(openssl rand -hex 32)"
  jwt_secret="$(openssl rand -hex 32)"
  grafana_password="$(openssl rand -hex 24)"
  umask 077

  cat > "${temporary_file}" <<EOF
APP_PORT=8080
FRONTEND_APP_URL=${PUBLIC_APP_URL:-http://localhost:8080}

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

  chmod 600 "${temporary_file}"
  mv "${temporary_file}" .env
  if [[ -n "${SUDO_USER:-}" ]]; then
    chown "${SUDO_USER}:$(id -gn "${SUDO_USER}")" .env
  fi
}

wait_for_url() {
  local name="$1" url="$2"
  for _ in {1..45}; do
    if curl --fail --silent "${url}" >/dev/null 2>&1; then
      printf '%-12s OK\n' "${name}:"
      return
    fi
    sleep 2
  done
  docker compose logs --no-color --tail=80 >&2
  fail "${name} nu a devenit disponibil: ${url}"
}

main() {
  log "Pregătesc Docker"
  prepare_docker
  create_env

  set -a
  source .env
  set +a

  log "Validez și pornesc infrastructura"
  docker compose config --quiet
  docker compose up -d --build

  log "Aștept aplicația și conexiunea cu MongoDB"
  wait_for_url "Aplicația" "http://127.0.0.1:${APP_PORT}/api/v1/ready"

  log "Creez sau reutilizez datele demo"
  docker compose exec -T backend npm run seed

  log "Verific monitorizarea"
  wait_for_url "Prometheus" "http://127.0.0.1:9090/-/ready"
  wait_for_url "Grafana" "http://127.0.0.1:${GRAFANA_PORT}/api/health"
  docker compose ps

  cat <<EOF

Provisioning finalizat.
Aplicație:  http://localhost:${APP_PORT}
Prometheus: http://localhost:9090
Grafana:    http://localhost:${GRAFANA_PORT}
Cont demo:  ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}
Parola Grafana este în .env.
EOF
}

main "$@"
