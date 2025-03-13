import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/results/TableResult';

/**
 * Handler for creating resource replication summary tables
 */
export class ResourceRepSummaryTableHandler extends BaseTableHandler {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'resourceRepSummary';
    }
    
    /**
     * Gets the default title for resource replication summary tables
     * @returns Default title string
     */
    getDefaultTitle(): string {
        return 'Resource Utilization by Replication';
    }
    
    /**
     * Checks if resource replication summary tables can be created (has data)
     * @returns Promise resolving with boolean
     */
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getResourceRepSummaryData();
        return data && data.length > 0;
    }
    
    /**
     * Creates a resource replication summary table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating resource replication summary table at position (${position.x}, ${position.y})`);
        
        try {
            const tableConfig = this.getTableConfig(position);
            const table = await this.tableGenerator.createResourceRepSummaryTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for resource replication summary table', 'warn');
                return this.createResult(null, false);
            }
            
            this.log('Resource replication summary table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating resource replication summary table: ${error}`, 'error');
            return this.createResult(null, false, error);
        }
    }
}
