import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/results/TableResult';

/**
 * Handler for creating resource utilization tables
 */
export class ResourceUtilizationTableHandler extends BaseTableHandler {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'resourceUtilization';
    }
    
    /**
     * Gets the default title for resource utilization tables
     * @returns Default title string
     */
    getDefaultTitle(): string {
        return 'Resource Utilization Summary';
    }
    
    /**
     * Checks if resource utilization tables can be created (has data)
     * @returns Promise resolving with boolean
     */
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getResourceUtilizationData();
        return data && data.length > 0;
    }
    
    /**
     * Creates a resource utilization table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating resource utilization table at position (${position.x}, ${position.y})`);
        
        try {
            const tableConfig = this.getTableConfig(position);
            const table = await this.tableGenerator.createResourceUtilizationTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for resource utilization table', 'warn');
                return this.createResult(null, false);
            }
            
            this.log('Resource utilization table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating resource utilization table: ${error}`, 'error');
            return this.createResult(null, false, error);
        }
    }
}
