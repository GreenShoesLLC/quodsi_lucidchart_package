// services/simulationData/collectionUpdater.ts
import { SerializedFields } from 'lucid-extension-sdk';
import { conditionalWarn } from './storageService';

/**
 * Prepares a collection update for Lucid
 * @param data Array of data items to include in the update
 * @param schema Schema definition for the collection
 * @param idFieldOrFunction String field name or function that returns the ID for an item
 * @returns Collection update object for Lucid client.update()
 */
export function prepareCollectionUpdate<T>(
    data: T[],
    schema: any,
    idFieldOrFunction: string | ((item: T) => string) = 'Id'
): { schema: any; patch: { items: Map<string, SerializedFields> } } {
    const items = new Map<string, SerializedFields>();

    data.forEach(item => {
        let id: string;
        
        // Handle both string id field and function that generates an id
        if (typeof idFieldOrFunction === 'function') {
            id = idFieldOrFunction(item);
        } else {
            id = (item as any)[idFieldOrFunction];
        }
        
        if (!id) {
            conditionalWarn(`Item missing ID:`, item);
            return;
        }

        const quotedId = `"${id}"`;
        
        // Convert to serialized fields
        const serialized: SerializedFields = {};
        Object.entries(item as object).forEach(([key, value]) => {
            serialized[key] = value;
        });

        items.set(quotedId, serialized);
    });

    return {
        schema,
        patch: {
            items
        }
    };
}
