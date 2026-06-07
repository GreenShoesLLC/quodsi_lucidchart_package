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
exports.UnsupportedVersionError = void 0;
var SerializerError_1 = require("./SerializerError");
var UnsupportedVersionError = /** @class */ (function (_super) {
    __extends(UnsupportedVersionError, _super);
    function UnsupportedVersionError(version) {
        var _this = _super.call(this, "Version ".concat(version.toString(), " is not supported")) || this;
        _this.name = 'UnsupportedVersionError';
        Object.setPrototypeOf(_this, UnsupportedVersionError.prototype);
        return _this;
    }
    return UnsupportedVersionError;
}(SerializerError_1.SerializerError));
exports.UnsupportedVersionError = UnsupportedVersionError;
