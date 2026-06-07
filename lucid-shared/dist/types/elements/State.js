"use strict";
/**
 * State class for defining state structure and constraints.
 *
 * This module provides the State class that serves as the template
 * from which StateInstances are created during simulation runtime.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategoryState = exports.createBooleanState = exports.createStringState = exports.createNumberState = exports.State = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var ComponentType_1 = require("./ComponentType");
var StateType_1 = require("./StateType");
var StateOperation_1 = require("./StateOperation");
/**
 * Definition of a state that can be attached to simulation components.
 *
 * State serves as the template from which StateInstances are created
 * during simulation runtime. It defines the structure, constraints, and
 * initial values for state data.
 */
var State = /** @class */ (function () {
    function State(id, name, componentType, dataType, initialValue, options) {
        var _a;
        this.type = SimulationObjectType_1.SimulationObjectType.None;
        /**
         * Whether to track changes for statistics (Phase 2+ feature)
         */
        this.collectStatistics = true;
        this.id = id;
        this.name = name;
        this.componentType = componentType;
        this.dataType = dataType;
        this.initialValue = initialValue;
        this.categoryValues = options === null || options === void 0 ? void 0 : options.categoryValues;
        this.description = options === null || options === void 0 ? void 0 : options.description;
        this.collectStatistics = (_a = options === null || options === void 0 ? void 0 : options.collectStatistics) !== null && _a !== void 0 ? _a : true;
        this.validate();
    }
    /**
     * Validate state definition for consistency and correctness.
     *
     * @throws Error if validation fails with descriptive error message
     */
    State.prototype.validate = function () {
        // Name validation
        if (!this.name) {
            throw new Error("State name cannot be empty");
        }
        if (!this.isValidIdentifier(this.name)) {
            throw new Error("State name '".concat(this.name, "' must be a valid identifier ") +
                "(start with letter/underscore, contain only letters/digits/underscores)");
        }
        // Initial value must match data type
        this.validateInitialValue();
        // Category-specific validation
        if (this.dataType === StateType_1.StateType.CATEGORY) {
            this.validateCategoryConstraints();
        }
    };
    /**
     * Check if a name is a valid identifier.
     */
    State.prototype.isValidIdentifier = function (name) {
        // Must start with letter or underscore
        // Can contain letters, digits, underscores
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    };
    /**
     * Validate that initial_value matches the declared data_type.
     *
     * @throws Error if initial value type doesn't match data_type
     */
    State.prototype.validateInitialValue = function () {
        var _this = this;
        var isValid = (function () {
            switch (_this.dataType) {
                case StateType_1.StateType.NUMBER:
                    return typeof _this.initialValue === 'number';
                case StateType_1.StateType.STRING:
                    return typeof _this.initialValue === 'string';
                case StateType_1.StateType.BOOLEAN:
                    return typeof _this.initialValue === 'boolean';
                case StateType_1.StateType.CATEGORY:
                    return typeof _this.initialValue === 'string';
                default:
                    return false;
            }
        })();
        if (!isValid) {
            var expectedType = (function () {
                switch (_this.dataType) {
                    case StateType_1.StateType.NUMBER: return "number";
                    case StateType_1.StateType.STRING: return "string";
                    case StateType_1.StateType.BOOLEAN: return "boolean";
                    case StateType_1.StateType.CATEGORY: return "string";
                    default: return "unknown";
                }
            })();
            throw new Error("".concat(this.dataType, " state '").concat(this.name, "' initial_value ") +
                "must be ".concat(expectedType, ", got ").concat(typeof this.initialValue));
        }
    };
    /**
     * Validate category-specific constraints for CATEGORY states.
     *
     * @throws Error if category constraints are invalid
     */
    State.prototype.validateCategoryConstraints = function () {
        var _this = this;
        if (!this.categoryValues) {
            throw new Error("CATEGORY state '".concat(this.name, "' must specify categoryValues array"));
        }
        if (!Array.isArray(this.categoryValues)) {
            throw new Error("CATEGORY state '".concat(this.name, "' categoryValues must be an array"));
        }
        if (this.categoryValues.length < 2) {
            throw new Error("CATEGORY state '".concat(this.name, "' must have at least 2 categoryValues, ") +
                "got ".concat(this.categoryValues.length));
        }
        // Check for duplicates
        var uniqueValues = new Set(this.categoryValues);
        if (uniqueValues.size !== this.categoryValues.length) {
            var duplicates = this.categoryValues.filter(function (val, idx) { return _this.categoryValues.indexOf(val) !== idx; });
            throw new Error("CATEGORY state '".concat(this.name, "' has duplicate categoryValues: ").concat(duplicates.join(', ')));
        }
        // All category values must be strings
        var nonStrings = this.categoryValues.filter(function (val) { return typeof val !== 'string'; });
        if (nonStrings.length > 0) {
            throw new Error("CATEGORY state '".concat(this.name, "' categoryValues must all be strings, ") +
                "found non-strings: ".concat(nonStrings.join(', ')));
        }
        // Initial value must be in category list
        if (!this.categoryValues.includes(this.initialValue)) {
            throw new Error("CATEGORY state '".concat(this.name, "' initialValue '").concat(this.initialValue, "' ") +
                "not in categoryValues [".concat(this.categoryValues.join(', '), "]"));
        }
    };
    /**
     * Check if this state supports arithmetic operations.
     *
     * @returns True if arithmetic operations (+=, -=, *=, /=) are supported
     */
    State.prototype.isArithmeticSupported = function () {
        return this.dataType === StateType_1.StateType.NUMBER;
    };
    /**
     * Get list of operation symbols supported by this state.
     *
     * @returns Array of operation symbols this state type supports
     */
    State.prototype.getSupportedOperations = function () {
        if (this.dataType === StateType_1.StateType.NUMBER) {
            return [
                StateOperation_1.StateOperation.ASSIGN,
                StateOperation_1.StateOperation.ADD,
                StateOperation_1.StateOperation.SUBTRACT,
                StateOperation_1.StateOperation.MULTIPLY,
                StateOperation_1.StateOperation.DIVIDE
            ];
        }
        else {
            return [StateOperation_1.StateOperation.ASSIGN];
        }
    };
    /**
     * Validate that a value is compatible with this state definition.
     *
     * @param value The value to validate
     * @returns True if the value is valid for this state
     * @throws Error if the value is invalid with descriptive message
     */
    State.prototype.validateValue = function (value) {
        // Type validation
        if (this.dataType === StateType_1.StateType.NUMBER) {
            if (typeof value !== 'number') {
                throw new Error("NUMBER state '".concat(this.name, "' requires number value, ") +
                    "got ".concat(typeof value));
            }
        }
        else if (this.dataType === StateType_1.StateType.STRING) {
            if (typeof value !== 'string') {
                throw new Error("STRING state '".concat(this.name, "' requires string value, ") +
                    "got ".concat(typeof value));
            }
        }
        else if (this.dataType === StateType_1.StateType.BOOLEAN) {
            if (typeof value !== 'boolean') {
                throw new Error("BOOLEAN state '".concat(this.name, "' requires boolean value, ") +
                    "got ".concat(typeof value));
            }
        }
        else if (this.dataType === StateType_1.StateType.CATEGORY) {
            if (typeof value !== 'string') {
                throw new Error("CATEGORY state '".concat(this.name, "' requires string value, ") +
                    "got ".concat(typeof value));
            }
            if (this.categoryValues && !this.categoryValues.includes(value)) {
                throw new Error("CATEGORY state '".concat(this.name, "' value '").concat(value, "' not in ") +
                    "categoryValues [".concat(this.categoryValues.join(', '), "]"));
            }
        }
        return true;
    };
    /**
     * Serialize State to plain object for JSON export.
     *
     * @returns Plain object representation of the State
     */
    State.prototype.toJSON = function () {
        var result = {
            id: this.id,
            name: this.name,
            componentType: this.componentType,
            dataType: this.dataType,
            initialValue: this.initialValue
        };
        // Add optional fields only if they have non-default values
        if (this.categoryValues !== undefined) {
            result.categoryValues = this.categoryValues;
        }
        if (this.description !== undefined) {
            result.description = this.description;
        }
        if (!this.collectStatistics) { // Only if not default (true)
            result.collectStatistics = this.collectStatistics;
        }
        return result;
    };
    /**
     * Deserialize State from plain object (from JSON import).
     *
     * @param data Plain object containing State data
     * @returns New State instance
     * @throws Error if required fields are missing or invalid
     */
    State.fromJSON = function (data) {
        var _a;
        // Extract required fields
        if (!data.id) {
            throw new Error("Missing required field 'id' in State data");
        }
        if (!data.name) {
            throw new Error("Missing required field 'name' in State data");
        }
        if (!data.componentType) {
            throw new Error("Missing required field 'componentType' in State data");
        }
        if (!data.dataType) {
            throw new Error("Missing required field 'dataType' in State data");
        }
        if (data.initialValue === undefined || data.initialValue === null) {
            throw new Error("Missing required field 'initialValue' in State data");
        }
        // Convert enum strings
        var componentType = data.componentType;
        var dataType = data.dataType;
        // Validate enums
        if (!Object.values(ComponentType_1.ComponentType).includes(componentType)) {
            throw new Error("Invalid componentType '".concat(data.componentType, "' in State data"));
        }
        if (!Object.values(StateType_1.StateType).includes(dataType)) {
            throw new Error("Invalid dataType '".concat(data.dataType, "' in State data"));
        }
        // Create instance (validation happens in constructor)
        return new State(data.id, data.name, componentType, dataType, data.initialValue, {
            categoryValues: data.categoryValues,
            description: data.description,
            collectStatistics: (_a = data.collectStatistics) !== null && _a !== void 0 ? _a : true
        });
    };
    State.prototype.toString = function () {
        return "State(name='".concat(this.name, "', componentType=").concat(this.componentType, ", dataType=").concat(this.dataType, ", initialValue=").concat(this.initialValue, ")");
    };
    return State;
}());
exports.State = State;
/**
 * Convenience function to create a NUMBER state.
 */
function createNumberState(id, name, componentType, initialValue, description) {
    if (initialValue === void 0) { initialValue = 0; }
    return new State(id, name, componentType, StateType_1.StateType.NUMBER, initialValue, { description: description });
}
exports.createNumberState = createNumberState;
/**
 * Convenience function to create a STRING state.
 */
function createStringState(id, name, componentType, initialValue, description) {
    if (initialValue === void 0) { initialValue = ""; }
    return new State(id, name, componentType, StateType_1.StateType.STRING, initialValue, { description: description });
}
exports.createStringState = createStringState;
/**
 * Convenience function to create a BOOLEAN state.
 */
function createBooleanState(id, name, componentType, initialValue, description) {
    if (initialValue === void 0) { initialValue = false; }
    return new State(id, name, componentType, StateType_1.StateType.BOOLEAN, initialValue, { description: description });
}
exports.createBooleanState = createBooleanState;
/**
 * Convenience function to create a CATEGORY state.
 */
function createCategoryState(id, name, componentType, categoryValues, initialValue, description) {
    if (!categoryValues || categoryValues.length === 0) {
        throw new Error("categoryValues cannot be empty");
    }
    var initValue = initialValue !== null && initialValue !== void 0 ? initialValue : categoryValues[0];
    return new State(id, name, componentType, StateType_1.StateType.CATEGORY, initValue, { categoryValues: categoryValues, description: description });
}
exports.createCategoryState = createCategoryState;
