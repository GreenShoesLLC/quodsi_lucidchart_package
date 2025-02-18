import { ISerializedDuration } from './ISerializedDuration';

export interface ISerializedOperationStep {
    duration: ISerializedDuration;
    requirementId: string | null;
    quantity: number;
}