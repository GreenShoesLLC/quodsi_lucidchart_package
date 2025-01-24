import { Activity } from "./Activity";
import { Duration } from "./Duration";
import { PeriodUnit } from "./DurationType";
import { DurationType } from "./DurationType";
import { OperationStep } from "./OperationStep";
import { Resource } from "./Resource";
import { ResourceRequirement } from "./ResourceRequirement";
import { RequirementMode } from "./RequirementMode";

// Create a Resource
const developerResource = new Resource("dev-1", "Developer", 10);

// Create a ResourceRequirement for the Resource
const developerRequirement = ResourceRequirement.createForSingleResource(
  developerResource,
  { quantity: 3 } // Requesting 3 units of the Resource
);

console.log("ResourceRequirement:", developerRequirement);
/*
ResourceRequirement {
  id: 'req_dev-1_1679164923456', // Example timestamp
  name: 'Requirement for Developer',
  type: 'ResourceRequirement',
  rootClauses: [
    RequirementClause {
      clauseId: 'clause-1',
      mode: 'REQUIRE_ALL',
      parentClauseId: undefined,
      requests: [
        ResourceRequest {
          resourceId: 'dev-1',
          quantity: 3,
          priority: 1,
          keepResource: false
        }
      ],
      subClauses: []
    }
  ]
}
*/

// Default duration for all OperationSteps
const defaultDuration = new Duration(1, PeriodUnit.MINUTES, DurationType.CONSTANT);

// 1st Instance: Simple Activity with 1 OperationStep, no requirementId
const simpleActivity = new Activity(
  "activity-1",
  "Simple Activity",
  1, // capacity
  1, // inputBufferCapacity
  1, // outputBufferCapacity
  [
    new OperationStep(defaultDuration, 1), // No requirementId
  ]
);

// 2nd Instance: Moderate Activity with 1 OperationStep, using developerRequirement.id
const moderateActivity = new Activity(
  "activity-2",
  "Moderate Activity",
  5, // capacity
  3, // inputBufferCapacity
  3, // outputBufferCapacity
  [
    new OperationStep(defaultDuration, 1, developerRequirement.id), // With developerRequirement.id
  ]
);

// 3rd Instance: Complex Activity with 3 OperationSteps
const complexActivity = new Activity(
  "activity-3",
  "Complex Activity",
  10, // capacity
  5,  // inputBufferCapacity
  5,  // outputBufferCapacity
  [
    new OperationStep(defaultDuration, 1),                     // No requirementId
    new OperationStep(defaultDuration, 2, developerRequirement.id), // With developerRequirement.id
    new OperationStep(defaultDuration, 3, "other-req-id"),     // Different requirementId
  ]
);

// Exporting all instances for further use
export {
  developerResource,
  developerRequirement,
  simpleActivity,
  moderateActivity,
  complexActivity,
};
