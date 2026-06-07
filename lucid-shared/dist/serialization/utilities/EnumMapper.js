"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnumMapper = void 0;
var EnumMapper = /** @class */ (function () {
    function EnumMapper(enumType) {
        this.enumType = enumType;
        this.stringToEnumMap = new Map();
        this.enumToStringMap = new Map();
        this.initializeMaps();
    }
    EnumMapper.prototype.initializeMaps = function () {
        var _this = this;
        // Create bidirectional mappings for enum values
        Object.entries(this.enumType)
            .filter(function (_a) {
            var key = _a[0];
            return isNaN(Number(key));
        }) // Filter out reverse mappings
            .forEach(function (_a) {
            var key = _a[0], value = _a[1];
            var enumValue = value;
            _this.stringToEnumMap.set(key, enumValue);
            _this.enumToStringMap.set(enumValue, key);
        });
    };
    EnumMapper.prototype.toString = function (enumValue) {
        var stringValue = this.enumToStringMap.get(enumValue);
        if (stringValue === undefined) {
            throw new Error("Invalid enum value: ".concat(enumValue));
        }
        return stringValue;
    };
    EnumMapper.prototype.toEnum = function (stringValue) {
        var enumValue = this.stringToEnumMap.get(stringValue);
        if (enumValue === undefined) {
            throw new Error("Invalid string value: ".concat(stringValue));
        }
        return enumValue;
    };
    EnumMapper.prototype.isValidEnumValue = function (value) {
        return this.enumToStringMap.has(value);
    };
    EnumMapper.prototype.isValidStringValue = function (value) {
        return this.stringToEnumMap.has(value);
    };
    EnumMapper.prototype.getAllValidStrings = function () {
        return Array.from(this.stringToEnumMap.keys());
    };
    EnumMapper.prototype.getAllValidEnumValues = function () {
        return Array.from(this.enumToStringMap.keys());
    };
    return EnumMapper;
}());
exports.EnumMapper = EnumMapper;
