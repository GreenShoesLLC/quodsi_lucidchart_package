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
exports.Generator = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var Duration_1 = require("./Duration");
var FlowNode_1 = require("./FlowNode");
var ModelDefaults_1 = require("./ModelDefaults");
var PeriodUnit_1 = require("./PeriodUnit");
var distributions_1 = require("./distributions");
var EntitySourceConfig_1 = require("./EntitySourceConfig");
var Generator = /** @class */ (function (_super) {
    __extends(Generator, _super);
    function Generator(id, name, generationConfig, exitConnector, x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.name = name;
        _this.type = SimulationObjectType_1.SimulationObjectType.Generator;
        _this.description = '';
        _this.generationConfig = generationConfig;
        _this.exitConnector = exitConnector;
        _this.setLocation(x, y);
        return _this;
    }
    Generator.createDefault = function (id, x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var defaultDuration = new Duration_1.Duration(PeriodUnit_1.PeriodUnit.HOURS, distributions_1.ExponentialDistribution.create(1));
        var generationConfig = (0, EntitySourceConfig_1.createDefaultEntitySourceConfig)(ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_ID, defaultDuration);
        generationConfig.periodicOccurrences = 999999;
        generationConfig.maxEntities = 999999;
        return new Generator(id, 'New Generator', generationConfig, undefined, x, y);
    };
    return Generator;
}(FlowNode_1.FlowNode));
exports.Generator = Generator;
