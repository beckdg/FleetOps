FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api ./apps/api
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fleetops/shared-types build
RUN pnpm --filter @fleetops/api prisma:generate
RUN pnpm --filter @fleetops/api build
RUN pnpm --filter @fleetops/api deploy --prod /prod/api
RUN cp -r /app/apps/api/prisma /prod/api/prisma
RUN pnpm --filter @fleetops/api exec prisma generate --schema=/prod/api/prisma/schema.prisma

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /prod/api ./

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
