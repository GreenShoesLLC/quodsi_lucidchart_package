import { DataConnectorAsynchronousAction } from "lucid-extension-sdk";
interface RequiredActionContext {
    documentId: string;
    userId: string;
    pageId: string;
}
export declare function getRequiredContext(action: DataConnectorAsynchronousAction): RequiredActionContext | null;
export declare function getExistingPageIds(collections: Record<string, string[]>): string[];
export {};
