"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
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
    return Model;
}());
exports.Model = Model;
