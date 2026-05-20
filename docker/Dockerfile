############################################
# System base: Bun + Docker CLI + skopeo + dumb-init
############################################
FROM oven/bun:1.3.14-debian AS system-base
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
RUN apt-get update && apt-get install --yes --no-install-recommends \
        python3 build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock ./

############################################
# Production-only deps
############################################
FROM build-base AS deps-prod
RUN bun install --frozen-lockfile --production

############################################
# Release image (frontend-dist must be pre-built in build context)
############################################
FROM system-base AS release
WORKDIR /app
COPY --from=deps-prod /app/node_modules ./node_modules
COPY . .
RUN mkdir -p ./data

VOLUME /app/data
EXPOSE 5001
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
    CMD bun /app/extra/healthcheck.ts
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bun", "./backend/index.ts"]
