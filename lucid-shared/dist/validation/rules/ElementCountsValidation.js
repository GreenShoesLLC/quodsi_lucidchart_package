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
exports.ElementCountsValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
/**
 * Validates basic element counts and requirements.
 */
var ElementCountsValidation = /** @class */ (function (_super) {
    __extends(ElementCountsValidation, _super);
    function ElementCountsValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ElementCountsValidation.prototype.validate = function (state, issues) {
        var modelDefinition = state.modelDefinition;
        this.log("Starting validation of element counts.");
        if (modelDefinition.generators.size() === 0) {
            this.log("Validation failed: Model has no generators.");
            issues.push(ValidationMessages_1.ValidationMessages.missingRequiredElement('generator'));
        }
        if (modelDefinition.activities.size() === 0) {
            this.log("Validation failed: Model has no activities.");
            issues.push(ValidationMessages_1.ValidationMessages.missingRequiredElement('activity'));
        }
        // if (modelDefinition.resources.size() === 0) {
        //     this.log("Validation warning: Model has no resources defined.");
        //     issues.push({
        //         type: 'warning',
        //         message: 'Model has no resources defined'
        //     });
        // }
        if (modelDefinition.entities.size() === 0) {
            this.log("Validation failed: Model has no entities.");
            issues.push(ValidationMessages_1.ValidationMessages.missingRequiredElement('entity'));
        }
        this.log("Completed validation of element counts.");
    };
    return ElementCountsValidation;
}(ValidationRule_1.ValidationRule));
exports.ElementCountsValidation = ElementCountsValidation;
