############################################
# System base: Bun + Docker CLI + skopeo + dumb-init
############################################
FROM oven/bun:1-debian AS system-base
RUN apt-get update && apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        dumb-init \
        skopeo \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install --yes --no-install-recommends \
        docker-ce-cli \
        docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

############################################
# Build base: install dependencies
############################################
FROM system-base AS build-base
WORKDIR /app
COPY package.json bun.lock ./

############################################
# All deps (dev + prod) for frontend build
############################################
FROM build-base AS deps-all
RUN bun install --frozen-lockfile

############################################
# Frontend build
############################################
FROM deps-all AS frontend-build
COPY . .
RUN bun run build:frontend

############################################
# Production-only deps
############################################
FROM build-base AS deps-prod
RUN bun install --frozen-lockfile --production

############################################
# Release image
############################################
FROM system-base AS release
WORKDIR /app
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=frontend-build /app/frontend-dist ./frontend-dist
COPY . .
RUN mkdir -p ./data

VOLUME /app/data
EXPOSE 5001
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
    CMD bun /app/extra/healthcheck.ts
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bun", "./backend/index.ts"]

############################################
# Nightly variant
############################################
FROM release AS nightly
RUN bun run mark-as-nightly
