"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generator = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var Duration_1 = require("./Duration");
var ModelDefaults_1 = require("./ModelDefaults");
var Generator = /** @class */ (function () {
    function Generator(id, name, activityKeyId, entityId, // Changed from entityType
    periodicOccurrences, periodIntervalDuration, entitiesPerCreation, periodicStartDuration, maxEntities) {
        if (activityKeyId === void 0) { activityKeyId = ""; }
        if (entityId === void 0) { entityId = ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_ID; }
        if (periodicOccurrences === void 0) { periodicOccurrences = Infinity; }
        if (periodIntervalDuration === void 0) { periodIntervalDuration = new Duration_1.Duration(); }
        if (entitiesPerCreation === void 0) { entitiesPerCreation = 1; }
        if (periodicStartDuration === void 0) { periodicStartDuration = new Duration_1.Duration(); }
        if (maxEntities === void 0) { maxEntities = Infinity; }
        this.id = id;
        this.name = name;
        this.activityKeyId = activityKeyId;
        this.entityId = entityId;
        this.periodicOccurrences = periodicOccurrences;
        this.periodIntervalDuration = periodIntervalDuration;
        this.entitiesPerCreation = entitiesPerCreation;
        this.periodicStartDuration = periodicStartDuration;
        this.maxEntities = maxEntities;
        this.type = SimulationObjectType_1.SimulationObjectType.Generator;
    }
    return Generator;
}());
exports.Generator = Generator;
