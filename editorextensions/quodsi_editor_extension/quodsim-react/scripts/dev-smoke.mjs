// Dev-server smoke test.
//
// This asserts more than "the dev server responds". Three separate dev-only
// defects have shipped on this branch because every prior check only proved
// the server answered an HTTP request, never that it served a WORKING APP
// that actually mounts React into #root. This script loads the page in a
// real browser (via Playwright), captures any uncaught page errors, and
// fails loudly if #root ends up empty.
//
// Assumes a dev server is already running at http://localhost:3000 (this
// script does not start one). Run `npx vite` (or `npm run start`) first.
//
// Playwright is not a dependency of this package - it lives at the monorepo
// root, so it is imported by absolute file URL.
import { chromium } from 'file:///C:/_source/quodsi/node_modules/playwright/index.mjs';

const DEV_SERVER_URL = 'http://localhost:3000/';
const MOUNT_TIMEOUT_MS = 15000;

async function main() {
  const browser = await chromium.launch();
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
    await page.goto(DEV_SERVER_URL, { waitUntil: 'load', timeout: MOUNT_TIMEOUT_MS });
  } catch (err) {
    navigationError = err;
  }

  // Give React a moment to mount even if 'load' fired early, and poll for
  // #root actually gaining children rather than assuming a fixed delay.
  let childCount = 0;
  let innerHTML = '';
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
  childCount = result.childCount;
  innerHTML = result.innerHTML;

  await browser.close();

  if (!result.exists || result.childCount === 0) {
    console.error('FAIL: dev-smoke - #root did not mount any content.');
    console.error(`  URL: ${DEV_SERVER_URL}`);
    console.error(`  #root exists: ${result.exists}, children: ${result.childCount}`);
    if (navigationError) {
      console.error(`  Navigation error: ${navigationError.message || navigationError}`);
    }
    if (pageErrors.length > 0) {
      console.error('  Captured pageerror event(s):');
      for (const e of pageErrors) {
        console.error(`    - ${e}`);
      }
    } else {
      console.error('  No pageerror events were captured.');
    }
    if (consoleErrors.length > 0) {
      console.error('  Captured console.error output:');
      for (const e of consoleErrors) {
        console.error(`    - ${e}`);
      }
    }
    process.exit(1);
  }

  console.log('PASS: dev-smoke - app mounted successfully.');
  console.log(`  #root child count: ${childCount}`);
  console.log(`  #root innerHTML preview: ${innerHTML.slice(0, 200)}${innerHTML.length > 200 ? '...' : ''}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL: dev-smoke - unexpected script error.');
  console.error(err);
  process.exit(1);
});
