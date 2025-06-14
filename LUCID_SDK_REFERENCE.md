# Lucid SDK Reference for Quodsi Development

This document provides quick reference to Lucid SDK patterns used in the Quodsi project.

## Key Lucid SDK Components Used

### Extension API
- **EditorClient**: Main interface for interacting with Lucid documents
- **BlockProxy**: Represents shapes on the canvas (Activity, Resource, etc.)
- **LineProxy**: Represents connectors between shapes
- **PageProxy**: Document page management
- **MenuProxy**: Custom menu additions

### Data Storage
- **Document Storage**: Persisting model data with the document
- **Collection API**: Managing sets of related data
- **Data Connector API**: External data synchronization

### UI Integration
- **Panel API**: Creating docked panels (ContentDockPanel, RightDockPanel)
- **Modal API**: Displaying dialogs
- **iFrame Communication**: postMessage protocol for React integration

## Common Patterns in Our Codebase

### 1. Shape to Model Conversion
```typescript
// Pattern used in LucidPageAnalyzer
const blocks = page.getAllBlocks();
blocks.forEach(block => {
    const customData = block.getData();
    // Convert to simulation object based on shape type
});
```

### 2. Panel Communication
```typescript
// Pattern used in MessageRouter
lucid.panels.createPanel({
    id: 'model-panel',
    url: 'quodsim-react/index.html',
    location: PanelLocation.RightDock
});
```

### 3. Data Persistence
```typescript
// Pattern used in StorageAdapter
const client = lucid.getClient();
client.document.setData('modelDefinition', serializedModel);
```

## Lucid SDK Resources

### Official Documentation
- Main docs: https://developer.lucid.co/docs/
- Extension API: https://developer.lucid.co/docs/extension-api
- REST API: https://developer.lucid.co/docs/rest-api
- Shape Libraries: https://developer.lucid.co/docs/create-shape-libraries

### Key References for Quodsi
1. **Extension Packages**: How we bundle and deploy
2. **Custom Shape Libraries**: Our simulation shapes
3. **Data Import/Sync**: Simulation results import
4. **OAuth Integration**: API authentication

### Development Tools
- `lucid-package` CLI for testing and bundling
- Developer account at https://lucid.app/developer
- Extension manifest configuration

## Integration Points

### Current Implementation
1. **Shape Library** (`/shapelibraries/quodsi_shape_library/`)
   - Custom shapes for simulation objects
   - Properties and behaviors definition

2. **Extension Entry** (`/editorextensions/quodsi_editor_extension/src/extension.ts`)
   - Main extension initialization
   - Panel registration
   - Event handling setup

3. **Data Connector** (`/dataconnectors/`)
   - External API integration
   - Simulation results import

### Best Practices from Lucid SDK
1. Use TypeScript for type safety
2. Handle async operations properly
3. Clean up event listeners
4. Validate data before operations
5. Use collection API for large datasets
6. Implement proper error handling

## Common Issues and Solutions

### Panel Communication
- Always wait for panel ready state
- Use structured message format
- Implement message queuing

### Shape Data
- Store complex data as JSON strings
- Validate shape properties
- Handle missing data gracefully

### Performance
- Batch operations when possible
- Use collections for large datasets
- Minimize canvas updates

## SDK Version Compatibility
- Current project uses Lucid Extension API v1
- Check manifest.json for version requirements
- Test with multiple Lucid product versions