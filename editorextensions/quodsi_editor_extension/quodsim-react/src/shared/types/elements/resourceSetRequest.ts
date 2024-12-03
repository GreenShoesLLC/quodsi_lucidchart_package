import { RequestSetType } from "./RequestSetType";
import { ResourceRequest } from "./ResourceRequest";


export class ResourceSetRequest {
    constructor(
        public name: string = 'initial',
        public requestType: RequestSetType = RequestSetType.AND,
        public requests: Array<ResourceRequest | ResourceSetRequest> = []
    ) { }
}