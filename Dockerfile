FROM node:20

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        git \
        openssl \
        python3 \
        make \
        g++ && \
    rm -rf /var/lib/apt/lists/*

COPY . .

RUN pnpm install --frozen-lockfile && \
    pnpm --filter @fleetops/shared-types build && \
    pnpm --filter @fleetops/api prisma:generate && \
    pnpm --filter @fleetops/api build

CMD ["node", "apps/api/dist/main.js"]
