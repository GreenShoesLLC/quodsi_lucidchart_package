// Example usage of the updated dashboard module

import { EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsDashboard } from './SimulationResultsDashboard';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from './interfaces/config/DashboardConfig';

export class ModelPanel {
    private client: EditorClient;

    constructor(client: EditorClient) {
        this.client = client;
    }

    /**
     * Example handler for creating a dashboard using default configurations
     */
    private async handleOutputCreateDashboard(): Promise<void> {
        try {
            console.log('[ModelPanel] Creating simulation results dashboard...');

            // Create dashboard instance with default configuration
            const dashboard = new SimulationResultsDashboard(this.client);

            // Generate a dashboard with the current date/time in the name
            const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
            const result = await dashboard.createDashboard(`Simulation Results - ${timestamp}`);

            console.log(`[ModelPanel] Dashboard created with ${result.tables.length} tables`);

            // Additional feedback
            if (result.emptyDataTypes.length > 0) {
                console.log(`[ModelPanel] The following data types had no data: ${result.emptyDataTypes.join(', ')}`);
            }

            if (result.errors.length > 0) {
                console.warn(`[ModelPanel] ${result.errors.length} errors occurred while creating the dashboard`);
                result.errors.forEach(err => {
                    console.error(`[ModelPanel] Error creating ${err.type} table:`, err.error);
                });
            }
        } catch (error) {
            console.error('[ModelPanel] Error creating simulation results dashboard:', error);
        }
    }

    /**
     * Example handler for creating a dashboard with custom configuration overrides
     */
    private async handleOutputCreateCustomDashboard(): Promise<void> {
        try {
            console.log('[ModelPanel] Creating custom simulation results dashboard...');

            // Start with the default configuration
            const customConfig: DashboardConfig = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_CONFIG));
            
            // Override specific settings
            customConfig.title = 'Custom Simulation Results';
            customConfig.layout = {
                ...customConfig.layout,
                tableWidth: 950, // Make tables wider
                tableSpacing: 70  // More space between tables
            };
            
            // Only include specific table types
            if (customConfig.tables) {
                customConfig.tables.activityTiming.included = false;
                customConfig.tables.resourceRepSummary.included = false;
                
                // Customize a specific table header
                customConfig.tables.entityThroughput.header = 'Entity Performance Metrics';
            }

            const dashboard = new SimulationResultsDashboard(this.client, customConfig);

            // Generate a dashboard with the current date/time in the name
            const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
            const result = await dashboard.createDashboard(`Custom Results - ${timestamp}`);

            console.log(`[ModelPanel] Custom dashboard created with ${result.tables.length} tables`);
        } catch (error) {
            console.error('[ModelPanel] Error creating custom dashboard:', error);
        }
    }
}
