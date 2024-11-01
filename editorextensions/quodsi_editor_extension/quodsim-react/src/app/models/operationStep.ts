import { Duration } from "./duration";
import { ResourceSetRequest } from "./resourceSetRequest";

export class OperationStep {
    constructor(
        public resourceSetRequest: ResourceSetRequest | null = null,
        public duration: Duration = new Duration()
    ) { }
}