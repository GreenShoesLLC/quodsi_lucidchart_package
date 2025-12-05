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
export function parseStructuredName(text: string): ParsedNameData {
    if (!text) {
        return { name: '' };
    }

    const trimmed = text.trim();

    // If no pipe character, treat entire text as name
    if (!trimmed.includes('|')) {
        return { name: trimmed };
    }

    const result: ParsedNameData = { name: '' };
    const pairs = trimmed.split('|');

    for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) continue;

        const key = pair.substring(0, colonIndex).trim().toLowerCase();
        const value = pair.substring(colonIndex + 1).trim();

        if (!key) continue;

        // Try to parse as number, otherwise keep as string
        const numValue = parseFloat(value);
        result[key] = isNaN(numValue) ? value : numValue;
    }

    // Ensure name is set - use first string value if no explicit 'name' key
    if (!result.name) {
        const firstKey = Object.keys(result).find(k => k !== 'name' && typeof result[k] === 'string');
        if (firstKey) {
            result.name = result[firstKey] as string;
        }
    }

    return result;
}

/**
 * Activity-specific parsed fields
 */
export interface ActivityParsedFields {
    name: string;
    duration?: number;
    capacity?: number;
    inputBufferCapacity?: number;
    outputBufferCapacity?: number;
    resource?: string;  // Resource name to auto-create and link
}

/**
 * Extract Activity-specific fields from parsed data
 */
export function extractActivityFields(parsed: ParsedNameData): ActivityParsedFields {
    return {
        name: parsed.name || '',
        duration: parsed.duration as number | undefined,
        capacity: parsed.capacity as number | undefined,
        inputBufferCapacity: (parsed.inputbuffer ?? parsed.input) as number | undefined,
        outputBufferCapacity: (parsed.outputbuffer ?? parsed.output) as number | undefined,
        resource: parsed.resource as string | undefined,
    };
}

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
export function extractGeneratorFields(parsed: ParsedNameData): GeneratorParsedFields {
    return {
        name: parsed.name || '',
        interval: parsed.interval as number | undefined,
        entitiesPerCreation: (parsed.entities ?? parsed.batch) as number | undefined,
        maxEntities: (parsed.max ?? parsed.maxentities) as number | undefined,
        periodicOccurrences: parsed.occurrences as number | undefined,
    };
}

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
export function extractResourceFields(parsed: ParsedNameData): ResourceParsedFields {
    return {
        name: parsed.name || '',
        capacity: parsed.capacity as number | undefined,
    };
}

/**
 * Entity-specific parsed fields
 */
export interface EntityParsedFields {
    name: string;
}

/**
 * Extract Entity-specific fields from parsed data
 */
export function extractEntityFields(parsed: ParsedNameData): EntityParsedFields {
    return {
        name: parsed.name || '',
    };
}

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
export function extractSimulationType(parsed: ParsedNameData): SimulationTypeName | undefined {
    const typeValue = parsed.type ?? parsed.t;
    if (!typeValue || typeof typeValue !== 'string') {
        return undefined;
    }

    const normalized = typeValue.toLowerCase().trim();

    // Check for resource aliases
    if (['resource', 'res', 'r'].includes(normalized)) {
        return 'resource';
    }

    // Check for activity aliases
    if (['activity', 'act', 'a'].includes(normalized)) {
        return 'activity';
    }

    // Check for generator aliases
    if (['generator', 'gen', 'g'].includes(normalized)) {
        return 'generator';
    }

    // Check for entity aliases
    if (['entity', 'ent', 'e'].includes(normalized)) {
        return 'entity';
    }

    return undefined;
}
