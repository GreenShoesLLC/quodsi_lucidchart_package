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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransformationsBetweenVersions = exports.getTransformations = exports.AllTransformations = void 0;
__exportStar(require("./TransformationTypes"), exports);
__exportStar(require("./ActivityTransforms"), exports);
__exportStar(require("./ConnectorTransforms"), exports);
__exportStar(require("./EntityTransforms"), exports);
__exportStar(require("./GeneratorTransforms"), exports);
__exportStar(require("./ResourceTransforms"), exports);
__exportStar(require("./ModelTransforms"), exports);
var ActivityTransforms_1 = require("./ActivityTransforms");
var ConnectorTransforms_1 = require("./ConnectorTransforms");
var EntityTransforms_1 = require("./EntityTransforms");
var GeneratorTransforms_1 = require("./GeneratorTransforms");
var ResourceTransforms_1 = require("./ResourceTransforms");
var ModelTransforms_1 = require("./ModelTransforms");
var version_1 = require("../../constants/version");
/**
 * Collection of all available transformations
 */
exports.AllTransformations = [
    ModelTransforms_1.ModelTransforms,
    ActivityTransforms_1.ActivityTransforms,
    ConnectorTransforms_1.ConnectorTransforms,
    EntityTransforms_1.EntityTransforms,
    GeneratorTransforms_1.GeneratorTransforms,
    ResourceTransforms_1.ResourceTransforms
];
/**
 * Helper to get transformations for a specific object type
 */
function getTransformations(objectType) {
    return exports.AllTransformations.find(function (t) { return t.objectType === objectType; });
}
exports.getTransformations = getTransformations;
/**
 * Helper to get all transformations between two versions.
 * Uses range-based matching: applies all transforms where the document
 * hasn't been upgraded past the transform's sourceVersion yet, and the
 * transform's targetVersion is within the current version.
 * Results are ordered by sourceVersion ascending for correct chaining.
 */
function getTransformationsBetweenVersions(sourceVersion, targetVersion) {
    return exports.AllTransformations.map(function (transformSet) { return (__assign(__assign({}, transformSet), { transformations: transformSet.transformations
            .filter(function (t) {
            return (0, version_1.compareVersions)(t.sourceVersion, sourceVersion) >= 0 &&
                (0, version_1.compareVersions)(t.targetVersion, targetVersion) <= 0;
        })
            .sort(function (a, b) { return (0, version_1.compareVersions)(a.sourceVersion, b.sourceVersion); }) })); }).filter(function (transformSet) { return transformSet.transformations.length > 0; });
}
exports.getTransformationsBetweenVersions = getTransformationsBetweenVersions;
