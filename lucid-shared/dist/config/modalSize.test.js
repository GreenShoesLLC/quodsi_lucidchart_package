"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var modalSize_1 = require("./modalSize");
describe('modalSize config', function () {
    it('defaults to xlarge', function () {
        expect(modalSize_1.DEFAULT_MODAL_SIZE).toBe('xlarge');
    });
    it('has pixel dimensions for the three fixed sizes', function () {
        expect(modalSize_1.MODAL_SIZE_DIMENSIONS.medium).toEqual({ width: 1000, height: 700 });
        expect(modalSize_1.MODAL_SIZE_DIMENSIONS.large).toEqual({ width: 1400, height: 900 });
        expect(modalSize_1.MODAL_SIZE_DIMENSIONS.xlarge).toEqual({ width: 1600, height: 1000 });
    });
    it('offers all four sizes (including fullscreen) as options', function () {
        var values = modalSize_1.MODAL_SIZE_OPTIONS.map(function (o) { return o.value; });
        expect(values).toEqual(['medium', 'large', 'xlarge', 'fullscreen']);
        modalSize_1.MODAL_SIZE_OPTIONS.forEach(function (o) { return expect(o.label).toBeTruthy(); });
    });
});
