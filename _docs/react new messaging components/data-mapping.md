# Data Mapping Between New & Old Message Formats

## Overview

This document details how data from the new messaging system should be mapped to the format expected by UI components based on the original implementation.

## Selection Message Mapping

### New Message Format (SELECTION_CHANGED)

```typescript
// New selection message format
{
  type: EnvelopeMessageType.SELECTION_CHANGED,
  data: {
    selectionType: string;
    documentId: string;
    hasModel: boolean;
    selectionState: {
      pageId: string;
      selectedIds: string[];
      selectionType: string;
    };
    selectedElements: ElementShape[];
    selectionCount: number;
    totalElementCount: number;
    documentContext: {
      documentId: string;
      pageId: string;
      title: string;
      isQuodsiModel: boolean;
    };
    modelItemData?: any;
    diagramElementType?: string;
    validationResult?: {
      isValid: boolean;
      errorCount: number;
      warningCount: number;
      messages: {
        type: 'error' | 'warning' | 'info';
        message: string;
        elementId?: string;
        code?: string;
      }[];
    };
  }
}
```

### Original ModelPanelAccordion Expected Props

```typescript
// Original ModelPanelAccordion props
interface ModelPanelAccordionProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  lastElementUpdate: string | null;
  diagramElementType?: DiagramElementType;
  referenceData: EditorReferenceData;
  showModelName?: boolean;
  showModelItemName?: boolean;
  visibleSections: {
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean;
  };
  needsInitialization?: boolean;
  // Action handlers excluded for brevity
}

// ModelItemData structure
interface ModelItemData {
  id: string;
  data: any;
  metadata: {
    type: SimulationObjectType;
    version: string;
    lastModified: string;
    id: string;
    isUnconverted?: boolean;
  };
  name: string;
  isUnconverted?: boolean;
}
```

### Mapping Logic

| Original Prop | Source in New Format | Transformation Logic |
|---------------|----------------------|----------------------|
| `modelName` | `data.documentContext.title` | Direct assignment |
| `validationState` | `data.validationResult` | Direct assignment, checking for null |
| `currentElement` | `data.modelItemData` | Direct assignment when exists, otherwise null |
| `lastElementUpdate` | `data.documentContext.lastUpdated` | Convert to string if present |
| `diagramElementType` | `data.diagramElementType` | Direct assignment |
| `referenceData` | Not directly in message | Must be stored in state from separate messages |
| `showModelName` | N/A | Default to true |
| `showModelItemName` | N/A | Default to true |
| `visibleSections` | N/A | Default configuration |
| `needsInitialization` | `!data.hasModel` | Invert the hasModel flag |

## ModelItemData Transformation

When dealing with element selection, we need to ensure the `modelItemData` property is properly structured:

```typescript
function transformToModelItemData(element: any): ModelItemData {
  // If the element already has the required structure, use it directly
  if (element.id && element.data && element.metadata) {
    return {
      id: element.id,
      data: element.data,
      metadata: {
        type: element.metadata.type,
        version: element.metadata.version || '1.0',
        lastModified: element.metadata.lastModified || new Date().toISOString(),
        id: element.id,
        isUnconverted: element.metadata.isUnconverted
      },
      name: element.name || `Item ${element.id}`,
      isUnconverted: element.isUnconverted
    };
  }
  
  // Otherwise, construct it from available properties
  return {
    id: element.id,
    data: element.data || {},
    metadata: {
      type: element.type || SimulationObjectType.None,
      version: '1.0',
      lastModified: new Date().toISOString(),
      id: element.id,
      isUnconverted: element.isUnconverted
    },
    name: element.name || element.text || `Item ${element.id}`,
    isUnconverted: element.isUnconverted
  };
}
```

## ValidationState Transformation

Validation data needs to be formatted according to the expected structure:

```typescript
function transformToValidationState(validationResult: any): ValidationState | null {
  if (!validationResult) return null;
  
  return {
    isValid: validationResult.isValid,
    messages: validationResult.messages || [],
    summary: {
      errorCount: validationResult.errorCount || 0,
      warningCount: validationResult.warningCount || 0
    }
  };
}
```

## Action Mapping

| Original Action | New Message Type | Payload Transformation |
|-----------------|------------------|------------------------|
| `onElementUpdate` | `UPDATE_ELEMENT_DATA` | `{ elementId, data, type }` |
| `onElementTypeChange` | `CONVERT_ELEMENT` | `{ elementId, type }` |
| `onValidate` | `VALIDATE_MODEL` | `{}` |
| `onSimulate` | `SIMULATE_MODEL` | `{ scenarioName }` |
| `onRemoveModel` | `REMOVE_MODEL` | `{}` |
| `onConvertPage` | `CONVERT_PAGE` | `{}` |
| `onViewResults` | `VIEW_SIMULATION_RESULTS` | `{}` |

## Reference Data Handling

Reference data isn't directly part of the selection message. This information needs to be:

1. Extracted from other messages
2. Stored in the application state
3. Combined with selection data when rendering components

```typescript
// In useModelPanel.ts
function useModelPanel() {
  const { selection, refData, /* other state */ } = useMessaging();
  
  // Combine the data
  return {
    // Selection data...
    referenceData: {
      entities: refData.entities || [],
      resources: refData.resources || [],
      // Other reference data...
    }
  };
}
```
