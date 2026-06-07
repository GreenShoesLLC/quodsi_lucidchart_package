import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { ISerializedRequirementClause } from './ISerializedRequirementClause';

export interface ISerializedResourceRequirement {
    id: string;
    name: string;
    type: SimulationObjectType;
    rootClauses: ISerializedRequirementClause[];
}