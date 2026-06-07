"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelSerializerFactory = exports.SchemaVersion = void 0;
var ModelDefinitionSerializerV1_1 = require("./v1/ModelDefinitionSerializerV1");
var UnsupportedVersionError_1 = require("./errors/UnsupportedVersionError");
var SchemaVersion = /** @class */ (function () {
    function SchemaVersion(major, minor) {
        this.major = major;
        this.minor = minor;
    }
    SchemaVersion.prototype.toString = function () {
        return "".concat(this.major, ".").concat(this.minor);
    };
    SchemaVersion.prototype.equals = function (other) {
        return this.major === other.major && this.minor === other.minor;
    };
    return SchemaVersion;
}());
exports.SchemaVersion = SchemaVersion;
var ModelSerializerFactory = /** @class */ (function () {
    function ModelSerializerFactory() {
    }
    /**
     * Creates a serializer for the specified model definition and version.
     * If no version is specified, uses the latest supported version.
     */
    ModelSerializerFactory.create = function (modelDefinition, version) {
        if (version === void 0) { version = ModelSerializerFactory.CURRENT_VERSION; }
        if (!ModelSerializerFactory.isVersionSupported(version)) {
            throw new UnsupportedVersionError_1.UnsupportedVersionError(version);
        }
        if (version.major === 1 && version.minor === 0) {
            return new ModelDefinitionSerializerV1_1.ModelDefinitionSerializerV1();
        }
        // This should never happen due to the isVersionSupported check above
        throw new UnsupportedVersionError_1.UnsupportedVersionError(version);
    };
    /**
     * Gets the current (latest) supported version.
     */
    ModelSerializerFactory.getCurrentVersion = function () {
        return ModelSerializerFactory.CURRENT_VERSION;
    };
    /**
     * Checks if the specified version is supported.
     */
    ModelSerializerFactory.isVersionSupported = function (version) {
        return ModelSerializerFactory.SUPPORTED_VERSIONS.some(function (supportedVersion) { return supportedVersion.equals(version); });
    };
    /**
     * Gets all supported versions.
     */
    ModelSerializerFactory.getSupportedVersions = function () {
        return __spreadArray([], ModelSerializerFactory.SUPPORTED_VERSIONS, true);
    };
    /**
     * Gets a list of supported version strings.
     */
    ModelSerializerFactory.getSupportedVersionStrings = function () {
        return ModelSerializerFactory.SUPPORTED_VERSIONS.map(function (v) { return v.toString(); });
    };
    ModelSerializerFactory.SUPPORTED_VERSIONS = [
        new SchemaVersion(1, 0)
    ];
    ModelSerializerFactory.CURRENT_VERSION = ModelSerializerFactory.SUPPORTED_VERSIONS[ModelSerializerFactory.SUPPORTED_VERSIONS.length - 1];
    return ModelSerializerFactory;
}());
exports.ModelSerializerFactory = ModelSerializerFactory;
