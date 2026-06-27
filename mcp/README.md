# forum-application — MCP server (stdio) + shared registry

Full-surface MCP server for the Forum Application on-chain discussion graph. Any
MCP-aware client (Claude, IDEs, agents) can **read** the comment/thread graph and
**post** to it. The same registry backs the networked Celaut twin in
[`../.service`](../.service) — there is no second copy.

## DRY: reads come from the app's own `src/`, not a hand-port

The forum read logic — recursive `fetchComments`, `fetchCommentsByProfile`, the
spam-flag count `fetchSpan`, the reply-tree `getScore`, and the Type NFT ids —
lives **once**, in `src/lib/ergo/{commentFetch,commentObject,envs,utils}.ts`, the
exact code the web app runs. `mcp/build.mjs` runs esbuild over `mcp/_entry.mjs`
(which re-exports those `src` symbols) and emits one Node-loadable ESM module:

```
mcp/_generated/lib.bundle.mjs      # COMMITTED, banner-marked, regenerate with: npm run build:mcp
```

so the sealed VM needs no build toolchain. Change a read in `src/` and a rebuild
flows it through `core.mjs`, the stdio server and the HTTP `.service` alike — the
old hand-ported `core.mjs`/`envs.mjs` (which duplicated the read logic and the
constants) are gone.

### esbuild aliases / externals (`build.mjs`)

| import | handling | why |
| --- | --- | --- |
| `reputation-system` | external → `reputation-system/node` | reads resolve the **same** installed package that writes use at runtime (no drift); no tx-builder graph inlined |
| `$app/environment` | `_stubs/app-environment.mjs` (`browser=false`) | SvelteKit virtual module; headless is never a browser |
| `dompurify` | `_stubs/dompurify.mjs` (passthrough) | nothing is rendered to a DOM — no XSS surface |
| `marked` | `_stubs/marked.mjs` (passthrough) | **the headless surface returns RAW on-chain markdown, not rendered HTML** |
| `@fleet-sdk/core`, `@scure/base`, `svelte/store` | inlined | pure deps, self-contained bundle |

The `marked` + `dompurify` passthroughs are the documented design choice: comment
`text` is returned as the raw on-chain markdown source (the on-chain bytes), which
is what an agent/REST consumer wants — not browser HTML.

## Layers

- `_entry.mjs` — re-exports the `src` read surface (the esbuild entry).
- `build.mjs` — esbuild bundler (`npm run build:mcp`; `esbuild` is a devDep).
- `_generated/lib.bundle.mjs` — the committed bundle.
- `core.mjs` — **thin** adapter: re-exports the bundle's forum reads + constants,
  points the bundled `explorer_uri`/`SPAM_LIMIT` stores at the configured env, and
  adds a few generic `reputation-system/node` passthroughs (type-NFT list, profile
  list, raw box search, block timestamp) — exposing the library, not duplicating it.
- `lib.mjs` — signer factory (`FORUM_SIGNER_MODE=seed|unsigned`), profile-box
  resolution, result normalization.
- `tools.mjs` — the single `TOOLS` + `HANDLERS` (+ `REST_ROUTES`) registry shared
  by both transports. Writes are reputation opinions via `create_*_with_signer`.
- `server.mjs` — stdio transport.

## Run

```sh
npm install          # @modelcontextprotocol/sdk + reputation-system (+ esbuild devDep)
npm run build:mcp    # regenerate _generated/lib.bundle.mjs from src/ (only when src reads change)
npm run mcp          # serve MCP over stdio
```

Reads need no wallet. Writes select a signer from `FORUM_SIGNER_MODE` (`seed`
submits; `unsigned`, the default, returns an unsigned EIP-12 tx — `FORUM_ADDRESS`
required). Explorer override: `FORUM_EXPLORER_API`. Spam threshold: `FORUM_SPAM_LIMIT`.
