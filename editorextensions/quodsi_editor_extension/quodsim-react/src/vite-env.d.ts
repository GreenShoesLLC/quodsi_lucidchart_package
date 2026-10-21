/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Quodsi version, channel and commit (platforms/shared/version/quodsiVersion.ts). */
  readonly VITE_QUODSI_VERSION?: string
  readonly VITE_QUODSI_CHANNEL?: string
  readonly VITE_QUODSI_COMMIT?: string
  /**
   * Data connector base URL. Used by environmentDetection.ts for the
   * Dev/Test/Prod LABEL only -- actual HTTP flows through Lucid's data
   * connector to the manifest's callbackBaseUrl, not through this value.
   * Set by deploy/lucid-package/build-bundle.ps1 per target environment.
   */
  readonly VITE_DATA_CONNECTOR_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
