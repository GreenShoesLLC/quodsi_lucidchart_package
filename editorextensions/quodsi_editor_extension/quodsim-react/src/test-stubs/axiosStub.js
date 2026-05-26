// Jest stub for the ESM-only `axios` package.
//
// CRA/Jest does not transform `node_modules` by default, and the published
// `axios` entry point is native ESM (`import ... from './lib/axios.js'`),
// which Jest cannot parse. `@quodsi/shared`'s `lucidApi` service imports axios
// at module-load time, so importing anything from `@quodsi/shared` pulls axios
// into the test graph. None of our component tests actually make HTTP calls,
// so this no-op stub is sufficient. Mapped via `jest.moduleNameMapper` in
// package.json (`^axios$`).
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
