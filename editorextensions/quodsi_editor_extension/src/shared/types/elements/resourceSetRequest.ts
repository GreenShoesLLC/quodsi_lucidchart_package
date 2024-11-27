import { RequestSetType } from "./enums/RequestSetType";
import { ResourceRequest } from "./resourceRequest";


export class ResourceSetRequest {
    constructor(
        public name: string = 'initial',
        public requestType: RequestSetType = RequestSetType.AND,
        public requests: Array<ResourceRequest | ResourceSetRequest> = []
    ) { }
}