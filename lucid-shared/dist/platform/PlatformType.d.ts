/**
 * Enumeration of supported diagram/design platforms
 */
export declare enum PlatformType {
    Lucid = "Lucid",
    Miro = "Miro",
    Canva = "Canva"
}
/**
 * Type guard to check if a string is a valid PlatformType
 */
export declare function isPlatformType(value: string): value is PlatformType;
/**
 * Platform-specific metadata structure
 */
export interface PlatformMetadata {
    platform: PlatformType;
    version: string;
    lastModified: string;
    [key: string]: unknown;
}
//# sourceMappingURL=PlatformType.d.ts.map