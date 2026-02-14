# ============================================
# RestaurantPro - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Base image with pnpm
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY .npmrc* ./
COPY patches ./patches

# Install dependencies with frozen lockfile
RUN --mount=type=cache,id=s/161d0465-e85a-4535-8620-645122f3e796-pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod=false
# Stage 3: Build application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production

# Build the application
# This runs: vite build (frontend) && esbuild (backend)
RUN pnpm run build

# Stage 4: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 restaurantpro

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application from builder
# Note: Vite builds to dist/public, and esbuild builds server to dist/index.js
COPY --from=builder --chown=restaurantpro:nodejs /app/dist ./dist
COPY --from=builder --chown=restaurantpro:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=restaurantpro:nodejs /app/scripts ./scripts
COPY --from=builder --chown=restaurantpro:nodejs /app/seed-cookie-policy.mjs ./seed-cookie-policy.mjs
COPY --from=builder --chown=restaurantpro:nodejs /app/package.json ./package.json

# Copy public assets (uploads, logos, etc.)
COPY --from=builder --chown=restaurantpro:nodejs /app/client/public ./client/public

# Install production dependencies only
COPY --from=deps /app/node_modules ./node_modules

# Create directories for uploads with proper permissions
RUN mkdir -p /app/client/public/uploads /app/client/public/logos && \
    chown -R restaurantpro:nodejs /app/client/public

# Switch to non-root user
USER restaurantpro

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start the application
# The migration script will check if database is initialized and run setup if needed
CMD ["sh", "-c", "node scripts/migrate-and-seed.mjs && node dist/index.js"]
