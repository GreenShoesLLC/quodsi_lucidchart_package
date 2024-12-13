import { MetaData } from "src/types/MetaData";
import { JsonObject } from "../JsonTypes";
export interface ElementData {
    id: string;
    data: JsonObject;
    metadata: MetaData;
    name: string | null;
    isUnconverted?: boolean;
}
//# sourceMappingURL=ElementData.d.ts.map