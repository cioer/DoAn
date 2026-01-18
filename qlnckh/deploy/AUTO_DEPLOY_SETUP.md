# Hướng dẫn cấu hình Auto-Deploy

## Tổng quan

Auto-deploy cho phép VPS tự động cập nhật code khi có push vào branch `main` trên GitHub.

**Luồng hoạt động:**
```
Push code lên GitHub
        ↓
GitHub gửi POST request đến https://huuthang.online/webhook
        ↓
Webhook server xác thực signature
        ↓
Chạy script auto-deploy.sh
        ↓
Pull code mới, rebuild và restart containers
```

---

## Bước 1: Tạo Webhook Secret

Webhook secret dùng để xác thực request từ GitHub (đảm bảo không ai giả mạo).

```bash
# Tạo secret ngẫu nhiên
openssl rand -hex 32
# Ví dụ output: a1b2c3d4e5f6...
```

**Lưu secret này lại** - sẽ dùng cho cả VPS và GitHub.

---

## Bước 2: Thêm WEBHOOK_SECRET vào .env trên VPS

```bash
# SSH vào VPS
ssh deploy@huuthang.online

# Sửa file .env
cd /home/deploy/qlnckh/qlnckh
nano .env

# Thêm dòng sau (thay bằng secret đã tạo):
WEBHOOK_SECRET=a1b2c3d4e5f6...
```

---

## Bước 3: Deploy webhook service

```bash
cd /home/deploy/qlnckh

# Pull code mới (có webhook service)
git pull

# Build và chạy webhook service
cd qlnckh/deploy
docker compose -f docker-compose.vps.yml --env-file ../.env build webhook
docker compose -f docker-compose.vps.yml --env-file ../.env up -d webhook

# Copy nginx config mới và restart nginx
cp nginx.conf nginx.conf.active
docker compose -f docker-compose.vps.yml --env-file ../.env restart nginx

# Kiểm tra webhook đang chạy
curl http://localhost:9000/health
# Kết quả: {"status":"ok","timestamp":"..."}
```

---

## Bước 4: Cấu hình GitHub Webhook

1. Vào repository trên GitHub: https://github.com/cioer/DoAn

2. Click **Settings** → **Webhooks** → **Add webhook**

3. Điền thông tin:
   - **Payload URL:** `https://huuthang.online/webhook`
   - **Content type:** `application/json`
   - **Secret:** (paste secret đã tạo ở Bước 1)
   - **Which events:** Chọn `Just the push event`
   - **Active:** ✓ Tích chọn

4. Click **Add webhook**

5. GitHub sẽ gửi một ping request để test. Kiểm tra trong **Recent Deliveries** xem có response 200 không.

---

## Bước 5: Test Auto-Deploy

```bash
# Trên máy local, tạo một thay đổi nhỏ
echo "// test auto-deploy $(date)" >> qlnckh/apps/src/main.ts

# Commit và push
git add .
git commit -m "test: Test auto-deploy"
git push origin main

# SSH vào VPS và xem logs
ssh deploy@huuthang.online
docker logs -f qlnckh-webhook

# Hoặc xem file log
docker exec qlnckh-webhook cat /app/logs/webhook.log
docker exec qlnckh-webhook cat /app/logs/deploy.log
```

---

## Các lệnh hữu ích

### Xem logs webhook
```bash
docker logs -f qlnckh-webhook
# Hoặc
docker exec qlnckh-webhook tail -f /app/logs/webhook.log
```

### Xem logs deploy
```bash
docker exec qlnckh-webhook tail -f /app/logs/deploy.log
```

### Restart webhook service
```bash
docker compose -f docker-compose.vps.yml --env-file ../.env restart webhook
```

### Test webhook endpoint
```bash
# Health check
curl https://huuthang.online/webhook/health

# Test với fake payload (sẽ bị reject vì sai signature)
curl -X POST https://huuthang.online/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Troubleshooting

### 1. Webhook không nhận được request

**Kiểm tra:**
- Nginx có proxy đúng không: `docker logs qlnckh-nginx`
- Webhook service có chạy không: `docker ps | grep webhook`
- GitHub webhook delivery status

### 2. Signature invalid

**Nguyên nhân:** Secret không khớp giữa GitHub và VPS

**Giải pháp:**
1. Kiểm tra WEBHOOK_SECRET trong `.env`
2. Đảm bảo restart webhook sau khi đổi secret
3. Đảm bảo GitHub webhook dùng đúng secret

### 3. Deploy không chạy

**Kiểm tra logs:**
```bash
docker exec qlnckh-webhook cat /app/logs/deploy.log
```

**Có thể do:**
- Docker socket permission
- Git pull bị conflict
- Build lỗi

### 4. Container không restart được

**Kiểm tra Docker socket:**
```bash
docker exec qlnckh-webhook ls -la /var/run/docker.sock
# Phải có quyền đọc/ghi
```

---

## Bảo mật

1. **HTTPS bắt buộc:** Webhook chỉ nên nhận request qua HTTPS để bảo vệ signature

2. **Webhook Secret:** Luôn dùng secret mạnh (32+ ký tự ngẫu nhiên)

3. **Signature verification:** Server luôn xác thực signature trước khi chạy deploy

4. **Branch filtering:** Chỉ deploy khi push vào `main` hoặc `master`

5. **Docker socket:** Chỉ mount read-only nếu có thể (hiện tại cần write để restart containers)

---

## Tắt Auto-Deploy

Nếu muốn tắt auto-deploy (ví dụ: deploy thủ công):

```bash
# Dừng webhook service
docker compose -f docker-compose.vps.yml --env-file ../.env stop webhook

# Hoặc xóa/disable webhook trên GitHub Settings
```
