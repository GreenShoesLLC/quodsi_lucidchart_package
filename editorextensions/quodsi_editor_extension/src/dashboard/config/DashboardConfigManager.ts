import { DEFAULT_DASHBOARD_CONFIG } from './DefaultDashboardConfig';
import { DashboardConfig } from '../interfaces/DashboardConfigInterface';
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

        // Create a deep copy of the default config to avoid modifying it
        const mergedConfig: DashboardConfig = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_CONFIG));

        // Merge top-level properties
        if (config.title !== undefined) mergedConfig.title = config.title;

        // Merge layout settings
        if (config.layout) {
            mergedConfig.layout = {
                ...mergedConfig.layout,
                ...config.layout
            };
        }

        // Merge table default settings
        if (config.tableDefaults) {
            mergedConfig.tableDefaults = {
                ...mergedConfig.tableDefaults,
                ...config.tableDefaults
            };
        }

        // Merge table-specific settings
        if (config.tables) {
            // Start with the defaults
            const tables = { ...mergedConfig.tables };

            // Merge each table configuration
            Object.entries(config.tables).forEach(([tableType, tableConfig]) => {
                if (!tables[tableType]) {
                    // If the table type doesn't exist in defaults, add it
                    tables[tableType] = tableConfig;
                } else {
                    // Otherwise merge with existing default
                    tables[tableType] = {
                        ...tables[tableType],
                        ...tableConfig
                    };

                    // Deep merge columns if provided
                    if (tableConfig.columns) {
                        tables[tableType].columns = {
                            ...tables[tableType].columns,
                            ...tableConfig.columns
                        };
                    }
                }
            });

            mergedConfig.tables = tables;
        }

        return mergedConfig;
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
                x: config.layout?.initialX || 50,
                y: 0 // This will be set by the layout manager
            },
            width: config.layout?.tableWidth || 800
        };

        // Add general table config from tableDefaults
        if (config.tableDefaults) {
            Object.assign(baseConfig, config.tableDefaults);
        }

        // Add type-specific customizations
        if (config.tables && config.tables[tableType]) {
            const tableConfig = config.tables[tableType];

            // Add column configuration if available
            if (tableConfig.columns) {
                if (tableConfig.columns.order) {
                    baseConfig.columnOrder = tableConfig.columns.order;
                }

                if (tableConfig.columns.exclude) {
                    baseConfig.excludeColumns = tableConfig.columns.exclude;
                }
            }
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
        if (!config.tables || !config.tables[tableType]) {
            return false;
        }

        return config.tables[tableType].included !== false; // Default to true if not specified
    }

    /**
     * Gets a list of all enabled table types
     * @param config Dashboard configuration
     * @returns Array of enabled table type names
     */
    static getEnabledTableTypes(config: DashboardConfig): string[] {
        if (!config.tables) {
            return [];
        }

        return Object.entries(config.tables)
            .filter(([_, tableConfig]) => tableConfig.included !== false)
            .map(([type]) => type);
    }
}
