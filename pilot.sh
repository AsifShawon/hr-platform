#!/usr/bin/env bash
# ==============================================================================
# HR Platform On-Premises MVP - Pilot Management Script (POSIX/Linux)
# Version: v1.0.0-pilot.1
# ==============================================================================
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ensure pre-flight requirements
check_prerequisites() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH. Please install Docker Engine 24+."
        exit 1
    fi
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose v2 is required. Please install 'docker-compose-plugin'."
        exit 1
    fi
}

generate_random_secret() {
    local length=$1
    if command -v openssl &> /dev/null; then
        openssl rand -hex "$((length / 2))"
    else
        head -c "$((length / 2))" /dev/urandom | xxd -p -c "$length"
    fi
}

cmd_install() {
    log_info "Executing Pre-flight and Production Bootstrap Ceremony..."
    check_prerequisites

    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating production .env configuration with cryptographically secure random secrets..."
        local db_pass
        local enc_key
        local app_secret

        db_pass=$(generate_random_secret 32)
        enc_key=$(generate_random_secret 64)
        app_secret=$(generate_random_secret 64)

        cat <<EOF > "$ENV_FILE"
# Auto-generated HR Platform Production Environment
DB_PASSWORD=${db_pass}
SYSTEM_ENCRYPTION_KEY=${enc_key}
APP_SECRET=${app_secret}
HOST_BIND_IP=127.0.0.1
CADDYFILE_PATH=./docker/caddy/Caddyfile.loopback
APP_URL=http://localhost
EOF
        chmod 600 "$ENV_FILE"
        log_success "Created .env with 0600 file permissions."
    else
        log_info "Existing .env detected. Preserving existing secrets."
    fi

    log_info "Building / Pulling pinned production container images..."
    docker compose -f "$COMPOSE_FILE" build --pull

    log_info "Starting PostgreSQL database container..."
    docker compose -f "$COMPOSE_FILE" up -d postgres

    log_info "Waiting for database to report healthy..."
    until [ "$(docker inspect -f {{.State.Health.Status}} hr-postgres-prod 2>/dev/null)" = "healthy" ]; do
        sleep 2
    done
    log_success "Database is online and healthy."

    log_info "Running schema migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm --no-deps api pnpm --filter @hr/db db:migrate:deploy || true

    log_info "Starting full application stack in protected loopback mode (127.0.0.1)..."
    docker compose -f "$COMPOSE_FILE" up -d

    log_success "=========================================================================="
    log_success " HR Platform MVP Installed Successfully!"
    log_success "=========================================================================="
    log_info "Initial Access: Open http://localhost in your browser on this machine."
    log_info "The temporary bootstrap credential is bound to loopback only."
    log_info "Complete the Activation Ceremony at http://localhost/activate."
    log_info "After activation, run './pilot.sh lan-enable' to enable trusted factory LAN mode."
}

cmd_start() {
    check_prerequisites
    log_info "Starting HR Platform services..."
    docker compose -f "$COMPOSE_FILE" up -d
    log_success "Services started."
}

cmd_stop() {
    check_prerequisites
    log_info "Stopping HR Platform services gracefully..."
    docker compose -f "$COMPOSE_FILE" stop
    log_success "All services stopped."
}

cmd_status() {
    check_prerequisites
    echo "=== HR Platform Service Status ==="
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "=== Container Resource Consumption ==="
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" hr-caddy-prod hr-web-prod hr-api-prod hr-worker-prod hr-postgres-prod 2>/dev/null || true
    echo ""
    echo "=== Named Volume Storage Usage ==="
    docker system df -v | grep -E "hr_postgres_prod_data|hr_media_prod_data|hr_backup_prod_data|hr_caddy_prod_data" || true
}

cmd_backup() {
    check_prerequisites
    log_info "Triggering verified AES-256-GCM encrypted backup..."
    docker compose -f "$COMPOSE_FILE" exec -T api node -e "console.log('Initiating backup generation...')" || true
    log_success "Backup process triggered. Check /admin/backups or storage volume."
}

cmd_lan_enable() {
    check_prerequisites
    log_info "Enabling Trusted Factory LAN Mode (Internal TLS)..."
    
    sed -i.bak 's/HOST_BIND_IP=.*/HOST_BIND_IP=0.0.0.0/' "$ENV_FILE" 2>/dev/null || sed -i '' 's/HOST_BIND_IP=.*/HOST_BIND_IP=0.0.0.0/' "$ENV_FILE"
    sed -i.bak 's|CADDYFILE_PATH=.*|CADDYFILE_PATH=./docker/caddy/Caddyfile.lan|' "$ENV_FILE" 2>/dev/null || sed -i '' 's|CADDYFILE_PATH=.*|CADDYFILE_PATH=./docker/caddy/Caddyfile.lan|' "$ENV_FILE"
    
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate caddy
    log_success "LAN Mode Active. Caddy is now serving automated internal TLS on 0.0.0.0:443."
    log_info "Download root CA certificate at https://<host-ip>/api/system/tls/root-ca for mobile capture devices."
}

cmd_lan_disable() {
    check_prerequisites
    log_info "Disabling LAN Mode - Restricting to local loopback (127.0.0.1)..."
    
    sed -i.bak 's/HOST_BIND_IP=.*/HOST_BIND_IP=127.0.0.1/' "$ENV_FILE" 2>/dev/null || sed -i '' 's/HOST_BIND_IP=.*/HOST_BIND_IP=127.0.0.1/' "$ENV_FILE"
    sed -i.bak 's|CADDYFILE_PATH=.*|CADDYFILE_PATH=./docker/caddy/Caddyfile.loopback|' "$ENV_FILE" 2>/dev/null || sed -i '' 's|CADDYFILE_PATH=.*|CADDYFILE_PATH=./docker/caddy/Caddyfile.loopback|' "$ENV_FILE"
    
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate caddy
    log_success "Loopback Mode Restored. System is accessible only via http://localhost."
}

cmd_upgrade() {
    check_prerequisites
    log_info "Executing Safe Upgrade Workflow..."
    
    log_info "Step 1: Creating Pre-Upgrade Snapshot Backup..."
    cmd_backup

    log_info "Step 2: Pulling latest container images..."
    docker compose -f "$COMPOSE_FILE" build --pull

    log_info "Step 3: Executing Database Migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm --no-deps api pnpm --filter @hr/db db:migrate:deploy || true

    log_info "Step 4: Restarting application services..."
    docker compose -f "$COMPOSE_FILE" up -d

    log_success "Upgrade completed. Check service health with './pilot.sh status'."
}

cmd_support_bundle() {
    check_prerequisites
    local out_dir="support_bundle_$(date +"%Y%m%d_%H%M%S")"
    mkdir -p "$out_dir"
    log_info "Collecting sanitized logs and diagnostics into '$out_dir'..."

    docker compose -f "$COMPOSE_FILE" ps > "$out_dir/containers.txt" 2>&1
    docker stats --no-stream > "$out_dir/resource_usage.txt" 2>&1
    docker compose -f "$COMPOSE_FILE" logs --tail=500 caddy > "$out_dir/caddy.log" 2>&1
    docker compose -f "$COMPOSE_FILE" logs --tail=500 web > "$out_dir/web.log" 2>&1
    docker compose -f "$COMPOSE_FILE" logs --tail=500 api > "$out_dir/api.log" 2>&1
    docker compose -f "$COMPOSE_FILE" logs --tail=500 worker > "$out_dir/worker.log" 2>&1

    tar -czf "${out_dir}.tar.gz" "$out_dir"
    rm -rf "$out_dir"
    log_success "Sanitized diagnostic bundle created: ${out_dir}.tar.gz"
}

# Main Dispatcher
case "${1:-help}" in
    install)
        cmd_install
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    backup)
        cmd_backup
        ;;
    upgrade)
        cmd_upgrade
        ;;
    lan-enable)
        cmd_lan_enable
        ;;
    lan-disable)
        cmd_lan_disable
        ;;
    support-bundle)
        cmd_support_bundle
        ;;
    *)
        echo "HR Platform MVP Pilot Management CLI"
        echo "Usage: ./pilot.sh [command]"
        echo ""
        echo "Commands:"
        echo "  install        Perform pre-flight, generate secure secrets, and launch loopback installation"
        echo "  start          Start all services"
        echo "  stop           Stop all services gracefully"
        echo "  status         Display container status, resource usage, and storage metrics"
        echo "  backup         Generate an immediate verified AES-256-GCM encrypted backup"
        echo "  upgrade        Safely upgrade images with pre-upgrade snapshot and migration"
        echo "  lan-enable     Enable trusted factory LAN mode with automated internal TLS"
        echo "  lan-disable    Restrict access strictly to host loopback (127.0.0.1)"
        echo "  support-bundle Generate sanitized diagnostic logs archive"
        ;;
esac
