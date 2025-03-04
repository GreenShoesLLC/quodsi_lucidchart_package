// layout/DashboardLayoutManager.ts

import { PageProxy, DocumentProxy, Viewport, PageDefinition, EditorClient } from 'lucid-extension-sdk';
import { DashboardConfig } from '../interfaces/DashboardTypes';

/**
 * Manages the layout and positioning of dashboard elements
 */
export class DashboardLayoutManager {
    private config: DashboardConfig;

    /**
     * Creates a new DashboardLayoutManager
     * @param config Dashboard configuration
     */
    constructor(config: DashboardConfig) {
        this.config = config;
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
            x: this.config.initialX || 50,
            y: this.config.initialY || 50
        };
    }

    /**
     * Calculates the Y position for the next table
     * @param currentY Current Y position
     * @param tableHeight Height of the current table
     * @returns Y position for the next table
     */
    calculateNextPosition(currentY: number, tableHeight: number): number {
        return currentY + tableHeight + (this.config.tableSpacing || 50);
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
     * Gets the width to use for tables
     * @returns Table width in pixels
     */
    getTableWidth(): number {
        return this.config.tableWidth || 800;
    }

    /**
     * Gets the spacing between tables
     * @returns Spacing in pixels
     */
    getTableSpacing(): number {
        return this.config.tableSpacing || 50;
    }
}
