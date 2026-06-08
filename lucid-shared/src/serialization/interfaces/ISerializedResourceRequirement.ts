import { SimulationObjectType } from '@quodsi/shared';
import { ISerializedRequirementClause } from './ISerializedRequirementClause';

export interface ISerializedResourceRequirement {
    id: string;
    name: string;
    type: SimulationObjectType;
    rootClauses: ISerializedRequirementClause[];
}