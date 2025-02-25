import { UpgradeIssue, UpgradeIssueSeverity } from '@quodsi/shared';
import { PageProxy } from 'lucid-extension-sdk';

/**
 * Performs Lucid-specific preflight checks
 */
export class LucidPreflightChecker {
    private static readonly META_KEY = 'q_meta';
    private static readonly DATA_KEY = 'q_data';

    /**
     * Validates that the page has necessary structure for upgrade
     */
    async validatePage(page: PageProxy): Promise<UpgradeIssue[]> {
        const issues: UpgradeIssue[] = [];

        // Check if page has model metadata
        const metaStr = page.shapeData.get(LucidPreflightChecker.META_KEY);
        if (!metaStr || typeof metaStr !== 'string') {
            issues.push({
                message: 'Page is missing q_meta data',
                severity: UpgradeIssueSeverity.Error
            });
            return issues; // Early return as other checks depend on q_meta
        }

        try {
            const metadata = JSON.parse(metaStr);
            const pageVersion = metadata.version;

            // Validate all elements have consistent versions
            const elementIssues = await this.validateElementVersions(page, pageVersion);
            issues.push(...elementIssues);

        } catch (error) {
            issues.push({
                message: `Error parsing page metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: UpgradeIssueSeverity.Error
            });
        }

        return issues;
    }

    /**
     * Validates that all elements have matching versions
     */
    private async validateElementVersions(page: PageProxy, pageVersion: string): Promise<UpgradeIssue[]> {
        const issues: UpgradeIssue[] = [];

        // Check blocks
        for (const block of page.blocks.values()) {
            const metaStr = block.shapeData.get(LucidPreflightChecker.META_KEY);
            if (!metaStr || typeof metaStr !== 'string') continue; // Skip non-Quodsi elements

            try {
                const metadata = JSON.parse(metaStr);
                if (metadata.version !== pageVersion) {
                    issues.push({
                        elementId: block.id,
                        elementType: metadata.type,
                        message: `Block version (${metadata.version}) does not match page version (${pageVersion})`,
                        severity: UpgradeIssueSeverity.Error
                    });
                }
            } catch (error) {
                issues.push({
                    elementId: block.id,
                    message: `Error parsing block metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    severity: UpgradeIssueSeverity.Error
                });
            }
        }

        // Check lines
        for (const line of page.lines.values()) {
            const metaStr = line.shapeData.get(LucidPreflightChecker.META_KEY);
            if (!metaStr || typeof metaStr !== 'string') continue; // Skip non-Quodsi elements

            try {
                const metadata = JSON.parse(metaStr);
                if (metadata.version !== pageVersion) {
                    issues.push({
                        elementId: line.id,
                        elementType: metadata.type,
                        message: `Line version (${metadata.version}) does not match page version (${pageVersion})`,
                        severity: UpgradeIssueSeverity.Error
                    });
                }
            } catch (error) {
                issues.push({
                    elementId: line.id,
                    message: `Error parsing line metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    severity: UpgradeIssueSeverity.Error
                });
            }
        }

        return issues;
    }

    /**
     * Gets the version from page metadata
     */
    getPageVersion(page: PageProxy): string | null {
        const metaStr = page.shapeData.get(LucidPreflightChecker.META_KEY);
        if (!metaStr || typeof metaStr !== 'string') return null;

        try {
            const metadata = JSON.parse(metaStr);
            return metadata.version;
        } catch {
            return null;
        }
    }
}
