import { MessageTypes } from '../MessageTypes';

export interface AppLifecyclePayloads {
    [MessageTypes.REACT_APP_READY]: undefined;

    // ERROR is now handled within SELECTION_CHANGED payload
    // Intentionally left empty
}