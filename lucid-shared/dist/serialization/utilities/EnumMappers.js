"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMapper = exports.Mappers = void 0;
var EnumMapper_1 = require("./EnumMapper");
var SimulationObjectType_1 = require("../../types/elements/SimulationObjectType");
var PeriodUnit_1 = require("../../types/elements/PeriodUnit");
var DurationType_1 = require("../../types/elements/DurationType");
var RequirementMode_1 = require("../../types/elements/RequirementMode");
var SimulationTimeType_1 = require("../../types/elements/SimulationTimeType");
// Single instance for each enum type
exports.Mappers = {
    SimulationObjectType: new EnumMapper_1.EnumMapper(SimulationObjectType_1.SimulationObjectType),
    PeriodUnit: new EnumMapper_1.EnumMapper(PeriodUnit_1.PeriodUnit),
    DurationType: new EnumMapper_1.EnumMapper(DurationType_1.DurationType),
    RequirementMode: new EnumMapper_1.EnumMapper(RequirementMode_1.RequirementMode),
    SimulationTimeType: new EnumMapper_1.EnumMapper(SimulationTimeType_1.SimulationTimeType)
};
// Helper function to get a specific mapper
function getMapper(type) {
    return exports.Mappers[type];
}
exports.getMapper = getMapper;
