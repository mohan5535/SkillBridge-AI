# ==============================================================================
# SkillBridge AI — Multi-Stage Production Dockerfile
# Node.js 24 Alpine runtime with native ES modules & zero-mutation safety
# ==============================================================================

FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy application source code and public assets
COPY backend/ ./

# Runner stage
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for Docker health check
RUN apk add --no-cache curl

# Copy runtime artifacts from builder
COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]

