// Node-safe stub for `dompurify`, aliased in by mcp/build.mjs.
//
// `src/lib/ergo/commentFetch.ts` calls `DOMPurify.sanitize(html)` purely as a
// DISPLAY-safety measure before injecting rendered comment HTML into the DOM.
// The MCP/REST consumer is an agent, not a browser DOM — there is no XSS surface
// here and nothing is rendered, so a passthrough is correct and avoids dragging
// a DOM polyfill (jsdom) into the sealed VM. Combined with the `marked` stub
// below, comment `text` is returned as the RAW on-chain markdown source.
//
// If a future read path emits HTML to a browser, swap this alias for
// `isomorphic-dompurify` instead.
const DOMPurify = { sanitize: (input) => input };
export default DOMPurify;
export const sanitize = DOMPurify.sanitize;
