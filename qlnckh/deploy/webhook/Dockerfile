# Dockerfile cho Webhook Server
#
# Image này chạy webhook server để nhận thông báo từ GitHub
# và thực hiện auto-deploy
#
# Cần mount:
# - /var/run/docker.sock: Để có thể chạy docker commands
# - /repo: Thư mục chứa git repository

FROM node:20-alpine

# Cài đặt các công cụ cần thiết
# - git: Pull code
# - docker-cli: Chạy docker compose commands
# - bash: Chạy deploy script
RUN apk add --no-cache \
    git \
    docker-cli \
    docker-cli-compose \
    bash \
    curl

WORKDIR /app

# Copy webhook server
COPY server.js ./
COPY auto-deploy.sh ./

# Đảm bảo script có quyền thực thi
RUN chmod +x auto-deploy.sh

# Tạo thư mục logs
RUN mkdir -p /app/logs

# Expose webhook port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Chạy webhook server
CMD ["node", "server.js"]
