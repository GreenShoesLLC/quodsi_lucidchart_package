"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModelDefinitionSerializer = void 0;
var State_1 = require("../types/elements/State");
var actions_1 = require("../types/elements/actions");
var SerializationError_1 = require("./errors/SerializationError");
var InvalidModelError_1 = require("./errors/InvalidModelError");
var BaseModelDefinitionSerializer = /** @class */ (function () {
    function BaseModelDefinitionSerializer() {
    }
    BaseModelDefinitionSerializer.prototype.validateModel = function (modelDefinition) {
        if (!modelDefinition) {
            throw new InvalidModelError_1.InvalidModelError('ModelDefinition cannot be null or undefined');
        }
        if (!modelDefinition.model) {
            throw new InvalidModelError_1.InvalidModelError('Model is required');
        }
        if (!modelDefinition.entities.getAll().length) {
            throw new InvalidModelError_1.InvalidModelError('At least one entity is required');
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeModel = function (model) {
        var _a, _b, _c, _d, _e, _f;
        try {
            if (!model.id || !model.name) {
                throw new InvalidModelError_1.InvalidModelError('Model must have id and name');
            }
            return {
                id: model.id,
                name: model.name,
                description: model.description,
                reps: model.reps,
                seed: model.seed,
                oneClockUnit: model.oneClockUnit,
                simulationTimeType: model.simulationTimeType,
                warmupClockPeriod: model.warmupClockPeriod,
                warmupClockPeriodUnit: model.warmupClockPeriodUnit,
                runClockPeriod: model.runClockPeriod,
                runClockPeriodUnit: model.runClockPeriodUnit,
                warmupDateTime: (_b = (_a = model.warmupDateTime) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _b !== void 0 ? _b : null,
                startDateTime: (_d = (_c = model.startDateTime) === null || _c === void 0 ? void 0 : _c.toISOString()) !== null && _d !== void 0 ? _d : null,
                finishDateTime: (_f = (_e = model.finishDateTime) === null || _e === void 0 ? void 0 : _e.toISOString()) !== null && _f !== void 0 ? _f : null
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Model', 'Failed to serialize model properties', error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeEntity = function (entity) {
        try {
            if (!entity.id || !entity.name) {
                throw new InvalidModelError_1.InvalidModelError('Entity must have id and name');
            }
            return {
                id: entity.id,
                name: entity.name,
                description: entity.description,
                type: entity.type,
                x: entity.x,
                y: entity.y
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Entity', "Failed to serialize entity \"".concat(entity.name, "\" (ID: ").concat(entity.id, ")"), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeActivity = function (activity, modelDefinition) {
        var _this = this;
        try {
            if (!activity.id || !activity.name) {
                throw new InvalidModelError_1.InvalidModelError('Activity must have id and name');
            }
            // Get all connectors where the sourceId matches the activity's id
            var relevantConnectors = modelDefinition.connectors.getAll()
                .filter(function (connector) { return connector.sourceId === activity.id; })
                .map(function (connector) { return _this.serializeConnector(connector); });
            var serialized = {
                id: activity.id,
                name: activity.name,
                description: activity.description,
                type: activity.type,
                x: activity.x,
                y: activity.y,
                capacity: activity.capacity,
                inboundQueueCapacity: activity.inboundQueueCapacity,
                outboundQueueCapacity: activity.outboundQueueCapacity,
                actions: activity.actions.map(function (action) {
                    return _this.serializeAction(action);
                }),
                connectors: relevantConnectors
            };
            // Path X-lite: include shape dimensions when the Lucid extension
            // captured them via block.getBoundingBox(). Absent for legacy /
            // non-Lucid models — the engine falls back to Path Z defaults.
            if (activity.width !== undefined) {
                serialized.width = activity.width;
            }
            if (activity.height !== undefined) {
                serialized.height = activity.height;
            }
            // NEW: Serialize sourceConfig if present (self-generating activity)
            if (activity.sourceConfig) {
                serialized.sourceConfig = this.serializeEntitySourceConfig(activity.sourceConfig);
            }
            // Add optional properties if they exist
            if (activity.financialProperties) {
                serialized.financialProperties = activity.financialProperties.toJSON();
            }
            if (activity.failureProperties) {
                serialized.failureProperties = activity.failureProperties.toJSON();
            }
            if (activity.connectType) {
                serialized.connectType = activity.connectType;
            }
            return serialized;
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Activity', "Failed to serialize activity \"".concat(activity.name, "\" (ID: ").concat(activity.id, ")"), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeDuration = function (duration) {
        try {
            return {
                durationPeriodUnit: duration.durationPeriodUnit,
                distribution: duration.distribution
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Duration', 'Failed to serialize duration', error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeGenerator = function (generator, modelDefinition) {
        try {
            if (!generator.id || !generator.name) {
                throw new InvalidModelError_1.InvalidModelError('Generator must have id and name');
            }
            if (!generator.generationConfig) {
                throw new InvalidModelError_1.InvalidModelError('Generator must have generationConfig');
            }
            // Compute exitConnector dynamically from connectors
            // This ensures it always reflects the current diagram state
            var outgoingConnector = modelDefinition.connectors.getAll()
                .find(function (c) { return c.sourceId === generator.id; });
            var serialized = {
                id: generator.id,
                name: generator.name,
                description: generator.description,
                type: generator.type,
                x: generator.x,
                y: generator.y,
                generationConfig: this.serializeEntitySourceConfig(generator.generationConfig)
            };
            // Set exitConnector from actual connector (not stored value)
            if (outgoingConnector) {
                serialized.exitConnector = outgoingConnector.targetId;
            }
            // Path X-lite: include shape dimensions when captured.
            if (generator.width !== undefined) {
                serialized.width = generator.width;
            }
            if (generator.height !== undefined) {
                serialized.height = generator.height;
            }
            return serialized;
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Generator', "Failed to serialize generator \"".concat(generator.name, "\" (ID: ").concat(generator.id, ")"), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeResource = function (resource) {
        try {
            if (!resource.id || !resource.name) {
                throw new InvalidModelError_1.InvalidModelError('Resource must have id and name');
            }
            var serialized = {
                id: resource.id,
                name: resource.name,
                description: resource.description,
                type: resource.type,
                x: resource.x,
                y: resource.y,
                capacity: resource.capacity
            };
            // Add optional properties if they exist
            if (resource.financialProperties) {
                serialized.financialProperties = resource.financialProperties.toJSON();
            }
            // Path X-lite: include shape dimensions when captured.
            if (resource.width !== undefined) {
                serialized.width = resource.width;
            }
            if (resource.height !== undefined) {
                serialized.height = resource.height;
            }
            return serialized;
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Resource', "Failed to serialize resource \"".concat(resource.name, "\" (ID: ").concat(resource.id, ")"), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeResourceRequirement = function (requirement) {
        var _this = this;
        try {
            if (!requirement.id || !requirement.name) {
                throw new InvalidModelError_1.InvalidModelError('ResourceRequirement must have id and name');
            }
            return {
                id: requirement.id,
                name: requirement.name,
                type: requirement.type,
                rootClauses: requirement.rootClauses.map(function (clause) { return _this.serializeRequirementClause(clause); })
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('ResourceRequirement', "Failed to serialize resource requirement ".concat(requirement.id), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeRequirementClause = function (clause) {
        var _this = this;
        try {
            if (!clause.clauseId) {
                throw new InvalidModelError_1.InvalidModelError('RequirementClause must have a clauseId');
            }
            return {
                clauseId: clause.clauseId,
                mode: clause.mode,
                parentClauseId: clause.parentClauseId,
                requests: clause.requests.map(function (request) { return _this.serializeResourceRequest(request); }),
                subClauses: clause.subClauses.map(function (subClause) { return _this.serializeRequirementClause(subClause); })
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('RequirementClause', "Failed to serialize requirement clause ".concat(clause.clauseId), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeResourceRequest = function (request) {
        try {
            if (!request.resourceId) {
                throw new InvalidModelError_1.InvalidModelError('ResourceRequest must have a resourceId');
            }
            return {
                resourceId: request.resourceId,
                quantity: request.quantity,
                priority: request.priority,
                keepResource: request.keepResource
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('ResourceRequest', "Failed to serialize resource request for resource ".concat(request.resourceId), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeConnector = function (connector) {
        var _this = this;
        var _a;
        try {
            if (!connector.id || !connector.sourceId) {
                throw new InvalidModelError_1.InvalidModelError('Connector must have id and sourceId');
            }
            // Get effective destination (new field or legacy targetId)
            var effectiveDestination = connector.getEffectiveDestinationUniqueId();
            if (!effectiveDestination) {
                throw new InvalidModelError_1.InvalidModelError('Connector must have destinationUniqueId or targetId');
            }
            var serialized = {
                id: connector.id,
                name: connector.name,
                description: connector.description,
                type: connector.type,
                sourceId: connector.sourceId,
                targetId: connector.targetId,
                sourceX: connector.sourceX,
                sourceY: connector.sourceY,
                targetX: connector.targetX,
                targetY: connector.targetY,
                x: connector.x,
                y: connector.y,
                weight: connector.weight,
                actions: connector.actions.map(function (action) {
                    return _this.serializeAction(action);
                }),
                entityTemplateUniqueId: connector.entityTemplateUniqueId,
                stateCondition: (_a = connector.stateCondition) === null || _a === void 0 ? void 0 : _a.toJSON(),
                stateModifications: connector.stateModifications.map(function (m) { return _this.serializeModification(m); })
            };
            // NEW: Serialize destinationUniqueId if present
            if (connector.destinationUniqueId) {
                serialized.destinationUniqueId = connector.destinationUniqueId;
            }
            // NEW: Serialize destinationPriority if present
            if (connector.destinationPriority !== undefined) {
                serialized.destinationPriority = connector.destinationPriority;
            }
            return serialized;
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Connector', "Failed to serialize connector \"".concat(connector.name, "\" (ID: ").concat(connector.id, ")"), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeState = function (state) {
        try {
            if (!state.id || !state.name) {
                throw new InvalidModelError_1.InvalidModelError('State must have id and name');
            }
            return {
                id: state.id,
                name: state.name,
                componentType: state.componentType,
                dataType: state.dataType,
                initialValue: state.initialValue,
                categoryValues: state.categoryValues,
                description: state.description,
                collectStatistics: state.collectStatistics
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('State', "Failed to serialize state ".concat(state.id), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.deserializeState = function (data) {
        try {
            if (!data.id || !data.name) {
                throw new InvalidModelError_1.InvalidModelError('Serialized state must have id and name');
            }
            return new State_1.State(data.id, data.name, data.componentType, data.dataType, data.initialValue, {
                categoryValues: data.categoryValues,
                description: data.description,
                collectStatistics: data.collectStatistics
            });
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('State', "Failed to deserialize state ".concat(data.id), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeTimePattern = function (pattern) {
        try {
            if (!pattern.id || !pattern.name) {
                throw new InvalidModelError_1.InvalidModelError('TimePattern must have id and name');
            }
            return {
                unique_id: pattern.id,
                name: pattern.name,
                weeklyWeights: pattern.weeklyWeights.length > 0 ? pattern.weeklyWeights : undefined,
                dayOfWeekWeights: pattern.dayOfWeekWeights.length > 0 ? pattern.dayOfWeekWeights : undefined,
                dayOfWeekHourWeights: pattern.dayOfWeekHourWeights.length > 0 ? pattern.dayOfWeekHourWeights : undefined,
                minuteDistributionDef: this.serializeDuration(pattern.minuteDistribution)
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('TimePattern', "Failed to serialize time pattern ".concat(pattern.id), error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeTimeDistributedConfig = function (config) {
        try {
            if (!config.id || !config.name) {
                throw new InvalidModelError_1.InvalidModelError('TimeDistributedConfig must have id and name');
            }
            return {
                unique_id: config.id,
                name: config.name,
                timePatternId: config.timePatternId,
                totalVolume: config.totalVolume,
                volumePeriodBasis: config.volumePeriodBasis,
                startDate: config.startDate,
                endDate: config.endDate
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('TimeDistributedConfig', "Failed to serialize time distributed config ".concat(config.id), error instanceof Error ? error : undefined);
        }
    };
    /**
     * Safely serialize a StateModification, handling both class instances and plain objects.
     * This provides a safety net for cases where modifications were loaded from storage
     * as plain objects without being hydrated back to StateModification instances.
     */
    BaseModelDefinitionSerializer.prototype.serializeModification = function (m) {
        if (typeof m.toJSON === 'function') {
            return m.toJSON();
        }
        // Already a plain object, return as-is
        return m;
    };
    BaseModelDefinitionSerializer.prototype.serializeAction = function (action) {
        var _this = this;
        try {
            var serialized = void 0;
            switch (action.actionType) {
                case actions_1.ActionType.ASSIGN:
                    serialized = {
                        actionType: actions_1.ActionType.ASSIGN,
                        modifications: action.modifications.map(function (m) { return _this.serializeModification(m); })
                    };
                    break;
                case actions_1.ActionType.SEIZE:
                    serialized = {
                        actionType: actions_1.ActionType.SEIZE,
                        resourceRequirementId: action.resourceRequirementId
                    };
                    break;
                case actions_1.ActionType.RELEASE:
                    serialized = {
                        actionType: actions_1.ActionType.RELEASE,
                        resourceRequirementId: action.resourceRequirementId
                    };
                    break;
                case actions_1.ActionType.DELAY:
                    serialized = {
                        actionType: actions_1.ActionType.DELAY,
                        duration: this.serializeDuration(action.duration)
                    };
                    break;
                case actions_1.ActionType.DELAY_WITH_RESOURCE: {
                    var delayWithResource = action;
                    serialized = {
                        actionType: actions_1.ActionType.DELAY_WITH_RESOURCE,
                        resourceRequirementId: delayWithResource.resourceRequirementId,
                        duration: this.serializeDuration(delayWithResource.duration)
                    };
                    if (delayWithResource.keepResource !== undefined) {
                        serialized.keepResource = delayWithResource.keepResource;
                    }
                    if (delayWithResource.stateModifications && delayWithResource.stateModifications.length > 0) {
                        serialized.stateModifications = delayWithResource.stateModifications.map(function (m) { return _this.serializeModification(m); });
                    }
                    break;
                }
                case actions_1.ActionType.SPLIT: {
                    var splitAction = action;
                    serialized = {
                        actionType: actions_1.ActionType.SPLIT,
                        count: splitAction.count,
                        entityTemplateId: splitAction.entityTemplateId,
                        destinationId: splitAction.destinationId,
                        inheritStates: splitAction.inheritStates,
                        modifications: splitAction.modifications.map(function (m) { return _this.serializeModification(m); }),
                        splitIndexState: splitAction.splitIndexState
                    };
                    break;
                }
                case actions_1.ActionType.CREATE: {
                    var createAction = action;
                    serialized = {
                        actionType: actions_1.ActionType.CREATE,
                        entityTemplateId: createAction.entityTemplateId,
                        destinationId: createAction.destinationId,
                        inheritStates: createAction.inheritStates,
                        modifications: createAction.modifications.map(function (m) { return _this.serializeModification(m); })
                    };
                    break;
                }
                case actions_1.ActionType.DISPOSE:
                    serialized = { actionType: actions_1.ActionType.DISPOSE };
                    break;
                case actions_1.ActionType.JOIN: {
                    var joinAction = action;
                    serialized = {
                        actionType: actions_1.ActionType.JOIN,
                        matchState: joinAction.matchState,
                        joinCount: joinAction.joinCount,
                        combinedTemplateId: joinAction.combinedTemplateId,
                        destinationId: joinAction.destinationId,
                        inheritStates: joinAction.inheritStates,
                        modifications: joinAction.modifications.map(function (m) { return _this.serializeModification(m); }),
                        joinCountState: joinAction.joinCountState
                    };
                    break;
                }
                case actions_1.ActionType.LOOP: {
                    var loopAction = action;
                    serialized = {
                        actionType: actions_1.ActionType.LOOP,
                        count: loopAction.count,
                        actions: loopAction.actions.map(function (a) { return _this.serializeAction(a); })
                    };
                    break;
                }
                case actions_1.ActionType.BRANCH: {
                    var branchAction = action;
                    serialized = {
                        actionType: actions_1.ActionType.BRANCH,
                        condition: branchAction.condition ? branchAction.condition.toJSON() : null,
                        ifTrue: branchAction.ifTrue.map(function (a) { return _this.serializeAction(a); }),
                        ifFalse: branchAction.ifFalse.map(function (a) { return _this.serializeAction(a); })
                    };
                    break;
                }
                default:
                    throw new InvalidModelError_1.InvalidModelError("Unknown action type: ".concat(action.actionType));
            }
            // Carry the stable action id through to the engine (scenario-change addressing).
            serialized.id = action.id;
            // Add optional stateCondition guard
            if (action.stateCondition) {
                var sc = action.stateCondition;
                serialized.stateCondition = typeof sc.toJSON === 'function' ? sc.toJSON() : sc;
            }
            return serialized;
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Action', 'Failed to serialize action', error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.serializeEntitySourceConfig = function (config) {
        var _this = this;
        try {
            if (!config.entityId) {
                throw new InvalidModelError_1.InvalidModelError('EntitySourceConfig must have entityId');
            }
            var serialized = {
                entityId: config.entityId,
                generatorType: config.generatorType
            };
            // FREQUENCY mode fields
            if (config.periodicOccurrences !== undefined) {
                serialized.periodicOccurrences = config.periodicOccurrences;
            }
            if (config.periodIntervalDuration) {
                serialized.periodIntervalDuration = this.serializeDuration(config.periodIntervalDuration);
            }
            if (config.entitiesPerCreation !== undefined) {
                serialized.entitiesPerCreation = config.entitiesPerCreation;
            }
            if (config.periodicStartDuration) {
                serialized.periodicStartDuration = this.serializeDuration(config.periodicStartDuration);
            }
            if (config.maxEntities !== undefined) {
                serialized.maxEntities = config.maxEntities;
            }
            // TIME_DISTRIBUTED mode fields
            if (config.timeDistributedConfigIds && config.timeDistributedConfigIds.length > 0) {
                serialized.timeDistributedConfigIds = config.timeDistributedConfigIds;
            }
            // State initialization
            if (config.initialStateModifications && config.initialStateModifications.length > 0) {
                serialized.initialStateModifications = config.initialStateModifications.map(function (m) { return _this.serializeModification(m); });
            }
            return serialized;
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('EntitySourceConfig', 'Failed to serialize entity source config', error instanceof Error ? error : undefined);
        }
    };
    BaseModelDefinitionSerializer.prototype.getMetadata = function () {
        try {
            return {
                version: this.getVersion().toString(),
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new SerializationError_1.SerializationError('Metadata', 'Failed to generate metadata', error instanceof Error ? error : undefined);
        }
    };
    return BaseModelDefinitionSerializer;
}());
exports.BaseModelDefinitionSerializer = BaseModelDefinitionSerializer;
