import { ISerializedModel } from '../../interfaces/ISerializedModel';

export interface ISerializedModelV1 extends ISerializedModel {
    // Version 1-specific additions can be added here
    formatVersion: '1.0';
}
