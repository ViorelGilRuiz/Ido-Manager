# Build stage for apps/api
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build
RUN npx prisma generate

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production --no-audit --no-fund

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/main"]
