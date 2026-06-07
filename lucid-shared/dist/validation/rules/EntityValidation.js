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
exports.EntityValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var types_1 = require("../../quodsi-messaging/validation/types");
var ModelDefaults_1 = require("../../types/elements/ModelDefaults");
var EntityValidation = /** @class */ (function (_super) {
    __extends(EntityValidation, _super);
    function EntityValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EntityValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var entities = state.modelDefinition.entities.getAll();
        this.log("Starting validation of entities.");
        // Check if there's at least one entity defined
        if (entities.length === 0) {
            this.log("Validation failed: No entities defined.");
            issues.push(ValidationMessages_1.ValidationMessages.missingRequiredElement('entity'));
            return;
        }
        // Validate each entity
        entities.forEach(function (entity) {
            _this.validateEntityData(entity, issues);
            _this.validateEntityUsage(entity, state, issues);
        });
        this.log("Completed validation of entities.");
    };
    EntityValidation.prototype.validateEntityData = function (entity, issues) {
        /**
         * Validates the basic data properties of an entity.
         */
        this.log("Validating data for Entity ID: ".concat(entity.id));
        if (!entity.name || entity.name.trim().length === 0) {
            this.log("Entity ID ".concat(entity.id, " has a missing name."));
            issues.push(ValidationMessages_1.ValidationMessages.missingName('Entity', entity.id, entity.name));
        }
        if (!entity.id || entity.id.trim().length === 0) {
            this.log("Entity ID ".concat(entity.id, " has missing or invalid ID."));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'entity_missing_id', "Entity has missing or invalid ID", entity.id));
        }
        if (entity.name === 'New Entity') {
            this.log("Entity ID ".concat(entity.id, " is using the default name."));
            var displayName = entity.name && entity.name.trim() !== ''
                ? "'".concat(entity.name, "'")
                : entity.id;
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'entity_default_name', "Entity ".concat(displayName, " is using default name"), entity.id));
        }
    };
    EntityValidation.prototype.validateEntityUsage = function (entity, state, issues) {
        /**
         * Validates the usage of an entity within the model.
         */
        this.log("Validating usage for Entity ID: ".concat(entity.id));
        // Skip validation for the default entity
        if (entity.id === ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_ID) {
            this.log("Skipping usage validation for default entity.");
            return;
        }
        var isUsedByGenerator = state.modelDefinition.generators.getAll()
            .some(function (generator) { var _a; return ((_a = generator.generationConfig) === null || _a === void 0 ? void 0 : _a.entityId) === entity.id; });
        if (!isUsedByGenerator) {
            this.log("Entity ID ".concat(entity.id, " is not used by any generator."));
            var displayName = entity.name && entity.name.trim() !== ''
                ? "'".concat(entity.name, "'")
                : entity.id;
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'entity_not_used', "Entity ".concat(displayName, " is not used by any generator"), entity.id));
        }
        var entities = state.modelDefinition.entities.getAll();
        var duplicateNames = entities.filter(function (e) {
            return e.id !== entity.id && e.name.trim().toLowerCase() === entity.name.trim().toLowerCase();
        });
        if (duplicateNames.length > 0) {
            this.log("Entity ID ".concat(entity.id, " has a name conflict with other entities."));
            var displayName = entity.name && entity.name.trim() !== ''
                ? "'".concat(entity.name, "'")
                : entity.id;
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'entity_name_conflict', "Entity ".concat(displayName, " has a name that conflicts with other entities"), entity.id));
        }
    };
    return EntityValidation;
}(ValidationRule_1.ValidationRule));
exports.EntityValidation = EntityValidation;
