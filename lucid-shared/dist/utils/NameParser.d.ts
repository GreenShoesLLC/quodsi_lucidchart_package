/**
 * NameParser - Parse structured data from shape names
 *
 * Supports YAML-like format: "key: value | key: value | key: value"
 * Falls back to using full text as name if format is not detected.
 */
/**
 * Parsed result from a structured name string
 */
export interface ParsedNameData {
    name: string;
    [key: string]: string | number | undefined;
}
/**
 * Parse YAML-like structured name format
 * Format: "key: value | key: value | key: value"
 *
 * @param text - Raw text from shape name
 * @returns Parsed data with name and optional fields
 */
export declare function parseStructuredName(text: string): ParsedNameData;
/**
 * Activity-specific parsed fields
 */
export interface ActivityParsedFields {
    name: string;
    duration?: number;
    capacity?: number;
    inboundQueueCapacity?: number;
    outboundQueueCapacity?: number;
    resource?: string;
}
/**
 * Extract Activity-specific fields from parsed data
 */
export declare function extractActivityFields(parsed: ParsedNameData): ActivityParsedFields;
/**
 * Generator-specific parsed fields
 */
export interface GeneratorParsedFields {
    name: string;
    interval?: number;
    entitiesPerCreation?: number;
    maxEntities?: number;
    periodicOccurrences?: number;
}
/**
 * Extract Generator-specific fields from parsed data
 */
export declare function extractGeneratorFields(parsed: ParsedNameData): GeneratorParsedFields;
/**
 * Resource-specific parsed fields
 */
export interface ResourceParsedFields {
    name: string;
    capacity?: number;
}
/**
 * Extract Resource-specific fields from parsed data
 */
export declare function extractResourceFields(parsed: ParsedNameData): ResourceParsedFields;
/**
 * Entity-specific parsed fields
 */
export interface EntityParsedFields {
    name: string;
}
/**
 * Extract Entity-specific fields from parsed data
 */
export declare function extractEntityFields(parsed: ParsedNameData): EntityParsedFields;
/**
 * Normalized simulation type values
 */
export type SimulationTypeName = 'resource' | 'activity' | 'generator' | 'entity';
/**
 * Extract and normalize simulation type from parsed data.
 * Supports aliases: type, t
 * Normalizes values: resource/res/r, activity/act/a, generator/gen/g, entity/ent/e
 *
 * @param parsed - Parsed name data
 * @returns Normalized type name or undefined if not specified/recognized
 */
export declare function extractSimulationType(parsed: ParsedNameData): SimulationTypeName | undefined;
//# sourceMappingURL=NameParser.d.ts.map