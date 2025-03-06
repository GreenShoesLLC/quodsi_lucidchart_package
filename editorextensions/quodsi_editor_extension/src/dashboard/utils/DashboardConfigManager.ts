// utils/DashboardConfigManager.ts

import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '../interfaces/DashboardTypes';
import { TableGenerationConfig } from '../interfaces/GeneratorTypes';


/**
 * Manages and provides access to dashboard configuration
 */
export class DashboardConfigManager {
    /**
     * Merges user-provided configuration with default values
     * @param config User-provided configuration (optional)
     * @returns Complete configuration with defaults applied
     */
    static mergeWithDefaults(config?: DashboardConfig): DashboardConfig {
        if (!config) {
            return { ...DEFAULT_DASHBOARD_CONFIG };
        }

        // Deep merge the includedDataTypes object
        const includedDataTypes = {
            ...DEFAULT_DASHBOARD_CONFIG.includedDataTypes,
            ...config.includedDataTypes
        };

        // Deep merge the tableConfig object
        const tableConfig = {
            ...DEFAULT_DASHBOARD_CONFIG.tableConfig,
            ...config.tableConfig
        };

        // Merge custom column configurations
        const customColumnConfig = {
            ...DEFAULT_DASHBOARD_CONFIG.customColumnConfig,
            ...config.customColumnConfig
        };

        // For each table type in the default config, merge with provided config
        if (DEFAULT_DASHBOARD_CONFIG.customColumnConfig) {
            Object.keys(DEFAULT_DASHBOARD_CONFIG.customColumnConfig).forEach(tableType => {
                if (customColumnConfig[tableType]) {
                    customColumnConfig[tableType] = {
                        ...DEFAULT_DASHBOARD_CONFIG.customColumnConfig![tableType],
                        ...customColumnConfig[tableType]
                    };
                }
            });
        }

        // Return merged configuration
        return {
            ...DEFAULT_DASHBOARD_CONFIG,
            ...config,
            includedDataTypes,
            tableConfig,
            customColumnConfig
        };
    }

    /**
     * Gets configuration for a specific table type, merging custom configuration with defaults
     * @param config Dashboard configuration
     * @param tableType Type of table to get configuration for
     * @returns Table configuration for the specified type
     */
    static getTableTypeConfig(config: DashboardConfig, tableType: string): TableGenerationConfig {
        // Start with basic position and size
        const baseConfig: TableGenerationConfig = {
            position: { 
                x: config.initialX || DEFAULT_DASHBOARD_CONFIG.initialX || 50, 
                y: 0 // This will be set by the layout manager
            },
            width: config.tableWidth || DEFAULT_DASHBOARD_CONFIG.tableWidth || 800
        };

        // Add general table config
        if (config.tableConfig) {
            Object.assign(baseConfig, config.tableConfig);
        }

        // Add type-specific customizations
        if (config.customColumnConfig && config.customColumnConfig[tableType]) {
            Object.assign(baseConfig, config.customColumnConfig[tableType]);
        }

        return baseConfig;
    }

    /**
     * Checks if a table type is enabled in the configuration
     * @param config Dashboard configuration
     * @param tableType Type of table to check
     * @returns True if the table type is enabled
     */
    static isTableTypeEnabled(config: DashboardConfig, tableType: string): boolean {
        if (!config.includedDataTypes) {
            return false;
        }

        return !!config.includedDataTypes[tableType as keyof typeof config.includedDataTypes];
    }

    /**
     * Gets a list of all enabled table types
     * @param config Dashboard configuration
     * @returns Array of enabled table type names
     */
    static getEnabledTableTypes(config: DashboardConfig): string[] {
        if (!config.includedDataTypes) {
            return [];
        }

        return Object.entries(config.includedDataTypes)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type);
    }
}
