# LucidChart Version Management

This directory contains the LucidChart-specific implementation of Quodsi's version management system.

## Directory Structure

```
/versioning/
  - LucidVersionManager.ts     # Main coordinator for version management
  - LucidVersionUpgrader.ts    # LucidChart-specific upgrade implementation
  - LucidPreflightChecker.ts   # LucidChart-specific validation
  - index.ts                   # Exports versioning components
```

## Components

### LucidVersionManager
- Coordinates version checking and upgrades
- Manages user notifications
- Handles page load checks
- Integrates with LucidChart UI

### LucidVersionUpgrader
- Implements platform-specific upgrade logic
- Manages LucidChart shape data
- Handles backup and rollback
- Applies transformations to elements

### LucidPreflightChecker
- Validates page and element metadata
- Ensures consistent versions
- Checks data integrity
- Reports validation issues

## Shape Data Structure

Quodsi uses LucidChart's shape data capability to store:

### Metadata (q_meta)
```json
{
    "type": "Activity",
    "version": "1.0.0",
    "lastModified": "2025-02-23T21:35:11.848Z",
    "id": "7sEVil4ffwLR"
}
```

### Data (q_data)
```json
{
    "id": "7sEVil4ffwLR",
    "name": "Process",
    "capacity": 1,
    "inputBufferCapacity": 1,
    "outputBufferCapacity": 1,
    "operationSteps": [
        {
            "requirementId": null,
            "quantity": 1,
            "duration": {
                "durationLength": 1,
                "durationPeriodUnit": "MINUTES",
                "durationType": "CONSTANT",
                "distribution": null
            }
        }
    ]
}
```

## Integration Points

- Works with ModelDefinitionPageBuilder
- Uses StorageAdapter for data access
- Integrates with NotificationService
- Coordinates with shared transformations

## Usage

```typescript
// Create version manager
const versionManager = new LucidVersionManager();

// Handle page load
await versionManager.handlePageLoad(page);
```

## Error Handling

### Validation Errors
- Missing metadata
- Version mismatches
- Invalid data structures

### Upgrade Errors
- Transform failures
- Storage failures
- Backup/restore issues

## Transaction Safety

1. **Preflight**
   - Check all elements
   - Validate data structures
   - Ensure upgrade possible

2. **Backup**
   - Store current state
   - Include metadata and data
   - Track all elements

3. **Upgrade**
   - Apply transformations
   - Update versions
   - Verify changes

4. **Rollback**
   - Restore from backup
   - Maintain data integrity
   - Clear temporary data

## Best Practices

1. **Shape Data**
   - Always validate types
   - Handle missing data
   - Use JSON parse/stringify

2. **Error Handling**
   - Provide clear messages
   - Include element details
   - Log important failures

3. **Performance**
   - Minimize page operations
   - Batch updates when possible
   - Clean up temporary data

## Testing

Test scenarios should cover:
1. Page load handling
2. Element version checking
3. Data transformation
4. Backup/restore
5. Error conditions
6. User notifications