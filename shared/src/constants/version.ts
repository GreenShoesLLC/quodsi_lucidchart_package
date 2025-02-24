/**
 * Current version of Quodsi
 * Should be updated to match package.json version when making releases
 */
export const QUODSI_VERSION = "1.1.0";

/**
 * Version information broken down into components
 */
export interface VersionInfo {
    major: number;
    minor: number;
    patch: number;
}

/**
 * Parses a version string into its components
 */
export const parseVersion = (version: string): VersionInfo => {
    const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
    return { major, minor, patch };
};

/**
 * Compares two version strings
 * @returns negative if v1 < v2, 0 if equal, positive if v1 > v2
 */
export const compareVersions = (v1: string, v2: string): number => {
    const ver1 = parseVersion(v1);
    const ver2 = parseVersion(v2);

    if (ver1.major !== ver2.major) return ver1.major - ver2.major;
    if (ver1.minor !== ver2.minor) return ver1.minor - ver2.minor;
    return ver1.patch - ver2.patch;
};

/**
 * Checks if a version string is valid
 */
export const isValidVersion = (version: string): boolean => {
    return /^\d+\.\d+\.\d+$/.test(version);
};
