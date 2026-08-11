#!/usr/bin/env bash
# =============================================================================
# FM1 Editor — build and deploy on AlmaLinux 9 / RHEL-compatible VPS
#
# Default production target:
#   https://fm1editor.alai-x.com
#
# Build directly from the private GitHub repository:
#   export GITHUB_TOKEN='github_pat_...'
#   sudo -E ./deploy.sh
#
# Deploy a prebuilt dist archive uploaded by deploy.ps1:
#   sudo ./deploy.sh --artifact /tmp/fm1editor-dist.tar.gz --revision <git-sha>
#
# Other usage:
#   sudo -E ./deploy.sh --skip-system-update
#   sudo ./deploy.sh --repo-url git@github.com:AlexanderSeel/FM1Editor.git
#   sudo ./deploy.sh --rollback
# =============================================================================
set -euo pipefail

APP_NAME="fm1editor"
DOMAIN="fm1editor.alai-x.com"
REPO_URL="https://github.com/AlexanderSeel/FM1Editor.git"
BRANCH="main"
NODE_VERSION="22"
BASE_DIR="/var/www/fm1editor.alai-x.com"
SOURCE_DIR="${BASE_DIR}/source"
RELEASES_DIR="${BASE_DIR}/releases"
CURRENT_LINK="${BASE_DIR}/current"
KEEP_RELEASES=4
USE_SSL=true
SKIP_SYSTEM_UPDATE=false
ROLLBACK=false
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
CERTIFICATE=""
CERTIFICATE_KEY=""
ARTIFACT=""
ARTIFACT_REVISION="artifact"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --base-dir)
      BASE_DIR="$2"
      SOURCE_DIR="${BASE_DIR}/source"
      RELEASES_DIR="${BASE_DIR}/releases"
      CURRENT_LINK="${BASE_DIR}/current"
      shift 2
      ;;
    --node-version) NODE_VERSION="$2"; shift 2 ;;
    --keep-releases) KEEP_RELEASES="$2"; shift 2 ;;
    --certificate) CERTIFICATE="$2"; shift 2 ;;
    --certificate-key) CERTIFICATE_KEY="$2"; shift 2 ;;
    --artifact) ARTIFACT="$2"; shift 2 ;;
    --revision) ARTIFACT_REVISION="$2"; shift 2 ;;
    --no-ssl) USE_SSL=false; shift ;;
    --skip-system-update) SKIP_SYSTEM_UPDATE=true; shift ;;
    --rollback) ROLLBACK=true; shift ;;
    -h|--help)
      sed -n '2,28p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

info()    { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
success() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
warn()    { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
die()     { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "Run this script as root or through sudo."
  command -v dnf >/dev/null 2>&1 || die "dnf is required; this script targets AlmaLinux/RHEL-compatible servers."
  [[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "Invalid domain: $DOMAIN"
  [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] || die "--keep-releases must be a positive integer."
  if [[ -n "$CERTIFICATE" || -n "$CERTIFICATE_KEY" ]]; then
    [[ -n "$CERTIFICATE" && -n "$CERTIFICATE_KEY" ]] || die "Pass both --certificate and --certificate-key."
  fi
  if [[ -n "$ARTIFACT" ]]; then
    [[ -f "$ARTIFACT" ]] || die "Artifact not found: $ARTIFACT"
    [[ "$ARTIFACT_REVISION" =~ ^[A-Za-z0-9._-]+$ ]] || die "Invalid artifact revision."
  fi
}

install_prerequisites() {
  if [[ "$SKIP_SYSTEM_UPDATE" != "true" ]]; then
    info "Updating system packages..."
    dnf -y update --quiet
  fi

  info "Installing deployment prerequisites..."
  dnf -y install --quiet curl nginx tar findutils policycoreutils-python-utils
  if [[ -n "$ARTIFACT" || "$ROLLBACK" == "true" ]]; then
    success "Runtime prerequisites ready."
    return
  fi

  dnf -y install --quiet git
  local installed_major=0
  if command -v node >/dev/null 2>&1; then
    installed_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  fi
  if (( installed_major < NODE_VERSION )); then
    info "Installing Node.js ${NODE_VERSION}.x..."
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | bash - >/dev/null
    dnf -y install --quiet nodejs
  else
    info "Using Node.js $(node --version)."
  fi
  success "Build prerequisites ready."
}

git_with_auth() {
  if [[ -n "$GITHUB_TOKEN" && "$REPO_URL" == https://github.com/* ]]; then
    git -c "http.extraHeader=Authorization: Bearer ${GITHUB_TOKEN}" "$@"
  else
    git "$@"
  fi
}

fetch_source() {
  mkdir -p "$BASE_DIR" "$RELEASES_DIR"
  if [[ -d "${SOURCE_DIR}/.git" ]]; then
    info "Updating ${BRANCH} in ${SOURCE_DIR}..."
    git_with_auth -C "$SOURCE_DIR" fetch --quiet --prune origin "$BRANCH"
    git -C "$SOURCE_DIR" checkout --quiet "$BRANCH"
    git -C "$SOURCE_DIR" reset --quiet --hard "origin/${BRANCH}"
    git -C "$SOURCE_DIR" clean -fdx --exclude=node_modules
  else
    info "Cloning private repository into ${SOURCE_DIR}..."
    rm -rf "$SOURCE_DIR"
    git_with_auth clone --quiet --branch "$BRANCH" --depth 1 "$REPO_URL" "$SOURCE_DIR"
  fi
  success "Source is at $(git -C "$SOURCE_DIR" rev-parse --short HEAD)."
}

prepare_release_directory() {
  local revision="$1"
  local safe_revision="${revision//[^A-Za-z0-9._-]/-}"
  RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${safe_revision:0:16}"
  RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
  mkdir -p "$RELEASE_DIR"
}

finalize_release() {
  local revision="$1"
  [[ -f "${RELEASE_DIR}/index.html" ]] || die "Release did not contain index.html at its root."
  printf '%s\n' "$revision" > "${RELEASE_DIR}/REVISION"
  chown -R nginx:nginx "$RELEASE_DIR"
  find "$RELEASE_DIR" -type d -exec chmod 755 {} +
  find "$RELEASE_DIR" -type f -exec chmod 644 {} +
  restorecon -R "$BASE_DIR" >/dev/null 2>&1 || true
  success "Release prepared: ${RELEASE_ID}."
}

build_release() {
  info "Installing npm dependencies, including native optional packages..."
  npm --prefix "$SOURCE_DIR" ci --include=optional --no-audit --no-fund

  info "Running TypeScript validation..."
  npm --prefix "$SOURCE_DIR" run lint

  info "Building production Vite bundle..."
  npm --prefix "$SOURCE_DIR" run build
  [[ -f "${SOURCE_DIR}/dist/index.html" ]] || die "dist/index.html was not produced."

  local revision="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
  prepare_release_directory "$(git -C "$SOURCE_DIR" rev-parse --short HEAD)"
  cp -a "${SOURCE_DIR}/dist/." "$RELEASE_DIR/"
  finalize_release "$revision"
}

extract_artifact_release() {
  info "Extracting prebuilt artifact ${ARTIFACT}..."
  prepare_release_directory "$ARTIFACT_REVISION"
  tar -xzf "$ARTIFACT" -C "$RELEASE_DIR"
  if [[ ! -f "${RELEASE_DIR}/index.html" && -f "${RELEASE_DIR}/dist/index.html" ]]; then
    cp -a "${RELEASE_DIR}/dist/." "$RELEASE_DIR/"
    rm -rf "${RELEASE_DIR}/dist"
  fi
  finalize_release "$ARTIFACT_REVISION"
}

activate_release() {
  local release_dir="$1"
  [[ -f "${release_dir}/index.html" ]] || die "Cannot activate a release without index.html: ${release_dir}"
  PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  ln -sfn "$release_dir" "${CURRENT_LINK}.next"
  mv -Tf "${CURRENT_LINK}.next" "$CURRENT_LINK"
  restorecon -R "$BASE_DIR" >/dev/null 2>&1 || true
  success "Activated $(basename "$release_dir")."
}

rollback_release() {
  mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null | sort -nr | awk '{print $2}')
  (( ${#releases[@]} >= 2 )) || die "At least two releases are required for rollback."
  local current="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  local target=""
  for release in "${releases[@]}"; do
    if [[ "$release" != "$current" ]]; then target="$release"; break; fi
  done
  [[ -n "$target" ]] || die "No previous release was found."
  activate_release "$target"
  nginx -t
  systemctl reload nginx || systemctl restart nginx
  health_check
  success "Rollback complete: $(basename "$target")."
}

ensure_certificate() {
  [[ "$USE_SSL" == "true" ]] || return
  if [[ -n "$CERTIFICATE" ]]; then
    [[ -f "$CERTIFICATE" ]] || die "Certificate not found: $CERTIFICATE"
    [[ -f "$CERTIFICATE_KEY" ]] || die "Certificate key not found: $CERTIFICATE_KEY"
    return
  fi

  CERTIFICATE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  CERTIFICATE_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
  [[ -f "$CERTIFICATE" && -f "$CERTIFICATE_KEY" ]] && return

  info "Obtaining a Let's Encrypt certificate for ${DOMAIN}..."
  dnf -y install --quiet epel-release
  dnf -y install --quiet certbot
  mkdir -p "${CURRENT_LINK}/.well-known/acme-challenge"
  rm -f "/etc/nginx/conf.d/${APP_NAME}-acme.conf"
  cat > "/etc/nginx/conf.d/${APP_NAME}-acme.conf" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    root ${CURRENT_LINK};
    location /.well-known/acme-challenge/ { try_files \$uri =404; }
    location / { return 503; }
}
NGINX
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
  certbot certonly --webroot -w "$CURRENT_LINK" -d "$DOMAIN" \
    --non-interactive --agree-tos --email "admin@${DOMAIN}" || \
    die "Certbot failed. Verify DNS for ${DOMAIN} and inbound ports 80/443."
  rm -f "/etc/nginx/conf.d/${APP_NAME}-acme.conf"
}

write_nginx_config() {
  local conf="/etc/nginx/conf.d/${APP_NAME}.conf"
  info "Writing Nginx configuration: ${conf}"

  if [[ "$USE_SSL" == "true" ]]; then
    cat > "$conf" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root ${CURRENT_LINK}; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    root ${CURRENT_LINK};
    index index.html;

    ssl_certificate ${CERTIFICATE};
    ssl_certificate_key ${CERTIFICATE_KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:FM1EDITOR_SSL:10m;
    ssl_session_timeout 1d;

    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(self), geolocation=()" always;

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        try_files \$uri =404;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Resource-Policy "same-origin" always;
        try_files \$uri =404;
    }

    location /samples/ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        add_header Cross-Origin-Resource-Policy "cross-origin" always;
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript application/wasm image/svg+xml;
}
NGINX
  else
    cat > "$conf" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    root ${CURRENT_LINK};
    index index.html;

    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location = /index.html { add_header Cache-Control "no-cache, no-store, must-revalidate"; try_files \$uri =404; }
    location /assets/ { expires 1y; add_header Cache-Control "public, max-age=31536000, immutable"; try_files \$uri =404; }
    location /samples/ { expires 7d; add_header Cache-Control "public, max-age=604800"; add_header Cross-Origin-Resource-Policy "cross-origin" always; try_files \$uri =404; }
    location / { try_files \$uri \$uri/ /index.html; }
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript application/wasm image/svg+xml;
}
NGINX
  fi

  nginx -t || die "Nginx configuration validation failed."
  systemctl enable --now nginx
  systemctl reload nginx || systemctl restart nginx
  success "Nginx configuration active."
}

configure_firewall() {
  if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http --quiet
    [[ "$USE_SSL" == "true" ]] && firewall-cmd --permanent --add-service=https --quiet
    firewall-cmd --reload --quiet
    success "Firewall updated."
  fi
}

health_check() {
  local code
  if [[ "$USE_SSL" == "true" ]]; then
    code="$(curl -ksS --resolve "${DOMAIN}:443:127.0.0.1" -o /dev/null -w '%{http_code}' --max-time 10 "https://${DOMAIN}/index.html" || echo 000)"
  else
    code="$(curl -sS -H "Host: ${DOMAIN}" -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1/index.html || echo 000)"
  fi
  [[ "$code" == "200" ]] || return 1
  success "Health check passed (HTTP ${code})."
}

prune_releases() {
  (( KEEP_RELEASES > 0 )) || return
  mapfile -t stale < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n "+$((KEEP_RELEASES + 1))" | awk '{print $2}')
  for release in "${stale[@]}"; do
    [[ "$release" == "$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)" ]] || rm -rf "$release"
  done
}

main() {
  require_root
  install_prerequisites
  mkdir -p "$BASE_DIR" "$RELEASES_DIR"

  if [[ "$ROLLBACK" == "true" ]]; then
    rollback_release
    exit 0
  fi

  if [[ -n "$ARTIFACT" ]]; then
    extract_artifact_release
  else
    fetch_source
    build_release
  fi

  activate_release "$RELEASE_DIR"
  ensure_certificate
  write_nginx_config
  configure_firewall

  if ! health_check; then
    warn "New release failed its health check."
    if [[ -n "${PREVIOUS_TARGET:-}" && -d "${PREVIOUS_TARGET}" ]]; then
      warn "Restoring previous release: $(basename "$PREVIOUS_TARGET")"
      activate_release "$PREVIOUS_TARGET"
      systemctl reload nginx || systemctl restart nginx
    fi
    die "Deployment rolled back. Inspect: journalctl -u nginx -n 100"
  fi

  prune_releases
  echo
  success "FM1 Editor deployed successfully."
  printf '  URL:      %s\n' "$([[ "$USE_SSL" == "true" ]] && echo https || echo http)://${DOMAIN}"
  printf '  Release:  %s\n' "$RELEASE_ID"
  printf '  Revision: %s\n' "$(cat "${RELEASE_DIR}/REVISION")"
  printf '  Root:     %s\n' "$CURRENT_LINK"
  printf '  Logs:     journalctl -u nginx -f\n'
}

main "$@"
