# =============================================================================
# QLNCKH Production Dockerfile
# Uses node:20-bullseye-slim (Debian 11 with OpenSSL 1.1 for Prisma)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies (with build tools)
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS deps

WORKDIR /app

# Install build essentials (already mostly available in slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (better cache)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build API
RUN npm run nx build api -- --configuration=production

# Build Web App
RUN npm run nx build web-apps

# -----------------------------------------------------------------------------
# Stage 3: Production Runner (minimal)
# -----------------------------------------------------------------------------
FROM node:20-bullseye-slim AS production

WORKDIR /app

# Install dumb-init and openssl
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init wget openssl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

# Copy built API
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps ./dist/apps

# Copy built Web App
COPY --from=builder --chown=nestjs:nodejs /app/dist/web-apps ./dist/web-apps

# Copy Prisma (needed for runtime)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy only production node_modules (selective)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy package.json
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Copy public assets
COPY --from=builder --chown=nestjs:nodejs /app/apps/public ./public

# Create directories
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER nestjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/apps/main.js"]
