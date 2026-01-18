#!/bin/bash
#
# Auto-Deploy Script cho QLNCKH
#
# Script này được gọi bởi webhook server khi có push vào branch main
# Nó sẽ:
# 1. Pull code mới từ GitHub
# 2. Rebuild Docker images nếu cần
# 3. Restart containers
#
# Lưu ý: Script này chạy trong webhook container và giao tiếp với
# Docker daemon thông qua Docker socket được mount vào container
#

set -e  # Dừng ngay nếu có lỗi

# ============================================
# Cấu hình
# ============================================
REPO_DIR="/repo"                    # Thư mục repo được mount vào container
DEPLOY_DIR="$REPO_DIR/qlnckh/deploy"
COMPOSE_FILE="docker-compose.vps.yml"
ENV_FILE="$REPO_DIR/qlnckh/.env"
LOG_FILE="/app/logs/deploy.log"

# ============================================
# Hàm tiện ích
# ============================================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    exit 1
}

# ============================================
# Kiểm tra điều kiện
# ============================================
log "========== BẮT ĐẦU AUTO-DEPLOY =========="

# Fix: Git safe.directory (container user khác với repo owner)
git config --global --add safe.directory "$REPO_DIR"

# Kiểm tra thư mục repo
if [ ! -d "$REPO_DIR/.git" ]; then
    error "Không tìm thấy git repository tại $REPO_DIR"
fi

# Kiểm tra docker socket
if [ ! -S "/var/run/docker.sock" ]; then
    error "Docker socket không có sẵn"
fi

# ============================================
# 1. Pull code mới
# ============================================
log "Step 1: Pulling code từ GitHub..."

cd "$REPO_DIR"

# Lưu commit hiện tại để so sánh
OLD_COMMIT=$(git rev-parse HEAD)

# Fetch và pull
git fetch origin main
git reset --hard origin/main

NEW_COMMIT=$(git rev-parse HEAD)

if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    log "Không có thay đổi mới (commit: ${NEW_COMMIT:0:7})"
    log "========== DEPLOY HOÀN TẤT (no changes) =========="
    exit 0
fi

log "Đã pull từ ${OLD_COMMIT:0:7} -> ${NEW_COMMIT:0:7}"

# Hiển thị các file thay đổi
log "Files changed:"
git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" | head -20 | while read file; do
    log "  - $file"
done

# ============================================
# 2. Kiểm tra xem có cần rebuild không
# ============================================
log "Step 2: Kiểm tra cần rebuild..."

NEED_REBUILD_APP=false
NEED_REBUILD_FORM_ENGINE=false

# Kiểm tra thay đổi trong qlnckh/ (app)
if git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" | grep -q "^qlnckh/"; then
    # Loại trừ các file không ảnh hưởng build
    if git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" | grep "^qlnckh/" | grep -vE "^qlnckh/(deploy/|docs/|README)" | grep -q .; then
        NEED_REBUILD_APP=true
        log "  -> Cần rebuild app (có thay đổi source code)"
    fi
fi

# Kiểm tra thay đổi trong form-engine-service/
if git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" | grep -q "^form-engine-service/"; then
    NEED_REBUILD_FORM_ENGINE=true
    log "  -> Cần rebuild form-engine"
fi

# ============================================
# 3. Rebuild và restart containers
# ============================================
cd "$DEPLOY_DIR"

if [ "$NEED_REBUILD_APP" = true ]; then
    log "Step 3a: Rebuilding app..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build app

    log "Step 3b: Restarting app..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d app
else
    log "Step 3: Không cần rebuild app"
fi

if [ "$NEED_REBUILD_FORM_ENGINE" = true ]; then
    log "Step 3c: Rebuilding form-engine..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build form-engine

    log "Step 3d: Restarting form-engine..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d form-engine
fi

# ============================================
# 4. Kiểm tra health
# ============================================
log "Step 4: Kiểm tra health của services..."

sleep 10  # Chờ containers khởi động

# Kiểm tra app container
if docker ps --filter "name=qlnckh-app" --filter "status=running" | grep -q qlnckh-app; then
    log "  -> qlnckh-app: Running"
else
    log "  -> qlnckh-app: NOT RUNNING - kiểm tra logs!"
fi

# Kiểm tra nginx
if docker ps --filter "name=qlnckh-nginx" --filter "status=running" | grep -q qlnckh-nginx; then
    log "  -> qlnckh-nginx: Running"
else
    log "  -> qlnckh-nginx: NOT RUNNING"
fi

# ============================================
# 5. Cleanup
# ============================================
log "Step 5: Dọn dẹp Docker images cũ..."
docker image prune -f --filter "until=24h" || true

# ============================================
# Hoàn tất
# ============================================
log "========== DEPLOY HOÀN TẤT =========="
log "Commit: ${NEW_COMMIT:0:7}"
log "App rebuilt: $NEED_REBUILD_APP"
log "Form-engine rebuilt: $NEED_REBUILD_FORM_ENGINE"

# Gửi thông báo (có thể thêm webhook Slack/Discord ở đây)
# curl -X POST -H 'Content-type: application/json' \
#   --data "{\"text\":\"Deploy thành công: ${NEW_COMMIT:0:7}\"}" \
#   "$SLACK_WEBHOOK_URL"

exit 0
