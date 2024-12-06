"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceSetRequest = void 0;
var RequestSetType_1 = require("./RequestSetType");
var ResourceSetRequest = /** @class */ (function () {
    function ResourceSetRequest(name, requestType, requests) {
        if (name === void 0) { name = 'initial'; }
        if (requestType === void 0) { requestType = RequestSetType_1.RequestSetType.AND; }
        if (requests === void 0) { requests = []; }
        this.name = name;
        this.requestType = requestType;
        this.requests = requests;
    }
    return ResourceSetRequest;
}());
exports.ResourceSetRequest = ResourceSetRequest;
