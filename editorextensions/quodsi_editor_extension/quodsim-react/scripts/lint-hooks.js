// Focused CI gate: fails ONLY on `react-hooks/rules-of-hooks` and
// `no-console` violations, across BOTH the quodsim-react app and the
// editor extension's own src.
//
// Pass 1 (quodsim-react, via .eslintrc.js): both rules are "error" via
// .eslintrc.js (eslint-plugin-react-hooks + @typescript-eslint/parser),
// not eslint-config-react-app -- that package was removed with
// react-scripts. The Vite dev server does not run ESLint at all (no
// DISABLE_ESLINT_PLUGIN equivalent, no built-in lint gate), so this
// script is the only thing enforcing them (that is how the ModelPanel
// and ConnectorsEditor "Rendered fewer hooks than expected" crashes
// shipped, and how raw console calls would regrow after the
// unified-logger migration).
//
// Pass 2 (../src, the editor extension proper): that package has no
// ESLint config of its own and no eslint devDependency -- eslint is only
// resolvable there because it hoists up from quodsim-react's
// devDependency into the workspace root node_modules. Rather than add a
// config file or a devDependency to that package, this pass supplies an
// inline config via `useEslintrc: false` + `overrideConfig`. It enforces
// only `no-console` -- `react-hooks/rules-of-hooks` is React-specific and
// does not apply to extension code, which has no components/hooks. This
// pass matters more than pass 1 by volume: of the ~204 console call
// sites migrated to the shared logger, ~176 were in the extension's src
// and only ~28 in quodsim-react.
//
// This intentionally enforces ONLY these rules (and only no-console in
// pass 2) so the gate is high-signal and is not drowned by unrelated
// lint errors / warnings elsewhere in the codebase (those are separate
// cleanups, out of scope here).
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

  // Second pass: the extension's own src. That package has no ESLint config and
  // no eslint devDependency of its own, so this pass supplies the config inline
  // with useEslintrc:false rather than adding a config file there. It enforces
  // only no-console - the hooks rule is React-specific and does not apply to
  // extension code, which has no components.
  const extensionEslint = new ESLint({
    useEslintrc: false,
    overrideConfig: {
      parser: require.resolve("@typescript-eslint/parser"),
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
      rules: { "no-console": "error" },
    },
  });
  const extensionResults = await extensionEslint.lintFiles(["../src/**/*.ts"]);

  const offenders = [];
  for (const result of [...results, ...extensionResults]) {
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

  console.log(`${[...GATED_RULES].join(", ")}: clean (no violations, both quodsim-react and extension src).`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
