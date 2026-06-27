# Celaut builds this image only to export its filesystem (docker buildx
# --output type=tar); the container is never run directly. CMD/ENTRYPOINT,
# EXPOSE and runtime ENV are intentionally omitted — the entrypoint, ports and
# envs are declared in service.json. Relative ./ COPY paths are auto-adjusted to
# service/... by the packer when this Dockerfile is moved into .service/.
FROM node:20-slim

WORKDIR /app

# Production deps only (better layer caching: manifest + vendored lib first).
# reputation-system is vendored as a pre-packed tarball so the build needs no
# git and runs no svelte-package `prepare` step (the tarball already ships dist).
COPY ./package.json /app/package.json
COPY ./reputation-system-0.0.1.tgz /app/reputation-system-0.0.1.tgz
RUN npm install --omit=dev --no-audit --no-fund

# Application: HTTP MCP+REST server + shared forum modules + init wrapper.
COPY ./server-http.mjs /app/server-http.mjs
COPY ./tools.mjs /app/tools.mjs
COPY ./core.mjs /app/core.mjs
COPY ./lib.mjs /app/lib.mjs
COPY ./envs.mjs /app/envs.mjs
COPY ./start.sh /app/start.sh
RUN chmod +x /app/start.sh
