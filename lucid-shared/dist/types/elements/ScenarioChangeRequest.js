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
exports.summarizeChangeRequest = exports.ScenarioChangeRequest = void 0;
var ScenarioObjectType_1 = require("./ScenarioObjectType");
var NumericPropertyModification_1 = require("./NumericPropertyModification");
var BooleanPropertyModification_1 = require("./BooleanPropertyModification");
var DurationModification_1 = require("./DurationModification");
var ResourceRequirementModification_1 = require("./ResourceRequirementModification");
var ScenarioPropertyName_1 = require("./ScenarioPropertyName");
var uuidUtils_1 = require("../../utils/uuidUtils");
var ScenarioChangeRequest = /** @class */ (function () {
    function ScenarioChangeRequest(options) {
        var _a;
        this.id = (_a = options.id) !== null && _a !== void 0 ? _a : (0, uuidUtils_1.generateUUID)();
        this.objectType = options.objectType;
        this.objectMatchCriteria = options.objectMatchCriteria;
        this.modificationDetails = options.modificationDetails;
        this.description = options.description;
        this.actionId = options.actionId;
    }
    ScenarioChangeRequest.prototype.toJSON = function () {
        return __assign({ id: this.id, objectType: this.objectType, objectMatchCriteria: this.objectMatchCriteria, modificationDetails: this.modificationDetails.toJSON(), description: this.description }, (this.actionId !== undefined ? { actionId: this.actionId } : {}));
    };
    ScenarioChangeRequest.fromJSON = function (data) {
        var modData = data.modificationDetails;
        var modification;
        if (modData.type === "boolean") {
            modification = BooleanPropertyModification_1.BooleanPropertyModification.fromJSON(modData);
        }
        else if (modData.type === "duration") {
            modification = DurationModification_1.DurationModification.fromJSON(modData);
        }
        else if (modData.type === "reference") {
            modification = ResourceRequirementModification_1.ResourceRequirementModification.fromJSON(modData);
        }
        else {
            modification = NumericPropertyModification_1.NumericPropertyModification.fromJSON(modData);
        }
        return new ScenarioChangeRequest({
            id: data.id,
            objectType: data.objectType,
            objectMatchCriteria: data.objectMatchCriteria,
            modificationDetails: modification,
            description: data.description,
            actionId: data.actionId,
        });
    };
    return ScenarioChangeRequest;
}());
exports.ScenarioChangeRequest = ScenarioChangeRequest;
/**
 * Generate the one-line summary shown in collapsed change-request rows.
 * Example: "ACTIVITY Workstation1: Activity Capacity Set to 5"
 */
function summarizeChangeRequest(cr) {
    var _a, _b, _c;
    var target = (_a = cr.objectMatchCriteria.name) !== null && _a !== void 0 ? _a : '<unnamed>';
    var mod = cr.modificationDetails;
    var propLabel = (_b = ScenarioPropertyName_1.PROPERTY_DISPLAY_LABELS[mod.propertyName]) !== null && _b !== void 0 ? _b : mod.propertyName;
    var targetText = cr.objectType === ScenarioObjectType_1.ScenarioObjectType.MODEL
        ? "".concat(cr.objectType)
        : "".concat(cr.objectType, " ").concat(target);
    if (mod instanceof NumericPropertyModification_1.NumericPropertyModification) {
        return "".concat(targetText, ": ").concat(propLabel, " ").concat(mod.setterType, " ").concat(mod.newValue);
    }
    if (mod instanceof DurationModification_1.DurationModification) {
        var isArrival = mod.propertyName === ScenarioPropertyName_1.ScenarioPropertyName.INTERARRIVAL_TIMING;
        if (mod.mode === 'scaleRate') {
            var noun = isArrival ? 'Arrival rate' : 'Duration';
            return "".concat(targetText, ": ").concat(noun, " \u00D7").concat(mod.factor);
        }
        var dtype = (_c = mod.duration) === null || _c === void 0 ? void 0 : _c.distribution.distributionType;
        var name_1 = dtype !== null && dtype !== void 0 ? dtype : '—';
        var what = isArrival ? 'arrival distribution' : 'duration';
        return "".concat(targetText, ": ").concat(what, " \u2192 ").concat(name_1);
    }
    if (mod instanceof ResourceRequirementModification_1.ResourceRequirementModification) {
        return "".concat(targetText, ": ").concat(propLabel, " \u2192 ").concat(mod.resourceRequirementId);
    }
    // Boolean (unused by MVP UI but supported by serialization)
    return "".concat(targetText, ": ").concat(propLabel, " = ").concat(mod.newValue);
}
exports.summarizeChangeRequest = summarizeChangeRequest;
