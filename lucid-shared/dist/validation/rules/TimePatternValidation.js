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
exports.TimePatternValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var types_1 = require("../../quodsi-messaging/validation/types");
var TimePatternValidation = /** @class */ (function (_super) {
    __extends(TimePatternValidation, _super);
    function TimePatternValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimePatternValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var patterns = state.modelDefinition.timePatterns.getAll();
        patterns.forEach(function (pattern) {
            _this.validateTimePatternData(pattern, issues);
        });
    };
    TimePatternValidation.prototype.validateTimePatternData = function (pattern, issues) {
        this.log("Starting validation for TimePattern ID: ".concat(pattern.id, ", Name: ").concat(pattern.name));
        // Validate the pattern's name
        if (!pattern.name || pattern.name.trim().length === 0) {
            this.log("Validation failed: TimePattern ID ".concat(pattern.id, " has an empty or missing name."));
            issues.push(ValidationMessages_1.ValidationMessages.missingName('TimePattern', pattern.id, pattern.name));
        }
        // Validate weekly weights (must be exactly 52 if provided)
        if (pattern.weeklyWeights && pattern.weeklyWeights.length > 0) {
            if (pattern.weeklyWeights.length !== 52) {
                this.log("Validation failed: TimePattern ID ".concat(pattern.id, " has invalid weekly_weights length (").concat(pattern.weeklyWeights.length, ")."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_pattern_weekly_weights', "TimePattern '".concat(pattern.name, "' weekly_weights must contain exactly 52 values (ISO weeks 1-52), got ").concat(pattern.weeklyWeights.length), pattern.id));
            }
            // Check for non-negative weights
            var negativeWeights = pattern.weeklyWeights.filter(function (w) { return w < 0; });
            if (negativeWeights.length > 0) {
                this.log("Validation failed: TimePattern ID ".concat(pattern.id, " has negative weekly weights."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_pattern_negative_weights', "TimePattern '".concat(pattern.name, "' weekly_weights must be non-negative"), pattern.id));
            }
        }
        // Validate day-of-week weights (must be exactly 7 if provided)
        if (pattern.dayOfWeekWeights && pattern.dayOfWeekWeights.length > 0) {
            if (pattern.dayOfWeekWeights.length !== 7) {
                this.log("Validation failed: TimePattern ID ".concat(pattern.id, " has invalid day_of_week_weights length (").concat(pattern.dayOfWeekWeights.length, ")."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_pattern_day_of_week_weights', "TimePattern '".concat(pattern.name, "' day_of_week_weights must contain exactly 7 values (Monday-Sunday), got ").concat(pattern.dayOfWeekWeights.length), pattern.id));
            }
            var negativeWeights = pattern.dayOfWeekWeights.filter(function (w) { return w < 0; });
            if (negativeWeights.length > 0) {
                this.log("Validation failed: TimePattern ID ".concat(pattern.id, " has negative day-of-week weights."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_pattern_negative_weights', "TimePattern '".concat(pattern.name, "' day_of_week_weights must be non-negative"), pattern.id));
            }
        }
        // Validate day-of-week-hour weights (must be exactly 168 if provided)
        if (pattern.dayOfWeekHourWeights && pattern.dayOfWeekHourWeights.length > 0) {
            if (pattern.dayOfWeekHourWeights.length !== 168) {
                this.log("Validation failed: TimePattern ID ".concat(pattern.id, " has invalid day_of_week_hour_weights length (").concat(pattern.dayOfWeekHourWeights.length, ")."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_pattern_day_of_week_hour_weights', "TimePattern '".concat(pattern.name, "' day_of_week_hour_weights must contain exactly 168 values (7 days \u00D7 24 hours), got ").concat(pattern.dayOfWeekHourWeights.length), pattern.id));
            }
            var negativeWeights = pattern.dayOfWeekHourWeights.filter(function (w) { return w < 0; });
            if (negativeWeights.length > 0) {
                this.log("Validation failed: TimePattern ID ".concat(pattern.id, " has negative hourly weights."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_pattern_negative_weights', "TimePattern '".concat(pattern.name, "' day_of_week_hour_weights must be non-negative"), pattern.id));
            }
        }
        this.log("Completed validation for TimePattern ID: ".concat(pattern.id));
    };
    return TimePatternValidation;
}(ValidationRule_1.ValidationRule));
exports.TimePatternValidation = TimePatternValidation;
