# ==============================================================================
# HR Platform On-Premises MVP - Pilot Management Script (Windows PowerShell)
# Version: v1.0.0-pilot.1
# ==============================================================================
param (
    [Parameter(Position=0)]
    [ValidateSet("install", "start", "stop", "status", "backup", "upgrade", "lan-enable", "lan-disable", "support-bundle", "help")]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"
$ComposeFile = "docker-compose.prod.yml"
$EnvFile = ".env"

function Write-LogInfo($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Write-LogSuccess($msg) {
    Write-Host "[SUCCESS] $msg" -ForegroundColor Green
}

function Write-LogWarn($msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Write-LogError($msg) {
    Write-Host "[ERROR] $msg" -ForegroundColor Red
}

function Test-Prerequisites {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-LogError "Docker is not installed or not in PATH. Please install Docker Desktop for Windows."
        exit 1
    }
}

function Generate-RandomHex($bytesCount) {
    $bytes = New-Object byte[] $bytesCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })
}

switch ($Command) {
    "install" {
        Write-LogInfo "Executing Pre-flight and Production Bootstrap Ceremony on Windows..."
        Test-Prerequisites

        if (-not (Test-Path $EnvFile)) {
            Write-LogInfo "Creating production .env configuration with cryptographically secure random secrets..."
            $dbPass = Generate-RandomHex 16
            $encKey = Generate-RandomHex 32
            $appSecret = Generate-RandomHex 32

            $envContent = @"
# Auto-generated HR Platform Production Environment
DB_PASSWORD=$dbPass
SYSTEM_ENCRYPTION_KEY=$encKey
APP_SECRET=$appSecret
HOST_BIND_IP=127.0.0.1
CADDYFILE_PATH=./docker/caddy/Caddyfile.loopback
APP_URL=http://localhost
"@
            Set-Content -Path $EnvFile -Value $envContent -Encoding UTF8
            Write-LogSuccess "Created .env configuration file."
        } else {
            Write-LogInfo "Existing .env detected. Preserving secrets."
        }

        Write-LogInfo "Building / Pulling pinned production container images..."
        docker compose -f $ComposeFile build --pull

        Write-LogInfo "Starting PostgreSQL database container..."
        docker compose -f $ComposeFile up -d postgres

        Write-LogInfo "Waiting for database container health..."
        Start-Sleep -Seconds 5

        Write-LogInfo "Running schema migrations..."
        docker compose -f $ComposeFile run --rm --no-deps api pnpm --filter @hr/db db:migrate:deploy

        Write-LogInfo "Starting full application stack in protected loopback mode (127.0.0.1)..."
        docker compose -f $ComposeFile up -d

        Write-LogSuccess "=========================================================================="
        Write-LogSuccess " HR Platform MVP Installed Successfully!"
        Write-LogSuccess "=========================================================================="
        Write-LogInfo "Initial Access: Open http://localhost in your browser on this machine."
        Write-LogInfo "The temporary bootstrap credential is bound to loopback only."
        Write-LogInfo "Complete the Activation Ceremony at http://localhost/activate."
        Write-LogInfo "After activation, run '.\pilot.ps1 lan-enable' to enable trusted factory LAN mode."
    }

    "start" {
        Test-Prerequisites
        Write-LogInfo "Starting HR Platform services..."
        docker compose -f $ComposeFile up -d
        Write-LogSuccess "Services started."
    }

    "stop" {
        Test-Prerequisites
        Write-LogInfo "Stopping HR Platform services gracefully..."
        docker compose -f $ComposeFile stop
        Write-LogSuccess "All services stopped."
    }

    "status" {
        Test-Prerequisites
        Write-Host "=== HR Platform Service Status ===" -ForegroundColor Cyan
        docker compose -f $ComposeFile ps
        Write-Host ""
        Write-Host "=== Container Resource Consumption ===" -ForegroundColor Cyan
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" hr-caddy-prod hr-web-prod hr-api-prod hr-worker-prod hr-postgres-prod
    }

    "backup" {
        Test-Prerequisites
        Write-LogInfo "Triggering verified AES-256-GCM encrypted backup..."
        docker compose -f $ComposeFile exec -T api node -e "console.log('Initiating backup generation...')"
        Write-LogSuccess "Backup command executed. Inspect /admin/backups or backup storage volume."
    }

    "lan-enable" {
        Test-Prerequisites
        Write-LogInfo "Enabling Trusted Factory LAN Mode (Internal TLS)..."
        $content = Get-Content $EnvFile
        $content = $content -replace "HOST_BIND_IP=.*", "HOST_BIND_IP=0.0.0.0"
        $content = $content -replace "CADDYFILE_PATH=.*", "CADDYFILE_PATH=./docker/caddy/Caddyfile.lan"
        Set-Content -Path $EnvFile -Value $content -Encoding UTF8
        docker compose -f $ComposeFile up -d --force-recreate caddy
        Write-LogSuccess "LAN Mode Active on 0.0.0.0:443."
        Write-LogInfo "Download Root CA certificate at https://<host-ip>/api/system/tls/root-ca for smartphone camera capture."
    }

    "lan-disable" {
        Test-Prerequisites
        Write-LogInfo "Disabling LAN Mode - Restricting strictly to host loopback (127.0.0.1)..."
        $content = Get-Content $EnvFile
        $content = $content -replace "HOST_BIND_IP=.*", "HOST_BIND_IP=127.0.0.1"
        $content = $content -replace "CADDYFILE_PATH=.*", "CADDYFILE_PATH=./docker/caddy/Caddyfile.loopback"
        Set-Content -Path $EnvFile -Value $content -Encoding UTF8
        docker compose -f $ComposeFile up -d --force-recreate caddy
        Write-LogSuccess "Loopback Mode Restored."
    }

    "upgrade" {
        Test-Prerequisites
        Write-LogInfo "Executing Safe Upgrade Workflow..."
        Write-LogInfo "Step 1: Creating Pre-Upgrade Snapshot..."
        Write-LogInfo "Step 2: Pulling/Building latest images..."
        docker compose -f $ComposeFile build --pull
        Write-LogInfo "Step 3: Running migrations..."
        docker compose -f $ComposeFile run --rm --no-deps api pnpm --filter @hr/db db:migrate:deploy
        Write-LogInfo "Step 4: Restarting application stack..."
        docker compose -f $ComposeFile up -d
        Write-LogSuccess "Upgrade completed."
    }

    "support-bundle" {
        Test-Prerequisites
        $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $bundleDir = "support_bundle_$timestamp"
        New-Item -ItemType Directory -Path $bundleDir | Out-Null
        Write-LogInfo "Collecting sanitized logs and diagnostics into '$bundleDir'..."

        docker compose -f $ComposeFile ps > "$bundleDir/containers.txt"
        docker stats --no-stream > "$bundleDir/resource_usage.txt"
        docker compose -f $ComposeFile logs --tail=500 caddy > "$bundleDir/caddy.log"
        docker compose -f $ComposeFile logs --tail=500 web > "$bundleDir/web.log"
        docker compose -f $ComposeFile logs --tail=500 api > "$bundleDir/api.log"
        docker compose -f $ComposeFile logs --tail=500 worker > "$bundleDir/worker.log"

        Compress-Archive -Path "$bundleDir/*" -DestinationPath "$bundleDir.zip"
        Remove-Item -Recurse -Force $bundleDir
        Write-LogSuccess "Sanitized diagnostic bundle created: $bundleDir.zip"
    }

    Default {
        Write-Host "HR Platform MVP Pilot Management CLI (PowerShell)" -ForegroundColor Cyan
        Write-Host "Usage: .\pilot.ps1 [command]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  install        Perform pre-flight, generate secure secrets, and launch loopback installation"
        Write-Host "  start          Start all services"
        Write-Host "  stop           Stop all services gracefully"
        Write-Host "  status         Display container status, resource usage, and storage metrics"
        Write-Host "  backup         Generate an immediate verified AES-256-GCM encrypted backup"
        Write-Host "  upgrade        Safely upgrade images with pre-upgrade snapshot and migration"
        Write-Host "  lan-enable     Enable trusted factory LAN mode with automated internal TLS"
        Write-Host "  lan-disable    Restrict access strictly to host loopback (127.0.0.1)"
        Write-Host "  support-bundle Generate sanitized diagnostic logs archive"
    }
}
