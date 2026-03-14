# ---------- Base ----------
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# ---------- Builder ----------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  else npm run build; \
  fi

# ---------- Runner ----------
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Next.js standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.bin/prisma* ./node_modules/.bin/
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

COPY --from=builder /app/package.json ./package.json

# Entrypoint
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 7751

ENTRYPOINT ["start.sh"]
CMD ["node", "server.js"]