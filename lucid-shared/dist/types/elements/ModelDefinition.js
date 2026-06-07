"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelDefinition = void 0;
var ActivityListManager_1 = require("./ActivityListManager");
var ConnectorListManager_1 = require("./ConnectorListManager");
var Entity_1 = require("./Entity");
var EntityListManager_1 = require("./EntityListManager");
var GeneratorListManager_1 = require("./GeneratorListManager");
var ModelDefaults_1 = require("./ModelDefaults");
var ResourceListManager_1 = require("./ResourceListManager");
var ResourceRequirementListManager_1 = require("./ResourceRequirementListManager");
var StateListManager_1 = require("./StateListManager");
var ComponentType_1 = require("./ComponentType");
var TimePatternListManager_1 = require("./TimePatternListManager");
var TimeDistributedConfigListManager_1 = require("./TimeDistributedConfigListManager");
var SimulationObjectType_1 = require("./SimulationObjectType");
var ScenarioListManager_1 = require("./ScenarioListManager");
var ModelDefinition = /** @class */ (function () {
    function ModelDefinition(model) {
        this.model = model;
        this.activities = new ActivityListManager_1.ActivityListManager();
        this.connectors = new ConnectorListManager_1.ConnectorListManager();
        this.resources = new ResourceListManager_1.ResourceListManager();
        this.resourceRequirements = new ResourceRequirementListManager_1.ResourceRequirementListManager();
        this.generators = new GeneratorListManager_1.GeneratorListManager();
        this.entities = new EntityListManager_1.EntityListManager();
        this.states = new StateListManager_1.StateListManager();
        this.timePatterns = new TimePatternListManager_1.TimePatternListManager();
        this.timeDistributedConfigs = new TimeDistributedConfigListManager_1.TimeDistributedConfigListManager();
        this.scenarios = new ScenarioListManager_1.ScenarioListManager();
        // Add default entity
        var defaultEntity = new Entity_1.Entity(ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_ID, ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_NAME);
        this.entities.add(defaultEntity);
    }
    Object.defineProperty(ModelDefinition.prototype, "id", {
        get: function () { return this.model.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ModelDefinition.prototype, "name", {
        get: function () { return this.model.name; },
        enumerable: false,
        configurable: true
    });
    /**
     * Get all states for a specific component type.
     */
    ModelDefinition.prototype.getStatesByComponentType = function (componentType) {
        return this.states.getByComponentType(componentType);
    };
    /**
     * Get all entity state definitions.
     */
    ModelDefinition.prototype.getEntityStateDefinitions = function () {
        return this.states.getEntityStates();
    };
    /**
     * Get all activity state definitions.
     */
    ModelDefinition.prototype.getActivityStateDefinitions = function () {
        return this.states.getActivityStates();
    };
    /**
     * Get all resource state definitions.
     */
    ModelDefinition.prototype.getResourceStateDefinitions = function () {
        return this.states.getResourceStates();
    };
    /**
     * Get all model state definitions.
     */
    ModelDefinition.prototype.getModelStateDefinitions = function () {
        return this.states.getModelStates();
    };
    /**
     * Get a state definition by its unique_id.
     */
    ModelDefinition.prototype.getStateByUniqueId = function (uniqueId) {
        return this.states.getByUniqueId(uniqueId);
    };
    /**
     * Add a state definition to the model.
     *
     * @throws Error if state name conflicts with existing state of same component type
     */
    ModelDefinition.prototype.addStateDefinition = function (state) {
        this.states.addWithValidation(state);
    };
    /**
     * Validate a list of StateModification objects against this model's state definitions.
     *
     * @throws Error if any modification is invalid
     */
    ModelDefinition.prototype.validateStateModifications = function (stateModifications) {
        // Create lookup map of all states by unique_id
        var availableStates = this.states.getAsMap();
        for (var _i = 0, stateModifications_1 = stateModifications; _i < stateModifications_1.length; _i++) {
            var modification = stateModifications_1[_i];
            modification.validate(availableStates);
        }
    };
    /**
     * Validate all state definitions for consistency and correctness.
     *
     * @throws Error if validation fails
     */
    ModelDefinition.prototype.validateStateDefinitions = function () {
        if (this.states.size() === 0) {
            return; // No states to validate
        }
        // Validate each state definition
        for (var _i = 0, _a = this.states.getAll(); _i < _a.length; _i++) {
            var state = _a[_i];
            state.validate();
        }
        // Check for duplicate state names within component types
        var componentStateNames = new Map();
        componentStateNames.set(ComponentType_1.ComponentType.MODEL, new Set());
        componentStateNames.set(ComponentType_1.ComponentType.ENTITY, new Set());
        componentStateNames.set(ComponentType_1.ComponentType.ACTIVITY, new Set());
        componentStateNames.set(ComponentType_1.ComponentType.RESOURCE, new Set());
        for (var _b = 0, _c = this.states.getAll(); _b < _c.length; _b++) {
            var state = _c[_b];
            var nameSet = componentStateNames.get(state.componentType);
            if (nameSet.has(state.name)) {
                throw new Error("Duplicate state name '".concat(state.name, "' found for ").concat(state.componentType, " components"));
            }
            nameSet.add(state.name);
        }
    };
    /**
     * Validate all state references throughout model.
     *
     * @throws Error if validation fails
     */
    ModelDefinition.prototype.validateStateReferences = function () {
        var _a;
        // Build state lookup by unique_id
        var stateLookup = this.states.getAsMap();
        // Validate generator initial state modifications
        for (var _i = 0, _b = this.generators.getAll(); _i < _b.length; _i++) {
            var generator = _b[_i];
            var mods = (_a = generator.generationConfig) === null || _a === void 0 ? void 0 : _a.initialStateModifications;
            if (mods && mods.length > 0) {
                this.validateComponentStateModifications(mods, stateLookup, "Generator '".concat(generator.name, "'"));
            }
        }
        // Validate activity action state modifications
        for (var _c = 0, _d = this.activities.getAll(); _c < _d.length; _c++) {
            var activity = _d[_c];
            // Validate action state modifications (for actions that support them)
            for (var _e = 0, _f = activity.actions; _e < _f.length; _e++) {
                var action = _f[_e];
                if ('stateModifications' in action && action.stateModifications && action.stateModifications.length > 0) {
                    this.validateComponentStateModifications(action.stateModifications, stateLookup, "Action in Activity '".concat(activity.name, "'"));
                }
            }
        }
        // Validate connector state modifications
        for (var _g = 0, _h = this.connectors.getAll(); _g < _h.length; _g++) {
            var connector = _h[_g];
            if (connector.stateModifications && connector.stateModifications.length > 0) {
                this.validateComponentStateModifications(connector.stateModifications, stateLookup, "Connector '".concat(connector.name, "'"));
            }
        }
    };
    /**
     * Validate state modifications for a specific component.
     *
     * @private
     */
    ModelDefinition.prototype.validateComponentStateModifications = function (modifications, stateLookup, componentName) {
        for (var _i = 0, modifications_1 = modifications; _i < modifications_1.length; _i++) {
            var modification = modifications_1[_i];
            var state = stateLookup.get(modification.stateUniqueId);
            if (!state) {
                throw new Error("".concat(componentName, " references unknown state unique_id: ").concat(modification.stateUniqueId));
            }
            // Validate the modification against the state definition
            modification.validate(stateLookup);
        }
    };
    /**
     * Validate cross-component state access permissions.
     *
     * @throws Error if validation fails
     */
    ModelDefinition.prototype.validateCrossComponentAccess = function () {
        // This validates that referenced components exist when using cross-component state modifications
        // Currently validates action state modifications and connector state modifications
        for (var _i = 0, _a = this.activities.getAll(); _i < _a.length; _i++) {
            var activity = _a[_i];
            for (var _b = 0, _c = activity.actions; _b < _c.length; _b++) {
                var action = _c[_b];
                if ('stateModifications' in action && action.stateModifications) {
                    for (var _d = 0, _e = action.stateModifications; _d < _e.length; _d++) {
                        var modification = _e[_d];
                        if (modification.componentUniqueId) {
                            this.validateComponentReference(modification);
                        }
                    }
                }
            }
        }
        for (var _f = 0, _g = this.connectors.getAll(); _f < _g.length; _f++) {
            var connector = _g[_f];
            if (connector.stateModifications) {
                for (var _h = 0, _j = connector.stateModifications; _h < _j.length; _h++) {
                    var modification = _j[_h];
                    if (modification.componentUniqueId) {
                        this.validateComponentReference(modification);
                    }
                }
            }
        }
    };
    /**
     * Validate that referenced component exists.
     *
     * @private
     */
    ModelDefinition.prototype.validateComponentReference = function (modification) {
        var state = this.states.getByUniqueId(modification.stateUniqueId);
        if (!state) {
            return; // Already caught by validateStateReferences
        }
        var componentUniqueId = modification.componentUniqueId;
        var componentType = state.componentType;
        if (componentType === ComponentType_1.ComponentType.RESOURCE) {
            var resource = this.resources.get(componentUniqueId);
            if (!resource) {
                throw new Error("State modification references non-existent resource '".concat(componentUniqueId, "'"));
            }
        }
        else if (componentType === ComponentType_1.ComponentType.ACTIVITY) {
            var activity = this.activities.get(componentUniqueId);
            if (!activity) {
                throw new Error("State modification references non-existent activity '".concat(componentUniqueId, "'"));
            }
        }
    };
    /**
     * Checks if a name is unique among objects of the given type.
     * @param type - The simulation object type to check within
     * @param name - The name to check
     * @param excludeId - Optional ID to exclude (for editing existing objects)
     * @returns true if the name is unique, false if it conflicts
     */
    ModelDefinition.prototype.isNameUniqueForType = function (type, name, excludeId) {
        var objects = this.getObjectsByType(type);
        return !objects.some(function (obj) { return obj.name === name && obj.id !== excludeId; });
    };
    /**
     * Gets all names currently in use for a given type.
     * @param type - The simulation object type
     * @returns Array of names in use
     */
    ModelDefinition.prototype.getUsedNamesForType = function (type) {
        return this.getObjectsByType(type).map(function (obj) { return obj.name; });
    };
    /**
     * Gets all objects of a given type.
     * @param type - The simulation object type
     * @returns Array of simulation objects
     */
    ModelDefinition.prototype.getObjectsByType = function (type) {
        switch (type) {
            case SimulationObjectType_1.SimulationObjectType.Activity:
                return this.activities.getAll();
            case SimulationObjectType_1.SimulationObjectType.Resource:
                return this.resources.getAll();
            case SimulationObjectType_1.SimulationObjectType.Generator:
                return this.generators.getAll();
            case SimulationObjectType_1.SimulationObjectType.Entity:
                return this.entities.getAll();
            case SimulationObjectType_1.SimulationObjectType.Connector:
                return this.connectors.getAll();
            default:
                return [];
        }
    };
    return ModelDefinition;
}());
exports.ModelDefinition = ModelDefinition;
