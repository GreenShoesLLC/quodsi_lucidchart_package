export declare class LucidApiService {
    private baseURL;
    constructor(baseUrl: string);
    simulateDocument(documentId: string, pageId: string, userId: string, authToken?: string): Promise<boolean>;
    getActivityUtilization(documentId: string, userId: string): Promise<string>;
    getSimulationStatus(documentId: string): Promise<any>;
}
export declare function createLucidApiService(baseUrl: string): LucidApiService;
//# sourceMappingURL=lucidApi.d.ts.map