"use strict";
/**
 * NameParser - Parse structured data from shape names
 *
 * Supports YAML-like format: "key: value | key: value | key: value"
 * Falls back to using full text as name if format is not detected.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSimulationType = exports.extractEntityFields = exports.extractResourceFields = exports.extractGeneratorFields = exports.extractActivityFields = exports.parseStructuredName = void 0;
/**
 * Parse YAML-like structured name format
 * Format: "key: value | key: value | key: value"
 *
 * @param text - Raw text from shape name
 * @returns Parsed data with name and optional fields
 */
function parseStructuredName(text) {
    if (!text) {
        return { name: '' };
    }
    var trimmed = text.trim();
    // If no pipe character, treat entire text as name
    if (!trimmed.includes('|')) {
        return { name: trimmed };
    }
    var result = { name: '' };
    var pairs = trimmed.split('|');
    for (var _i = 0, pairs_1 = pairs; _i < pairs_1.length; _i++) {
        var pair = pairs_1[_i];
        var colonIndex = pair.indexOf(':');
        if (colonIndex === -1)
            continue;
        var key = pair.substring(0, colonIndex).trim().toLowerCase();
        var value = pair.substring(colonIndex + 1).trim();
        if (!key)
            continue;
        // Try to parse as number, otherwise keep as string
        var numValue = parseFloat(value);
        result[key] = isNaN(numValue) ? value : numValue;
    }
    // Ensure name is set - use first string value if no explicit 'name' key
    if (!result.name) {
        var firstKey = Object.keys(result).find(function (k) { return k !== 'name' && typeof result[k] === 'string'; });
        if (firstKey) {
            result.name = result[firstKey];
        }
    }
    return result;
}
exports.parseStructuredName = parseStructuredName;
/**
 * Extract Activity-specific fields from parsed data
 */
function extractActivityFields(parsed) {
    var _a, _b;
    return {
        name: parsed.name || '',
        duration: parsed.duration,
        capacity: parsed.capacity,
        inboundQueueCapacity: ((_a = parsed.inboundQueue) !== null && _a !== void 0 ? _a : parsed.inbound),
        outboundQueueCapacity: ((_b = parsed.outboundQueue) !== null && _b !== void 0 ? _b : parsed.outbound),
        resource: parsed.resource,
    };
}
exports.extractActivityFields = extractActivityFields;
/**
 * Extract Generator-specific fields from parsed data
 */
function extractGeneratorFields(parsed) {
    var _a, _b;
    return {
        name: parsed.name || '',
        interval: parsed.interval,
        entitiesPerCreation: ((_a = parsed.entities) !== null && _a !== void 0 ? _a : parsed.batch),
        maxEntities: ((_b = parsed.max) !== null && _b !== void 0 ? _b : parsed.maxentities),
        periodicOccurrences: parsed.occurrences,
    };
}
exports.extractGeneratorFields = extractGeneratorFields;
/**
 * Extract Resource-specific fields from parsed data
 */
function extractResourceFields(parsed) {
    return {
        name: parsed.name || '',
        capacity: parsed.capacity,
    };
}
exports.extractResourceFields = extractResourceFields;
/**
 * Extract Entity-specific fields from parsed data
 */
function extractEntityFields(parsed) {
    return {
        name: parsed.name || '',
    };
}
exports.extractEntityFields = extractEntityFields;
/**
 * Extract and normalize simulation type from parsed data.
 * Supports aliases: type, t
 * Normalizes values: resource/res/r, activity/act/a, generator/gen/g, entity/ent/e
 *
 * @param parsed - Parsed name data
 * @returns Normalized type name or undefined if not specified/recognized
 */
function extractSimulationType(parsed) {
    var _a;
    var typeValue = (_a = parsed.type) !== null && _a !== void 0 ? _a : parsed.t;
    if (!typeValue || typeof typeValue !== 'string') {
        return undefined;
    }
    var normalized = typeValue.toLowerCase().trim();
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
exports.extractSimulationType = extractSimulationType;
