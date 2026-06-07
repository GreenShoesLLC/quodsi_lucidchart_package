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
exports.TimeDistributedConfigValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var types_1 = require("../../quodsi-messaging/validation/types");
var TimeDistributedConfigValidation = /** @class */ (function (_super) {
    __extends(TimeDistributedConfigValidation, _super);
    function TimeDistributedConfigValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TimeDistributedConfigValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var configs = state.modelDefinition.timeDistributedConfigs.getAll();
        configs.forEach(function (config) {
            _this.validateTimeDistributedConfigData(config, state, issues);
        });
    };
    TimeDistributedConfigValidation.prototype.validateTimeDistributedConfigData = function (config, state, issues) {
        this.log("Starting validation for TimeDistributedConfig ID: ".concat(config.id, ", Name: ").concat(config.name));
        // Validate the config's name
        if (!config.name || config.name.trim().length === 0) {
            this.log("Validation failed: TimeDistributedConfig ID ".concat(config.id, " has an empty or missing name."));
            issues.push(ValidationMessages_1.ValidationMessages.missingName('TimeDistributedConfig', config.id, config.name));
        }
        // Validate time pattern reference
        if (!config.timePatternId || config.timePatternId.trim().length === 0) {
            this.log("Validation failed: TimeDistributedConfig ID ".concat(config.id, " does not specify a time_pattern_id."));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_distributed_config_pattern_ref', "TimeDistributedConfig '".concat(config.name, "' must reference a valid TimePattern"), config.id));
        }
        else {
            var patternExists = state.modelDefinition.timePatterns.get(config.timePatternId);
            if (!patternExists) {
                this.log("Validation failed: TimeDistributedConfig ID ".concat(config.id, " references non-existent pattern (").concat(config.timePatternId, ")."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_distributed_config_pattern_ref', "TimeDistributedConfig '".concat(config.name, "' references non-existent TimePattern '").concat(config.timePatternId, "'"), config.id));
            }
        }
        // Validate total volume
        if (typeof config.totalVolume !== 'number' || config.totalVolume < 0) {
            this.log("Validation failed: TimeDistributedConfig ID ".concat(config.id, " has invalid total_volume (").concat(config.totalVolume, ")."));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_distributed_config_total_volume', "TimeDistributedConfig '".concat(config.name, "' total_volume must be non-negative"), config.id));
        }
        // Validate start_date format (ISO 8601: YYYY-MM-DD)
        if (!config.startDate || !this.isValidISODate(config.startDate)) {
            this.log("Validation failed: TimeDistributedConfig ID ".concat(config.id, " has invalid start_date (").concat(config.startDate, ")."));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_distributed_config_start_date', "TimeDistributedConfig '".concat(config.name, "' start_date must be valid ISO 8601 format (YYYY-MM-DD)"), config.id));
        }
        // Validate end_date format (ISO 8601: YYYY-MM-DD)
        if (!config.endDate || !this.isValidISODate(config.endDate)) {
            this.log("Validation failed: TimeDistributedConfig ID ".concat(config.id, " has invalid end_date (").concat(config.endDate, ")."));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_distributed_config_end_date', "TimeDistributedConfig '".concat(config.name, "' end_date must be valid ISO 8601 format (YYYY-MM-DD)"), config.id));
        }
        // Validate end_date > start_date
        if (config.startDate && config.endDate && this.isValidISODate(config.startDate) && this.isValidISODate(config.endDate)) {
            var startDate = new Date(config.startDate);
            var endDate = new Date(config.endDate);
            if (endDate <= startDate) {
                this.log("Validation failed: TimeDistributedConfig ID ".concat(config.id, " has end_date <= start_date."));
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'time_distributed_config_date_range', "TimeDistributedConfig '".concat(config.name, "' end_date must be after start_date"), config.id));
            }
        }
        this.log("Completed validation for TimeDistributedConfig ID: ".concat(config.id));
    };
    TimeDistributedConfigValidation.prototype.isValidISODate = function (dateStr) {
        // ISO 8601 date format: YYYY-MM-DD
        var regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) {
            return false;
        }
        // Check if it's a valid date
        var date = new Date(dateStr);
        return date instanceof Date && !isNaN(date.getTime());
    };
    return TimeDistributedConfigValidation;
}(ValidationRule_1.ValidationRule));
exports.TimeDistributedConfigValidation = TimeDistributedConfigValidation;
