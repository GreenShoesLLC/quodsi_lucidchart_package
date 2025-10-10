import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import { JsonObject } from '../../types/common';
import { ISerializedState } from '../../serialization/interfaces/ISerializedState';

/**
 * Sent to request element update
 */
export interface ElementUpdateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.ELEMENT_UPDATE;
  data: {
    /** Element ID to update */
    elementId: string;

    /** Element type as string (SimulationObjectType) */
    type: string;

    /** Element data (properties) */
    data: JsonObject;
  };
}

/**
 * Sent with element update results
 */
export interface ElementUpdateResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Element ID that was updated */
    elementId: string;

    /** Error message if update failed */
    errorMessage?: string;
  };
}

/**
 * Sent to request element type conversion
 */
export interface ElementConvertMessage extends EnvelopeBase {
  type: EnvelopeMessageType.ELEMENT_CONVERT;
  data: {
    /** Element ID to convert */
    elementId: string;

    /** New type to convert to (SimulationObjectType as string) */
    newType: string;

    /** Optional data to apply during conversion */
    data?: JsonObject;
  };
}

/**
 * Sent with element conversion results
 */
export interface ElementConvertResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.ELEMENT_CONVERT_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Element ID that was converted */
    elementId: string;

    /** Error message if conversion failed */
    errorMessage?: string;
  };
}

/**
 * Sent to request states update
 */
export interface StatesUpdateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.STATES_UPDATE;
  data: {
    /** Serialized states array */
    states: ISerializedState[];
  };
}

/**
 * Sent with states update results
 */
export interface StatesUpdateResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.STATES_UPDATE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Error message if update failed */
    errorMessage?: string;
  };
}

/** Union type of all element operations messages */
export type ElementOpsMessage =
  | ElementUpdateMessage
  | ElementUpdateResultMessage
  | ElementConvertMessage
  | ElementConvertResultMessage
  | StatesUpdateMessage
  | StatesUpdateResultMessage;
