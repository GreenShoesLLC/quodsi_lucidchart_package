import { AppLifecyclePayloads } from './payloads/AppLifecyclePayloads';
import { ValidationPayloads } from './payloads/ValidationPayloads';
import { SelectionPayloads } from './payloads/SelectionPayloads';
import { AuthPayloads } from './payloads/AuthPayloads';
import { ActionRequest, ActionResponse } from './payloads/ActionPayloads';

export enum MessageTypes {
    // React App Lifecycle
    REACT_APP_READY = 'reactAppReady',
    AUTH = 'auth',
    SELECTION_CHANGED = 'selectionChanged',
    // New Action Message Types
    ACTION_REQUEST = 'actionRequest',
    ACTION_RESPONSE = 'actionResponse',
    VALIDATION_RESULT = 'validationResult',
}

export interface MessagePayloads extends
    AppLifecyclePayloads,
    SelectionPayloads,
    ValidationPayloads,
    AuthPayloads {
    // Add the new Action message payloads
    [MessageTypes.ACTION_REQUEST]: ActionRequest;
    [MessageTypes.ACTION_RESPONSE]: ActionResponse;
}

export type Message<T extends MessageTypes> = {
    messagetype: T;
    data: MessagePayloads[T];
};