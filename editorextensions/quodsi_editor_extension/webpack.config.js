const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const process = require("process");

const webpack = require("webpack");
const WebpackShellPluginNext = require("webpack-shell-plugin-next");

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

module.exports = {
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

          // Enable links to other React assets, even when served by the extension,
          // by having those assets' links explicitly point to the React dev server
          const reactAppContentHTMLReplaced = reactAppContentHTML.replaceAll(
            /(src|href)="\//gi,
            `$1="http://localhost:${target.port}/`
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
          child_process.execSync("npx react-scripts build", {
            stdio: "inherit",
          });

          // In the React app's bundled HTML, enable links to other React assets,
          // by having those links explicitly point to the extension's bundle
          const content = fs.readFileSync("build/index.html", "utf8");
          const newContent = content.replaceAll(/(src|href)="\//gi, '$1="');
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
  mode: "development",
};
