# LucidChart Document to Model Conversion Process

## 1. Conversion Entry Points

### User Interface Triggers
1. Right Panel Initial Load
   - No existing model detected
   - ConvertPageToModel option displayed

2. Manual Conversion
   - User clicks convert button in ModelUtilities
   - Triggers conversion process

## 2. Conversion Process Flow

### Initial Analysis
```typescript
public convert(page: PageProxy): void {
    const outgoingOnlyBlocks: BlockProxy[] = [];
    const incomingOnlyBlocks: BlockProxy[] = [];
    const bothIncomingAndOutgoingBlocks: BlockProxy[] = [];
    const noLinesBlocks: BlockProxy[] = [];
    const soloOutgoingLines: LineProxy[] = [];
    const manyOutgoingLines: LineProxy[] = [];
```

### Element Classification
1. Blocks (Shapes) are categorized by:
   - Outgoing connections only
   - Incoming connections only
   - Both incoming and outgoing
   - No connections

2. Lines are categorized by:
   - Single outgoing connection
   - Multiple outgoing connections

## 3. Data Structure Creation

### Model Container
```typescript
const modelData = ModelUtils.createNew();
// Sets basic model properties:
// - Unique ID
// - Default name
// - Runtime parameters
// - Simulation configuration
```

### Block Processing
For each block:
1. Analyzes connections
2. Determines simulation role
3. Creates appropriate component data
4. Stores data using shapeData API

### Line Processing
For each line:
1. Analyzes connection pattern
2. Sets probability based on outgoing count
3. Creates connector component data
4. Stores data using shapeData API

## 4. Data Storage Implementation

### Page Level Storage
```typescript
static setPageCustomData(activePage: PageProxy): Model {
    const model = ModelUtils.createNew();
    const shapeDataHandler = new QuodsiShapeData(activePage);
    shapeDataHandler.setObjectTypeAndData(
        SimulationObjectType.Model, 
        model
    );
    return model;
}
```

### Component Level Storage
```typescript
private addInitialActivityDataToBlock(block: BlockProxy): void {
    const shapeDataHandler = new QuodsiShapeData(block);
    const activityData = DefaultSimulationObjects.initialActivity();
    activityData.name = getBlockName(block);
    shapeDataHandler.setObjectTypeAndData(
        SimulationObjectType.Activity, 
        activityData
    );
}
```

## 5. Conversion Rules

### Activity Detection
- Shapes become Activities by default
- Properties derived from:
  - Shape text content
  - Connection patterns
  - Position in flow

### Connector Configuration
```typescript
private processManyOutgoingLines(lines: LineProxy[]): void {
    const probability = 1.0 / lines.length;
    lines.forEach(line => {
        this.addInitialConnectorDataToLine(line, probability);
    });
}
```

### Resource Identification
- Based on shape properties
- Connection patterns
- Text content analysis

## 6. Post-Conversion Tasks

### Validation
1. Check model completeness
2. Verify component connections
3. Validate configuration data

### UI Updates
1. Switch to ModelTabs view
2. Show validation results
3. Enable editing capabilities

### Status Updates
```typescript
private updatePageStatus(newStatus: PageStatus): void {
    activePage.shapeData.set(
        RightPanel.CURRENT_STATUS_KEY,
        JSON.stringify(newStatus)
    );
}
```

## 7. Error Handling

### Conversion Safeguards
- Validates page state
- Checks element validity
- Handles missing data

### Recovery Options
- Rollback capabilities
- Partial conversion handling
- User notification system

## 8. User Feedback

### Progress Indicators
- Conversion status updates
- Component count summary
- Validation results

### Error Reporting
- Detailed error messages
- Conversion issue highlights
- Resolution suggestions

## 9. Post-Conversion State

### Model Access
- Full model editing capabilities
- Component configuration
- Simulation controls

### Data Persistence
- Automatic save of model state
- Component data preservation
- Configuration retention
