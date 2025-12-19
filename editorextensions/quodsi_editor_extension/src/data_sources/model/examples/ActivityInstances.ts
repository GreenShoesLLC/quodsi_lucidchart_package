import { DataProxy } from "lucid-extension-sdk";
import { MODEL_COLLECTIONS } from "../ModelDataSource";

export async function createExampleInstances(data: DataProxy) {
    const source = data.dataSources.get("model_source");
    if (!source) return;

    // Resources
    await source.collections.get(MODEL_COLLECTIONS.RESOURCES)?.patchItems({
        added: [{
            id: "dev-1",
            name: "Developer",
            capacity: 10,
            type: "Resource"
        }]
    });

    // ResourceRequirements
    await source.collections.get(MODEL_COLLECTIONS.RESOURCE_REQUIREMENTS)?.patchItems({
        added: [{
            id: "req_dev-1",
            name: "Requirement for Developer",
            type: "ResourceRequirement"
        }]
    });

    // RequirementClauses
    await source.collections.get(MODEL_COLLECTIONS.REQUIREMENT_CLAUSES)?.patchItems({
        added: [{
            id: "clause-1",
            mode: "REQUIRE_ALL",
            requirementId: "req_dev-1"
        }]
    });

    // ResourceRequests
    await source.collections.get(MODEL_COLLECTIONS.RESOURCE_REQUESTS)?.patchItems({
        added: [{
            id: "request-1",
            resourceId: "dev-1",
            quantity: 3,
            priority: 1,
            keepResource: false,
            clauseId: "clause-1"
        }]
    });

    // Activities
    await source.collections.get(MODEL_COLLECTIONS.ACTIVITIES)?.patchItems({
        added: [
            {
                id: "activity-1",
                name: "Simple Activity",
                capacity: 1,
                inboundQueueCapacity: 1,
                outboundQueueCapacity: 1,
                type: "Activity"
            },
            {
                id: "activity-2",
                name: "Moderate Activity",
                capacity: 5,
                inboundQueueCapacity: 3,
                outboundQueueCapacity: 3,
                type: "Activity"
            },
            {
                id: "activity-3",
                name: "Complex Activity",
                capacity: 10,
                inboundQueueCapacity: 5,
                outboundQueueCapacity: 5,
                type: "Activity"
            }
        ]
    });

}