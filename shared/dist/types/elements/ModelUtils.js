"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelUtils = void 0;
var SimulationTimeType_1 = require("./SimulationTimeType");
var SimulationObjectType_1 = require("./SimulationObjectType");
var ModelDefaults_1 = require("./ModelDefaults");
var ModelUtils = /** @class */ (function () {
    function ModelUtils() {
    }
    /**
     * Generates a UUID for the model
     */
    ModelUtils.generateUUID = function () {
        var _a;
        try {
            // Check if we're in a browser environment and have crypto support
            if (typeof window !== 'undefined' && ((_a = window === null || window === void 0 ? void 0 : window.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID)) {
                return window.crypto.randomUUID();
            }
        }
        catch (e) {
            // Silently fall through to fallback
        }
        // Fallback implementation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    /**
     * Creates a new default model instance with a UUID
     */
    ModelUtils.createNew = function (name) {
        if (name === void 0) { name = 'New Model'; }
        return ModelUtils.createWithDefaults({
            name: name
            // Remove id generation - it will be set by the caller
        });
    };
    /**
     * Creates a complete Model object with default values for all optional fields
     */
    ModelUtils.createWithDefaults = function (partialModel) {
        var defaults = {
            id: partialModel.id,
            name: partialModel.name || 'New Model',
            type: SimulationObjectType_1.SimulationObjectType.Model,
            reps: ModelDefaults_1.ModelDefaults.DEFAULT_REPS,
            forecastDays: ModelDefaults_1.ModelDefaults.DEFAULT_FORECAST_DAYS,
            seed: ModelDefaults_1.ModelDefaults.DEFAULT_SEED,
            oneClockUnit: ModelDefaults_1.ModelDefaults.DEFAULT_CLOCK_UNIT,
            simulationTimeType: ModelDefaults_1.ModelDefaults.DEFAULT_SIMULATION_TIME_TYPE,
            warmupClockPeriod: ModelDefaults_1.ModelDefaults.DEFAULT_WARMUP_PERIOD,
            warmupClockPeriodUnit: ModelDefaults_1.ModelDefaults.DEFAULT_CLOCK_UNIT,
            runClockPeriod: ModelDefaults_1.ModelDefaults.DEFAULT_RUN_PERIOD,
            runClockPeriodUnit: ModelDefaults_1.ModelDefaults.DEFAULT_CLOCK_UNIT,
            warmupDateTime: null,
            startDateTime: null,
            finishDateTime: null
        };
        return __assign(__assign({}, defaults), partialModel);
    };
    ModelUtils.validate = function (model) {
        var validated = __assign({}, model);
        // Ensure model has a valid UUID
        if (!validated.id) {
            validated.id = ModelUtils.generateUUID();
        }
        validated.reps = Math.max(1, model.reps);
        validated.forecastDays = Math.max(1, model.forecastDays);
        if (validated.warmupClockPeriod !== undefined) {
            validated.warmupClockPeriod = Math.max(0, validated.warmupClockPeriod);
        }
        if (validated.runClockPeriod !== undefined) {
            validated.runClockPeriod = Math.max(0, validated.runClockPeriod);
        }
        if (validated.simulationTimeType === SimulationTimeType_1.SimulationTimeType.Clock) {
            validated.warmupDateTime = null;
            validated.startDateTime = null;
            validated.finishDateTime = null;
        }
        else if (validated.simulationTimeType === SimulationTimeType_1.SimulationTimeType.CalendarDate) {
            validated.warmupClockPeriod = undefined;
            validated.runClockPeriod = undefined;
            validated.warmupClockPeriodUnit = undefined;
            validated.runClockPeriodUnit = undefined;
        }
        return validated;
    };
    ModelUtils.isComplete = function (model) {
        return (typeof model.id === 'string' &&
            model.id.length > 0 &&
            typeof model.name === 'string' &&
            typeof model.reps === 'number' &&
            typeof model.forecastDays === 'number' &&
            model.type === SimulationObjectType_1.SimulationObjectType.Model);
    };
    return ModelUtils;
}());
exports.ModelUtils = ModelUtils;
