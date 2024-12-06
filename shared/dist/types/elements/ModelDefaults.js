"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelDefaults = void 0;
var PeriodUnit_1 = require("./PeriodUnit");
var SimulationTimeType_1 = require("./SimulationTimeType");
var ModelDefaults;
(function (ModelDefaults) {
    ModelDefaults.DEFAULT_SEED = 12345;
    ModelDefaults.DEFAULT_CLOCK_UNIT = PeriodUnit_1.PeriodUnit.MINUTES;
    ModelDefaults.DEFAULT_SIMULATION_TIME_TYPE = SimulationTimeType_1.SimulationTimeType.Clock;
    ModelDefaults.DEFAULT_WARMUP_PERIOD = 0.0;
    ModelDefaults.DEFAULT_RUN_PERIOD = 0.0;
    ModelDefaults.DEFAULT_REPS = 1;
    ModelDefaults.DEFAULT_FORECAST_DAYS = 30;
    ModelDefaults.DEFAULT_ENTITY_ID = "00000000-0000-0000-0000-000000000000";
    ModelDefaults.DEFAULT_ENTITY_NAME = "Default Entity";
})(ModelDefaults = exports.ModelDefaults || (exports.ModelDefaults = {}));
