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
                inputBufferCapacity: 1,
                outputBufferCapacity: 1,
                type: "Activity"
            },
            {
                id: "activity-2",
                name: "Moderate Activity",
                capacity: 5,
                inputBufferCapacity: 3,
                outputBufferCapacity: 3,
                type: "Activity"
            },
            {
                id: "activity-3",
                name: "Complex Activity",
                capacity: 10,
                inputBufferCapacity: 5,
                outputBufferCapacity: 5,
                type: "Activity"
            }
        ]
    });

    // OperationSteps
    await source.collections.get(MODEL_COLLECTIONS.OPERATION_STEPS)?.patchItems({
        added: [
            {
                id: "step-1",
                activityId: "activity-1",
                duration: JSON.stringify({
                    value: 1,
                    unit: "MINUTES",
                    type: "CONSTANT"
                }),
                quantity: 1
            },
            {
                id: "step-2",
                activityId: "activity-2",
                requirementId: "req_dev-1",
                duration: JSON.stringify({
                    value: 1,
                    unit: "MINUTES",
                    type: "CONSTANT"
                }),
                quantity: 1
            },
            {
                id: "step-3",
                activityId: "activity-3",
                duration: JSON.stringify({
                    value: 1,
                    unit: "MINUTES",
                    type: "CONSTANT"
                }),
                quantity: 1
            },
            {
                id: "step-4",
                activityId: "activity-3",
                requirementId: "req_dev-1",
                duration: JSON.stringify({
                    value: 1,
                    unit: "MINUTES",
                    type: "CONSTANT"
                }),
                quantity: 2
            },
            {
                id: "step-5",
                activityId: "activity-3",
                requirementId: "other-req-id",
                duration: JSON.stringify({
                    value: 1,
                    unit: "MINUTES",
                    type: "CONSTANT"
                }),
                quantity: 3
            }
        ]
    });
}