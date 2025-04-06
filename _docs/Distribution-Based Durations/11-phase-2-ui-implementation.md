# Phase 2: UI Implementation

## Overview

Phase 2 focuses on implementing the UI components needed to support distribution-based durations. Building on the type system changes from Phase 1, this phase develops the components that allow users to interact with distributions in the Quodsi interface.

## Goals

1. Create the EnhancedDurationEditor component to replace CompactDurationEditor
2. Implement parameter editors for each supported distribution type
3. Replace existing duration editors with the new component
4. Ensure the UI fits within space constraints

## Tasks

### 1. Create Distribution Type Selector

- **New File**: `quodsim-react/src/components/distribution/DistributionTypeSelector.tsx`
- **Changes**:
  - Create dropdown component for selecting distribution types
  - Group options by category (common vs. advanced)
  - Use `getDistributionDisplayName` from DistributionType.ts for display
  - Use `isDistributionTypeSupported` to filter available types

**Estimated Time**: 2 days

### 2. Create Parameter Editors

- **New Files**:
  - `quodsim-react/src/components/distribution/parameters/ParameterEditor.tsx` (base interface)
  - `quodsim-react/src/components/distribution/parameters/ConstantParameterEditor.tsx`
  - `quodsim-react/src/components/distribution/parameters/UniformParameterEditor.tsx`
  - `quodsim-react/src/components/distribution/parameters/TriangularParameterEditor.tsx`
  - `quodsim-react/src/components/distribution/parameters/NormalParameterEditor.tsx`
- **Changes**:
  - Create specialized editors that use the parameter metadata from distribution classes
  - Import metadata (e.g., `CONSTANT_PARAMETER_METADATA`) to drive UI
  - Implement validation using the distribution classes (e.g., `ConstantDistribution.validateParameters`)

**Estimated Time**: 4 days

### 3. Create Distribution Parameters Editor

- **New File**: `quodsim-react/src/components/distribution/DistributionParametersEditor.tsx`
- **Changes**:
  - Create container component that switches between parameter editors
  - Use DistributionFactory to manage distributions
  - Handle distribution creation and validation through the appropriate distribution class

**Estimated Time**: 2 days

### 4. Create Enhanced Duration Editor

- **New File**: `quodsim-react/src/components/EnhancedDurationEditor.tsx`
- **Changes**:
  - Create main duration editor component
  - Use DistributionFactory for converting between duration formats
  - Use `createDistributionFromConstantDuration` for backward compatibility
  - Support compact mode for space-constrained contexts

**Estimated Time**: 3 days

### 5. Replace Existing Editors

- **File**: `quodsim-react/src/components/OperationStepEditor.tsx`
- **File**: `quodsim-react/src/components/ActivityEditor.tsx`
- **Changes**:
  - Update imports to use EnhancedDurationEditor
  - Adjust layout as needed for the new component
  - Ensure proper migration of existing data

**Estimated Time**: 2 days

## Implementation Notes

### Distribution Type Selector Implementation

```tsx
import React from 'react';
import { DistributionType, getDistributionDisplayName, isDistributionTypeSupported } from '@quodsi/shared';

interface DistributionTypeSelectorProps {
  value: DistributionType;
  onChange: (type: DistributionType) => void;
  disabled?: boolean;
}

export const DistributionTypeSelector: React.FC<DistributionTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  // Filter supported distribution types
  const supportedTypes = Object.values(DistributionType)
    .filter(type => isDistributionTypeSupported(type));
  
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        Distribution Type
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DistributionType)}
        disabled={disabled}
        className="w-full px-2 py-1 text-sm border rounded"
      >
        {supportedTypes.map((type) => (
          <option key={type} value={type}>
            {getDistributionDisplayName(type)}
          </option>
        ))}
      </select>
    </div>
  );
};
```

### Parameter Editor Usage Example

```tsx
import React from 'react';
import { 
  ConstantParameters, 
  CONSTANT_PARAMETER_METADATA, 
  ConstantDistribution 
} from '@quodsi/shared';

interface ConstantParameterEditorProps {
  parameters: ConstantParameters;
  onChange: (updated: ConstantParameters) => void;
  disabled?: boolean;
}

export const ConstantParameterEditor: React.FC<ConstantParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false
}) => {
  const metadata = CONSTANT_PARAMETER_METADATA.value;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const updatedParams = { ...parameters, value: isNaN(newValue) ? 0 : newValue };
    
    // Only update if valid
    if (ConstantDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };
  
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        {metadata.label}
      </label>
      <input
        type="number"
        value={parameters.value}
        onChange={handleChange}
        disabled={disabled}
        min={metadata.min}
        step={metadata.step}
        className="w-full px-2 py-1 text-sm border rounded"
      />
    </div>
  );
};
```

## Dependencies

- Phase 1: Core Type Changes with reorganized distribution types must be completed

## Deliverables

1. Distribution Type Selector component
2. Parameter editor components for each distribution type
3. Distribution Parameters Editor component
4. Enhanced Duration Editor component
5. Updated operation step and activity editors

## Testing Plan

### Unit Tests

1. **Distribution Type Selector Tests**:
   - Test selection change events
   - Test display name formatting
   - Test supported types filtering

2. **Parameter Editor Tests**:
   - Test input validation using distribution validation methods
   - Test change events
   - Test parameter updates

3. **Distribution Parameters Editor Tests**:
   - Test switching between parameter editors
   - Test parameter updates
   - Test integration with distribution factory

4. **Enhanced Duration Editor Tests**:
   - Test format conversion using DistributionFactory
   - Test distribution type changes
   - Test parameter updates
   - Test period unit changes

### Integration Tests

1. **Editor Integration Tests**:
   - Test EnhancedDurationEditor in Operation Step Editor
   - Test model updates when duration changes

### UI Tests

1. **Visual Tests**:
   - Test layout in different contexts
   - Test compact mode
   - Test responsiveness
   - Verify the UI fits within the 300px width constraint

2. **User Flow Tests**:
   - Test complete user journey for changing distribution types
   - Test parameter input and validation feedback

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex UI in limited space | High | Use compact mode, collapsible sections, tooltips |
| Parameter validation UX | Medium | Use distribution class validation methods for consistent validation |
| Migration of existing data | Medium | Use DistributionFactory.createDistributionFromConstantDuration |
| Performance with dynamic components | Low | Optimize rerenders, use memoization |

## Acceptance Criteria

1. EnhancedDurationEditor component renders correctly in all contexts
2. Users can switch between distribution types
3. Parameter editors display appropriate fields for each distribution
4. All inputs are properly validated using the distribution class validation methods
5. Changes to distributions are correctly propagated to the model
6. UI fits within space constraints
7. All unit, integration, and UI tests pass

## Next Steps

Upon completion of Phase 2, proceed to Phase 3: Python Integration
