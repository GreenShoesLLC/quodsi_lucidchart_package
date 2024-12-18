"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var PeriodUnit_1 = require("./PeriodUnit");
var SimulationTimeType_1 = require("./SimulationTimeType");
var ModelDefaults_1 = require("./ModelDefaults");
var Model = /** @class */ (function () {
    function Model(id, name, reps, forecastDays, seed, oneClockUnit, simulationTimeType, warmupClockPeriod, warmupClockPeriodUnit, runClockPeriod, runClockPeriodUnit, warmupDateTime, startDateTime, finishDateTime) {
        if (warmupDateTime === void 0) { warmupDateTime = null; }
        if (startDateTime === void 0) { startDateTime = null; }
        if (finishDateTime === void 0) { finishDateTime = null; }
        this.id = id;
        this.name = name;
        this.reps = reps;
        this.forecastDays = forecastDays;
        this.seed = seed;
        this.oneClockUnit = oneClockUnit;
        this.simulationTimeType = simulationTimeType;
        this.warmupClockPeriod = warmupClockPeriod;
        this.warmupClockPeriodUnit = warmupClockPeriodUnit;
        this.runClockPeriod = runClockPeriod;
        this.runClockPeriodUnit = runClockPeriodUnit;
        this.warmupDateTime = warmupDateTime;
        this.startDateTime = startDateTime;
        this.finishDateTime = finishDateTime;
        this.type = SimulationObjectType_1.SimulationObjectType.Model;
    }
    Model.createDefault = function (id) {
        return new Model(id, //id
        'New Model', //name
        ModelDefaults_1.ModelDefaults.DEFAULT_REPS, //reps
        ModelDefaults_1.ModelDefaults.DEFAULT_FORECAST_DAYS, //forecast
        ModelDefaults_1.ModelDefaults.DEFAULT_SEED, //seed
        ModelDefaults_1.ModelDefaults.DEFAULT_CLOCK_UNIT, //oneClockUnit
        SimulationTimeType_1.SimulationTimeType.Clock, //oneClockUnit
        0, //simulationTimeType
        PeriodUnit_1.PeriodUnit.HOURS, //warmupClockPeriod
        24, //runClockPeriod
        PeriodUnit_1.PeriodUnit.HOURS, //runClockPeriodUnit
        null, // warmupDateTime
        null, // startDateTime
        null // finishDateTime
        );
    };
    return Model;
}());
exports.Model = Model;
