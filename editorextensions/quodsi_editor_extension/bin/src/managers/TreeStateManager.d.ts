import { PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { ModelStructure } from '@quodsi/shared';
export declare class TreeStateManager {
    private static readonly LOG_PREFIX;
    private expandedNodes;
    private modelManager;
    private stateChangeListeners;
    private loggingEnabled;
    constructor(modelManager: ModelManager);
    setLogging(enabled: boolean): void;
    private isLoggingEnabled;
    private log;
    private logError;
    handleNodeToggle(nodeId: string, expanded: boolean, currentPage: PageProxy): void;
    updateTreeState(expandedNodes: string[], currentPage: PageProxy): void;
    expandPath(modelStructure: ModelStructure, nodeId: string): void;
    validateState(nodes: string[]): boolean;
    getExpandedNodes(): string[];
    loadSavedState(page: PageProxy): void;
    onStateChange(listener: (nodes: string[]) => void): void;
    private notifyStateChange;
}
//# sourceMappingURL=TreeStateManager.d.ts.map