#!/usr/bin/env node
/**
 * Forum Application Celaut service — Streamable HTTP MCP + REST, bound on
 * 0.0.0.0:8080.
 *
 * A Celaut service is a networked microVM reached over TCP, so stdio is not
 * usable. This server exposes the SAME tool surface as the stdio MCP
 * (mcp/server.mjs) two ways:
 *
 *   GET  /health                 liveness probe
 *   POST /mcp                    MCP over Streamable HTTP (stateless)
 *   GET  /api/...                REST reads  (JSON)
 *   POST /api/...                REST writes (JSON body) via the configured signer
 *
 * Tool defs, handlers and the REST route table are imported from tools.mjs, so
 * MCP and REST can never drift apart. Reads need no wallet. Writes select a
 * Signer from FORUM_SIGNER_MODE (=seed submits; =unsigned, the default, returns
 * the unsigned EIP-12 tx without any key).
 */
import { createServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { TOOLS, HANDLERS, REST_ROUTES } from './tools.mjs';

const PORT = Number(process.env.PORT) || 8080;
const MCP_PATH = '/mcp';

// ── MCP server factory (one per request, stateless) ─────────────────────────

function makeMcpServer() {
  const server = new Server(
    { name: 'forum-application', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    const handler = HANDLERS[name];
    if (!handler) {
      return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
    try {
      const data = await handler(args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Error in ${name}: ${err?.message || String(err)}` }] };
    }
  });
  return server;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2));
}

/** Match a request path against a route pattern, extracting :params. */
function matchRoute(route, method, pathname) {
  if (route.method !== method) return null;
  const rParts = route.path.split('/').filter(Boolean);
  const pParts = pathname.split('/').filter(Boolean);
  if (rParts.length !== pParts.length) return null;
  const params = {};
  for (let i = 0; i < rParts.length; i += 1) {
    if (rParts[i].startsWith(':')) params[rParts[i].slice(1)] = decodeURIComponent(pParts[i]);
    else if (rParts[i] !== pParts[i]) return null;
  }
  return params;
}

// ── HTTP bootstrap ──────────────────────────────────────────────────────────

const httpServer = createServer(async (req, res) => {
  const parsed = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsed.pathname;
  const query = Object.fromEntries(parsed.searchParams.entries());

  // Liveness probe.
  if (req.method === 'GET' && (pathname === '/health' || pathname === '/')) {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'forum-application',
      transport: 'streamable-http+rest',
      signerMode: (process.env.FORUM_SIGNER_MODE || 'unsigned').toLowerCase(),
      endpoints: { mcp: MCP_PATH, rest: REST_ROUTES.map((r) => `${r.method} ${r.path}`) }
    });
  }

  // REST API.
  if (pathname.startsWith('/api/')) {
    for (const route of REST_ROUTES) {
      const params = matchRoute(route, req.method, pathname);
      if (!params) continue;
      try {
        const body = req.method === 'POST' ? (await readBody(req)) || {} : {};
        const args = route.arg({ p: params, q: query, b: body });
        const data = await HANDLERS[route.handler](args);
        return sendJson(res, 200, data);
      } catch (err) {
        return sendJson(res, 400, { error: `${route.handler}: ${err?.message || String(err)}` });
      }
    }
    return sendJson(res, 404, { error: `No REST route for ${req.method} ${pathname}` });
  }

  // MCP over Streamable HTTP (stateless).
  if (pathname === MCP_PATH) {
    const server = makeMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      await transport.handleRequest(req, res, body);
    } catch (err) {
      if (!res.headersSent) {
        sendJson(res, 500, {
          jsonrpc: '2.0',
          error: { code: -32603, message: `Internal error: ${err?.message || String(err)}` },
          id: null
        });
      }
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`forum-application MCP+REST listening on 0.0.0.0:${PORT} (mcp: ${MCP_PATH}, rest: /api/*)`);
});
