import { JsonSerializable } from '../JsonTypes';
import { MessageTypes } from '../MessageTypes';
import { SelectionState } from '../../SelectionState';
import { ModelStructure } from '../../accordion/ModelStructure';
import { ModelData } from './ModelData';

export interface AppLifecyclePayloads {
    [MessageTypes.REACT_APP_READY]: undefined;

    [MessageTypes.INITIAL_STATE]: {
        isModel: boolean;
        pageId: string;
        documentId: string;
        canConvert: boolean;
        // modelData: JsonSerializable | null;
        modelData: ModelData | null;
        selectionState: SelectionState;
        modelStructure?: ModelStructure;
        expandedNodes?: string[];
    };

    [MessageTypes.ERROR]: {
        error: string;
        details?: JsonSerializable;
    };
}
