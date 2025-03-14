import { DashboardConfig } from "../interfaces";
import { DEFAULT_TABLE_CONFIGS } from "./DefaultTableConfig";

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
    title: 'Sim Results',
    layout: {
        tableSpacing: 50,
        initialX: 50,
        initialY: 50,
        tableWidth: 800,
    },
    tableDefaults: {
        formatNumbers: true,
        percentDecimals: 1,
        numberDecimals: 2,
        styleHeader: true,
        dynamicColumns: false,  // Changed to false to show all columns
        maxColumns: 15  // Increased from 6 to 15
    },
    tableOrder: [
        'entityState',
        'activityUtilization',
        'entityThroughput',
        'activityTiming',
        // Any tables not in this list will be shown after these
    ],
    tables: DEFAULT_TABLE_CONFIGS
};