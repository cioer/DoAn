# Nhật ký Deploy QLNCKH lên VPS

**Ngày:** 18/01/2026
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

## Bài học rút ra

1. **Docker networking:** Containers giao tiếp qua Docker network, không phải localhost. App phải bind `0.0.0.0`.

2. **Đường dẫn tương đối:** Luôn kiểm tra kỹ đường dẫn tương đối từ vị trí file docker-compose.yml.

3. **Environment variables:** Docker Compose chỉ auto-load `.env` nếu nằm cùng thư mục. Dùng `--env-file` khi `.env` ở nơi khác.

4. **SSL với Docker:** Dùng certbot container + shared volumes để quản lý certificates.

5. **Database migrations:** Với database mới, `prisma db push` đơn giản hơn `migrate deploy`.

6. **Static files trong NestJS:** Cần `ServeStaticModule` để serve frontend SPA.
