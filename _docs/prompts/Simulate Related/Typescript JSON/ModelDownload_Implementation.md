# Model Download Implementation Guide

## Overview
This document describes the implementation of browser-based JSON file downloads for model data using the Blob API. The implementation provides configurable options, error handling, and resource cleanup.

## Interface Definitions

### ModelDownloadOptions
Options interface for configuring the download behavior:
```typescript
interface ModelDownloadOptions {
    indent?: number;             // Number of spaces for JSON indentation
    includeTimestamp?: boolean;  // Whether to include timestamp in filename
    fileNamePrefix?: string;     // Custom prefix for the filename
    fileNameSuffix?: string;     // Custom suffix for the filename
    mimeType?: string;          // MIME type for the file
}
```

### Default Options
Default configuration values:
```typescript
const DEFAULT_DOWNLOAD_OPTIONS: ModelDownloadOptions = {
    indent: 2,
    includeTimestamp: true,
    fileNamePrefix: 'model',
    mimeType: 'application/json'
};
```

## Implementation

### Download Function
The main download function with error handling and cleanup:

```typescript
private downloadModelJson(
    serializedModel: ISerializedModel, 
    modelId: string,
    options?: Partial<ModelDownloadOptions>
): void {
    try {
        // Merge options with defaults
        const downloadOptions = { ...DEFAULT_DOWNLOAD_OPTIONS, ...options };
        
        // Create JSON string
        const json = JSON.stringify(serializedModel, null, downloadOptions.indent);
        if (!json) {
            throw new Error('Failed to stringify model data');
        }

        // Create Blob
        const blob = new Blob([json], { type: downloadOptions.mimeType });
        if (!blob) {
            throw new Error('Failed to create Blob from model data');
        }

        // Generate filename
        const timestamp = downloadOptions.includeTimestamp 
            ? `_${new Date().toISOString().replace(/[:.]/g, '-')}` 
            : '';
        const suffix = downloadOptions.fileNameSuffix 
            ? `_${downloadOptions.fileNameSuffix}` 
            : '';
        const fileName = `${downloadOptions.fileNamePrefix}_${modelId}${timestamp}${suffix}.json`;

        try {
            // Create URL and trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;

            try {
                document.body.appendChild(a);
                a.click();
                this.log(`Model download initiated: ${fileName}`);
            } catch (error) {
                throw new Error(`Failed to trigger download: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                // Clean up resources
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            throw new Error(`Failed to create download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } catch (error) {
        const errorMessage = `Model download failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.log(errorMessage);
        throw new Error(errorMessage);
    }
}
```

## Usage Examples

### Basic Usage
```typescript
// Use default options
this.downloadModelJson(serializedModel, modelId);
```

### Custom Configuration
```typescript
// Custom filename and formatting
this.downloadModelJson(serializedModel, modelId, {
    indent: 4,
    fileNamePrefix: 'simulation',
    fileNameSuffix: 'backup',
    includeTimestamp: false
});

// Minimal formatting
this.downloadModelJson(serializedModel, modelId, {
    indent: 0,
    includeTimestamp: false
});
```

### Integration with ModelPanel
```typescript
private async handleValidateModel(): Promise<void> {
    const validationResult = await this.modelManager.validateModel();

    if (validationResult.isValid) {
        const modelDefinition = await this.modelManager.getModelDefinition();
        
        if (modelDefinition) {
            const serializer = ModelSerializerFactory.create(modelDefinition);
            const serializedModel = serializer.serialize(modelDefinition);

            try {
                // Download with custom options
                this.downloadModelJson(serializedModel, modelDefinition.id, {
                    fileNamePrefix: 'quodsi_model',
                    fileNameSuffix: 'v1'
                });
            } catch (downloadError) {
                this.log('Model download failed:', downloadError);
                // Handle download error
            }
        }
    }
}
```

## Error Handling

### Error Categories
1. JSON Stringification Errors
   - Failed to convert model to JSON string

2. Blob Creation Errors
   - Failed to create Blob from JSON data

3. Download Trigger Errors
   - Failed to create URL
   - Failed to trigger download
   - Failed to clean up resources

### Error Propagation
- All errors are caught and logged
- Errors include detailed messages
- Resources are cleaned up in finally blocks
- Errors are propagated to caller

## Resource Management

### Created Resources
- Blob objects
- Object URLs
- DOM elements (anchor tag)

### Cleanup Process
1. Revoke object URLs using `window.URL.revokeObjectURL()`
2. Remove temporary DOM elements
3. Cleanup occurs in finally blocks to ensure execution

## Filename Generation

### Components
1. Prefix (configurable)
2. Model ID
3. Timestamp (optional)
4. Suffix (configurable)
5. Extension (.json)

### Timestamp Format
- ISO string with special characters replaced
- Example: `2025-02-14T12-30-45-000Z`

## Best Practices
1. Always provide error handling
2. Clean up resources in finally blocks
3. Use type-safe options
4. Log operations for debugging
5. Allow configuration through options
6. Validate inputs before processing
7. Use consistent filename formats
8. Provide feedback on operations
