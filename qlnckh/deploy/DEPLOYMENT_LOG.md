# Nhật ký Deploy QLNCKH lên VPS

**Ngày:** 18/01/2026
**Auto-deploy:** ✅ Đã kích hoạt (test lúc 12:53 GMT+7)
**Domain:** huuthang.online
**VPS:** deploy@huuthang.online

---

## 1. Kiểm tra tình trạng VPS ban đầu

```bash
docker ps
# Kết quả: VPS đang chạy Android backend trên port 80
# - school_management_backend (port 80)
# - school_management_db (port 3306)
```

**Vấn đề:** Android backend đang chiếm port 80, không thể chạy Nginx trên cùng port.

**Giải pháp:** Chuyển Android backend sang port 8080 để giải phóng port 80 cho Nginx.

```bash
# Sửa file .env của Android backend
# PORT=80 -> PORT=8080
# docker-compose.yml: ports: "80:80" -> "8080:80"
docker compose down && docker compose up -d
```

---

## 2. Vấn đề với Sudo trên VPS

```bash
ssh deploy@huuthang.online "sudo apt-get install nginx"
# Lỗi: sudo yêu cầu password nhưng không thể nhập qua SSH non-interactive
```

**Vấn đề:** User `deploy` cần nhập password cho sudo, nhưng khi chạy lệnh qua SSH từ xa, không có cách nào nhập password an toàn.

**Giải pháp:** Thay vì cài Nginx trên host (cần sudo), chuyển sang dùng Nginx trong Docker container - không cần quyền root.

```yaml
# docker-compose.vps.yml - Thêm nginx container
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf.active:/etc/nginx/conf.d/default.conf:ro
      - certbot_www:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
```

**Lý do:** Docker container chạy với quyền của user hiện tại, không cần sudo. Nginx trong container có thể bind port 80/443 vì được cấp quyền thông qua Docker socket.

---

## 3. Vấn đề đường dẫn trong docker-compose.vps.yml

```yaml
# Sai - đường dẫn tương đối không đúng
form-engine:
  build:
    context: ../form-engine-service  # Sai!
```

**Vấn đề:** File docker-compose.vps.yml nằm trong `qlnckh/deploy/`, nhưng `form-engine-service` nằm ngoài thư mục `qlnckh/`. Đường dẫn `../form-engine-service` sẽ trỏ đến `qlnckh/form-engine-service` (không tồn tại).

**Cấu trúc thực tế trên VPS:**
```
/home/deploy/qlnckh/           # Git clone root
├── form-engine-service/       # Đây là form-engine
├── modul_create_temple/       # Templates
└── qlnckh/                    # Thư mục con
    └── deploy/
        └── docker-compose.vps.yml
```

**Giải pháp:** Sửa đường dẫn thành `../../form-engine-service`

```yaml
# Đúng
form-engine:
  build:
    context: ../../form-engine-service
  volumes:
    - ../../modul_create_temple:/app/templates:ro
```

---

## 4. Vấn đề biến môi trường không được đọc

```bash
docker compose -f docker-compose.vps.yml up -d
# Warning: The "POSTGRES_PASSWORD" variable is not set
```

**Vấn đề:** Docker Compose không tự động đọc file `.env` khi chạy từ thư mục `deploy/`, trong khi `.env` nằm ở thư mục cha `qlnckh/`.

**Giải pháp 1:** Thêm `env_file` vào từng service trong docker-compose.yml

```yaml
postgres:
  env_file:
    - ../.env  # Đường dẫn tương đối đến .env
```

**Giải pháp 2:** Dùng flag `--env-file` khi chạy docker compose

```bash
docker compose -f docker-compose.vps.yml --env-file ../.env up -d
```

**Lý do:** Docker Compose chỉ tự động đọc `.env` nếu nó nằm cùng thư mục với docker-compose.yml. Khi file `.env` ở thư mục khác, phải chỉ định rõ đường dẫn.

---

## 5. Vấn đề NestJS bind localhost

```bash
curl http://huuthang.online
# Lỗi: 502 Bad Gateway
```

```javascript
// apps/src/main.ts - Code cũ
await app.listen(port, '127.0.0.1');  // Chỉ lắng nghe localhost!
```

**Vấn đề:** App NestJS bind vào `127.0.0.1` (localhost), nghĩa là chỉ chấp nhận kết nối từ bên trong container. Nginx container không thể kết nối đến vì nó ở container khác (khác network namespace).

**Giải pháp:** Bind vào `0.0.0.0` để chấp nhận kết nối từ mọi interface.

```javascript
// apps/src/main.ts - Code mới
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
await app.listen(port, host);
```

**Lý do:**
- `127.0.0.1`: Chỉ chấp nhận kết nối nội bộ (loopback interface)
- `0.0.0.0`: Chấp nhận kết nối từ tất cả network interfaces, bao gồm Docker bridge network

---

## 6. Vấn đề SSL Certificate với Certbot

```bash
docker compose run certbot certonly --webroot ...
# Kết quả: "No renewals were attempted"
```

**Vấn đề:** Khi dùng `docker compose run` với certbot service đã có entrypoint sẵn, lệnh bị conflict.

**Giải pháp:** Chạy certbot trực tiếp với `docker run`, mount đúng volumes:

```bash
docker run --rm \
  -v deploy_certbot_www:/var/www/certbot \
  -v deploy_certbot_conf:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d huuthang.online \
  --register-unsafely-without-email \
  --agree-tos
```

**Kết quả:** Certificate được tạo thành công tại `/etc/letsencrypt/live/huuthang.online/`

---

## 7. Vấn đề Database Migration

```bash
npx prisma migrate deploy
# Lỗi: relation "proposals" does not exist
```

**Vấn đề:** Thư mục `prisma/migrations/` trong git chỉ chứa 3 migration mới, thiếu migration cơ bản tạo bảng `proposals` (bị gitignore).

**Giải pháp:** Sử dụng `prisma db push` thay vì `migrate deploy` cho lần đầu tiên:

```bash
npx prisma db push --skip-generate
```

**Lý do:**
- `prisma migrate deploy`: Chạy các migration files theo thứ tự, yêu cầu đầy đủ migration history
- `prisma db push`: Đồng bộ schema trực tiếp với database, bỏ qua migration history - phù hợp cho lần setup đầu tiên

---

## 8. Vấn đề ServeStaticModule cho Frontend

```bash
curl https://huuthang.online/
# Kết quả: {"message":"Cannot GET /","statusCode":404}
```

**Vấn đề:** NestJS chỉ serve API tại `/api/*`, không serve frontend React.

**Giải pháp:** Thêm `ServeStaticModule` vào app.module.ts:

```typescript
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'web-apps'),
      exclude: ['/api{*path}'],  // Không serve static cho API routes
    }),
    // ... other modules
  ],
})
```

**Lý do:** NestJS mặc định chỉ handle routes được định nghĩa trong controllers. Để serve file tĩnh (HTML, JS, CSS), cần thêm ServeStaticModule.

---

## 9. Vấn đề path-to-regexp syntax

```bash
# Lỗi: PathError: Missing parameter name at index 5: /api*
```

**Vấn đề:** Pattern `/api*` không hợp lệ trong path-to-regexp v8 (version mới).

**Giải pháp:** Đổi thành syntax mới `/api{*path}`:

```typescript
// Cũ (v7 và trước)
exclude: ['/api*']

// Mới (v8+)
exclude: ['/api{*path}']
```

**Lý do:** path-to-regexp v8 thay đổi syntax cho wildcard matching. Phải đặt tên cho parameter (`path`) thay vì dùng `*` đơn thuần.

---

## 10. Vấn đề đường dẫn static files

```bash
# Lỗi: ENOENT: no such file or directory, stat '/app/web-apps/index.html'
```

**Vấn đề:** Đường dẫn `join(__dirname, '..', '..', 'web-apps')` không đúng.

**Phân tích:**
```
Khi build, __dirname = /app/dist/apps (vị trí của main.js)
join(__dirname, '..', '..', 'web-apps') = /app/web-apps (SAI!)
join(__dirname, '..', 'web-apps') = /app/dist/web-apps (ĐÚNG!)
```

**Cấu trúc trong container:**
```
/app/
├── dist/
│   ├── apps/
│   │   └── main.js      <- __dirname ở đây
│   └── web-apps/
│       └── index.html   <- File cần serve
```

**Giải pháp:**
```typescript
// Đúng
rootPath: join(__dirname, '..', 'web-apps')
```

---

## Tổng kết các file đã tạo/sửa

| File | Mô tả |
|------|-------|
| `deploy/docker-compose.vps.yml` | Docker compose cho VPS với nginx, certbot |
| `deploy/nginx.conf` | Nginx config với HTTPS |
| `deploy/nginx-init.conf` | Nginx config ban đầu (HTTP only) |
| `deploy/deploy.sh` | Script tự động deploy |
| `apps/src/main.ts` | Sửa bind 0.0.0.0, cập nhật CORS |
| `apps/src/app/app.module.ts` | Thêm ServeStaticModule |

---

## Các lệnh deploy tiếp theo

```bash
# SSH vào VPS
ssh deploy@huuthang.online

# Di chuyển đến thư mục deploy
cd /home/deploy/qlnckh/qlnckh/deploy

# Cập nhật code
git pull

# Rebuild và restart app
docker compose -f docker-compose.vps.yml --env-file ../.env build app
docker compose -f docker-compose.vps.yml --env-file ../.env up -d app

# Xem logs
docker compose -f docker-compose.vps.yml --env-file ../.env logs -f app

# Restart tất cả services
docker compose -f docker-compose.vps.yml --env-file ../.env restart
```

---

## 11. Thiết lập Auto-Deploy với GitHub Webhooks

**Mục tiêu:** VPS tự động cập nhật code khi push lên branch `main`.

**Kiến trúc:**
```
Push code lên GitHub
        ↓
GitHub gửi POST đến https://huuthang.online/webhook
        ↓
Webhook server (Node.js container) xác thực signature
        ↓
Chạy auto-deploy.sh: git pull → rebuild → restart
```

### 11.1. Tạo Webhook Server

```javascript
// deploy/webhook/server.js
const http = require('http');
const crypto = require('crypto');

// Xác thực signature từ GitHub
function verifySignature(payload, signature) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

**Lý do dùng HMAC-SHA256:**
- GitHub ký payload bằng secret key
- Server xác thực để đảm bảo request thật sự từ GitHub
- Ngăn chặn kẻ tấn công giả mạo webhook

### 11.2. Script Auto-Deploy

```bash
# deploy/webhook/auto-deploy.sh

# 1. Pull code mới
git fetch origin main
git reset --hard origin/main

# 2. Kiểm tra file nào thay đổi
CHANGED=$(git diff --name-only $OLD_COMMIT $NEW_COMMIT)

# 3. Chỉ rebuild nếu source code thay đổi (không rebuild nếu chỉ đổi docs)
if echo "$CHANGED" | grep -q "^qlnckh/"; then
  docker compose build app
  docker compose up -d app
fi
```

**Lý do kiểm tra file thay đổi:**
- Tiết kiệm thời gian: không rebuild nếu chỉ đổi README
- Giảm downtime: chỉ restart service cần thiết

### 11.3. Thêm vào Docker Compose

```yaml
# docker-compose.vps.yml
webhook:
  build: ./webhook
  ports:
    - "127.0.0.1:9000:9000"  # Chỉ localhost, nginx proxy
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock  # Để chạy docker commands
    - ../../:/repo  # Mount repo để git pull
  environment:
    WEBHOOK_SECRET: ${WEBHOOK_SECRET}
```

**Lý do mount Docker socket:**
- Webhook container cần chạy `docker compose` để rebuild/restart
- Mount socket cho phép container giao tiếp với Docker daemon trên host

**Bảo mật:**
- Port 9000 chỉ bind localhost (không expose ra ngoài)
- Nginx proxy `/webhook` endpoint với HTTPS

### 11.4. Cập nhật Nginx Config

```nginx
# Thêm upstream cho webhook
upstream webhook {
    server webhook:9000;
}

# Proxy /webhook endpoint
location /webhook {
    proxy_pass http://webhook;
    # Giữ nguyên headers từ GitHub để xác thực
    proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
    proxy_set_header X-GitHub-Event $http_x_github_event;
}
```

**Lý do proxy qua Nginx:**
- Webhook được bảo vệ bởi HTTPS (SSL termination tại Nginx)
- Không cần expose thêm port ra ngoài
- Dùng chung domain `huuthang.online`

### 11.5. Cấu hình GitHub Webhook

1. Vào **Repository Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://huuthang.online/webhook`
3. **Content type:** `application/json`
4. **Secret:** Paste WEBHOOK_SECRET từ VPS
5. **Events:** Chọn "Just the push event"

### 11.6. Các file đã tạo

| File | Mô tả |
|------|-------|
| `deploy/webhook/server.js` | Webhook server nhận request từ GitHub |
| `deploy/webhook/auto-deploy.sh` | Script pull code và rebuild containers |
| `deploy/webhook/Dockerfile` | Docker image cho webhook service |
| `deploy/setup-autodeploy.sh` | Script setup trên VPS |
| `deploy/AUTO_DEPLOY_SETUP.md` | Hướng dẫn chi tiết |

### 11.7. Lệnh setup trên VPS

```bash
# SSH vào VPS và chạy setup script
ssh deploy@huuthang.online
cd /home/deploy/qlnckh
git pull origin main
bash qlnckh/deploy/setup-autodeploy.sh

# Script sẽ:
# - Tạo WEBHOOK_SECRET
# - Build webhook container
# - Cập nhật nginx config
# - In hướng dẫn cấu hình GitHub
```

### 11.8. Xem logs

```bash
# Logs webhook server
docker logs -f qlnckh-webhook

# Logs deploy
docker exec qlnckh-webhook cat /app/logs/deploy.log
```

---

## 12. Kiểm tra Website sau Deploy

**Ngày kiểm tra:** 18/01/2026

| Endpoint | Status | Ý nghĩa |
|----------|--------|---------|
| `https://huuthang.online/` | `200 OK` | Frontend React hoạt động |
| `https://huuthang.online/api/auth/me` | `401 Unauthorized` | API hoạt động (cần đăng nhập) |
| SSL Certificate | Valid | HTTPS hoạt động với HTTP/2 |
| Nginx | `nginx/1.29.4` | Reverse proxy hoạt động |
| Express | Running | NestJS backend hoạt động |

**Kết luận:** Website hoạt động bình thường sau khi deploy.

---

## Bài học rút ra

1. **Docker networking:** Containers giao tiếp qua Docker network, không phải localhost. App phải bind `0.0.0.0`.

2. **Đường dẫn tương đối:** Luôn kiểm tra kỹ đường dẫn tương đối từ vị trí file docker-compose.yml.

7. **Auto-deploy với Webhooks:** Dùng GitHub webhooks + container riêng để tự động deploy. Luôn xác thực signature để bảo mật.

8. **Mount Docker socket cẩn thận:** Cho phép container chạy docker commands nhưng cũng là rủi ro bảo mật - chỉ dùng cho services tin cậy.

3. **Environment variables:** Docker Compose chỉ auto-load `.env` nếu nằm cùng thư mục. Dùng `--env-file` khi `.env` ở nơi khác.

4. **SSL với Docker:** Dùng certbot container + shared volumes để quản lý certificates.

5. **Database migrations:** Với database mới, `prisma db push` đơn giản hơn `migrate deploy`.

6. **Static files trong NestJS:** Cần `ServeStaticModule` để serve frontend SPA.
