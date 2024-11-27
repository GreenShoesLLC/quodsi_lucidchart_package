import { RequestSetType } from "./enums/RequestSetType";
import { ResourceRequest } from "./resourceRequest";
export declare class ResourceSetRequest {
    name: string;
    requestType: RequestSetType;
    requests: Array<ResourceRequest | ResourceSetRequest>;
    constructor(name?: string, requestType?: RequestSetType, requests?: Array<ResourceRequest | ResourceSetRequest>);
}
