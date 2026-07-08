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

# Generate Prisma client
RUN bunx prisma generate

# Set DATABASE_URL for build (in-memory SQLite is fine for build)
ENV DATABASE_URL="file:/app/db/custom.db"

# Create db directory
RUN mkdir -p /app/db

# Build Next.js
RUN bun run build

# Stage 3: Production
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/db/custom.db"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static files
COPY --from=builder /app/.next/static ./.next/static

# Copy public directory
COPY --from=builder /app/public ./public

# Copy prisma schema and db for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db

# Generate Prisma client in production
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create db directory and set permissions
RUN mkdir -p /app/db && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]