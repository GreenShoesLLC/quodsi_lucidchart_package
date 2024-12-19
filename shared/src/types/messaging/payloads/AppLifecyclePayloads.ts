import { JsonSerializable } from '../JsonTypes';
import { MessageTypes } from '../MessageTypes';
import { SelectionState } from '../../SelectionState';
import { ModelStructure } from '../../accordion/ModelStructure';
import { ModelData } from './ModelData';

export interface AppLifecyclePayloads {
    [MessageTypes.REACT_APP_READY]: undefined;

    [MessageTypes.ERROR]: {
        error: string;
        details?: JsonSerializable;
    };
}
