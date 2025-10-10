import { MetaData } from "./MetaData";
import { JsonObject } from "./common";

export interface ModelItemData {
    id: string;
    data: JsonObject;
    metadata: MetaData;
    name: string | null;
    isUnconverted?: boolean;
}
