/**
 * Represents the severity of an upgrade issue
 */
export enum UpgradeIssueSeverity {
    /** Issue prevents upgrade from proceeding */
    Error = 'Error',
    /** Issue should be noted but doesn't prevent upgrade */
    Warning = 'Warning'
}

/**
 * Represents a single issue found during preflight check
 */
export interface UpgradeIssue {
    /** Element ID where issue was found (if applicable) */
    elementId?: string;
    /** Element type where issue was found (if applicable) */
    elementType?: string;
    /** Description of the issue */
    message: string;
    /** Severity of the issue */
    severity: UpgradeIssueSeverity;
}

/**
 * Results from a preflight upgrade check
 */
export interface PreflightResult {
    /** Whether the upgrade can proceed */
    canUpgrade: boolean;
    /** Source version being upgraded from */
    sourceVersion: string;
    /** Target version being upgraded to */
    targetVersion: string;
    /** List of issues found during preflight */
    issues: UpgradeIssue[];
}
