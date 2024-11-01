import { Resource } from "./resource";

export class ResourceRequest {
    constructor(
        public keepResource: boolean = false,
        public resource: Resource | null = null,
        public quantity: number = 1
    ) { }
}