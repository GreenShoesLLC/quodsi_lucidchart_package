Both Activity and Connector contain 1 to many OperationStep

public operationSteps: OperationStep[] = [],

export class OperationStep {
    constructor(
        public resourceSetRequest: ResourceSetRequest | null = null,
        public duration: Duration = new Duration()
    ) { }
}

export class ResourceSetRequest {
    constructor(
        public name: string = 'initial',
        public requestType: RequestSetType = RequestSetType.AND,
        public requests: Array<ResourceRequest | ResourceSetRequest> = []
    ) { }
}

export class ResourceRequest {
    constructor(
        public keepResource: boolean = false,
        public resource: Resource | null = null,
        public quantity: number = 1
    ) { }
}

As you can see, OperationStep can define a duration of time and can optional contain 1 to many sets of resource requests that can be anded or OR together.  

If you look at the current ActivityEditor.tsx, you will see it is rendering 1 to many of the Operation Steps in the user interface.  Notice that each Operation Step UI does not allow the user to pick a Resource.

I would like to add the ability for the user to add 1 to many "Resource Requests" where the user can select from a list of Resource names and then enter a quantity.  The resource names list should come from the ModelManager and/or ModelDefinition found in the ModelPanel.

