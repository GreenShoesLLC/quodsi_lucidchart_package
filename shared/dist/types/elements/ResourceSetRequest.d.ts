import { RequirementMode } from "./RequirementMode";
import { Resource } from "./Resource";
import { ResourceRequest } from "./ResourceRequest";
export interface ResourceRequirement {
    id: string;
    name: string;
    description?: string;
    mode: RequirementMode;
    requests: ResourceRequest[];
    isBaseResource?: boolean;
}
export declare function createResourceRequirement(id: string, name: string, options?: Partial<Omit<ResourceRequirement, 'id' | 'name'>>): ResourceRequirement;
export declare function createBaseResourceRequirement(resource: Resource): ResourceRequirement;
//# sourceMappingURL=ResourceSetRequest.d.ts.map