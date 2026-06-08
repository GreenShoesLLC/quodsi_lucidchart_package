import { EnumMapper } from './EnumMapper';
import { SimulationObjectType } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { DurationType } from '@quodsi/shared';
import { RequirementMode } from '@quodsi/shared';
import { SimulationTimeType } from '@quodsi/shared';

// Single instance for each enum type
export const Mappers = {
    SimulationObjectType: new EnumMapper(SimulationObjectType),
    PeriodUnit: new EnumMapper(PeriodUnit),
    DurationType: new EnumMapper(DurationType),
    RequirementMode: new EnumMapper(RequirementMode),
    SimulationTimeType: new EnumMapper(SimulationTimeType)
};

// Type-safe accessor for the mappers
export type MapperType = keyof typeof Mappers;

// Helper function to get a specific mapper
export function getMapper<T extends MapperType>(type: T): typeof Mappers[T] {
    return Mappers[type];
}
