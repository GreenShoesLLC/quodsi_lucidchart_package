// Focused CI gate: fails ONLY on `react-hooks/rules-of-hooks` violations.
//
// The rule is already "error" via eslint-config-react-app, but the dev
// server runs with DISABLE_ESLINT_PLUGIN=true and there is no lint gate,
// so nothing actually enforced it (that is how the ModelPanel and
// ConnectorsEditor "Rendered fewer hooks than expected" crashes shipped).
//
// This intentionally enforces ONLY the hooks-order rule so the gate is
// high-signal and is not drowned by the ~33 unrelated lint errors / 15
// react-hooks/exhaustive-deps warnings elsewhere in the codebase (those
// are separate cleanups, out of scope here).
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
