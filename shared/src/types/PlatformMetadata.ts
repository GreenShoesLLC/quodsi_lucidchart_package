export interface PlatformMetadata {
    platform: string;
    version: string;
    lastModified: Date;
    elementId?: string;
    additionalData?: Record<string, unknown>;
}
