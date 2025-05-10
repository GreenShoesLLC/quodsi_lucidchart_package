# React New Messaging Components Implementation Plan

## Overview

This document outlines the approach for creating new React components that work with the new messaging system while preserving the UI functionality and look-and-feel of the existing components. We'll use a phased approach to implement the new ModelPanel component, leveraging the architectural advantages of the new messaging system.

## Architectural Principles

1. **Component Composition**: Break UI into smaller, focused components
2. **Separation of Concerns**: 
   - Data transformation logic in hooks and mappers
   - UI state in component state
   - UI rendering in functional components
3. **Unidirectional Data Flow**:
   - State flows down as props
   - Events flow up as callbacks
4. **Hooks-Based Architecture**: Use functional components with hooks instead of class components
5. **Type Safety**: Strong TypeScript interfaces for all data structures
6. **Selective Reuse**: Preserve valuable parts of existing components

## Folder Structure

```
src/
├── features/                # New feature-based organization
│   ├── modelPanel/          # New model panel components
│   │   ├── ModelPanel.tsx   # Main container component
│   │   ├── PanelHeader.tsx  # Replaces Header.tsx
│   │   ├── ElementEditor.tsx
│   │   ├── ValidationPanel.tsx
│   │   └── SimulationControls.tsx
│   ├── editors/             # Element-specific editors (reused or adapted)
│   │   ├── ActivityEditor.tsx
│   │   ├── EntityEditor.tsx
│   │   └── ...
│   └── shared/              # Shared UI components 
│       ├── AccordionSection.tsx
│       ├── StatusIndicator.tsx
│       └── ...
└── messaging/               # Existing messaging system
    ├── hooks/               # Custom hooks for messaging
    │   ├── useModelPanel.ts # New hook for model panel state
    │   └── ...
    └── mappers/             # Data transformation
        └── modelItem.mapper.ts  # New mapper for ModelItemData
```

## Implementation Phases

### Phase 1: Selection State Handling

**Goal**: Display the selected element and model information

1. Create `useModelPanel` hook for data transformation
2. Implement `ModelPanel` main container component
3. Create `PanelHeader` for displaying model/element name and basic controls

### Phase 2: Element Editing Capability

**Goal**: Edit element properties based on selection type

1. Adapt `ElementEditor` to work with new data structures
2. Create data transformers for each element type
3. Connect editor save actions to messaging system

### Phase 3: Validation Display

**Goal**: Show validation messages for model and elements

1. Create `ValidationPanel` component
2. Implement message filtering for current selection
3. Connect validation actions to messaging system

### Phase 4: Simulation Controls

**Goal**: Run simulations and view results

1. Create `SimulationControls` component
2. Implement simulation status display
3. Connect simulation actions to messaging system

## Key Message Handling Strategies

### Selection Data Transformation

The new messaging system's `selection` state will be transformed into the format expected by the UI components:

```typescript
// In useModelPanel.ts
function useModelPanel() {
  const { selection, validation, simulation, sendMessage } = useMessaging();
  
  // Extract model and element information
  const currentElement = selection.selectedElements[0] || null;
  const modelItemData = currentElement ? transformToModelItemData(currentElement) : null;
  const documentContext = selection.documentContext;
  
  // Return transformed data and actions
  return {
    modelName: documentContext?.documentTitle || '',
    currentElement: modelItemData,
    // Additional properties and actions...
  };
}
```

### Action Handling

UI events will be mapped to appropriate messages:

```typescript
const handleElementUpdate = (elementId: string, data: any) => {
  sendMessage(EnvelopeMessageType.UPDATE_ELEMENT_DATA, { 
    elementId, 
    data,
    type: currentElement?.metadata?.type 
  });
};
```

## Migration Strategy

1. **Start Fresh**: Build new components without modifying existing ones
2. **Reference Original**: Use existing components as reference for functionality
3. **Incremental Testing**: Test each component as it's implemented
4. **Parallel Development**: Keep both implementations functional during development
5. **Final Cutover**: Switch to new components when implementation is complete
