# Enhanced Duration Editor

## Overview

The Enhanced Duration Editor will be the main component for editing durations with distribution support. It will replace the current `CompactDurationEditor` and provide a unified interface for all duration types. The component will use our class-based distribution implementation to handle creation, validation, and value calculation.

## Component Structure

```
EnhancedDurationEditor
├── DistributionTypeSelector
└── DistributionParametersEditor
    ├── ConstantParameterEditor
    ├── UniformParameterEditor
    ├── TriangularParameterEditor
    └── NormalParameterEditor
```

## API

```typescript
interface EnhancedDurationEditorProps {
  duration: Duration;
  onChange: (updatedDuration: Duration) => void;
  label?: string;
  compact?: boolean; // If true, uses a more compact layout
}
```

## Implementation

### File Location

```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\EnhancedDurationEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { Duration, DurationType, PeriodUnit, Distribution, DistributionType } from "@quodsi/shared";
import { DistributionTypeSelector } from "./distribution/DistributionTypeSelector";
import { DistributionParametersEditor } from "./distribution/DistributionParametersEditor";
import { 
  createDefaultDistribution 
} from "@quodsi/shared/src/types/elements/distributions/DistributionFactory";
import { 
  ConstantParameters, 
  ConstantDistribution 
} from "@quodsi/shared/src/types/elements/distributions";

interface EnhancedDurationEditorProps {
  duration: Duration;
  onChange: (updatedDuration: Duration) => void;
  label?: string;
  compact?: boolean;
}

export const EnhancedDurationEditor: React.FC<EnhancedDurationEditorProps> = ({
  duration,
  onChange,
  label = "Duration",
  compact = false,
}) => {
  // Map for period unit display
  const periodUnitDisplay: Record<PeriodUnit, string> = {
    [PeriodUnit.MINUTES]: "MIN",
    [PeriodUnit.HOURS]: "HR",
    [PeriodUnit.DAYS]: "DAY",
    [PeriodUnit.SECONDS]: "SEC",
  };

  // Handle distribution type change
  const handleDistributionTypeChange = (type: DistributionType) => {
    // Use factory method to create default distribution
    const newDistribution = createDefaultDistribution(type);
    
    // For CONSTANT type, preserve the current value if available
    if (type === DistributionType.CONSTANT && duration.durationLength) {
      const value = duration.durationLength;
      // Use the class method to create a constant distribution
      const constantDistribution = ConstantDistribution.create(value);
      
      onChange({
        ...duration,
        durationType: DurationType.DISTRIBUTION,
        distribution: constantDistribution,
        durationLength: value // For backward compatibility
      });
    } else {
      onChange({
        ...duration,
        durationType: DurationType.DISTRIBUTION,
        distribution: newDistribution
      });
    }
  };

  // Handle distribution parameter changes
  const handleDistributionChange = (updatedDistribution: Distribution) => {
    // Update durationLength for CONSTANT distributions to maintain compatibility
    let updatedDuration: Duration = {
      ...duration,
      distribution: updatedDistribution
    };
    
    // If it's a CONSTANT distribution, update the durationLength field for compatibility with other components
    if (updatedDistribution.distributionType === DistributionType.CONSTANT) {
      const params = updatedDistribution.parameters as ConstantParameters;
      updatedDuration.durationLength = params.value;
    }
    
    onChange(updatedDuration);
  };

  // Handle period unit change
  const handlePeriodUnitChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    onChange({
      ...duration,
      durationPeriodUnit: event.target.value as PeriodUnit
    });
  };

  // Get current distribution type, defaulting to CONSTANT if not set
  const distributionType = duration.distribution?.distributionType || DistributionType.CONSTANT;

  return (
    <div className={`duration-editor ${compact ? "compact" : ""}`}>
      {/* Label */}
      <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
      
      {/* Distribution Type Selector */}
      <div className="mb-2">
        <DistributionTypeSelector
          distributionType={distributionType}
          onChange={handleDistributionTypeChange}
        />
      </div>
      
      {/* Distribution Parameters Editor */}
      <div className="mb-2">
        <DistributionParametersEditor
          distribution={duration.distribution}
          distributionType={distributionType}
          onChange={handleDistributionChange}
        />
      </div>
      
      {/* Period Unit Selector */}
      <div>
        <select
          name="durationPeriodUnit"
          className="w-full text-sm border rounded px-2 py-1"
          value={duration.durationPeriodUnit}
          onChange={handlePeriodUnitChange}
        >
          {Object.values(PeriodUnit).map((unit) => (
            <option key={unit} value={unit}>
              {periodUnitDisplay[unit]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
```

## Key Implementation Details

1. **Distribution Type Selection**:
   - Uses the class-based factory methods for creating distributions
   - Preserves durationLength if changing to CONSTANT type

2. **Parameter Editing**:
   - Delegates to the DistributionParametersEditor component
   - Updates the durationLength field when CONSTANT parameters change for compatibility with other components

3. **Period Unit Selection**:
   - Allows selecting from available period units (SECONDS, MINUTES, HOURS, DAYS)

## Usage Example

```tsx
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import { Duration, PeriodUnit, DurationType } from "@quodsi/shared";
import { ConstantDistribution } from "@quodsi/shared/src/types/elements/distributions";

// Inside another component
const [duration, setDuration] = useState(
  new Duration(
    1, 
    PeriodUnit.MINUTES, 
    DurationType.DISTRIBUTION,
    ConstantDistribution.create(1)
  )
);

return (
  <EnhancedDurationEditor 
    duration={duration} 
    onChange={setDuration}
    label="Processing Time" 
  />
);
```

## Compact Mode

For space-constrained contexts, the component supports a compact mode that reduces margins and padding:

```tsx
<EnhancedDurationEditor 
  duration={duration} 
  onChange={setDuration}
  label="Processing Time"
  compact={true}
/>
```

## Integration

This component will replace `CompactDurationEditor` in:
- `OperationStepEditor.tsx`
- `ActivityEditor.tsx`
- Any other components using duration editing

## Testing Considerations

1. **Initial State**:
   - Test initialization with different distribution types
   - Verify default parameters are applied correctly

2. **Distribution Type Changes**:
   - Test switching between different distribution types
   - Verify that parameters are properly initialized

3. **Parameter Updates**:
   - Test updating parameters for each distribution type
   - Verify that changes are properly propagated to the Duration object

4. **Component Integration**:
   - Test integration with other components that use the Duration object
   - Verify that all necessary fields (durationLength, durationPeriodUnit, etc.) are properly updated
