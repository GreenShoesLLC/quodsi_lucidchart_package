// Focused CI gate: fails ONLY on `react-hooks/rules-of-hooks` and
// `no-console` violations.
//
// Both rules are "error" via .eslintrc.js (eslint-plugin-react-hooks +
// @typescript-eslint/parser), not eslint-config-react-app -- that package
// was removed with react-scripts. The Vite dev server does not run ESLint
// at all (no DISABLE_ESLINT_PLUGIN equivalent, no built-in lint gate), so
// this script is the only thing enforcing them (that is how the
// ModelPanel and ConnectorsEditor "Rendered fewer hooks than expected"
// crashes shipped, and how raw console calls would regrow after the
// unified-logger migration).
//
// This intentionally enforces ONLY these two rules so the gate is
// high-signal and is not drowned by unrelated lint errors / warnings
// elsewhere in the codebase (those are separate cleanups, out of scope
// here).
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

const GATED_RULES = new Set(["react-hooks/rules-of-hooks", "no-console"]);

(async () => {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);

  const offenders = [];
  for (const result of results) {
    for (const message of result.messages) {
      if (GATED_RULES.has(message.ruleId)) {
        offenders.push(
          `${result.filePath}:${message.line}:${message.column}  [${message.ruleId}]  ${message.message}`
        );
      }
    }
  }

  if (offenders.length > 0) {
    console.error(`\n${[...GATED_RULES].join(", ")} violations (${offenders.length}):`);
    offenders.forEach((o) => console.error("  " + o));
    console.error(
      "\nHooks must run unconditionally — move every hook above any early return.\n" +
        "Use the shared logger instead of raw console calls.\n"
    );
    process.exit(1);
  }

  console.log(`${[...GATED_RULES].join(", ")}: clean (no violations).`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
