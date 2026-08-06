import { ISerializedModel } from '../../interfaces/ISerializedModel';

// V1 currently adds nothing over the canonical flat document shape (formatVersion
// dropped 2026.08.20 — schemaVersion/metadata.version carry the wire-format
// stamp; see BaseModelDefinitionSerializer.getVersion() doc comment).
export type ISerializedModelV1 = ISerializedModel;
