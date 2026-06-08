import { SimulationObjectType } from '@quodsi/shared';

export interface ModelElement {
    id: string;
    name: string;
    type: SimulationObjectType;
    hasChildren: boolean;
    children?: ModelElement[];
}