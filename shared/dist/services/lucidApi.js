"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLucidApiService = exports.LucidApiService = void 0;
// src/services/lucidApi.ts
var axios_1 = __importDefault(require("axios"));
var LucidApiService = /** @class */ (function () {
    function LucidApiService(baseUrl) {
        if (!baseUrl) {
            throw new Error('baseUrl is required for LucidApiService');
        }
        this.baseURL = baseUrl;
    }
    LucidApiService.prototype.simulateDocument = function (documentId, pageId, userId, authToken) {
        return __awaiter(this, void 0, void 0, function () {
            var url, headers, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        url = "".concat(this.baseURL, "Lucid/simulate/").concat(documentId, "?pageId=").concat(pageId, "&userId=").concat(userId);
                        headers = {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        };
                        if (authToken) {
                            headers['Authorization'] = "Bearer ".concat(authToken);
                        }
                        return [4 /*yield*/, (0, axios_1.default)({
                                method: 'POST',
                                url: url,
                                headers: headers
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.status !== 200) {
                            throw new Error("HTTP error! status: ".concat(response.status));
                        }
                        return [2 /*return*/, true];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error in simulateDocument:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LucidApiService.prototype.getActivityUtilization = function (documentId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var blobName, url, response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        blobName = "".concat(userId, "/activity_utilization.csv");
                        url = "".concat(this.baseURL, "Lucid/files/").concat(documentId, "/").concat(blobName);
                        return [4 /*yield*/, (0, axios_1.default)({
                                method: 'GET',
                                url: url,
                                responseType: 'text'
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.status !== 200) {
                            throw new Error("HTTP error! status: ".concat(response.status));
                        }
                        return [2 /*return*/, response.data];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Error in getActivityUtilization:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LucidApiService.prototype.getDocumentStatus = function (documentId, authToken) {
        return __awaiter(this, void 0, void 0, function () {
            var url, headers, response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        url = "".concat(this.baseURL, "Lucid/status/").concat(documentId);
                        headers = {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        };
                        if (authToken) {
                            headers['Authorization'] = "Bearer ".concat(authToken);
                        }
                        return [4 /*yield*/, (0, axios_1.default)({
                                method: 'GET',
                                url: url,
                                headers: headers
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.status !== 200) {
                            throw new Error("HTTP error! status: ".concat(response.status));
                        }
                        return [2 /*return*/, response.data];
                    case 2:
                        error_3 = _a.sent();
                        console.error('Error in getDocumentStatus:', error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LucidApiService.prototype.getSimulationStatus = function (documentId) {
        return __awaiter(this, void 0, void 0, function () {
            var url, response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        url = "".concat(this.baseURL, "Lucid/status/").concat(documentId);
                        return [4 /*yield*/, (0, axios_1.default)({
                                method: 'GET',
                                url: url,
                                headers: {
                                    'Accept': 'application/json'
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.status !== 200) {
                            throw new Error("HTTP error! status: ".concat(response.status));
                        }
                        return [2 /*return*/, response.data];
                    case 2:
                        error_4 = _a.sent();
                        console.error('Error in getSimulationStatus:', error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return LucidApiService;
}());
exports.LucidApiService = LucidApiService;
function createLucidApiService(baseUrl) {
    return new LucidApiService(baseUrl);
}
exports.createLucidApiService = createLucidApiService;
