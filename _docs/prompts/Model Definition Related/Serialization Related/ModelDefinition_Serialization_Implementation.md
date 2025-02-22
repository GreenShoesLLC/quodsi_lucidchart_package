# ModelDefinition Serialization Implementation

## Overview
This document summarizes the implementation of the JSON serialization system for the ModelDefinition class, following the design outlined in `ModelDefinition_Serialization_Design.md`.

## Implemented Components

### 1. Core Interfaces
Created a complete set of interfaces in the `shared/src/serialization/interfaces/` directory:
- `ISchemaVersion` - Version information
- `IModelDefinitionSerializer` - Base serializer interface
- `ISerializedModel` - Core model serialization structure
- Individual interfaces for each component:
  - `ISerializedActivity`
  - `ISerializedConnector`
  - `ISerializedDuration`
  - `ISerializedEntity`
  - `ISerializedGenerator`
  - `ISerializedOperationStep`
  - `ISerializedResource`
  - `ISerializedResourceRequirement`

### 2. EnumMapper Utility
Created a type-safe enum mapping system:
- Generic `EnumMapper<T>` class for handling enum conversions
- Bidirectional mapping between enums and strings
- Validation and error handling
- Support for all model enums (SimulationObjectType, PeriodUnit, etc.)

### 3. Base Serializer Implementation
Implemented `BaseModelDefinitionSerializer`:
- Abstract base class with common serialization logic
- Comprehensive error handling
- Validation for all components
- Helper methods for serializing each model component
- Type-safe implementation

### 4. Error Handling
Created error hierarchy in `shared/src/serialization/errors/`:
- `SerializerError` - Base error class
- `UnsupportedVersionError` - Version-related issues
- `InvalidModelError` - Validation failures
- `SerializationError` - Serialization process errors

### 5. Factory Implementation
Implemented `ModelSerializerFactory`:
- Version management
- Serializer creation
- Version validation
- Support for v1.0
- Extensible design for future versions

### 6. Integration
Added serialization support to ModelPanel:
- Validation and serialization flow
- Error handling
- Download functionality
- Configurable options for file export

## File Download Implementation
Added browser-based JSON file download functionality:
- Configurable options (indentation, filename, etc.)
- Error handling
- Resource cleanup
- Progress messaging

## Project Structure
```
shared/src/serialization/
├── interfaces/
│   ├── IModelDefinitionSerializer.ts
│   ├── ISerializedModel.ts
│   ├── ISchemaVersion.ts
│   └── [component interfaces]
├── errors/
│   ├── SerializerError.ts
│   ├── UnsupportedVersionError.ts
│   ├── InvalidModelError.ts
│   └── SerializationError.ts
├── utilities/
│   ├── EnumMapper.ts
│   └── EnumMappers.ts
├── v1/
│   ├── ModelDefinitionSerializerV1.ts
│   └── interfaces/
│       └── ISerializedModelV1.ts
└── ModelSerializerFactory.ts
```

## Usage Example
```typescript
// In ModelPanel
private async handleValidateModel(): Promise<void> {
    this.log('Handling validate model');

    const validationResult = await this.modelManager.validateModel();
    this.log('validationResult:', validationResult);
    // Send separate validation result message for explicit validation requests
    this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);

    // If validation succeeded, try to serialize
    if (validationResult.isValid || !validationResult.isValid) {
        try {
            // Get the model definition from the model manager
            const modelDefinition = await this.modelManager.getModelDefinition();

            if (modelDefinition) {
                // Create a serializer using the factory (will use latest version by default)
                const serializer = ModelSerializerFactory.create(modelDefinition);

                // Attempt serialization
                const serializedModel = serializer.serialize(modelDefinition);
                this.log('serializedModel:', serializedModel);

                try {
                    // Prepare the request payload
                    const document = new DocumentProxy(this.client);
                    const documentId = document.id;
                    const viewport = new Viewport(this.client);
                    const user: UserProxy = new UserProxy(this.client);
                    // const activePageProxy = viewport.getCurrentPage();
                    const activePageProxy: PageProxy | null | undefined = viewport.getCurrentPage();
                    const AZURE_FUNCTION_URL = "http://localhost:7071/api/dataConnector/"
                    // const YOUR_AZURE_FUNCTION_URL = "http://dev-quodsi-lucid-function-app.azurewebsites.net/api/dataConnector/"
                    let pageId: string = 'undefined';
                    let userId: string = 'undefined';
                    if (user) {
                        userId = user.id;
                    }

                    if (activePageProxy) {
                        pageId = activePageProxy.id;
                    }
                    const payload = {
                        documentId: documentId,
                        pageId: pageId,
                        userId: userId,
                        model: serializedModel
                    };

                    // Make the request to upload the model definition
                    const response = await this.client.oauthXhr("quodsi", {
                        url: `${AZURE_FUNCTION_URL}simulation/save-and-submit`,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        data: JSON.stringify(payload),
                        method: "POST"
                    });

                    this.log('Model upload successful:', response);
                } catch (uploadError) {
                    this.log('Model upload failed:', uploadError);
                }

                // Log success of serialization
                this.log('Model serialization successful');

            } else {
                this.log('No model definition available');
            }
        } catch (error) {
            // Handle serialization errors
            this.log('Model serialization failed:', error);
        }
    }
}
```

## Potential Next Steps
1. Implement comprehensive unit tests
2. Add validation rules specific to v1.0
3. Consider compression for large models
4. Add support for different file formats
5. Implement versioned deserialization
