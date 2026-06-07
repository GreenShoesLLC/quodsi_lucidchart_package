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
exports.EntityTransforms = void 0;
/**
 * Transformations for Entity objects
 */
exports.EntityTransforms = {
    objectType: 'Entity',
    transformations: [
        {
            sourceVersion: '2026.02.03',
            targetVersion: '2026.02.07',
            transform: function (data) {
                var _a;
                return (__assign(__assign({}, data), { description: (_a = data.description) !== null && _a !== void 0 ? _a : '' }));
            }
        }
    ]
};
