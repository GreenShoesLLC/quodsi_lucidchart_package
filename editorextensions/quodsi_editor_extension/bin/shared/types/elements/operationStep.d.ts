import { Duration } from "./duration";
import { ResourceSetRequest } from "./resourceSetRequest";
export declare class OperationStep {
    resourceSetRequest: ResourceSetRequest | null;
    duration: Duration;
    constructor(resourceSetRequest?: ResourceSetRequest | null, duration?: Duration);
}
