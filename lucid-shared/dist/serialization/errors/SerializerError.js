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
exports.SerializerError = void 0;
var SerializerError = /** @class */ (function (_super) {
    __extends(SerializerError, _super);
    function SerializerError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'SerializerError';
        Object.setPrototypeOf(_this, SerializerError.prototype);
        return _this;
    }
    return SerializerError;
}(Error));
exports.SerializerError = SerializerError;
