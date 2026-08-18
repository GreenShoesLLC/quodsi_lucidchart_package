const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const process = require("process");

const webpack = require("webpack");
const WebpackShellPluginNext = require("webpack-shell-plugin-next");
const { rewriteDevHtml, stripToRelative } = require("./scripts/devHtmlRewrite");

const reactTargets = [{ name: "quodsim-react", port: 3000 }];

// Local-dev override for the Studio URL used by AccountStrip's "Create New
// User" menu. Reads from `local-studio-url.txt` (gitignored) if present —
// the developer creates that file once with a single line like
// `https://localhost:3030` to route the button at their local Studio dev
// server during iteration. Cloud bundles ignore it: a true CI build won't have
// the file, and build-bundle.ps1 (local builds of cloud packages) sets
// QUODSI_SKIP_LOCAL_STUDIO_OVERRIDE=1 — either way the extension falls back to
// the per-package-ID mapping in authHandler.ts (production behavior).
function readLocalStudioOverride() {
  // Cloud packages (build-bundle.ps1 for Dev/TST/PRD) set this so a LOCAL build
  // of a cloud package ignores local-studio-url.txt — otherwise `localhost`
  // gets baked into __LOCAL_STUDIO_OVERRIDE__ and overrides the per-package-ID
  // Studio URL. `npm start` (local dev) leaves it unset.
  if (process.env.QUODSI_SKIP_LOCAL_STUDIO_OVERRIDE === "1") {
    console.log("[webpack] __LOCAL_STUDIO_OVERRIDE__ skipped (QUODSI_SKIP_LOCAL_STUDIO_OVERRIDE=1)");
    return "";
  }
  const overrideFile = path.resolve(__dirname, "local-studio-url.txt");
  try {
    const value = fs.readFileSync(overrideFile, "utf8").trim();
    if (value) {
      console.log(`[webpack] __LOCAL_STUDIO_OVERRIDE__ = ${value} (from ${overrideFile})`);
      return value;
    }
  } catch {
    // file doesn't exist — fine, no override
  }
  return "";
}

module.exports = (env, argv) => {
  // lucid-package's watch path calls this export with only an `env` argument,
  // so `argv` is undefined there - default to development. webpack-cli passes
  // (env, argv) with argv.mode set from --mode, which is how the production
  // bundle gets 'production'.
  const mode = (argv && argv.mode) || "development";

  return {
  entry: "./src/extension.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /[\\\/]resources[\\\/]/,
        use: "raw-loader",
        exclude: /\.json$/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "bin/extension.js",
    path: __dirname,
  },
  plugins: [
    new webpack.DefinePlugin({
      __LOCAL_STUDIO_OVERRIDE__: JSON.stringify(readLocalStudioOverride()),
      __QUODSI_LOG_LEVEL__: JSON.stringify(mode === "production" ? "warn" : "debug"),
    }),
    new WebpackShellPluginNext({
      // Run during execution of `npx lucid-package@latest test-editor-extension`.
      // When doing a watch build, the user must manually first run "npm start".
      // Then, this script will update the html file to prefix http://localhost:3000/ to all the resource URLs
      onWatchRun: {
        scripts: reactTargets.map((target) => async () => {
          // Executed by WebpackShellPluginNext, from within the package's root level directory.
          fs.mkdirSync(`public/${target.name}`, { recursive: true });

          const reactServerURL = `http://localhost:${target.port}`;
          const reactAppResponse = await fetch(reactServerURL).catch(
            (error) => {
              console.error(
                `Extension failed to load the React app. Make sure the React server is running on ${reactServerURL}.`
              );
              throw error;
            }
          );
          const reactAppContentHTML = await reactAppResponse.text();

          // Enable links to other React assets, even when served by the
          // extension, by pointing them at the React dev server.
          //
          // See scripts/devHtmlRewrite.js for the full explanation and the
          // single source of truth for this rewrite (both HTML attributes
          // AND the JS module specifiers inside inline module scripts, e.g.
          // @vitejs/plugin-react's Fast Refresh preamble). That module is
          // also what tests/devHtmlRewrite.test.ts exercises directly, so
          // any change here should be made there instead.
          const reactAppContentHTMLReplaced = rewriteDevHtml(
            reactAppContentHTML,
            target.port
          );

          // Enable the extension to serve a copy of the React app
          fs.writeFileSync(
            `public/${target.name}/index.html`,
            reactAppContentHTMLReplaced
          );
        }),
        blocking: true,
      },
      // Run during execution of `npx lucid-package@latest bundle`.
      // When doing a full build, this script will automatically run "npm run build"
      // and then copy all the assets to the root level public folder
      onBeforeNormalRun: {
        scripts: reactTargets.map((target) => () => {
          // Executed by WebpackShellPluginNext from within each _extension's_ directory.
          fs.mkdirSync(`../../public/${target.name}`, { recursive: true });

          process.chdir(`${target.name}`);
          // Vite (see quodsim-react/vite.config.mts). The Lucid CLI is agnostic
          // about what produces these files -- `bundle` only zips public/
          // verbatim -- so the build tool is entirely this repo's choice.
          child_process.execSync("npm run build", {
            stdio: "inherit",
          });

          // Belt-and-braces: Vite's `base: './'` already emits relative paths,
          // so this normally matches nothing. Retained so a future config
          // regression (or a hand-edited index.html) still can't ship
          // root-absolute asset URLs, which silently 404 inside the package.
          // See scripts/devHtmlRewrite.js for the single source of truth.
          const content = fs.readFileSync("build/index.html", "utf8");
          const newContent = stripToRelative(content);
          fs.writeFileSync("build/index.html", newContent);

          // Add React assets to the extension's bundle
          fs.cpSync("build", `../../../public/${target.name}`, {
            recursive: true,
          });
        }),
        blocking: true,
      },
    }),
  ],
  mode,
  };
};
