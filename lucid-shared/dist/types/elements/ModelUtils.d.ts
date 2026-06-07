import { Model } from "./Model";
declare global {
    interface Window {
        crypto: Crypto;
    }
}
export declare class ModelUtils {
    /**
     * Generates a UUID for the model
     */
    private static generateUUID;
    /**
     * Creates a new default model instance with a UUID
     */
    static createNew(name?: string): Model;
    /**
     * Creates a complete Model object with default values for all optional fields
     */
    static createWithDefaults(partialModel: Partial<Model>): Model;
    static validate(model: Model): Model;
    static isComplete(model: Partial<Model>): model is Model;
}
//# sourceMappingURL=ModelUtils.d.ts.map