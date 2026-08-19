// editorextensions/quodsi_editor_extension/tests/__mocks__/lucid-extension-sdk.ts
// Minimal stand-ins so importing modules don't pull the real SDK at test time.
export class ElementProxy {}
export class BlockProxy {}
export class LineProxy {}
export class PageProxy {}
export class Viewport {}
export class DocumentProxy {}
// Captures the config a subclass passes to `super(client, config)` on
// `.config` so tests can assert on the url/size/title a RoutingModal
// subclass (e.g. PatternEditorModal, StudioEmbedModal) computed, without
// pulling in the real SDK's iframe/platform machinery.
export class Modal {
  public readonly config: unknown;
  constructor(_client: unknown, config: unknown) {
    this.config = config;
  }
  // No-ops so a test can drive a RoutingModal subclass's real lifecycle
  // (show(), and the frameClosed() override that releases the pattern modal's
  // open-guard) without the SDK's iframe machinery.
  public async show(): Promise<void> {}
  protected frameLoaded(): void {}
  protected frameClosed(): void {}
}
export class Panel {}
export class EditorClient {}
