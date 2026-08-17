// Stub for the ESM-only `axios` package, used in tests.
//
// The published `axios` entry point is native ESM (`import ... from
// './lib/axios.js'`). `@quodsi/shared`'s `lucidApi` service imports axios
// at module-load time, so importing anything from `@quodsi/shared` pulls axios
// into the test graph. None of our component tests actually make HTTP calls,
// so this no-op stub is sufficient. Mapped via `test.alias` in
// vite.config.ts (`^axios$`).
const noop = () => Promise.resolve({ data: {} });

const axios = {
  create: () => axios,
  get: noop,
  post: noop,
  put: noop,
  delete: noop,
  patch: noop,
  request: noop,
  interceptors: {
    request: { use: () => {}, eject: () => {} },
    response: { use: () => {}, eject: () => {} },
  },
};

module.exports = axios;
module.exports.default = axios;
