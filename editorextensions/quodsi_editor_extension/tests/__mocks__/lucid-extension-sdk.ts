// editorextensions/quodsi_editor_extension/tests/__mocks__/lucid-extension-sdk.ts
// Minimal stand-ins so importing modules don't pull the real SDK at test time.
export class ElementProxy {}
// Mirrors the SDK's own hierarchy (ElementProxy -> ItemProxy -> Block/Line),
// because production code branches on `instanceof` across all three -- e.g.
// itemDataBuilder picks a name by BlockProxy and gates the unconverted flag
// by ItemProxy, so a mock that flattened them would throw on the second check.
export class ItemProxy extends ElementProxy {}
export class BlockProxy extends ItemProxy {}
export class LineProxy extends ItemProxy {}
export class PageProxy extends ElementProxy {}
export class Viewport {}
/**
 * Test seam for `DocumentProxy.pages`: the pages a constructed mock
 * DocumentProxy reports. The real `pages` is a MapProxy served by the Lucid
 * app; a plain Map matches the slice production code uses (`.values()`).
 * Tests push their fake pages here (and clear it in beforeEach) --
 * pasteHookWiring builds the paste normalizer's cross-page enumeration from
 * `new DocumentProxy(client).pages`.
 */
export const documentPagesForTests: any[] = [];

export class DocumentProxy {
  public readonly pages = new Map<string, any>(documentPagesForTests.map((p) => [p.id, p]));
  // Real signature returns a handle string (see documentproxy.d.ts); no test
  // currently drives this hook through a real DocumentProxy instance (the
  // extension.ts registration is exercised only via a source-level text
  // check -- booting extension.ts under Jest is impractical), so this is a
  // no-op stub kept in shape with the SDK for anything that does construct
  // one.
  public hookCreateItems(_callback: (items: ItemProxy[]) => void): string {
    return 'create-items-hook-handle';
  }
}
// Captures the config a subclass passes to `super(client, config)` on
// `.config` so tests can assert on the url/size/title a RoutingModal
// subclass (e.g. PatternEditorModal, StudioEmbedModal) computed, without
// pulling in the real SDK's iframe/platform machinery.
export class Modal {
  public readonly config: unknown;
  // Mirrors the real SDK's Modal (node_modules/lucid-extension-sdk/ui/modal.js):
  // `visible` starts false, `show()` flips it true, `hide()` only acts (and
  // only flips it back false) when it is currently true. This is the seam
  // RoutingModal.messageFromFrame's CLOSE_MODAL intercept depends on -- see
  // tests/model/routingModal.closeModal.test.ts.
  public visible = false;
  constructor(_client: unknown, config: unknown) {
    this.config = config;
  }
  // No-ops so a test can drive a RoutingModal subclass's real lifecycle
  // (show(), and the frameClosed() override that releases the pattern modal's
  // open-guard) without the SDK's iframe machinery.
  public async show(): Promise<void> {
    this.visible = true;
  }
  public hide(): void {
    if (this.visible) {
      this.visible = false;
    }
  }
  protected frameLoaded(): void {}
  protected frameClosed(): void {}
}
export class Panel {}
export class EditorClient {}
