import { ElementProxy, ItemProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { SelectionState } from '@quodsi/shared';
export declare class SelectionManager {
    private static readonly LOG_PREFIX;
    private currentSelection;
    private modelManager;
    private selectionChangeListeners;
    private loggingEnabled;
    constructor(modelManager: ModelManager);
    setLogging(enabled: boolean): void;
    private isLoggingEnabled;
    private log;
    private logError;
    determineSelectionState(currentPage: ElementProxy, items: ItemProxy[]): Promise<SelectionState>;
    private determineSelectionType;
    private mapElementTypeToSelectionType;
    validateSelection(selection: SelectionState): boolean;
    onSelectionChange(listener: (selection: SelectionState) => void): void;
    getCurrentSelection(): SelectionState;
    setCurrentSelection(selection: SelectionState): void;
    private notifySelectionChange;
}
//# sourceMappingURL=SelectionManager.d.ts.map