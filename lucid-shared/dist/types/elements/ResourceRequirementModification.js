"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceRequirementModification = void 0;
/**
 * Swaps the resource requirement an action (Seize / Release / DelayWithResource)
 * points at. Reference swap, discriminator type:"reference". Mirrors the engine's
 * ResourceRequirementPropertyModification.
 */
var ResourceRequirementModification = /** @class */ (function () {
    function ResourceRequirementModification(options) {
        this.propertyName = options.propertyName;
        this.resourceRequirementId = options.resourceRequirementId;
    }
    ResourceRequirementModification.prototype.toJSON = function () {
        return { type: "reference", propertyName: this.propertyName, resourceRequirementId: this.resourceRequirementId };
    };
    ResourceRequirementModification.fromJSON = function (data) {
        var _a;
        return new ResourceRequirementModification({
            propertyName: data.propertyName,
            resourceRequirementId: (_a = data.resourceRequirementId) !== null && _a !== void 0 ? _a : "",
        });
    };
    return ResourceRequirementModification;
}());
exports.ResourceRequirementModification = ResourceRequirementModification;
