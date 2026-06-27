#!/usr/bin/env node
/**
 * Forum Application MCP server (stdio).
 *
 * Exposes the FULL operational surface of the forum library over MCP stdio, so
 * any MCP-aware client (Claude, IDEs, agents) can read the on-chain discussion
 * graph AND post to it. Forum writes are reputation opinions, so writes funnel
 * through `reputation-system/node`'s signer abstraction (see mcp/lib.mjs;
 * FORUM_SIGNER_MODE=seed submits autonomously, =unsigned returns the unsigned
 * tx for an external wallet). Tool definitions and handlers are shared with the
 * HTTP service in mcp/tools.mjs — there is no re-implementation here.
 *
 * Run: `npm run mcp`
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { TOOLS, HANDLERS } from './tools.mjs';

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

const transport = new StdioServerTransport();
await server.connect(transport);
