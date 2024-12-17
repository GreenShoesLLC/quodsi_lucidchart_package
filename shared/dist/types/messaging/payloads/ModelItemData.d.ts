import { MetaData } from "src/types/MetaData";
import { JsonObject } from "../JsonTypes";
export interface ModelItemData {
    id: string;
    data: JsonObject;
    metadata: MetaData;
    name: string | null;
    isUnconverted?: boolean;
}
//# sourceMappingURL=ModelItemData.d.ts.map