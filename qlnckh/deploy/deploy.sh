#!/bin/bash
# QLNCKH VPS Deployment Script (Docker Nginx version)
# Usage: ./deploy.sh [YOUR_EMAIL]

set -e

DOMAIN="huuthang.online"
EMAIL="${1:-admin@huuthang.online}"
DEPLOY_DIR="/home/deploy/qlnckh"

echo "=========================================="
echo "QLNCKH Deployment for: $DOMAIN"
echo "=========================================="

cd $DEPLOY_DIR

# 1. Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env

    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    JWT_REFRESH_SECRET=$(openssl rand -hex 32)
    COOKIE_SECRET=$(openssl rand -hex 16)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)

    # Update .env with generated secrets
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i "s/^COOKIE_SECRET=.*/COOKIE_SECRET=$COOKIE_SECRET/" .env
    sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env

    echo "Generated secrets in .env"
fi

# 2. Check if SSL certificates exist
SSL_EXISTS=false
if docker volume ls | grep -q "qlnckh_certbot_conf"; then
    # Check if certs exist in volume
    if docker run --rm -v qlnckh_certbot_conf:/certs alpine test -f /certs/live/$DOMAIN/fullchain.pem 2>/dev/null; then
        SSL_EXISTS=true
        echo "SSL certificates found."
    fi
fi

# 3. Start with initial config (HTTP only) if no SSL
if [ "$SSL_EXISTS" = false ]; then
    echo "[1/5] Starting services with HTTP only..."
    cp deploy/nginx-init.conf deploy/nginx.conf.active

    # Start containers
    docker compose -f deploy/docker-compose.vps.yml up -d postgres app form-engine

    # Wait for app to be ready
    echo "Waiting for app to start..."
    sleep 15

    # Start nginx with init config
    docker compose -f deploy/docker-compose.vps.yml up -d nginx
    sleep 5

    # Get SSL certificate
    echo "[2/5] Getting SSL certificate..."
    docker compose -f deploy/docker-compose.vps.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN

    # Switch to full SSL config
    echo "[3/5] Enabling SSL..."
    cp deploy/nginx.conf deploy/nginx.conf.active
    docker compose -f deploy/docker-compose.vps.yml restart nginx
else
    echo "[1/3] SSL exists, starting all services..."
    cp deploy/nginx.conf deploy/nginx.conf.active
    docker compose -f deploy/docker-compose.vps.yml up -d
fi

# 4. Run database migrations
echo "[4/5] Running database migrations..."
sleep 10
docker compose -f deploy/docker-compose.vps.yml exec -T app npx prisma migrate deploy

# 5. Start certbot renewal service
echo "[5/5] Starting certbot renewal..."
docker compose -f deploy/docker-compose.vps.yml up -d certbot

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
