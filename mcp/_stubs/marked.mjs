// Node-safe stub for `marked`, aliased in by mcp/build.mjs.
//
// `src/lib/ergo/commentFetch.ts` runs a comment's on-chain text through
// `marked(text)` to render markdown to HTML for the web DOM. An MCP/REST
// consumer wants the underlying DATA, not rendered HTML, so this passthrough
// returns the raw markdown source unchanged (the on-chain bytes). The caller's
// `await marked(text)` still works — awaiting a string is a no-op. This is the
// documented choice: the headless surface returns raw text, not HTML, which is
// also why the `dompurify` alias is a passthrough.
export const marked = (src) => src;
export default marked;
