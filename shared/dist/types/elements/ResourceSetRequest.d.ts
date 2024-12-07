import { RequestSetType } from "./RequestSetType";
import { ResourceRequest } from "./ResourceRequest";
export declare class ResourceSetRequest {
    name: string;
    requestType: RequestSetType;
    requests: Array<ResourceRequest | ResourceSetRequest>;
    constructor(name?: string, requestType?: RequestSetType, requests?: Array<ResourceRequest | ResourceSetRequest>);
}
//# sourceMappingURL=ResourceSetRequest.d.ts.map