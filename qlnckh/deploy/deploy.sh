#!/bin/bash
# QLNCKH VPS Deployment Script
# Usage: ./deploy.sh YOUR_DOMAIN

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./deploy.sh YOUR_DOMAIN"
    echo "Example: ./deploy.sh qlnckh.example.com"
    exit 1
fi

echo "=========================================="
echo "QLNCKH Deployment for: $DOMAIN"
echo "=========================================="

# 1. Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "!!! IMPORTANT !!!"
    echo "Edit .env file and set your secrets:"
    echo "  nano .env"
    echo ""
    echo "Required variables:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - JWT_SECRET"
    echo "  - JWT_REFRESH_SECRET"
    echo "  - COOKIE_SECRET"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# 2. Setup Nginx config
echo "[1/5] Setting up Nginx config..."
sudo cp deploy/nginx-qlnckh.conf /etc/nginx/sites-available/qlnckh
sudo sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/qlnckh

# Create symlink if not exists
if [ ! -L /etc/nginx/sites-enabled/qlnckh ]; then
    sudo ln -s /etc/nginx/sites-available/qlnckh /etc/nginx/sites-enabled/
fi

# 3. Get SSL certificate
echo "[2/5] Getting SSL certificate..."
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || {
    echo "Certbot failed. Trying standalone mode..."
    sudo systemctl stop nginx
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    sudo systemctl start nginx
}

# 4. Test and reload Nginx
echo "[3/5] Testing Nginx config..."
sudo nginx -t && sudo systemctl reload nginx

# 5. Build and start containers
echo "[4/5] Building Docker images..."
docker compose -f deploy/docker-compose.vps.yml build

echo "[5/5] Starting services..."
docker compose -f deploy/docker-compose.vps.yml up -d

# 6. Run database migrations
echo "Running database migrations..."
sleep 10  # Wait for postgres to be ready
docker compose -f deploy/docker-compose.vps.yml exec app npx prisma migrate deploy

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Your app is now running at: https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  View logs:    docker compose -f deploy/docker-compose.vps.yml logs -f"
echo "  Restart:      docker compose -f deploy/docker-compose.vps.yml restart"
echo "  Stop:         docker compose -f deploy/docker-compose.vps.yml down"
echo ""
