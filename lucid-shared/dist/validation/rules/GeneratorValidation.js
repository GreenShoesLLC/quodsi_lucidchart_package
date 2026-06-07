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
exports.GeneratorValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var types_1 = require("../../quodsi-messaging/validation/types");
var DistributionType_1 = require("../../types/elements/DistributionType");
var GeneratorValidation = /** @class */ (function (_super) {
    __extends(GeneratorValidation, _super);
    function GeneratorValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Helper to extract a numeric value from a Duration.
     * For constant distributions, returns the value.
     * For other distributions, returns the mean/expected value if determinable.
     * Returns undefined if duration is invalid or value cannot be determined.
     */
    GeneratorValidation.prototype.getDurationValue = function (duration) {
        if (!(duration === null || duration === void 0 ? void 0 : duration.distribution)) {
            return undefined;
        }
        var dist = duration.distribution;
        if (dist.distributionType === DistributionType_1.DistributionType.CONSTANT) {
            var params = dist.parameters;
            return params === null || params === void 0 ? void 0 : params.value;
        }
        // For non-constant distributions, we could add mean calculations here
        // For now, return undefined (skip validation for stochastic durations)
        return undefined;
    };
    GeneratorValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var generators = state.modelDefinition.generators.getAll();
        generators.forEach(function (generator) {
            // Check for missing generationConfig
            if (!generator.generationConfig) {
                _this.log("Validation failed: Generator ID ".concat(generator.id, " has no generationConfig."));
                issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('configuration', generator.id, 'Generator is missing generationConfig - please re-edit and save', generator.name));
                return; // Skip further validation for this generator
            }
            _this.validateGeneratorData(generator, state, issues);
            _this.validateDurationSettings(generator, issues);
            _this.validateEntitySettings(generator, state, issues);
            _this.validateExitConnector(generator, state, issues);
        });
        this.validateGeneratorInteractions(generators, issues);
    };
    GeneratorValidation.prototype.validateGeneratorData = function (generator, state, issues) {
        /**
         * Validates the data properties of a given Generator.
         * Ensures the Generator has a valid name, valid entities per creation,
         * periodic occurrences, max entities constraints, and referenced activity key IDs exist.
         */
        this.log("Starting validation for Generator ID: ".concat(generator.id, ", Name: ").concat(generator.name));
        // Validate the Generator's name
        if (!generator.name || generator.name.trim().length === 0) {
            this.log("Validation failed: Generator ID ".concat(generator.id, " has an empty or missing name."));
            issues.push(ValidationMessages_1.ValidationMessages.missingName('Generator', generator.id, generator.name));
        }
        // Validate entities per creation
        if (typeof generator.generationConfig.entitiesPerCreation !== 'number' ||
            generator.generationConfig.entitiesPerCreation < GeneratorValidation.MIN_ENTITIES_PER_CREATION ||
            generator.generationConfig.entitiesPerCreation > GeneratorValidation.MAX_ENTITIES_PER_CREATION) {
            this.log("Validation failed: Generator ID ".concat(generator.id, " has invalid entitiesPerCreation (").concat(generator.generationConfig.entitiesPerCreation, ")."));
            issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('entities per creation', generator.id, "Must be between ".concat(GeneratorValidation.MIN_ENTITIES_PER_CREATION, " and ").concat(GeneratorValidation.MAX_ENTITIES_PER_CREATION), generator.name));
        }
        // Validate periodic occurrences
        if (generator.generationConfig.periodicOccurrences !== Infinity &&
            (typeof generator.generationConfig.periodicOccurrences !== 'number' ||
                generator.generationConfig.periodicOccurrences < GeneratorValidation.MIN_PERIODIC_OCCURRENCES)) {
            this.log("Validation failed: Generator ID ".concat(generator.id, " has invalid periodicOccurrences (").concat(generator.generationConfig.periodicOccurrences, ")."));
            issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('periodic occurrences', generator.id, 'Must be Infinity or a number greater than 0', generator.name));
        }
        // Validate maxEntities
        if (generator.generationConfig.maxEntities !== Infinity &&
            (typeof generator.generationConfig.maxEntities !== 'number' ||
                generator.generationConfig.maxEntities < GeneratorValidation.MIN_MAX_ENTITIES ||
                generator.generationConfig.maxEntities > GeneratorValidation.MAX_MAX_ENTITIES)) {
            this.log("Validation failed: Generator ID ".concat(generator.id, " has invalid maxEntities (").concat(generator.generationConfig.maxEntities, ")."));
            issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('maximum entities limit', generator.id, "Must be Infinity or between ".concat(GeneratorValidation.MIN_MAX_ENTITIES, " and ").concat(GeneratorValidation.MAX_MAX_ENTITIES), generator.name));
        }
        this.log("Completed validation for Generator ID: ".concat(generator.id));
    };
    GeneratorValidation.prototype.validateDurationSettings = function (generator, issues) {
        /**
         * Validates the duration settings of a Generator.
         * Ensures that the period interval duration and start duration are valid and logically consistent.
         */
        var _a, _b;
        this.log("Starting duration settings validation for Generator ID: ".concat(generator.id));
        var config = generator.generationConfig;
        // Validate period interval duration exists and has valid distribution
        if (!((_a = config.periodIntervalDuration) === null || _a === void 0 ? void 0 : _a.distribution)) {
            this.log("Validation failed: Generator ID ".concat(generator.id, " has invalid period interval duration."));
            issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('period interval duration', generator.id, 'Must have a valid duration with distribution', generator.name));
        }
        else {
            // For constant distributions, validate the value is non-negative
            var intervalValue = this.getDurationValue(config.periodIntervalDuration);
            if (intervalValue !== undefined && intervalValue < 0) {
                this.log("Validation failed: Generator ID ".concat(generator.id, " has negative period interval duration."));
                issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('period interval duration', generator.id, 'Duration value must be non-negative', generator.name));
            }
        }
        // Validate periodic start duration if present
        if ((_b = config.periodicStartDuration) === null || _b === void 0 ? void 0 : _b.distribution) {
            var startValue = this.getDurationValue(config.periodicStartDuration);
            if (startValue !== undefined && startValue < 0) {
                this.log("Validation failed: Generator ID ".concat(generator.id, " has negative periodic start duration."));
                issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('periodic start duration', generator.id, 'Duration value must be non-negative', generator.name));
            }
            // Warn if start duration is longer than interval (only for constant durations)
            var intervalValue = this.getDurationValue(config.periodIntervalDuration);
            if (intervalValue !== undefined && startValue !== undefined) {
                if (startValue > intervalValue && intervalValue > 0) {
                    this.log("Warning: Generator ID ".concat(generator.id, " has start duration longer than interval duration."));
                    issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'generator_start_exceeds_interval', "Generator '".concat(generator.name, "' has start delay (").concat(startValue, ") longer than interval (").concat(intervalValue, ")"), generator.id));
                }
            }
        }
        this.log("Completed duration settings validation for Generator ID: ".concat(generator.id));
    };
    GeneratorValidation.prototype.validateEntitySettings = function (generator, state, issues) {
        /**
         * Validates the entity-related settings of a Generator.
         * Ensures entity references exist and constraints on entity creation are valid.
         */
        var _a, _b, _c;
        this.log("Starting entity settings validation for Generator ID: ".concat(generator.id));
        if (!generator.generationConfig.entityId) {
            this.log("Validation failed: Generator ID ".concat(generator.id, " does not specify an entity ID."));
            issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('entity reference', generator.id, 'Must specify an entity ID', generator.name));
        }
        else {
            var entityExists = state.modelDefinition.entities.get(generator.generationConfig.entityId);
            if (!entityExists) {
                this.log("Validation failed: Generator ID ".concat(generator.id, " references a non-existent entity (").concat(generator.generationConfig.entityId, ")."));
                issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('entity reference', generator.id, "References non-existent entity ".concat(generator.generationConfig.entityId), generator.name));
            }
        }
        var periodicOccurrences = (_a = generator.generationConfig.periodicOccurrences) !== null && _a !== void 0 ? _a : Infinity;
        var maxEntities = (_b = generator.generationConfig.maxEntities) !== null && _b !== void 0 ? _b : Infinity;
        var entitiesPerCreation = (_c = generator.generationConfig.entitiesPerCreation) !== null && _c !== void 0 ? _c : 1;
        if (periodicOccurrences !== Infinity && maxEntities !== Infinity) {
            var totalEntities = periodicOccurrences * entitiesPerCreation;
            if (totalEntities > maxEntities) {
                this.log("Warning: Generator ID ".concat(generator.id, " may exceed maximum entities limit."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'generator_max_entities_limit', "Generator ".concat(generator.id, " may reach maximum entities limit before completing all periodic occurrences"), generator.id));
            }
        }
        this.log("Completed entity settings validation for Generator ID: ".concat(generator.id));
    };
    GeneratorValidation.prototype.validateExitConnector = function (generator, state, issues) {
        /**
         * Validates that a Generator has exactly one outgoing connector.
         * - 0 connectors = ERROR (entities have nowhere to go)
         * - 1 connector = OK
         * - >1 connectors = WARNING (generators route to single destination)
         */
        this.log("Starting exit connector validation for Generator ID: ".concat(generator.id));
        var outgoingConnectors = state.modelDefinition.connectors.getAll()
            .filter(function (c) { return c.sourceId === generator.id; });
        if (outgoingConnectors.length === 0) {
            this.log("Validation failed: Generator ID ".concat(generator.id, " has no exit connector."));
            issues.push(ValidationMessages_1.ValidationMessages.generatorValidation('exit connector', generator.id, 'Generator must have an exit connector to route generated entities', generator.name));
        }
        else if (outgoingConnectors.length > 1) {
            this.log("Warning: Generator ID ".concat(generator.id, " has ").concat(outgoingConnectors.length, " exit connectors."));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'generator_multiple_exit_connectors', "Generator '".concat(generator.name || generator.id, "' has ").concat(outgoingConnectors.length, " exit connectors; only the first will be used for routing"), generator.id));
        }
        this.log("Completed exit connector validation for Generator ID: ".concat(generator.id));
    };
    GeneratorValidation.prototype.validateGeneratorInteractions = function (generators, issues) {
        /**
         * Validates interactions among multiple Generators.
         * Checks for potential system overload due to high entity generation rates.
         */
        var _this = this;
        var _a;
        this.log("Starting generator interactions validation.");
        // Calculate total entity generation rate (only for constant interval durations)
        var totalEntitiesPerSecond = 0;
        generators.forEach(function (generator) {
            var _a;
            if (!generator.generationConfig)
                return;
            var intervalValue = _this.getDurationValue(generator.generationConfig.periodIntervalDuration);
            if (intervalValue && intervalValue > 0) {
                var entitiesPerCreation = (_a = generator.generationConfig.entitiesPerCreation) !== null && _a !== void 0 ? _a : 1;
                var generatorRate = entitiesPerCreation / intervalValue;
                totalEntitiesPerSecond += generatorRate;
            }
        });
        if (totalEntitiesPerSecond > 1000) {
            this.log("Warning: High entity generation rate detected (".concat(totalEntitiesPerSecond.toFixed(2), " entities/second)."));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'high_entity_generation_rate', "High entity generation rate detected (".concat(totalEntitiesPerSecond.toFixed(2), " entities/second)"), (_a = generators[0]) === null || _a === void 0 ? void 0 : _a.id));
        }
        this.log("Completed generator interactions validation.");
    };
    // Constants for validation limits
    GeneratorValidation.MIN_ENTITIES_PER_CREATION = 1;
    GeneratorValidation.MAX_ENTITIES_PER_CREATION = 1000;
    GeneratorValidation.MIN_PERIODIC_OCCURRENCES = 1;
    GeneratorValidation.MIN_MAX_ENTITIES = 1;
    GeneratorValidation.MAX_MAX_ENTITIES = 1000000;
    return GeneratorValidation;
}(ValidationRule_1.ValidationRule));
exports.GeneratorValidation = GeneratorValidation;
