"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializationError = exports.UnsupportedVersionError = exports.InvalidModelError = exports.SerializerError = exports.EnumMapper = exports.ModelDefinitionSerializerV1 = exports.offsetSerializedModelCoordinates = exports.parsePageTranslate = exports.BaseModelDefinitionSerializer = exports.SchemaVersion = exports.ModelSerializerFactory = void 0;
// Core exports
var ModelSerializerFactory_1 = require("./ModelSerializerFactory");
Object.defineProperty(exports, "ModelSerializerFactory", { enumerable: true, get: function () { return ModelSerializerFactory_1.ModelSerializerFactory; } });
Object.defineProperty(exports, "SchemaVersion", { enumerable: true, get: function () { return ModelSerializerFactory_1.SchemaVersion; } });
var BaseModelDefinitionSerializer_1 = require("./BaseModelDefinitionSerializer");
Object.defineProperty(exports, "BaseModelDefinitionSerializer", { enumerable: true, get: function () { return BaseModelDefinitionSerializer_1.BaseModelDefinitionSerializer; } });
// SVG <-> layout coordinate alignment (Approach A)
var coordinateAlignment_1 = require("./coordinateAlignment");
Object.defineProperty(exports, "parsePageTranslate", { enumerable: true, get: function () { return coordinateAlignment_1.parsePageTranslate; } });
Object.defineProperty(exports, "offsetSerializedModelCoordinates", { enumerable: true, get: function () { return coordinateAlignment_1.offsetSerializedModelCoordinates; } });
// V1 Serializer
var ModelDefinitionSerializerV1_1 = require("./v1/ModelDefinitionSerializerV1");
Object.defineProperty(exports, "ModelDefinitionSerializerV1", { enumerable: true, get: function () { return ModelDefinitionSerializerV1_1.ModelDefinitionSerializerV1; } });
var EnumMapper_1 = require("./utilities/EnumMapper");
Object.defineProperty(exports, "EnumMapper", { enumerable: true, get: function () { return EnumMapper_1.EnumMapper; } });
// Errors
var SerializerError_1 = require("./errors/SerializerError");
Object.defineProperty(exports, "SerializerError", { enumerable: true, get: function () { return SerializerError_1.SerializerError; } });
var InvalidModelError_1 = require("./errors/InvalidModelError");
Object.defineProperty(exports, "InvalidModelError", { enumerable: true, get: function () { return InvalidModelError_1.InvalidModelError; } });
var UnsupportedVersionError_1 = require("./errors/UnsupportedVersionError");
Object.defineProperty(exports, "UnsupportedVersionError", { enumerable: true, get: function () { return UnsupportedVersionError_1.UnsupportedVersionError; } });
var SerializationError_1 = require("./errors/SerializationError");
Object.defineProperty(exports, "SerializationError", { enumerable: true, get: function () { return SerializationError_1.SerializationError; } });
