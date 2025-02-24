# Versioning System

The versioning system manages upgrades of Quodsi simulation models and their elements across different diagram platforms (LucidChart, Miro, etc.).

## Directory Structure

```
/versioning/
  - BaseVersionUpgrader.ts      # Abstract base class for version upgraders
  - IVersionUpgrader.ts         # Core interface defining upgrader contract
  - PreflightResult.ts          # Types for preflight check results
  - VersionManager.ts           # Orchestrates the upgrade process
  - VersionUpgraderFactory.ts   # Creates platform-specific upgraders
  /transformations/             # Data structure transformation definitions
    - TransformationTypes.ts    # Core transformation types
    - ActivityTransforms.ts     # Activity-specific transformations
    - ConnectorTransforms.ts    # Connector-specific transformations
    - EntityTransforms.ts       # Entity-specific transformations
    - GeneratorTransforms.ts    # Generator-specific transformations
    - ResourceTransforms.ts     # Resource-specific transformations
    - ModelTransforms.ts        # Model-specific transformations
    - index.ts                  # Exports all transformations
```

## Key Concepts

### Version Management
- All elements in a diagram share the Model's version
- Version information stored in element metadata (q_meta)
- Element data stored separately (q_data)
- No backward compatibility required
- Automatic upgrades when version mismatch detected

### Upgrade Process
1. **Preflight Check**
   - Validates all elements can be upgraded
   - Ensures consistent versions across elements
   - Reports any issues before attempting upgrade

2. **Backup**
   - Creates backup of all element data
   - Enables rollback if upgrade fails

3. **Transform**
   - Applies version-specific transformations
   - Updates both data and metadata
   - Maintains data integrity

4. **Verify**
   - Confirms all elements upgraded successfully
   - Checks version numbers match
   - Cleans up backup data on success

### Platform Support
- Platform-agnostic core
- Platform-specific implementations
- Factory pattern for upgrader creation
- Consistent interface across platforms

## Usage

### Creating a New Upgrader
```typescript
class MyPlatformUpgrader extends BaseVersionUpgrader {
    protected async getSourceVersion(page: any): Promise<string> {
        // Implementation
    }

    protected async validatePlatformRequirements(page: any): Promise<UpgradeIssue[]> {
        // Implementation
    }

    // Other required methods...
}
```

### Registering an Upgrader
```typescript
VersionUpgraderFactory.registerUpgrader(PlatformType.MyPlatform, MyPlatformUpgrader);
```

### Using the Version Manager
```typescript
const manager = new VersionManager(PlatformType.MyPlatform, {
    notifyUser: true,
    onUpgradeComplete: () => {
        // Handle completion
    }
});

await manager.performUpgrade(page);
```

## Adding New Transformations

1. Create transformation in appropriate file:
```typescript
export const MyTransforms: TransformationSet = {
    objectType: 'MyType',
    transformations: [
        {
            sourceVersion: '1.0.0',
            targetVersion: '1.1.0',
            transform: (data: any) => ({
                ...data,
                newProperty: 'default'
            })
        }
    ]
};
```

2. Export from index.ts
3. Update current version in VersionUpgraderFactory

## Error Handling

- Preflight validation prevents partial upgrades
- Transaction-like behavior (all or nothing)
- Automatic rollback on failure
- Detailed error reporting
- User notifications for issues

## Best Practices

1. **Version Numbers**
   - Use semantic versioning
   - Increment appropriately for changes
   - Document version changes

2. **Transformations**
   - Keep transforms simple and focused
   - Validate data before and after
   - Provide sensible defaults

3. **Platform Implementation**
   - Handle platform-specific storage
   - Implement proper backup/restore
   - Add appropriate validation

4. **Testing**
   - Test each transformation
   - Verify rollback functionality
   - Test platform-specific features