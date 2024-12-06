"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceRequest = void 0;
var ResourceRequest = /** @class */ (function () {
    function ResourceRequest(keepResource, resource, quantity) {
        if (keepResource === void 0) { keepResource = false; }
        if (resource === void 0) { resource = null; }
        if (quantity === void 0) { quantity = 1; }
        this.keepResource = keepResource;
        this.resource = resource;
        this.quantity = quantity;
    }
    return ResourceRequest;
}());
exports.ResourceRequest = ResourceRequest;
