// Dev-server smoke test.
//
// This asserts more than "the dev server responds". Three separate dev-only
// defects have shipped on this branch because every prior check only proved
// the server answered an HTTP request, never that it served a WORKING APP
// that actually mounts React into #root. This script loads the page in a
// real browser (via Playwright), captures any uncaught page errors, and
// fails loudly if #root ends up empty.
//
// It runs TWO checks:
//
//   1. Same-origin: load http://localhost:3000/ directly. This proves the
//      dev server itself serves a working app.
//
//   2. Cross-origin: fetch the SAME dev HTML, run it through the exact
//      production rewrite (scripts/devHtmlRewrite.js - the same module
//      webpack.config.js uses), and serve the REWRITTEN result from
//      127.0.0.1:9902 - a genuinely different origin from localhost. This
//      reproduces how Lucid actually serves the panel (fetched from the Vite
//      dev server, served from Lucid's own origin) and is the ONLY one of
//      these two checks that can catch a regression in the rewrite itself.
//      Check 1 cannot: a bare-root specifier like "/@react-refresh" resolves
//      fine when the page is loaded FROM localhost:3000 in the first place,
//      so the exact defect that once blanked the panel (see
//      devHtmlRewrite.js's header comment) is invisible to check 1.
//
// Assumes a dev server is already running at http://localhost:3000 (this
// script does not start one). Run `npx vite` (or `npm run start`) first.
//
// Playwright is not a dependency of this package - it is resolved from
// wherever it's installed (this repo's node_modules, or the monorepo root),
// rather than hardcoded to one absolute path, so this script works in a
// standalone clone of this repo too.
import { createRequire } from 'node:module';
import http from 'node:http';

const require = createRequire(import.meta.url);

// Playwright is CommonJS, and its exports are assigned in a way
// cjs-module-lexer cannot statically see, so a dynamic import() of it does
// not reliably yield named exports. `require()` it directly instead - it is
// resolved (not hardcoded to one absolute path) so this works whether
// playwright lives in this repo's node_modules or hoisted to the monorepo
// root.
let chromium;
try {
  const playwrightEntry = require.resolve('playwright');
  ({ chromium } = require(playwrightEntry));
} catch (err) {
  console.error('FAIL: dev-smoke - playwright not found. Run: npm i -D playwright');
  console.error(`  (${err && err.message ? err.message : err})`);
  process.exit(1);
}

// The production rewrite - same module webpack.config.js requires. Loading
// it here (rather than reimplementing the logic) is the whole point: this
// script must exercise the REAL rewrite, not a copy of it.
const devHtmlRewritePath = require.resolve(
  '../../scripts/devHtmlRewrite.js'
);
const { rewriteDevHtml } = require(devHtmlRewritePath);

const DEV_SERVER_URL = 'http://localhost:3000/';
const DEV_SERVER_PORT = 3000;
const CROSS_ORIGIN_HOST = '127.0.0.1';
const CROSS_ORIGIN_PORT = 9902;
const CROSS_ORIGIN_URL = `http://${CROSS_ORIGIN_HOST}:${CROSS_ORIGIN_PORT}/`;
const MOUNT_TIMEOUT_MS = 15000;

/** Load `url` in a fresh page, wait for #root to gain children, report result. */
async function checkAppMounts(browser, url) {
  const page = await browser.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  let navigationError = null;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: MOUNT_TIMEOUT_MS });
  } catch (err) {
    navigationError = err;
  }

  // Give React a moment to mount even if 'load' fired early, and poll for
  // #root actually gaining children rather than assuming a fixed delay.
  try {
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        return !!root && root.children.length > 0;
      },
      { timeout: MOUNT_TIMEOUT_MS }
    );
  } catch {
    // fall through - we will report whatever state #root is actually in
  }

  const result = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      exists: !!root,
      childCount: root ? root.children.length : 0,
      innerHTML: root ? root.innerHTML : '',
    };
  });

  await page.close();

  return { url, navigationError, pageErrors, consoleErrors, ...result };
}

function reportResult(label, result) {
  const passed = result.exists && result.childCount > 0;
  if (passed) {
    console.log(`PASS: dev-smoke [${label}] - app mounted successfully.`);
    console.log(`  URL: ${result.url}`);
    console.log(`  #root child count: ${result.childCount}`);
    console.log(
      `  #root innerHTML preview: ${result.innerHTML.slice(0, 200)}${
        result.innerHTML.length > 200 ? '...' : ''
      }`
    );
  } else {
    console.error(`FAIL: dev-smoke [${label}] - #root did not mount any content.`);
    console.error(`  URL: ${result.url}`);
    console.error(`  #root exists: ${result.exists}, children: ${result.childCount}`);
    if (result.navigationError) {
      console.error(
        `  Navigation error: ${result.navigationError.message || result.navigationError}`
      );
    }
    if (result.pageErrors.length > 0) {
      console.error('  Captured pageerror event(s):');
      for (const e of result.pageErrors) {
        console.error(`    - ${e}`);
      }
    } else {
      console.error('  No pageerror events were captured.');
    }
    if (result.consoleErrors.length > 0) {
      console.error('  Captured console.error output:');
      for (const e of result.consoleErrors) {
        console.error(`    - ${e}`);
      }
    }
  }
  return passed;
}

/** Fetch the raw dev HTML, rewrite it, and serve it from a different origin. */
function startCrossOriginServer(rewrittenHtml) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(rewrittenHtml);
    });
    server.on('error', reject);
    server.listen(CROSS_ORIGIN_PORT, CROSS_ORIGIN_HOST, () => resolve(server));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function main() {
  const browser = await chromium.launch();

  let pass1 = false;
  let pass2 = false;
  let crossOriginServer = null;

  try {
    // Check 1: same-origin (the dev server serving its own page directly).
    const sameOriginResult = await checkAppMounts(browser, DEV_SERVER_URL);
    pass1 = reportResult('1/same-origin', sameOriginResult);

    // Check 2: cross-origin (the real production rewrite, served from a
    // different origin - reproduces how Lucid actually serves the panel).
    try {
      const rawResponse = await fetch(DEV_SERVER_URL);
      const rawHtml = await rawResponse.text();
      const rewrittenHtml = rewriteDevHtml(rawHtml, DEV_SERVER_PORT);

      crossOriginServer = await startCrossOriginServer(rewrittenHtml);

      const crossOriginResult = await checkAppMounts(browser, CROSS_ORIGIN_URL);
      pass2 = reportResult('2/cross-origin', crossOriginResult);
    } catch (err) {
      console.error('FAIL: dev-smoke [2/cross-origin] - unexpected error.');
      console.error(err);
      pass2 = false;
    }
  } finally {
    if (crossOriginServer) {
      await closeServer(crossOriginServer);
    }
    await browser.close();
  }

  if (!pass1 || !pass2) {
    console.error(
      `FAIL: dev-smoke - check 1 (same-origin): ${pass1 ? 'PASS' : 'FAIL'}, check 2 (cross-origin): ${
        pass2 ? 'PASS' : 'FAIL'
      }`
    );
    process.exit(1);
  }

  console.log('PASS: dev-smoke - both same-origin and cross-origin checks mounted successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL: dev-smoke - unexpected script error.');
  console.error(err);
  process.exit(1);
});
