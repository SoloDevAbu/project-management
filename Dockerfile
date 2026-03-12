# ---------- Dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  else npm run build; \
  fi

# ---------- Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 nodejs
RUN adduser -S nextjs -u 1001

# standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# prisma schema
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 7751

CMD ["node", "server.js"]