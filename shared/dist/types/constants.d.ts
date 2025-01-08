import { SerializedIsoDateObject } from "lucid-extension-sdk/core/data/serializedfield/serializedfields";
export declare const MAX_MILEAGE: number;
export declare const DATA_SOURCE_NAME = "Rental Car Manager";
export declare const CARS_COLLECTION_NAME = "Cars";
export declare const LOTS_COLLECTION_NAME = "Lots";
export declare const BLOCK_SIZES: {
    MARGIN: number;
    LOT_PADDING: number;
    CAR_HEIGHT: number;
    CAR_WIDTH: number;
    LOT_WIDTH: number;
    START_PADDING: number;
};
export declare enum Colors {
    Red = "Red",
    White = "White",
    Gray = "Gray"
}
export declare enum Statuses {
    OnTheLot = "On the lot",
    Rented = "Rented",
    InService = "In service"
}
export interface Car {
    id: string;
    type: string;
    make: string;
    model: string;
    color: string;
    miles: number;
    status: Statuses;
    lot: string;
    manufacturedDate: SerializedIsoDateObject;
    lastServiceDate: SerializedIsoDateObject;
    nextServiceDate: SerializedIsoDateObject;
}
export interface Lot {
    address: string;
    image: string;
}
export interface LotNode {
    lot: Lot;
    cars: Car[];
}
export declare const convertLotToLotNode: (l: Lot) => LotNode;
//# sourceMappingURL=constants.d.ts.map