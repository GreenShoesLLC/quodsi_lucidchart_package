"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeDistributedEntitySourceConfig = exports.createDefaultEntitySourceConfig = void 0;
var GeneratorType_1 = require("./GeneratorType");
/**
 * Creates a default EntitySourceConfig for FREQUENCY mode
 */
function createDefaultEntitySourceConfig(entityId, periodIntervalDuration) {
    return {
        entityId: entityId,
        generatorType: GeneratorType_1.GeneratorType.FREQUENCY,
        periodicOccurrences: Infinity,
        periodIntervalDuration: periodIntervalDuration,
        entitiesPerCreation: 1,
        maxEntities: Infinity,
        initialStateModifications: []
    };
}
exports.createDefaultEntitySourceConfig = createDefaultEntitySourceConfig;
/**
 * Creates an EntitySourceConfig for TIME_DISTRIBUTED mode
 */
function createTimeDistributedEntitySourceConfig(entityId, timeDistributedConfigIds) {
    return {
        entityId: entityId,
        generatorType: GeneratorType_1.GeneratorType.TIME_DISTRIBUTED,
        timeDistributedConfigIds: timeDistributedConfigIds,
        initialStateModifications: []
    };
}
exports.createTimeDistributedEntitySourceConfig = createTimeDistributedEntitySourceConfig;
