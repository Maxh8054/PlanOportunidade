# Stage 1: Dependencies
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use PostgreSQL schema for production build
RUN cp prisma/schema.render.prisma prisma/schema.prisma

# Generate Prisma client for PostgreSQL
RUN bunx prisma generate

# Build Next.js
RUN bun run build

# Stage 3: Production
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static files
COPY --from=builder /app/.next/static ./.next/static

# Copy public directory
COPY --from=builder /app/public ./public

# Copy prisma schema (PostgreSQL version)
COPY --from=builder /app/prisma ./prisma

# Copy Prisma client modules + CLI (with engines) for runtime db push
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use local prisma binary (NOT bunx) to avoid re-downloading at runtime
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js db push --accept-data-loss && bun server.js"]
