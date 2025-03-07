const child_process = require("child_process");
const fs = require("fs");
const process = require("process");

const WebpackShellPluginNext = require("webpack-shell-plugin-next");

const reactTargets = [{ name: "quodsim-react", port: 3000 }];

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
