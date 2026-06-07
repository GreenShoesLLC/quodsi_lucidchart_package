"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateListManager = void 0;
var ComponentListManager_1 = require("./ComponentListManager");
var SimulationObjectType_1 = require("./SimulationObjectType");
var ComponentType_1 = require("./ComponentType");
/**
 * List manager for State collections.
 *
 * Extends ComponentListManager to provide state-specific functionality
 * including filtering by component type and validation.
 */
var StateListManager = /** @class */ (function (_super) {
    __extends(StateListManager, _super);
    function StateListManager() {
        return _super.call(this, SimulationObjectType_1.SimulationObjectType.None) || this;
    }
    /**
     * Get all states for a specific component type.
     *
     * @param componentType ComponentType enum value
     * @returns Array of State objects for that component type
     */
    StateListManager.prototype.getByComponentType = function (componentType) {
        return this.getAll().filter(function (state) { return state.componentType === componentType; });
    };
    /**
     * Get state by unique ID.
     *
     * @param uniqueId The unique_id of the state to find
     * @returns State if found, undefined otherwise
     */
    StateListManager.prototype.getByUniqueId = function (uniqueId) {
        // First try direct lookup by id
        var state = this.get(uniqueId);
        if (state) {
            return state;
        }
        // Fall back to searching all states
        return this.getAll().find(function (s) { return s.id === uniqueId; });
    };
    /**
     * Get all entity state definitions.
     */
    StateListManager.prototype.getEntityStates = function () {
        return this.getByComponentType(ComponentType_1.ComponentType.ENTITY);
    };
    /**
     * Get all activity state definitions.
     */
    StateListManager.prototype.getActivityStates = function () {
        return this.getByComponentType(ComponentType_1.ComponentType.ACTIVITY);
    };
    /**
     * Get all resource state definitions.
     */
    StateListManager.prototype.getResourceStates = function () {
        return this.getByComponentType(ComponentType_1.ComponentType.RESOURCE);
    };
    /**
     * Get all model state definitions.
     */
    StateListManager.prototype.getModelStates = function () {
        return this.getByComponentType(ComponentType_1.ComponentType.MODEL);
    };
    /**
     * Add a state definition with validation for duplicate names.
     *
     * @param state State to add
     * @throws Error if state name conflicts with existing state of same component type
     */
    StateListManager.prototype.addWithValidation = function (state) {
        // Check for name conflicts within component type
        var existingStates = this.getByComponentType(state.componentType);
        var nameConflict = existingStates.find(function (s) { return s.name === state.name; });
        if (nameConflict) {
            throw new Error("State name '".concat(state.name, "' already exists for ").concat(state.componentType, " components"));
        }
        this.add(state);
    };
    /**
     * Check if a state with the given name exists for a component type.
     *
     * @param name State name to check
     * @param componentType Component type to check within
     * @returns True if a state with that name exists
     */
    StateListManager.prototype.hasStateWithName = function (name, componentType) {
        var states = this.getByComponentType(componentType);
        return states.some(function (s) { return s.name === name; });
    };
    /**
     * Get all states as a map keyed by unique ID.
     *
     * @returns Map of State objects keyed by their id
     */
    StateListManager.prototype.getAsMap = function () {
        var map = new Map();
        for (var _i = 0, _a = this.getAll(); _i < _a.length; _i++) {
            var state = _a[_i];
            map.set(state.id, state);
        }
        return map;
    };
    return StateListManager;
}(ComponentListManager_1.ComponentListManager));
exports.StateListManager = StateListManager;
