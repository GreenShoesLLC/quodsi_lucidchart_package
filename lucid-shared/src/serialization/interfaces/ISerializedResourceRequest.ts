/**
 * Wire-cleanup Phase B2 Task 9: ground-truthed against
 * `CleanResourceRequestDoc` (engine `document/clean/elements.py`) —
 * `quantity`/`priority`/`keepResource` all sparse-omitted at their schema
 * default (1/1/false) by `ResourceRequest.toJSON()`.
 */
export interface ISerializedResourceRequest {
    resourceId: string;
    quantity?: number;
    priority?: number;
    keepResource?: boolean;
}
