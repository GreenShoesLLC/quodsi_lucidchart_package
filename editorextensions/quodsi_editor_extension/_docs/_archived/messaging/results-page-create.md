# Results Page Create Exchange

## Overview
Results page creation messages handle the generation of dashboard pages in LucidChart that display simulation results, including tables, charts, and key metrics.

## Message Flow

### RESULTS_PAGE_CREATE: React → Extension

**Direction:** React → Extension  
**Purpose:** Request creation of dashboard page with simulation results  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  jobId: string,           // Simulation job ID
  documentId: string,      // Current document
  pageTitle?: string       // Optional custom title
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/modelOpsSender.ts`
- Function: `modelOpsSender.createResultsPage`

**Handler:**
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleResultsPageCreate`

**Response:** `RESULTS_PAGE_CREATE_RESULT`

---

### RESULTS_PAGE_CREATE_RESULT: Extension → React

**Direction:** Extension → React  
**Purpose:** Report dashboard creation operation result  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  success: boolean,
  documentId: string,
  pageId?: string,         // ID of created page
  errorMessage?: string
}
```

**Sender:** 
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleResultsPageCreate`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/modelOps.mapper.ts`
- Function: `modelOps.mapper.mapMessageToAction`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| RESULTS_PAGE_CREATE | ✅ modelOpsSender.createResultsPage | ✅ ModelOpsHandler.handleResultsPageCreate | ➖ N/A | ➖ N/A |
| RESULTS_PAGE_CREATE_RESULT | ➖ N/A | ➖ N/A | ✅ ModelOpsHandler.handleResultsPageCreate | ✅ modelOps.mapper.mapMessageToAction |

## Dashboard Creation Sequence

1. Simulation completes successfully
2. User clicks "View Results" button
3. **RESULTS_PAGE_CREATE** sent to extension
4. Extension performs dashboard creation:
   - Fetches results from data connector
   - Creates new page in document
   - Generates tables and visualizations
   - Positions elements on canvas
   - Applies styling and formatting
5. **RESULTS_PAGE_CREATE_RESULT** sent to React
6. React shows success message
7. User navigated to new dashboard page

## Implementation Details

### Dashboard Creation Handler
```typescript
async handleResultsPageCreate(msg: EnvelopeBase): Promise<void> {
    try {
        const { jobId, documentId, pageTitle } = msg.data;
        
        // Fetch simulation results
        const results = await this.dataConnectorService.getSimulationResults(jobId);
        if (!results || !results.hasData) {
            throw new Error('No simulation results available');
        }
        
        // Create new page
        const document = await this.client.getDocument(documentId);
        const newPage = await document.addPage({
            title: pageTitle || `Results - ${new Date().toLocaleDateString()}`
        });
        
        // Initialize dashboard builder
        const dashboardBuilder = new SimulationResultsDashboard(
            this.client,
            newPage
        );
        
        // Build dashboard with results
        await dashboardBuilder.build(results);
        
        // Navigate to new page
        await this.client.navigateToPage(newPage.id);
        
        // Send success response
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT,
            {
                success: true,
                documentId: documentId,
                pageId: newPage.id
            }
        );
        
    } catch (error) {
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT,
            {
                success: false,
                documentId: msg.data.documentId,
                errorMessage: error.message
            }
        );
    }
}
```

### Dashboard Builder
```typescript
class SimulationResultsDashboard {
    async build(results: SimulationResults): Promise<void> {
        // Create title
        await this.createTitle(results.metadata);
        
        // Add summary metrics
        await this.createSummarySection(results.summary);
        
        // Create data tables
        const tables = [
            { 
                title: 'Activity Utilization',
                data: results.activityRepSummary,
                generator: new ActivityRepSummaryTableGenerator()
            },
            {
                title: 'Resource Utilization',
                data: results.resourceRepSummary,
                generator: new ResourceRepSummaryTableGenerator()
            }
        ];
        
        for (const table of tables) {
            if (table.data && table.data.length > 0) {
                await this.createDataTable(
                    table.title,
                    table.data,
                    table.generator
                );
            }
        }
        
        // Add footer with metadata
        await this.createFooter(results.metadata);
    }
    
    private async createDataTable(
        title: string,
        data: any[],
        generator: TableGenerator
    ): Promise<void> {
        // Create table shape
        const table = await this.page.addTable({
            rows: data.length + 1, // +1 for header
            columns: generator.getColumnCount(),
            x: this.currentY,
            y: this.currentX
        });
        
        // Apply formatting
        await generator.formatTable(table, data);
        
        // Update position for next element
        this.currentY += table.height + this.spacing;
    }
}
```

## Dashboard Components

### Summary Section
```typescript
// Key metrics displayed at top
{
  "Total Entities Processed": 1000,
  "Average Cycle Time": "45.2 minutes",
  "Resource Utilization": "78.5%",
  "Throughput": "22.1 entities/hour"
}
```

### Data Tables

**Activity Utilization Table:**
| Activity Name | Count | Avg Duration | Min | Max | Utilization |
|--------------|-------|--------------|-----|-----|-------------|
| Process A | 450 | 10.2 | 8.1 | 15.3 | 82.5% |
| Process B | 550 | 8.7 | 7.2 | 12.1 | 76.3% |

**Resource Utilization Table:**
| Resource Name | Capacity | Avg Usage | Peak Usage | Utilization |
|--------------|----------|-----------|------------|-------------|
| Worker | 5 | 3.8 | 5 | 76.0% |
| Machine | 3 | 2.7 | 3 | 90.0% |

### Visual Layout
```
┌─────────────────────────────────┐
│     Simulation Results          │
│     2024-06-14 10:30 AM        │
├─────────────────────────────────┤
│ Summary:                        │
│ • Entities: 1000               │
│ • Duration: 8 hours            │
│ • Utilization: 78.5%           │
├─────────────────────────────────┤
│ [Activity Utilization Table]    │
├─────────────────────────────────┤
│ [Resource Utilization Table]    │
├─────────────────────────────────┤
│ Job ID: abc-123                 │
│ Model: Production Line v1       │
└─────────────────────────────────┘
```

## Error Handling

### Common Errors
- Results not ready yet
- No data in results
- Page creation fails
- Navigation fails
- Insufficient permissions

### Error Recovery
```typescript
// Retry with delay
if (error.message.includes('not ready')) {
    setTimeout(() => {
        retryResultsPageCreate(jobId);
    }, 5000);
}

// Fallback to text export
if (error.message.includes('page creation failed')) {
    offerTextExport(results);
}
```

## UI Integration

### Results Button State
```typescript
const ViewResultsButton = ({ simulation }) => {
    const canViewResults = 
        simulation.status === 'completed' && 
        simulation.hasResults;
    
    return (
        <Button 
            disabled={!canViewResults}
            onClick={() => createResultsPage(simulation.jobId)}
        >
            {simulation.status === 'running' ? 'Running...' : 'View Results'}
        </Button>
    );
};
```

### Success Feedback
```typescript
const handleResultsPageCreated = (result) => {
    if (result.success) {
        showNotification({
            type: 'success',
            message: 'Results dashboard created',
            action: {
                label: 'View',
                onClick: () => navigateToPage(result.pageId)
            }
        });
    } else {
        showError(`Failed to create dashboard: ${result.errorMessage}`);
    }
};
```

## Configuration Options

### Customizable Elements
- Page title format
- Table selection
- Metric selection
- Layout style
- Color scheme

### Future Enhancements
- Chart visualizations
- Custom metrics
- Export options
- Template selection

## Performance Considerations

- Large result sets may take time
- Table creation is resource intensive
- Consider pagination for huge datasets
- Async rendering for better UX

## Related Messages
- **MODEL_RUN_STATUS** - Enables results button
- **SIMULATION_RUN** - Generates results
- **ERROR** - Reports creation failures
- **LOG** - Tracks dashboard creation