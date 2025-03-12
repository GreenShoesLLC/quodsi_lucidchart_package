// layout/DashboardLayoutManager.ts

import { PageProxy, DocumentProxy, Viewport, PageDefinition, EditorClient, BlockProxy, TextMarkupNames } from 'lucid-extension-sdk';
import { DashboardConfig } from '../interfaces/config/DashboardConfig';

/**
 * Manages the layout and positioning of dashboard elements
 */
export class DashboardLayoutManager {
    private config: DashboardConfig;
    private client: EditorClient;

    /**
     * Creates a new DashboardLayoutManager
     * @param config Dashboard configuration
     * @param client Editor client
     */
    constructor(config: DashboardConfig, client: EditorClient) {
        this.config = config;
        this.client = client;
    }

    /**
     * Creates a new page for the dashboard
     * @param client Editor client
     * @param pageName Name for the new page
     * @returns The created page
     */
    async createDashboardPage(client: EditorClient, pageName: string): Promise<PageProxy> {
        const document = new DocumentProxy(client);
        const def: PageDefinition = {
            title: pageName,
        };
        
        const page = document.addPage(def);
        console.log(`[Layout] Created new page with ID: ${page.id}`);
        
        return page;
    }

    /**
     * Gets the initial position for the first table
     * @returns Position coordinates
     */
    getInitialPosition(): { x: number, y: number } {
        return {
            x: this.config.layout?.initialX || 50,
            y: this.config.layout?.initialY || 50
        };
    }

    /**
     * Calculates the Y position for the next table
     * @param currentY Current Y position
     * @param tableHeight Height of the current table
     * @returns Y position for the next table
     */
    calculateNextPosition(currentY: number, tableHeight: number): number {
        return currentY + tableHeight + (this.config.layout?.tableSpacing || 50);
    }

    /**
     * Sets the viewport to show the specified page
     * @param client Editor client
     * @param page Page to display
     */
    async setViewportToPage(client: EditorClient, page: PageProxy): Promise<void> {
        const viewport = new Viewport(client);
        viewport.setCurrentPage(page);
    }

    /**
     * Creates a header text element
     * @param page Page to add the header to
     * @param headerText Text for the header
     * @param position Position coordinates
     * @returns The created header and its height
     */
    async createTableHeader(
        page: PageProxy,
        headerText: string,
        position: { x: number, y: number }
    ): Promise<{ header: BlockProxy, height: number }> {
        console.log(`[Layout] Creating header at position (${position.x}, ${position.y}) with text "${headerText}"`);
        
        // Get table width from config
        const tableWidth = this.config.layout?.tableWidth || 800;
        
        // Make sure the RectangleShape class is loaded
        await this.client.loadBlockClasses(['ProcessBlock']);
        
        // Create text shape for header using addBlock
        const headerShape = page.addBlock({
            className: 'ProcessBlock',
            boundingBox: {
                x: position.x,
                y: position.y,
                w: tableWidth,
                h: 40 // Default height for header
            }
        });
        
        // Set properties - we need to set these separately since they're not part of the block definition
        headerShape.properties.set('TextAlignment', 'center');
        headerShape.properties.set('FillColor', '#F0F0F0');
        headerShape.properties.set('BorderColor', '#FFFFFF'); // No visible border
        headerShape.properties.set('BorderWidth', 0);
        
        // Set the text content
        headerShape.textAreas.set('Text', headerText);
        
        // Set text styles
        await headerShape.textStyles.set('Text', {
            [TextMarkupNames.Family]: 'Open Sans,Helvetica,Arial,sans-serif',
            [TextMarkupNames.Size]: 14,
            [TextMarkupNames.Bold]: true,
            [TextMarkupNames.Color]: '#000000'
        });
        
        // Get actual height
        const boundingBox = headerShape.getBoundingBox();
        const height = boundingBox.h;
        
        console.log(`[Layout] Created header with height ${height}px`);
        
        return {
            header: headerShape,
            height 
        };
    }

    /**
     * Gets the width to use for tables
     * @returns Table width in pixels
     */
    getTableWidth(): number {
        return this.config.layout?.tableWidth || 800;
    }

    /**
     * Gets the spacing between tables
     * @returns Spacing in pixels
     */
    getTableSpacing(): number {
        return this.config.layout?.tableSpacing || 50;
    }
    
    /**
     * Gets the spacing to use between a header and its table
     * @returns Spacing in pixels 
     */
    getHeaderTableSpacing(): number {
        return 5; // Small spacing between header and table
    }
}
