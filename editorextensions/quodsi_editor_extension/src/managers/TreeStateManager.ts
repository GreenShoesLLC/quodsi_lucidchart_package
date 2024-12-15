import { PageProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { ModelStructure } from '@quodsi/shared';

export class TreeStateManager {
    private static readonly LOG_PREFIX = '[TreeStateManager]';
    private expandedNodes: Set<string> = new Set();
    private modelManager: ModelManager;
    private stateChangeListeners: ((nodes: string[]) => void)[] = [];
    private loggingEnabled: boolean = false;

    constructor(modelManager: ModelManager) {
        this.modelManager = modelManager;
        this.log('TreeStateManager initialized');
    }

    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    private isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    private log(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.log(`${TreeStateManager.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${TreeStateManager.LOG_PREFIX} ${message}`, ...args);
        }
    }

    public handleNodeToggle(nodeId: string, expanded: boolean, currentPage: PageProxy): void {
        this.log('Handling node toggle', { nodeId, expanded, pageId: currentPage?.id });

        try {
            if (!nodeId) {
                throw new Error('Node ID is required');
            }

            if (!currentPage) {
                throw new Error('Current page is required');
            }

            if (expanded) {
                this.expandedNodes.add(nodeId);
                this.log('Node expanded', { nodeId });
            } else {
                this.expandedNodes.delete(nodeId);
                this.log('Node collapsed', { nodeId });
            }

            const expandedNodesArray = Array.from(this.expandedNodes);
            this.log('Saving expanded nodes to storage', { nodes: expandedNodesArray });
            this.modelManager.setExpandedNodes(currentPage, expandedNodesArray);
            this.notifyStateChange(expandedNodesArray);

        } catch (error) {
            this.logError('Error handling node toggle:', error);
            throw error;
        }
    }

    public updateTreeState(expandedNodes: string[], currentPage: PageProxy): void {
        this.log('Updating tree state', {
            nodeCount: expandedNodes.length,
            pageId: currentPage?.id
        });

        try {
            if (!this.validateState(expandedNodes)) {
                throw new Error('Invalid expanded nodes state');
            }

            if (!currentPage) {
                throw new Error('Current page is required');
            }

            this.expandedNodes = new Set(expandedNodes);
            this.log('Tree state updated', { nodes: expandedNodes });

            this.modelManager.setExpandedNodes(currentPage, expandedNodes);
            this.notifyStateChange(expandedNodes);

        } catch (error) {
            this.logError('Error updating tree state:', error);
            throw error;
        }
    }

    public expandPath(modelStructure: ModelStructure, nodeId: string): void {
        this.log('Expanding path to node', { nodeId });

        const pathNodes = this.modelManager.findPathToNode(modelStructure, nodeId);
        this.log('Found path nodes', { pathNodes });

        pathNodes.forEach(id => {
            this.expandedNodes.add(id);
            this.log('Added node to expanded set', { nodeId: id });
        });
    }

    public validateState(nodes: string[]): boolean {
        this.log('Validating tree state', { nodeCount: nodes?.length });

        const isValid = Array.isArray(nodes) && nodes.every(node => typeof node === 'string');
        if (!isValid) {
            this.logError('Invalid tree state', nodes);
        }
        return isValid;
    }

    public getExpandedNodes(): string[] {
        const nodes = Array.from(this.expandedNodes);
        this.log('Getting expanded nodes', { nodes });
        return nodes;
    }

    public loadSavedState(page: PageProxy): void {
        this.log('Loading saved state', { pageId: page?.id });

        const savedNodes = this.modelManager.getExpandedNodes(page);
        this.log('Retrieved saved nodes', { savedNodes });

        if (savedNodes?.length) {
            this.expandedNodes = new Set(savedNodes);
            this.log('Restored expanded nodes', { nodes: savedNodes });
        } else {
            this.log('No saved nodes found');
        }
    }

    public onStateChange(listener: (nodes: string[]) => void): void {
        this.log('Adding state change listener');
        this.stateChangeListeners.push(listener);
    }

    private notifyStateChange(nodes: string[]): void {
        this.log('Notifying state change listeners', {
            listenerCount: this.stateChangeListeners.length
        });

        this.stateChangeListeners.forEach((listener, index) => {
            try {
                this.log(`Executing listener ${index}`);
                listener(nodes);
            } catch (error) {
                this.logError(`Error in state change listener ${index}:`, error);
            }
        });
    }
}