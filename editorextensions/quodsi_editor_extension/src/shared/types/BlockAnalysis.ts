
import { SimulationObjectType } from '../../shared/types/elements/enums/simulationObjectType';
/**
 * Information about a block's analysis
 */
export interface BlockAnalysis {
    incomingCount: number;
    outgoingCount: number;
    elementType?: SimulationObjectType;
}