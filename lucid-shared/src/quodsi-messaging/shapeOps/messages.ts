import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import { JsonObject } from '../../types/common';

/**
 * Which side of a reference element a newly created shape should be placed
 * near. Used only as a placement hint for SHAPE_CREATE -- the extension
 * decides the exact coordinates.
 */
export type ShapeSide = 'right' | 'below' | 'left' | 'above';

/**
 * Sent to request creation of a single shape (Activity, Generator, or
 * Connector) on the current page.
 */
export interface ShapeCreateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SHAPE_CREATE;
  data: {
    /** Shape type to create */
    shapeType: 'Activity' | 'Generator' | 'Connector';

    /** Element data (properties) for the new shape */
    element: JsonObject;

    /** Optional placement hint relative to an existing element */
    near?: {
      /** Element ID to place the new shape near */
      elementId: string;

      /** Side of the reference element to place the new shape on */
      side: ShapeSide;
    };
  };
}

/**
 * Sent with shape creation results
 */
export interface ShapeCreateResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SHAPE_CREATE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Element ID of the created shape */
    id?: string;

    /** Error message if creation failed */
    errorMessage?: string;
  };
}

/**
 * Sent to request deletion of a single shape
 */
export interface ShapeDeleteMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SHAPE_DELETE;
  data: {
    /** Shape type of the element to delete */
    shapeType: 'Activity' | 'Generator' | 'Connector';

    /** Element ID to delete */
    elementId: string;
  };
}

/**
 * Sent with shape deletion results
 */
export interface ShapeDeleteResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SHAPE_DELETE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Element IDs that were deleted (deleting a shape can cascade, e.g. to its connectors) */
    deletedIds?: string[];

    /** Error message if deletion failed */
    errorMessage?: string;
  };
}

/**
 * Sent to request moving a single shape to new coordinates
 */
export interface ShapeMoveMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SHAPE_MOVE;
  data: {
    /** Element ID to move */
    elementId: string;

    /** New x coordinate */
    x: number;

    /** New y coordinate */
    y: number;
  };
}

/**
 * Sent with shape move results
 */
export interface ShapeMoveResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SHAPE_MOVE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Error message if the move failed */
    errorMessage?: string;
  };
}

/**
 * Sent to request creation of a whole page-level model from a document
 * produced elsewhere (e.g. by the Advisor).
 */
export interface ModelCreatePageMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_CREATE_PAGE;
  data: {
    /** The document describing the page/model to create */
    document: JsonObject;
  };
}

/**
 * Sent with page-level model creation results
 */
export interface ModelCreatePageResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** ID of the created page */
    pageId?: string;

    /** Map from the document's source element IDs to the created element IDs */
    idMap?: Record<string, string>;

    /** Error message if creation failed */
    errorMessage?: string;
  };
}

/** Union type of all shape operations messages */
export type ShapeOpsMessage =
  | ShapeCreateMessage
  | ShapeCreateResultMessage
  | ShapeDeleteMessage
  | ShapeDeleteResultMessage
  | ShapeMoveMessage
  | ShapeMoveResultMessage
  | ModelCreatePageMessage
  | ModelCreatePageResultMessage;
