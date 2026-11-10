/**
 * Expression builder messages (spec 2026-11-10). The state-change dialog in
 * the ~300px model panel opens the shared ExpressionBuilder in a real Lucid
 * modal over the canvas, and the result comes back to the panel.
 *
 * Every payload carries the panel-minted `requestId`, which is how the
 * panel's bridge matches a RESULT to the call that is waiting on it.
 */
import type { ExpressionBuilderRequest, ModalSize } from '@quodsi/shared';

/** Panel -> host OPEN_EXPRESSION_BUILDER. */
export type OpenExpressionBuilderData = {
  requestId: string;
  request: ExpressionBuilderRequest;
  modalSize?: ModalSize;
};

/** Host -> 'expression' modal EXPRESSION_BUILDER_INIT, sent once the modal opens. */
export type ExpressionBuilderInitData = {
  requestId: string;
  request: ExpressionBuilderRequest;
};

/**
 * Modal -> host, then host -> 'model', EXPRESSION_BUILDER_RESULT. `expression`
 * is null on Cancel, on the modal's own close button, and when a builder was
 * already open.
 */
export type ExpressionBuilderResultData = {
  requestId: string;
  expression: string | null;
};
