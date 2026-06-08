
import { SimulationObjectType } from '@quodsi/shared';
/**
 * Information about a block's analysis
 */
export interface BlockAnalysis {
    incomingCount: number;
    outgoingCount: number;
    elementType?: SimulationObjectType;
}