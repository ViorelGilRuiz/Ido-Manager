# Root Dockerfile for Railway monorepo deployment
# This builds the apps/api workspace from the repository root.

FROM node:20-alpine AS builder
WORKDIR /app

# Copy root workspace metadata and API package files only
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/tsconfig.build.json ./apps/api/
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/
COPY apps/api/prisma/seed.ts ./apps/api/prisma/seed.ts
COPY apps/api/src ./apps/api/src

# Install only API workspace dependencies to avoid building the full monorepo
RUN npm ci --workspace apps/api --no-audit --no-fund
RUN npm --workspace apps/api run build
RUN npm --workspace apps/api run prisma:generate

FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace apps/api --only=production --omit=dev --no-audit --no-fund

WORKDIR /app/apps/api
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main"]
