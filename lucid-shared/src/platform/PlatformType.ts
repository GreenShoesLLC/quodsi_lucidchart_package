/**
 * Enumeration of supported diagram/design platforms
 */
export enum PlatformType {
    Lucid = 'Lucid',
    Miro = 'Miro',
    Canva = 'Canva'
}

/**
 * Type guard to check if a string is a valid PlatformType
 */
export function isPlatformType(value: string): value is PlatformType {
    return Object.values(PlatformType).includes(value as PlatformType);
}

/**
 * Platform-specific metadata structure
 */
export interface PlatformMetadata {
    platform: PlatformType;
    version: string;
    lastModified: string;
    [key: string]: unknown;
}