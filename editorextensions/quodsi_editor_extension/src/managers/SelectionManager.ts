import { ElementProxy, ItemProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../core/ModelManager';
import { SelectionState, SelectionType, SimulationObjectType } from '@quodsi/shared';

export class SelectionManager {
    private static readonly LOG_PREFIX = '[SelectionManager]';
    private currentSelection: SelectionState;
    private modelManager: ModelManager;
    private selectionChangeListeners: ((selection: SelectionState) => void)[] = [];
    private loggingEnabled: boolean = false;

    constructor(modelManager: ModelManager) {
        this.modelManager = modelManager;
        this.currentSelection = {
            pageId: '',
            selectedIds: [],
            selectionType: SelectionType.NONE
        };
        this.log('SelectionManager initialized');
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
            console.log(`${SelectionManager.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${SelectionManager.LOG_PREFIX} ${message}`, ...args);
        }
    }

    public async determineSelectionState(currentPage: ElementProxy, items: ItemProxy[]): Promise<SelectionState> {
        this.log('Determining selection state', {
            pageId: currentPage.id,
            itemCount: items.length,
            items: items.map(i => i.id)
        });

        const type = await this.determineSelectionType(items);
        const state = {
            pageId: currentPage.id,
            selectedIds: items.map(item => item.id),
            selectionType: type
        };

        this.log('Selection state determined', state);
        return state;
    }

    private async determineSelectionType(items: ItemProxy[]): Promise<SelectionType> {
        this.log('Determining selection type', { itemCount: items.length });

        if (items.length === 0) {
            this.log('No items selected, returning NONE');
            return SelectionType.NONE;
        }
        if (items.length > 1) {
            this.log('Multiple items selected, returning MULTIPLE');
            return SelectionType.MULTIPLE;
        }

        const item = items[0];
        this.log('Processing single item selection', { itemId: item.id });

        if (this.modelManager.isUnconvertedElement(item)) {
            this.log('Item is unconverted', { itemId: item.id });
            return SelectionType.UNCONVERTED_ELEMENT;
        }

        const metadata = await this.modelManager.getMetadata(item);
        this.log('Retrieved metadata', { itemId: item.id, metadata });

        if (!metadata?.type || metadata.type === SimulationObjectType.None) {
            this.log('Invalid or None type metadata, treating as unconverted', { itemId: item.id });
            return SelectionType.UNCONVERTED_ELEMENT;
        }

        const selectionType = this.mapElementTypeToSelectionType(metadata.type);
        this.log('Mapped element type to selection type', {
            itemId: item.id,
            elementType: metadata.type,
            selectionType
        });
        return selectionType;
    }

    private mapElementTypeToSelectionType(elementType: SimulationObjectType): SelectionType {
        this.log('Mapping element type to selection type', { elementType });

        // Create a type-safe mapping object
        const mapping: Partial<Record<SimulationObjectType, SelectionType>> = {
            [SimulationObjectType.Activity]: SelectionType.ACTIVITY,
            [SimulationObjectType.Connector]: SelectionType.CONNECTOR,
            [SimulationObjectType.Entity]: SelectionType.ENTITY,
            [SimulationObjectType.Generator]: SelectionType.GENERATOR,
            [SimulationObjectType.Resource]: SelectionType.RESOURCE,
            [SimulationObjectType.Model]: SelectionType.MODEL
        };

        const result = mapping[elementType] ?? SelectionType.UNKNOWN_BLOCK;
        this.log('Type mapping result', { elementType, result });
        return result;
    }

    public validateSelection(selection: SelectionState): boolean {
        this.log('Validating selection state', selection);
        const isValid = (
            selection &&
            typeof selection.pageId === 'string' &&
            Array.isArray(selection.selectedIds) &&
            typeof selection.selectionType === 'number'
        );

        if (!isValid) {
            this.logError('Invalid selection state', selection);
        }
        return isValid;
    }

    public onSelectionChange(listener: (selection: SelectionState) => void): void {
        this.log('Adding selection change listener');
        this.selectionChangeListeners.push(listener);
    }

    public getCurrentSelection(): SelectionState {
        this.log('Getting current selection', this.currentSelection);
        return this.currentSelection;
    }

    public setCurrentSelection(selection: SelectionState): void {
        this.log('Setting current selection', selection);

        if (!this.validateSelection(selection)) {
            this.logError('Invalid selection state, not updating', selection);
            return;
        }

        this.currentSelection = selection;
        this.notifySelectionChange();
    }

    private notifySelectionChange(): void {
        this.log('Notifying selection change listeners', {
            listenerCount: this.selectionChangeListeners.length
        });

        this.selectionChangeListeners.forEach((listener, index) => {
            try {
                this.log(`Executing listener ${index}`);
                listener(this.currentSelection);
            } catch (error) {
                this.logError(`Error in selection change listener ${index}:`, error);
            }
        });
    }
}