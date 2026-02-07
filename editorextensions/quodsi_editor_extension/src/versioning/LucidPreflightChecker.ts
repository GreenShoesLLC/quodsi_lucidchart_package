import { UpgradeIssue, UpgradeIssueSeverity } from '@quodsi/shared';
import { PageProxy } from 'lucid-extension-sdk';

/**
 * Performs Lucid-specific preflight checks.
 * In the new format, version is stored only on the page (in q_data), not per-element.
 */
export class LucidPreflightChecker {
    private static readonly DATA_KEY = 'q_data';

    /**
     * Validates that the page has necessary structure for upgrade
     */
    async validatePage(page: PageProxy): Promise<UpgradeIssue[]> {
        const issues: UpgradeIssue[] = [];

        // Check if page has model data with type and version
        const dataStr = page.shapeData.get(LucidPreflightChecker.DATA_KEY);
        if (!dataStr || typeof dataStr !== 'string') {
            issues.push({
                message: 'Page is missing q_data',
                severity: UpgradeIssueSeverity.Error
            });
            return issues;
        }

        try {
            const data = JSON.parse(dataStr);

            if (!data.type) {
                issues.push({
                    message: 'Page q_data is missing type field',
                    severity: UpgradeIssueSeverity.Error
                });
            }

            if (!data.version) {
                issues.push({
                    message: 'Page q_data is missing version field',
                    severity: UpgradeIssueSeverity.Error
                });
            }
        } catch (error) {
            issues.push({
                message: `Error parsing page data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: UpgradeIssueSeverity.Error
            });
        }

        return issues;
    }

    /**
     * Gets the version from page's q_data
     */
    getPageVersion(page: PageProxy): string | null {
        const dataStr = page.shapeData.get(LucidPreflightChecker.DATA_KEY);
        if (!dataStr || typeof dataStr !== 'string') return null;

        try {
            const data = JSON.parse(dataStr);
            return data.version || null;
        } catch {
            return null;
        }
    }
}
