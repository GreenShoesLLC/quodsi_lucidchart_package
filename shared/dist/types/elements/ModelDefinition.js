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
var ModelDefinition = /** @class */ (function () {
    function ModelDefinition(model) {
        this.model = model;
        this.activities = new ActivityListManager_1.ActivityListManager();
        this.connectors = new ConnectorListManager_1.ConnectorListManager();
        this.resources = new ResourceListManager_1.ResourceListManager();
        this.generators = new GeneratorListManager_1.GeneratorListManager();
        this.entities = new EntityListManager_1.EntityListManager();
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
    return ModelDefinition;
}());
exports.ModelDefinition = ModelDefinition;
