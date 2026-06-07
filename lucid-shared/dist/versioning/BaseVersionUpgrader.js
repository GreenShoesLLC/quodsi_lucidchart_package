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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseVersionUpgrader = void 0;
var PreflightResult_1 = require("./PreflightResult");
/**
 * Base implementation of version upgrader
 * Provides common functionality for platform-specific upgraders
 */
var BaseVersionUpgrader = /** @class */ (function () {
    function BaseVersionUpgrader(currentVersion, options) {
        if (options === void 0) { options = {}; }
        this.currentVersion = currentVersion;
        this.options = options;
    }
    /**
     * Checks if source version can be upgraded to current version
     */
    BaseVersionUpgrader.prototype.canUpgrade = function (sourceVersion) {
        // Simple version comparison for now
        return sourceVersion !== this.currentVersion;
    };
    /**
     * Performs validation check before attempting upgrade
     */
    BaseVersionUpgrader.prototype.preflight = function (page) {
        return __awaiter(this, void 0, void 0, function () {
            var sourceVersion, issues, baseIssues, platformIssues, hasErrors;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getSourceVersion(page)];
                    case 1:
                        sourceVersion = _a.sent();
                        issues = [];
                        return [4 /*yield*/, this.validateBaseRequirements(page)];
                    case 2:
                        baseIssues = _a.sent();
                        issues.push.apply(issues, baseIssues);
                        return [4 /*yield*/, this.validatePlatformRequirements(page)];
                    case 3:
                        platformIssues = _a.sent();
                        issues.push.apply(issues, platformIssues);
                        hasErrors = issues.some(function (issue) { return issue.severity === PreflightResult_1.UpgradeIssueSeverity.Error; });
                        return [2 /*return*/, {
                                canUpgrade: !hasErrors,
                                sourceVersion: sourceVersion,
                                targetVersion: this.currentVersion,
                                issues: issues
                            }];
                }
            });
        });
    };
    /**
     * Performs the upgrade on all elements
     */
    BaseVersionUpgrader.prototype.upgrade = function (page) {
        return __awaiter(this, void 0, void 0, function () {
            var preflightResult, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.options.skipPreflight) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.preflight(page)];
                    case 1:
                        preflightResult = _a.sent();
                        if (!preflightResult.canUpgrade) {
                            throw new Error('Preflight check failed. Cannot proceed with upgrade.');
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, , 8]);
                        return [4 /*yield*/, this.beginUpgrade(page)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.performUpgrade(page)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.finalizeUpgrade(page)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        error_1 = _a.sent();
                        return [4 /*yield*/, this.rollbackUpgrade(page)];
                    case 7:
                        _a.sent();
                        throw error_1;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validates basic requirements common to all platforms
     */
    BaseVersionUpgrader.prototype.validateBaseRequirements = function (page) {
        return __awaiter(this, void 0, void 0, function () {
            var issues;
            return __generator(this, function (_a) {
                issues = [];
                // Example base validation
                if (!page) {
                    issues.push({
                        message: 'No page/document provided',
                        severity: PreflightResult_1.UpgradeIssueSeverity.Error
                    });
                }
                return [2 /*return*/, issues];
            });
        });
    };
    return BaseVersionUpgrader;
}());
exports.BaseVersionUpgrader = BaseVersionUpgrader;
