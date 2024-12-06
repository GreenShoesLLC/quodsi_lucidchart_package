"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectTypeUtils = exports.ConnectType = void 0;
// connectType.ts
var ConnectType;
(function (ConnectType) {
    ConnectType["Probability"] = "Probability";
    ConnectType["AttributeValue"] = "AttributeValue";
})(ConnectType = exports.ConnectType || (exports.ConnectType = {}));
var ConnectTypeUtils = /** @class */ (function () {
    function ConnectTypeUtils() {
    }
    ConnectTypeUtils.stringToConnectRule = function (inputStr) {
        // Normalize the input string to lower case to make the matching case-insensitive
        var normalizedStr = inputStr.toLowerCase();
        // Define a mapping of string representations to ConnectType values
        var stringToEnumMapping = {
            "percentage": ConnectType.Probability,
            "attributevalue": ConnectType.AttributeValue
        };
        // Look up the normalized string in the mapping and return the corresponding ConnectType value
        // If the input string doesn't match any key in the mapping, throw an Error
        if (normalizedStr in stringToEnumMapping) {
            return stringToEnumMapping[normalizedStr];
        }
        else {
            throw new Error("Unknown ConnectType: '".concat(inputStr, "'"));
        }
    };
    return ConnectTypeUtils;
}());
exports.ConnectTypeUtils = ConnectTypeUtils;
