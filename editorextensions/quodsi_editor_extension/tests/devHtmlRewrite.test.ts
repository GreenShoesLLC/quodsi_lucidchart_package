// editorextensions/quodsi_editor_extension/tests/devHtmlRewrite.test.ts
//
// Unit tests for scripts/devHtmlRewrite.js - the single source of truth for
// rewriting the Vite dev server's index.html so it still works when Lucid
// serves it from its own origin. See that module's header comment for the
// full "why" - in short, an attribute-only rewrite once missed the
// @vitejs/plugin-react Fast Refresh preamble's `from "/@react-refresh"`
// module specifier, which blanked the panel in production. Test 3 below is
// the direct regression test for that outage.

// The module under test is plain CommonJS (webpack.config.js must `require`
// it), so we `require` it here too rather than `import`ing it.
const {
  rewriteDevHtml,
  stripToRelative,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('../scripts/devHtmlRewrite');

describe('rewriteDevHtml', () => {
  it('rewrites a script src HTML attribute (double quotes)', () => {
    const input = '<script src="/assets/x.js"></script>';
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe('<script src="http://localhost:3000/assets/x.js"></script>');
  });

  it('rewrites a link href HTML attribute (single quotes)', () => {
    const input = "<link href='/style.css'>";
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe("<link href='http://localhost:3000/style.css'>");
  });

  it('REGRESSION: rewrites the @react-refresh preamble module specifier that caused the blank-panel outage', () => {
    const input = 'import { injectIntoGlobalHook } from "/@react-refresh";';
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe(
      'import { injectIntoGlobalHook } from "http://localhost:3000/@react-refresh";'
    );
  });

  it('rewrites a from-import specifier with single quotes', () => {
    const input = "import { x } from '/@react-refresh'";
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe("import { x } from 'http://localhost:3000/@react-refresh'");
  });

  it('rewrites a bare side-effect import (double quotes)', () => {
    const input = 'import "/side-effect.js"';
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe('import "http://localhost:3000/side-effect.js"');
  });

  it('rewrites a bare side-effect import (single quotes)', () => {
    const input = "import '/side-effect.js'";
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe("import 'http://localhost:3000/side-effect.js'");
  });

  it('rewrites a dynamic import()', () => {
    const input = 'import("/dynamic.js")';
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe('import("http://localhost:3000/dynamic.js")');
  });

  it('rewrites a dynamic import() with whitespace inside the parens and single quotes', () => {
    const input = "import( '/dynamic.js' )";
    const output = rewriteDevHtml(input, 3000);
    expect(output).toBe("import( 'http://localhost:3000/dynamic.js' )");
  });

  it('leaves protocol-relative URLs alone', () => {
    const scriptInput = '<script src="//cdn.example.com/x.js"></script>';
    expect(rewriteDevHtml(scriptInput, 3000)).toBe(scriptInput);

    const fromInput = 'import { x } from "//cdn.example.com/x.js"';
    expect(rewriteDevHtml(fromInput, 3000)).toBe(fromInput);
  });

  it('is idempotent - already-absolute URLs are untouched, and re-running the rewrite is a no-op', () => {
    const input = '<script src="http://localhost:3000/x"></script>';
    const once = rewriteDevHtml(input, 3000);
    expect(once).toBe(input);
    const twice = rewriteDevHtml(once, 3000);
    expect(twice).toBe(once);
  });

  it('is idempotent for a from-import specifier - already-absolute URLs are untouched', () => {
    const input = 'import { x } from "http://localhost:3000/@react-refresh"';
    const once = rewriteDevHtml(input, 3000);
    expect(once).toBe(input);
    const twice = rewriteDevHtml(once, 3000);
    expect(twice).toBe(once);
  });

  it('is idempotent for a bare side-effect import - already-absolute URLs are untouched', () => {
    const input = 'import "http://localhost:3000/side-effect.js"';
    const once = rewriteDevHtml(input, 3000);
    expect(once).toBe(input);
    const twice = rewriteDevHtml(once, 3000);
    expect(twice).toBe(once);
  });

  it('is idempotent for a dynamic import() - already-absolute URLs are untouched', () => {
    const input = 'import("http://localhost:3000/dynamic.js")';
    const once = rewriteDevHtml(input, 3000);
    expect(once).toBe(input);
    const twice = rewriteDevHtml(once, 3000);
    expect(twice).toBe(once);
  });

  it('rewrites both the @react-refresh preamble and a script src in a realistic full document, and nothing else', () => {
    const input = [
      '<!DOCTYPE html>',
      '<html>',
      '  <head>',
      '    <script type="module">',
      '      import RefreshRuntime from "/@react-refresh"',
      '      RefreshRuntime.injectIntoGlobalHook(window)',
      '      window.$RefreshReg$ = () => {}',
      '      window.$RefreshSig$ = () => (type) => type',
      '      window.__vite_plugin_react_preamble_installed__ = true',
      '    </script>',
      '    <script type="module" src="/src/index.tsx"></script>',
      '  </head>',
      '  <body>',
      '    <div id="root"></div>',
      '  </body>',
      '</html>',
    ].join('\n');

    const output = rewriteDevHtml(input, 3000);

    const expected = input
      .replace(
        'from "/@react-refresh"',
        'from "http://localhost:3000/@react-refresh"'
      )
      .replace(
        'src="/src/index.tsx"',
        'src="http://localhost:3000/src/index.tsx"'
      );

    expect(output).toBe(expected);
  });
});

describe('stripToRelative', () => {
  it('strips the leading slash from a src attribute', () => {
    const input = '<script src="/assets/x.js"></script>';
    const output = stripToRelative(input);
    expect(output).toBe('<script src="assets/x.js"></script>');
  });

  it('leaves protocol-relative URLs alone', () => {
    const input = '<script src="//cdn/x"></script>';
    expect(stripToRelative(input)).toBe(input);
  });
});
