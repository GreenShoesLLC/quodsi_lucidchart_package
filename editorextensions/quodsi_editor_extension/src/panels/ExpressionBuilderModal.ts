import { EditorClient } from 'lucid-extension-sdk';
import { ModalSize, DEFAULT_MODAL_SIZE, MODAL_SIZE_DIMENSIONS } from '@quodsi/lucid-shared';
import { RoutingModal } from './RoutingModal';

/**
 * Modal that hosts Studio's shared ExpressionBuilder in the packaged
 * extension's own quodsim-react bundle (?view=expression), over the whole
 * Lucid application (spec 2026-11-10). The state-change dialog that asks for
 * it lives in the ~300px right-dock panel, too narrow for the builder.
 * Registers the 'expression' channel, same wiring as PatternEditorModal.
 *
 * The request travels as EXPRESSION_BUILDER_INIT rather than on the URL (it
 * carries the model's readable states). ModelRootHandler sends it from
 * onLoaded, once frameLoaded has registered the channel, so the send queues
 * on a known panel until REACT_APP_READY instead of logging a missing one.
 */
export class ExpressionBuilderModal extends RoutingModal {
  /** Invoked after each frameLoaded, once the channel is registered. */
  private readonly onLoaded?: () => void;
  /** Invoked once this modal's iframe has closed (see PatternEditorModal). */
  private readonly onClosed?: () => void;

  constructor(
    client: EditorClient,
    opts: { modalSize?: ModalSize; onLoaded?: () => void; onClosed?: () => void } = {},
  ) {
    const url = 'quodsim-react/index.html?view=expression';
    const size = opts.modalSize ?? DEFAULT_MODAL_SIZE;
    const sizeOpts =
      size === 'fullscreen'
        ? { fullScreen: true as const }
        : MODAL_SIZE_DIMENSIONS[size];
    super(client, { url, title: 'Build expression', ...sizeOpts }, 'expression');
    this.onLoaded = opts.onLoaded;
    this.onClosed = opts.onClosed;
  }

  protected frameLoaded(): void {
    super.frameLoaded();
    this.onLoaded?.();
  }

  /** Channel teardown first (super), then the handler's callback. */
  protected frameClosed(): void {
    super.frameClosed();
    this.onClosed?.();
  }
}
