interface ScenarioStates {
    scenarios: any[];
}
interface DocumentStatusResponse {
    hasContainer: boolean;
    scenarios: ScenarioStates;
    statusDateTime: string;
}
export declare class LucidApiService {
    private baseURL;
    constructor(baseUrl: string);
    simulateDocument(documentId: string, pageId: string, userId: string, authToken?: string): Promise<boolean>;
    getActivityUtilization(documentId: string, userId: string): Promise<string>;
    getDocumentStatus(documentId: string, authToken?: string): Promise<DocumentStatusResponse>;
    getSimulationStatus(documentId: string): Promise<any>;
}
export declare function createLucidApiService(baseUrl: string): LucidApiService;
export {};
//# sourceMappingURL=lucidApi.d.ts.map