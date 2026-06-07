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
exports.ModelDefinitionSerializerV1 = void 0;
var BaseModelDefinitionSerializer_1 = require("../BaseModelDefinitionSerializer");
var SerializationError_1 = require("../errors/SerializationError");
var ModelDefinitionSerializerV1 = /** @class */ (function (_super) {
    __extends(ModelDefinitionSerializerV1, _super);
    function ModelDefinitionSerializerV1() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ModelDefinitionSerializerV1.prototype.getVersion = function () {
        return {
            major: 1,
            minor: 0,
            toString: function () {
                return "".concat(this.major, ".").concat(this.minor);
            }
        };
    };
    ModelDefinitionSerializerV1.prototype.validateV1Specific = function (modelDefinition) {
        // Add any V1-specific validation rules
    };
    ModelDefinitionSerializerV1.prototype.serialize = function (modelDefinition) {
        var _this = this;
        try {
            // Validate the model
            this.validateModel(modelDefinition);
            this.validateV1Specific(modelDefinition);
            var metadata = this.getMetadata();
            return {
                formatVersion: '1.0',
                metadata: metadata,
                model: this.serializeModel(modelDefinition.model),
                entities: modelDefinition.entities.getAll().map(function (entity) {
                    return _this.serializeEntity(entity);
                }),
                activities: modelDefinition.activities.getAll().map(function (activity) {
                    return _this.serializeActivity(activity, modelDefinition);
                }),
                resources: modelDefinition.resources.getAll().map(function (resource) {
                    return _this.serializeResource(resource);
                }),
                generators: modelDefinition.generators.getAll().map(function (generator) {
                    return _this.serializeGenerator(generator, modelDefinition);
                }),
                resourceRequirements: modelDefinition.resourceRequirements.getAll().map(function (requirement) {
                    return _this.serializeResourceRequirement(requirement);
                }),
                states: modelDefinition.states.getAll().map(function (state) {
                    return _this.serializeState(state);
                }),
                timePatterns: modelDefinition.timePatterns.getAll().map(function (pattern) {
                    return _this.serializeTimePattern(pattern);
                }),
                timeDistributedConfigs: modelDefinition.timeDistributedConfigs.getAll().map(function (config) {
                    return _this.serializeTimeDistributedConfig(config);
                }),
                scenarios: modelDefinition.scenarios.getAll().map(function (scenario) {
                    return scenario.toJSON();
                })
            };
        }
        catch (error) {
            if (error instanceof SerializationError_1.SerializationError) {
                throw error;
            }
            throw new SerializationError_1.SerializationError('Model', 'Failed to serialize model definition', error instanceof Error ? error : undefined);
        }
    };
    return ModelDefinitionSerializerV1;
}(BaseModelDefinitionSerializer_1.BaseModelDefinitionSerializer));
exports.ModelDefinitionSerializerV1 = ModelDefinitionSerializerV1;
