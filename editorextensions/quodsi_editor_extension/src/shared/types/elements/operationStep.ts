import { Duration } from "./Duration";
import { ResourceSetRequest } from "./ResourceSetRequest";


export class OperationStep {
    constructor(
        public resourceSetRequest: ResourceSetRequest | null = null,
        public duration: Duration = new Duration()
    ) { }
}