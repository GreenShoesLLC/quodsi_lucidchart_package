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
exports.PositionedSimulationObject = void 0;
/**
 * Abstract base class for simulation objects with location
 * Provides x and y coordinates while maintaining the core SimulationObject contract
 */
var PositionedSimulationObject = /** @class */ (function () {
    function PositionedSimulationObject() {
        // Location properties with default initialization
        this.x = 0;
        this.y = 0;
    }
    /**
     * Sets the location of the simulation object
     * @param x X-coordinate (default 0)
     * @param y Y-coordinate (default 0)
     */
    PositionedSimulationObject.prototype.setLocation = function (x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = x;
        this.y = y;
    };
    /**
     * Retrieves the current location of the object
     * @returns Object containing x and y coordinates
     */
    PositionedSimulationObject.prototype.getLocation = function () {
        return { x: this.x, y: this.y };
    };
    /**
     * Checks if the object has a meaningful location
     * Considers a location "set" if either x or y is non-zero
     * @returns Boolean indicating if location is set
     */
    PositionedSimulationObject.prototype.hasLocation = function () {
        return this.x !== 0 || this.y !== 0;
    };
    /**
     * Creates a shallow copy of the object with location preserved
     * @returns A new instance of the object with the same location
     */
    PositionedSimulationObject.prototype.clone = function () {
        var clonedObject = Object.create(Object.getPrototypeOf(this));
        Object.assign(clonedObject, this);
        return clonedObject;
    };
    /**
     * Resets the location to the default (0,0)
     */
    PositionedSimulationObject.prototype.resetLocation = function () {
        this.x = 0;
        this.y = 0;
    };
    /**
     * Serialization helper method
     * @returns Object representation including location and optional dimensions
     */
    PositionedSimulationObject.prototype.toJSON = function () {
        return __assign(__assign(__assign(__assign({}, this), { x: this.x, y: this.y }), (this.width !== undefined && { width: this.width })), (this.height !== undefined && { height: this.height }));
    };
    return PositionedSimulationObject;
}());
exports.PositionedSimulationObject = PositionedSimulationObject;
