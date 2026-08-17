// editorextensions/quodsi_editor_extension/scripts/devHtmlRewrite.js
//
// Single source of truth for rewriting the Vite dev server's index.html so it
// still works when Lucid serves it from ITS OWN origin out of
// public/quodsim-react/.
//
// Why this is not trivial: the page is FETCHED from http://localhost:<port>
// but SERVED from lucid.app, so every root-relative reference in it resolves
// against lucid.app and 404s. Two distinct classes exist:
//
//   1. HTML attributes - <script src="/..."> , <link href="/...">
//   2. JS module specifiers inside INLINE module scripts. @vitejs/plugin-react
//      injects a Fast Refresh preamble containing
//      `import { injectIntoGlobalHook } from "/@react-refresh"`. That is not an
//      attribute, so an attribute-only rewrite misses it. When it 404s the
//      inline module aborts BEFORE assigning window.$RefreshReg$, and every
//      plugin-transformed component then throws
//      "ReferenceError: $RefreshReg$ is not defined" - a blank panel, not a
//      console warning. That outage is why this module exists.
//
// Protocol-relative URLs ("//cdn.example.com/x") are deliberately left alone:
// they are already origin-independent and rewriting them would corrupt them.
// Every rule below therefore carries a (?!\/) guard.

/** Absolutise root-relative refs in dev HTML to point at the Vite dev server. */
function rewriteDevHtml(html, port) {
  const origin = `http://localhost:${port}`;
  return html
    // HTML attributes:      src="/x"        href='/x'
    .replace(/\b(src|href)=(["'])\/(?!\/)/gi, `$1=$2${origin}/`)
    // static imports:       from "/x"       from '/x'
    .replace(/\b(from\s+)(["'])\/(?!\/)/g, `$1$2${origin}/`)
    // side-effect imports:  import "/x"     import '/x'
    .replace(/\b(import\s+)(["'])\/(?!\/)/g, `$1$2${origin}/`)
    // dynamic imports:      import("/x")    import( '/x' )
    .replace(/\b(import\s*\(\s*)(["'])\/(?!\/)/g, `$1$2${origin}/`);
}

/** Strip leading slashes from BUILT html so assets resolve inside the package. */
function stripToRelative(html) {
  return html.replace(/\b(src|href)=(["'])\/(?!\/)/gi, '$1=$2');
}

module.exports = { rewriteDevHtml, stripToRelative };
