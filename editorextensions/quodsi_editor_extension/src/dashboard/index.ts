// index.ts

// Main dashboard class
export { SimulationResultsDashboard } from './SimulationResultsDashboard';

// Utility classes
export { DashboardConfigManager } from './config/DashboardConfigManager';
export { DashboardLayoutManager } from './layout/DashboardLayoutManager';
export { DashboardTableFactory } from './factory/DashboardTableFactory';

// Base handler
export { BaseTableHandler } from './handlers/BaseTableHandler';

// Concrete handlers
export { ActivityUtilizationTableHandler } from './handlers/ActivityUtilizationTableHandler';
export { ActivityRepSummaryTableHandler } from './handlers/ActivityRepSummaryTableHandler';
// Additional handlers will be exported here as they are created
