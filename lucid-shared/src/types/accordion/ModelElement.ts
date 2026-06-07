import { SimulationObjectType } from '../elements/SimulationObjectType';

export interface ModelElement {
    id: string;
    name: string;
    type: SimulationObjectType;
    hasChildren: boolean;
    children?: ModelElement[];
}