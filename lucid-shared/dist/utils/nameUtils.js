"use strict";
/**
 * Name utilities for ensuring unique simulation object names.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUniqueName = exports.generateUniqueName = void 0;
/**
 * Generates a unique name by appending a truncated element ID suffix.
 * @param baseName - The original name (e.g., "Triage")
 * @param elementId - The platform element ID to use as suffix
 * @param suffixLength - How many characters of ID to append (default: 6)
 * @returns Unique name like "Triage_a1b2c3"
 */
function generateUniqueName(baseName, elementId, suffixLength) {
    if (suffixLength === void 0) { suffixLength = 6; }
    var suffix = elementId.slice(-suffixLength);
    return "".concat(baseName, "_").concat(suffix);
}
exports.generateUniqueName = generateUniqueName;
/**
 * Ensures a name is unique for the given type, generating a suffixed
 * version if necessary.
 * @param model - The ModelDefinition to check against
 * @param type - The simulation object type
 * @param name - The desired name
 * @param elementId - The element ID for suffix generation
 * @returns The original name if unique, or a suffixed version
 */
function ensureUniqueName(model, type, name, elementId) {
    if (model.isNameUniqueForType(type, name)) {
        return name;
    }
    return generateUniqueName(name, elementId);
}
exports.ensureUniqueName = ensureUniqueName;
