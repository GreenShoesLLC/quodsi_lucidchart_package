import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';

/**
 * Modal that hosts the shared Diagram Mapping screen (quodsi_studio's
 * `DiagramMappingPanel`) in the packaged extension's own quodsim-react
 * bundle (?view=diagram-mapping), over the whole Lucid application.
 * Registers the 'diagram-mapping' channel, same wiring
 * SettingsModal/ScheduleEditorModal use for 'settings'/'schedule'.
 *
 * WHY INLINE, NOT A STUDIO EMBED (spec 2026-09-15, smoke-found: the old path
 * was very slow). Diagram Mapping only ever talks to the extension --
 * ANALYZE_PAGE / APPLY_SHAPE_CHANGES, answered by DiagramMappingRelayHandler
 * -- so the previous route through
 * SimulationRunHandler.openEmbedSurfaceModal (an UpsertModel to resolve a
 * server model id, a hosted Studio iframe at
 * /embed/models/<id>/diagram-mapping, and a sign-in token relay) was pure
 * overhead: the Studio page never used the model id or quodsi_api. This
 * modal skips all of that and renders the shared DiagramMappingPanel
 * straight from the panel bundle, talking directly to the existing relay
 * handler. No model id, no Studio iframe, no token relay.
 *
 * TITLED -- same as SettingsModal/ScheduleEditorModal, and for the same
 * reason: Lucid's own chrome gives this modal a native title bar whose X
 * closes it with no code of ours.
 */
export class DiagramMappingModal extends RoutingModal {
  /**
   * Invoked once this modal's iframe has closed. SimulationRunHandler uses
   * it to release its "a diagram-mapping modal is open" guard -- see
   * handleOpenDiagramMappingModal. Assigned after super() (no `this` before
   * it) and read only from frameClosed, which cannot fire before the
   * constructor returns.
   */
  private readonly onClosed?: () => void;

  constructor(client: EditorClient, opts: { modalSize?: ModalSize; onClosed?: () => void }) {
    const url = `quodsim-react/index.html?view=diagram-mapping`;
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, title: 'Diagram Mapping', ...sizeOpts }, 'diagram-mapping');
    this.onClosed = opts.onClosed;
  }

  /**
   * RoutingModal.frameClosed does the channel teardown; this adds the
   * open-guard release on top. Ordering: super() first, so the channel is
   * already released by the time anything reacts to the callback.
   */
  protected frameClosed(): void {
    super.frameClosed();
    this.onClosed?.();
  }
}
