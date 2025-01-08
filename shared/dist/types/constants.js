"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLotToLotNode = exports.Statuses = exports.Colors = exports.BLOCK_SIZES = exports.LOTS_COLLECTION_NAME = exports.CARS_COLLECTION_NAME = exports.DATA_SOURCE_NAME = exports.MAX_MILEAGE = void 0;
exports.MAX_MILEAGE = 200 * 1000;
exports.DATA_SOURCE_NAME = "Rental Car Manager";
exports.CARS_COLLECTION_NAME = "Cars";
exports.LOTS_COLLECTION_NAME = "Lots";
exports.BLOCK_SIZES = {
    MARGIN: 16,
    LOT_PADDING: 48,
    CAR_HEIGHT: 120,
    CAR_WIDTH: 360,
    LOT_WIDTH: 16 + 360 + 16,
    START_PADDING: 160,
};
var Colors;
(function (Colors) {
    Colors["Red"] = "Red";
    Colors["White"] = "White";
    Colors["Gray"] = "Gray";
})(Colors = exports.Colors || (exports.Colors = {}));
var Statuses;
(function (Statuses) {
    Statuses["OnTheLot"] = "On the lot";
    Statuses["Rented"] = "Rented";
    Statuses["InService"] = "In service";
})(Statuses = exports.Statuses || (exports.Statuses = {}));
var convertLotToLotNode = function (lot) {
    return {
        lot: lot,
        cars: [],
    };
};
exports.convertLotToLotNode = convertLotToLotNode;
