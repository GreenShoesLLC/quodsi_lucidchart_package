import { ModelElement } from './ModelElement';

export interface ModelStructure {
    elements: ModelElement[];
    hierarchy: Record<string, string[]>; // parent -> children mapping
}