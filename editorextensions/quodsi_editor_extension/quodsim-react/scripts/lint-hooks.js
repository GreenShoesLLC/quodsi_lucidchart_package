// Focused CI gate: fails ONLY on `react-hooks/rules-of-hooks` violations.
//
// The rule is "error" via .eslintrc.js (eslint-plugin-react-hooks +
// @typescript-eslint/parser), not eslint-config-react-app -- that package
// was removed with react-scripts. The Vite dev server does not run ESLint
// at all (no DISABLE_ESLINT_PLUGIN equivalent, no built-in lint gate), so
// this script is the only thing enforcing the rule (that is how the
// ModelPanel and ConnectorsEditor "Rendered fewer hooks than expected"
// crashes shipped).
//
// This intentionally enforces ONLY the hooks-order rule so the gate is
// high-signal and is not drowned by the ~33 unrelated lint errors / 15
// react-hooks/exhaustive-deps warnings elsewhere in the codebase (those
// are separate cleanups, out of scope here).
//
// WARNING: `new ESLint()` below reads config via the legacy eslintrc
// system, which requires ESLint 8.x (pinned ^8.57.0, currently resolving
// to 8.57.1). ESLint 9 defaults to flat config and ignores .eslintrc.js
// entirely -- on an ESLint 9 upgrade this would silently lint against an
// empty ruleset and this gate would report "clean" forever without
// catching anything. Migrate to eslint.config.js (or pass
// { overrideConfigFile } / ESLINT_USE_FLAT_CONFIG=false deliberately)
// before bumping ESLint past 8.x.
const { ESLint } = require("eslint");

const RULE = "react-hooks/rules-of-hooks";

(async () => {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);

  const offenders = [];
  for (const result of results) {
    for (const message of result.messages) {
      if (message.ruleId === RULE) {
        offenders.push(
          `${result.filePath}:${message.line}:${message.column}  ${message.message}`
        );
      }
    }
  }

  if (offenders.length > 0) {
    console.error(`\n${RULE} violations (${offenders.length}):`);
    offenders.forEach((o) => console.error("  " + o));
    console.error(
      "\nHooks must run unconditionally — move every hook above any early return.\n"
    );
    process.exit(1);
  }

  console.log(`${RULE}: clean (no violations).`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
