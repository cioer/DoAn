#!/bin/bash
#
# Script thiết lập auto-deploy trên VPS
# Chạy script này trên VPS sau khi SSH vào
#
# Usage: bash setup-autodeploy.sh <WEBHOOK_SECRET>
#

set -e

WEBHOOK_SECRET="${1:-}"

if [ -z "$WEBHOOK_SECRET" ]; then
    echo "============================================"
    echo "THIẾT LẬP AUTO-DEPLOY CHO QLNCKH"
    echo "============================================"
    echo ""
    echo "Bước 1: Tạo webhook secret"
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    echo "Secret đã tạo: $WEBHOOK_SECRET"
    echo ""
    echo "LƯU LẠI SECRET NÀY để cấu hình GitHub webhook!"
    echo ""
fi

echo "============================================"
echo "Bước 2: Pull code mới"
echo "============================================"
cd /home/deploy/qlnckh
git pull origin main

echo ""
echo "============================================"
echo "Bước 3: Thêm WEBHOOK_SECRET vào .env"
echo "============================================"
cd /home/deploy/qlnckh/qlnckh

# Kiểm tra xem đã có WEBHOOK_SECRET chưa
if grep -q "^WEBHOOK_SECRET=" .env 2>/dev/null; then
    # Cập nhật secret cũ
    sed -i "s/^WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env
    echo "Đã cập nhật WEBHOOK_SECRET trong .env"
else
    # Thêm mới
    echo "" >> .env
    echo "# Auto-deploy webhook secret" >> .env
    echo "WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
    echo "Đã thêm WEBHOOK_SECRET vào .env"
fi

echo ""
echo "============================================"
echo "Bước 4: Build và chạy webhook service"
echo "============================================"
cd /home/deploy/qlnckh/qlnckh/deploy

# Build webhook
docker compose -f docker-compose.vps.yml --env-file ../.env build webhook

# Chạy webhook
docker compose -f docker-compose.vps.yml --env-file ../.env up -d webhook

echo ""
echo "============================================"
echo "Bước 5: Cập nhật nginx config"
echo "============================================"
cp nginx.conf nginx.conf.active
docker compose -f docker-compose.vps.yml --env-file ../.env restart nginx

echo ""
echo "============================================"
echo "Bước 6: Kiểm tra"
echo "============================================"
sleep 5

# Kiểm tra webhook service
echo -n "Webhook service: "
if docker ps | grep -q qlnckh-webhook; then
    echo "RUNNING"
else
    echo "NOT RUNNING - Kiểm tra logs!"
fi

# Test health endpoint
echo -n "Health check: "
HEALTH=$(curl -s http://localhost:9000/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "OK"
else
    echo "FAILED"
fi

echo ""
echo "============================================"
echo "HOÀN TẤT!"
echo "============================================"
echo ""
echo "Webhook URL: https://huuthang.online/webhook"
echo "Webhook Secret: $WEBHOOK_SECRET"
echo ""
echo "BƯỚC TIẾP THEO:"
echo "1. Vào GitHub repo → Settings → Webhooks → Add webhook"
echo "2. Payload URL: https://huuthang.online/webhook"
echo "3. Content type: application/json"
echo "4. Secret: $WEBHOOK_SECRET"
echo "5. Events: Just the push event"
echo "6. Click Add webhook"
echo ""
echo "Xem logs: docker logs -f qlnckh-webhook"
echo ""
