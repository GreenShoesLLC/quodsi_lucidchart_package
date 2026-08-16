import { ComponentType, StateType } from '@quodsi/shared';

/**
 * Serialized representation of a State definition. Field names unchanged by
 * wire-cleanup Phase B2 — only the `componentType`/`dataType` ENUM VALUES
 * flipped to clean lowercase spellings (Task 3), which `ComponentType`/
 * `StateType` (imported from `@quodsi/shared`) already carry.
 */
export interface ISerializedState {
    id: string;
    name: string;
    componentType: ComponentType;
    dataType: StateType;
    initialValue: number | string | boolean;
    categoryValues?: string[];
    description?: string;
    collectStatistics: boolean;
}
