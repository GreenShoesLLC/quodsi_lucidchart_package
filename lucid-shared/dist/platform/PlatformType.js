"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlatformType = exports.PlatformType = void 0;
/**
 * Enumeration of supported diagram/design platforms
 */
var PlatformType;
(function (PlatformType) {
    PlatformType["Lucid"] = "Lucid";
    PlatformType["Miro"] = "Miro";
    PlatformType["Canva"] = "Canva";
})(PlatformType = exports.PlatformType || (exports.PlatformType = {}));
/**
 * Type guard to check if a string is a valid PlatformType
 */
function isPlatformType(value) {
    return Object.values(PlatformType).includes(value);
}
exports.isPlatformType = isPlatformType;
