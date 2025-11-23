import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import { JsonObject } from '../../types/common';
import { ISerializedState } from '../../serialization/interfaces/ISerializedState';
import { ISerializedResourceRequirement } from '../../serialization/interfaces/ISerializedResourceRequirement';
import { ISerializedTimePattern } from '../../serialization/interfaces/ISerializedTimePattern';
import { ISerializedTimeDistributedConfig } from '../../serialization/interfaces/ISerializedTimeDistributedConfig';

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

/**
 * Sent to request resource requirements update
 */
export interface ResourceRequirementsUpdateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE;
  data: {
    /** Serialized resource requirements array */
    resourceRequirements: ISerializedResourceRequirement[];
  };
}

/**
 * Sent with resource requirements update results
 */
export interface ResourceRequirementsUpdateResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Error message if update failed */
    errorMessage?: string;
  };
}

/**
 * Sent to request time patterns update
 */
export interface TimePatternsUpdateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.TIME_PATTERNS_UPDATE;
  data: {
    /** Serialized time patterns array */
    timePatterns: ISerializedTimePattern[];
  };
}

/**
 * Sent with time patterns update results
 */
export interface TimePatternsUpdateResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.TIME_PATTERNS_UPDATE_RESULT;
  data: {
    /** Success flag */
    success: boolean;

    /** Error message if update failed */
    errorMessage?: string;
  };
}

/**
 * Sent to request time distributed configs update
 */
export interface TimeDistributedConfigsUpdateMessage extends EnvelopeBase {
  type: EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE;
  data: {
    /** Serialized time distributed configs array */
    timeDistributedConfigs: ISerializedTimeDistributedConfig[];
  };
}

/**
 * Sent with time distributed configs update results
 */
export interface TimeDistributedConfigsUpdateResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT;
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
  | StatesUpdateResultMessage
  | ResourceRequirementsUpdateMessage
  | ResourceRequirementsUpdateResultMessage
  | TimePatternsUpdateMessage
  | TimePatternsUpdateResultMessage
  | TimeDistributedConfigsUpdateMessage
  | TimeDistributedConfigsUpdateResultMessage;
