FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache openssl python3 make g++

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @fleetops/shared-types build && \
    test -f packages/shared-types/dist/index.js && \
    pnpm --filter @fleetops/api prisma:generate && \
    pnpm --filter @fleetops/api build

RUN pnpm --filter @fleetops/api deploy --prod /prod/api && \
    cp -r apps/api/prisma /prod/api/prisma

WORKDIR /prod/api
RUN npm install --no-save --ignore-scripts prisma@6.19.3 && \
    npx prisma generate --schema=./prisma/schema.prisma

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl && \
    npm install -g prisma@6.19.3 && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /prod/api ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/main.js"]
