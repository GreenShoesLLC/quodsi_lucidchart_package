import { EnvelopeMessageType } from '../../src/quodsi-messaging/envelope/envelopeMessageTypes';
import {
  ShapeSide,
  ShapeCreateMessage,
  ShapeCreateResultMessage,
  ShapeDeleteMessage,
  ShapeDeleteResultMessage,
  ShapeMoveMessage,
  ShapeMoveResultMessage,
  ModelCreatePageMessage,
  ModelCreatePageResultMessage,
} from '../../src/quodsi-messaging/shapeOps/messages';
import { EnvelopMessagePayloads } from '../../src/quodsi-messaging';

/**
 * Task 1 of the Lucid Advisor drawing-half plan: four new extension message
 * types (and their results) so the frame and extension can relay shape
 * creation, deletion, moves, and page-level model creation.
 *
 * This test is deliberately compile-gated: it fails to TYPECHECK (not just
 * to run) until the eight enum members exist AND the payload map registers
 * all eight keys with the matching `data` shape. ts-jest type-checks on
 * every run, so a payload-map mismatch fails the test file outright.
 */
describe('shapeOps message types', () => {
  it('declares the eight enum members with their exact string values', () => {
    expect(EnvelopeMessageType.SHAPE_CREATE).toBe('SHAPE_CREATE');
    expect(EnvelopeMessageType.SHAPE_CREATE_RESULT).toBe('SHAPE_CREATE_RESULT');
    expect(EnvelopeMessageType.SHAPE_DELETE).toBe('SHAPE_DELETE');
    expect(EnvelopeMessageType.SHAPE_DELETE_RESULT).toBe('SHAPE_DELETE_RESULT');
    expect(EnvelopeMessageType.SHAPE_MOVE).toBe('SHAPE_MOVE');
    expect(EnvelopeMessageType.SHAPE_MOVE_RESULT).toBe('SHAPE_MOVE_RESULT');
    expect(EnvelopeMessageType.MODEL_CREATE_PAGE).toBe('MODEL_CREATE_PAGE');
    expect(EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT).toBe('MODEL_CREATE_PAGE_RESULT');
  });

  // Type-level assertion helper: assigning `a` to a variable typed `b` fails
  // to compile if the shapes disagree. No runtime behavior -- the value of
  // this check is the compile step itself.
  function assignableTo<T>(_value: T): void {
    /* no-op */
  }

  it('registers all eight payloads in the shared payload map (compile-time)', () => {
    const shapeCreate: ShapeCreateMessage['data'] = {
      shapeType: 'Activity',
      element: { name: 'A1' },
      near: { elementId: 'el-1', side: 'right' as ShapeSide },
    };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.SHAPE_CREATE]>(shapeCreate);

    const shapeCreateResult: ShapeCreateResultMessage['data'] = { success: true, id: 'el-2' };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.SHAPE_CREATE_RESULT]>(shapeCreateResult);

    const shapeDelete: ShapeDeleteMessage['data'] = { shapeType: 'Connector', elementId: 'el-3' };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.SHAPE_DELETE]>(shapeDelete);

    const shapeDeleteResult: ShapeDeleteResultMessage['data'] = { success: true, deletedIds: ['el-3'] };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.SHAPE_DELETE_RESULT]>(shapeDeleteResult);

    const shapeMove: ShapeMoveMessage['data'] = { elementId: 'el-4', x: 10, y: 20 };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.SHAPE_MOVE]>(shapeMove);

    const shapeMoveResult: ShapeMoveResultMessage['data'] = { success: false, errorMessage: 'nope' };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.SHAPE_MOVE_RESULT]>(shapeMoveResult);

    const modelCreatePage: ModelCreatePageMessage['data'] = { document: { pages: [] } };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.MODEL_CREATE_PAGE]>(modelCreatePage);

    const modelCreatePageResult: ModelCreatePageResultMessage['data'] = {
      success: true,
      pageId: 'p-1',
      idMap: { 'src-1': 'dst-1' },
    };
    assignableTo<EnvelopMessagePayloads[EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT]>(modelCreatePageResult);

    // Reaching here means every assignment above compiled.
    expect(true).toBe(true);
  });

  it('accepts a full envelope for each new message type', () => {
    const create: ShapeCreateMessage = {
      id: 'id-1',
      type: EnvelopeMessageType.SHAPE_CREATE,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: { shapeType: 'Generator', element: {} },
    };
    expect(create.type).toBe(EnvelopeMessageType.SHAPE_CREATE);

    const move: ShapeMoveMessage = {
      id: 'id-2',
      type: EnvelopeMessageType.SHAPE_MOVE,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: { elementId: 'el-5', x: 1, y: 2 },
    };
    expect(move.data.x).toBe(1);
  });
});
