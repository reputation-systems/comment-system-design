# forum-application — Celaut service (MCP + REST)

A sealed Celaut microVM that exposes the full `forum-application` surface over
the network, two ways at once on `0.0.0.0:8080`:

- **MCP** (Streamable HTTP) at `POST /mcp` — same tools as the stdio server in
  [`../mcp/server.mjs`](../mcp/server.mjs).
- **REST** (plain JSON) under `/api/*` — one route per library method.
- **Health** at `GET /health`.

Forum reads are framework-agnostic Ergo Explorer queries. Forum writes are
reputation **opinions**, so they go through `reputation-system/node`'s signer
abstraction. Reads never need a wallet.

## Signer modes

Set with `FORUM_SIGNER_MODE`:

| Mode | Behavior | Required env |
| --- | --- | --- |
| `unsigned` (default) | Build the tx and return the unsigned EIP-12 transaction. **No key in the VM.** | `FORUM_ADDRESS` (P2PK base58 that funds the tx) |
| `seed` | Sign **and submit** autonomously. | `FORUM_MNEMONIC` (+ optional `FORUM_MNEMONIC_PASSWORD`, `FORUM_NODE_URI`, `FORUM_ADDRESS_INDEX`) |

Other env: `FORUM_EXPLORER_API` (default `https://api.ergoplatform.com`),
`FORUM_SPAM_LIMIT` (default `0`).

## REST endpoints

Reads (GET):

- `GET /health`
- `GET /api/contract-info`
- `GET /api/type-nfts`
- `GET /api/comments?topicId=<id>&reply=<bool>`
- `GET /api/profiles?types=a,b&isSelfDefined=true&limit=50&offset=0`
- `GET /api/profiles/:profileTokenId/comments`
- `GET /api/comments/:commentId/spam`
- `GET /api/topics/:topicId/score`
- `GET /api/boxes?typeNftId=&objectPointer=&tokenId=&ownerAddress=&isLocked=&polarization=&content=&limit=&offset=`
- `GET /api/blocks/:blockId/timestamp`

Writes (POST, JSON body — return `{submitted,txId}` in seed mode or
`{submitted:false,unsignedTransaction}` in unsigned mode):

- `POST /api/profile`      `{ content?, totalSupply?, typeNftId?, sacrificedErg? }`
- `POST /api/comments`     `{ topicId, text, sentiment?, mainBoxId?, isLocked?, tokenAmount? }`
- `POST /api/replies`      `{ parentCommentId, text, sentiment?, mainBoxId?, isLocked?, tokenAmount? }`
- `POST /api/spam-flags`   `{ targetCommentId, mainBoxId? }`
- `POST /api/opinions`     `{ typeNftId, objectPointer?, polarization, content?, mainBoxId?, isLocked?, tokenAmount? }`

`mainBoxId` is the profile box to spend from; if omitted it is auto-discovered
from the signer's address.

## Run locally

```sh
cd .service
npm install
FORUM_SIGNER_MODE=unsigned FORUM_ADDRESS=<your_p2pk_addr> npm start
# health
curl localhost:8080/health
# read
curl "localhost:8080/api/comments?topicId=716f6e863f744b9ac22c97ec7b76ea5f5908bc5b2f67c61510bfc4751384ea7a"
# MCP tools/list
curl -s localhost:8080/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Packaging

`reputation-system` is vendored as `reputation-system-0.0.1.tgz` (a pre-packed
tarball that already ships `dist/`), so the Docker build needs no git and runs
no `svelte-package` step. `Dockerfile`, `service.json`, `start.sh` and
`pack_config.json` follow the standard Celaut `.service` layout; the packer
exports the image filesystem and seals the VM to `api.ergoplatform.com` only.
