import { EnumMapper } from './EnumMapper';
import { SimulationObjectType } from '../../types/elements/SimulationObjectType';
import { PeriodUnit } from '../../types/elements/PeriodUnit';
import { DurationType } from '../../types/elements/DurationType';
import { RequirementMode } from '../../types/elements/RequirementMode';
import { SimulationTimeType } from '../../types/elements/SimulationTimeType';
export declare const Mappers: {
    SimulationObjectType: EnumMapper<typeof SimulationObjectType>;
    PeriodUnit: EnumMapper<typeof PeriodUnit>;
    DurationType: EnumMapper<typeof DurationType>;
    RequirementMode: EnumMapper<typeof RequirementMode>;
    SimulationTimeType: EnumMapper<typeof SimulationTimeType>;
};
export type MapperType = keyof typeof Mappers;
export declare function getMapper<T extends MapperType>(type: T): typeof Mappers[T];
//# sourceMappingURL=EnumMappers.d.ts.map