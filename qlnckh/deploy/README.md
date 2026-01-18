# QLNCKH VPS Deployment Guide

## Prerequisites

- VPS với Ubuntu 20.04+ hoặc Debian 11+
- Docker & Docker Compose đã cài
- Nginx đã cài
- Certbot đã cài (cho SSL)
- Domain đã trỏ về IP của VPS

## Quick Deploy

```bash
# 1. Clone repo
git clone https://github.com/cioer/DoAn.git
cd DoAn/qlnckh

# 2. Copy và edit .env
cp .env.example .env
nano .env  # Set các secrets

# 3. Chạy deploy script
chmod +x deploy/deploy.sh
./deploy/deploy.sh YOUR_DOMAIN
```

## Manual Deploy

### 1. Setup .env

```bash
cp .env.example .env
```

Edit `.env`:
```env
POSTGRES_USER=qlnckh
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=qlnckh

JWT_SECRET=generate_random_string_64_chars
JWT_REFRESH_SECRET=generate_another_random_string_64_chars
COOKIE_SECRET=generate_another_random_string_32_chars
```

Tạo random secrets:
```bash
openssl rand -hex 32  # cho JWT_SECRET
openssl rand -hex 32  # cho JWT_REFRESH_SECRET
openssl rand -hex 16  # cho COOKIE_SECRET
```

### 2. Setup Nginx

```bash
# Copy config
sudo cp deploy/nginx-qlnckh.conf /etc/nginx/sites-available/qlnckh

# Thay YOUR_DOMAIN bằng domain thực
sudo sed -i 's/YOUR_DOMAIN/qlnckh.example.com/g' /etc/nginx/sites-available/qlnckh

# Enable site
sudo ln -s /etc/nginx/sites-available/qlnckh /etc/nginx/sites-enabled/

# Test config
sudo nginx -t
```

### 3. Get SSL Certificate

```bash
# Tạm thời comment SSL block trong nginx config
sudo certbot certonly --webroot -w /var/www/certbot -d YOUR_DOMAIN

# Hoặc standalone mode
sudo systemctl stop nginx
sudo certbot certonly --standalone -d YOUR_DOMAIN
sudo systemctl start nginx
```

### 4. Build & Start

```bash
# Build images
docker compose -f deploy/docker-compose.vps.yml build

# Start services
docker compose -f deploy/docker-compose.vps.yml up -d

# Run migrations
docker compose -f deploy/docker-compose.vps.yml exec app npx prisma migrate deploy
```

### 5. Reload Nginx

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Commands

```bash
# View logs
docker compose -f deploy/docker-compose.vps.yml logs -f

# Restart all services
docker compose -f deploy/docker-compose.vps.yml restart

# Restart specific service
docker compose -f deploy/docker-compose.vps.yml restart app

# Stop all
docker compose -f deploy/docker-compose.vps.yml down

# Update & redeploy
git pull
docker compose -f deploy/docker-compose.vps.yml up -d --build
```

## Ports

| Service | Internal Port | External |
|---------|---------------|----------|
| App (NestJS) | 3000 | 127.0.0.1:3000 (Nginx proxy) |
| PostgreSQL | 5432 | Internal only |
| Form Engine | 8080 | Internal only |

## Troubleshooting

### Check container status
```bash
docker compose -f deploy/docker-compose.vps.yml ps
```

### Check logs
```bash
docker compose -f deploy/docker-compose.vps.yml logs app
docker compose -f deploy/docker-compose.vps.yml logs postgres
docker compose -f deploy/docker-compose.vps.yml logs form-engine
```

### Database connection issues
```bash
# Check if postgres is healthy
docker compose -f deploy/docker-compose.vps.yml exec postgres pg_isready

# Connect to database
docker compose -f deploy/docker-compose.vps.yml exec postgres psql -U qlnckh
```

### Reset database
```bash
docker compose -f deploy/docker-compose.vps.yml down -v  # WARNING: Deletes all data!
docker compose -f deploy/docker-compose.vps.yml up -d
docker compose -f deploy/docker-compose.vps.yml exec app npx prisma migrate deploy
```
