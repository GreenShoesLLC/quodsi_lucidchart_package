import { Resource } from "./resource";
export declare class ResourceRequest {
    keepResource: boolean;
    resource: Resource | null;
    quantity: number;
    constructor(keepResource?: boolean, resource?: Resource | null, quantity?: number);
}
