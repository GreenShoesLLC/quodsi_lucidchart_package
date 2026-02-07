import { ElementTypeInfo } from "./ElementTypeInfo";
import { JsonObject } from "./common";

export interface ModelItemData {
    id: string;
    data: JsonObject;
    metadata: ElementTypeInfo;
    name: string | null;
    isUnconverted?: boolean;
}
