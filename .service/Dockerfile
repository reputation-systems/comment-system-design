# Celaut builds this image only to export its filesystem (docker buildx
# --output type=tar); the container is never run directly. CMD/ENTRYPOINT,
# EXPOSE and runtime ENV are intentionally omitted — the entrypoint, ports and
# envs are declared in service.json.
#
# Build context is the repository root (the packer moves this Dockerfile into
# .service/ and rewrites `./` COPY paths to `service/...`). Non-`./` paths such
# as `mcp` are left as-is and resolve against the repo root, so the sealed VM can
# bundle the SINGLE shared registry that lives in mcp/ — no duplicated copies.
#
# Image layout mirrors the repo so `../mcp` imports in service/server-http.mjs
# resolve the same way inside the VM as in local dev:
#   /app/service/server-http.mjs   (this .service)
#   /app/mcp/...                    (shared core/lib/tools + prebuilt bundle)
#   /app/node_modules              (production deps from .service/package.json)
FROM node:20-slim

WORKDIR /app

# Production deps only (better layer caching: deps before source). reputation-system
# is the github pin (github:reputation-systems/reputation-system) — fetched by npm
# over HTTPS, no committed tarball. Its committed dist/ ships the ./node entry, so
# no extra build step is needed here.
COPY ./package.json /app/package.json
RUN npm install --omit=dev --no-audit --no-fund

# The shared MCP registry (reads bundled from src/, generic passthroughs, writes,
# tools) — single source of truth. The prebuilt _generated/lib.bundle.mjs is
# committed, so the VM needs no build toolchain. Copy node-only files; the
# mcp/package*.json + node_modules are intentionally excluded (deps come from
# /app/node_modules above), as are the build-time _entry/build/_stubs.
COPY mcp/core.mjs        /app/mcp/core.mjs
COPY mcp/lib.mjs         /app/mcp/lib.mjs
COPY mcp/tools.mjs       /app/mcp/tools.mjs
COPY mcp/_generated      /app/mcp/_generated

# This service: HTTP+REST server + init wrapper.
COPY ./server-http.mjs   /app/service/server-http.mjs
COPY ./start.sh          /app/start.sh
RUN chmod +x /app/start.sh
