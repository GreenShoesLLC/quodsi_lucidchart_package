"use strict";
/**
 * Canonical validation types for the Quodsi validation system.
 *
 * These types are used across the entire application:
 * - Shared library validation services
 * - Extension-to-React messaging protocol
 * - React UI components and state
 *
 * All other validation type definitions should import from here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationSeverity = void 0;
/**
 * Severity levels for validation issues.
 */
var ValidationSeverity;
(function (ValidationSeverity) {
    ValidationSeverity["ERROR"] = "error";
    ValidationSeverity["WARNING"] = "warning";
    ValidationSeverity["INFO"] = "info";
})(ValidationSeverity = exports.ValidationSeverity || (exports.ValidationSeverity = {}));
