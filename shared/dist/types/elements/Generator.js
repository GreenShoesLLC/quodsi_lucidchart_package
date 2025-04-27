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
var PositionedSimulationObject_1 = require("./PositionedSimulationObject");
var ModelDefaults_1 = require("./ModelDefaults");
var PeriodUnit_1 = require("./PeriodUnit");
var distributions_1 = require("./distributions");
var Generator = /** @class */ (function (_super) {
    __extends(Generator, _super);
    function Generator(id, name, activityKeyId, entityId, periodicOccurrences, periodIntervalDuration, entitiesPerCreation, periodicStartDuration, maxEntities, x, y) {
        if (activityKeyId === void 0) { activityKeyId = ""; }
        if (entityId === void 0) { entityId = ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_ID; }
        if (periodicOccurrences === void 0) { periodicOccurrences = Infinity; }
        if (periodIntervalDuration === void 0) { periodIntervalDuration = new Duration_1.Duration(); }
        if (entitiesPerCreation === void 0) { entitiesPerCreation = 1; }
        if (periodicStartDuration === void 0) { periodicStartDuration = new Duration_1.Duration(); }
        if (maxEntities === void 0) { maxEntities = Infinity; }
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var _this = _super.call(this) || this;
        _this.id = id;
        _this.name = name;
        _this.activityKeyId = activityKeyId;
        _this.entityId = entityId;
        _this.periodicOccurrences = periodicOccurrences;
        _this.periodIntervalDuration = periodIntervalDuration;
        _this.entitiesPerCreation = entitiesPerCreation;
        _this.periodicStartDuration = periodicStartDuration;
        _this.maxEntities = maxEntities;
        _this.type = SimulationObjectType_1.SimulationObjectType.Generator;
        // Set location using inherited method
        _this.setLocation(x, y);
        return _this;
    }
    Generator.createDefault = function (id, x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        var generator = new Generator(id, 'New Generator', '{SomeActivityName}', ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_ID, 10, // periodicOccurrences
        new Duration_1.Duration(PeriodUnit_1.PeriodUnit.HOURS, distributions_1.ConstantDistribution.create(1)), // periodIntervalDuration
        1, // entitiesPerCreation
        new Duration_1.Duration(PeriodUnit_1.PeriodUnit.HOURS, distributions_1.ConstantDistribution.create(1)), // periodicStartDuration
        999 // maxEntities
        );
        // Set location using inherited method
        generator.setLocation(x, y);
        return generator;
    };
    return Generator;
}(PositionedSimulationObject_1.PositionedSimulationObject));
exports.Generator = Generator;
