# Enhanced Duration Editor

## Overview

The Enhanced Duration Editor will be the main component for editing durations with distribution support. It will replace the current `CompactDurationEditor` and provide a unified interface for all duration types.

## Component Structure

```
EnhancedDurationEditor
├── DistributionTypeSelector
└── DistributionParametersEditor
    ├── ConstantParametersEditor
    ├── UniformParametersEditor
    ├── TriangularParametersEditor
    └── NormalParametersEditor
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
import React, { useState, useEffect } from "react";
import { Duration, DurationType, PeriodUnit, Distribution, DistributionType } from "@quodsi/shared";
import { DistributionTypeSelector } from "./distribution/DistributionTypeSelector";
import { DistributionParametersEditor } from "./distribution/DistributionParametersEditor";
import { createDefaultDistribution, constantToDuration } from "@quodsi/shared/src/types/elements/helpers/DistributionFactory";

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

  // Local state for initial migration of old format
  const [migrated, setMigrated] = useState(false);

  // Migrate CONSTANT durations to distribution-based format
  useEffect(() => {
    if (!migrated && duration.durationType === DurationType.CONSTANT) {
      const migratedDuration = constantToDuration(
        duration.durationLength,
        duration.durationPeriodUnit
      );
      onChange(migratedDuration);
      setMigrated(true);
    }
  }, [duration, onChange, migrated]);

  // Handle distribution type change
  const handleDistributionTypeChange = (type: DistributionType) => {
    const newDistribution = createDefaultDistribution(type);
    
    // For CONSTANT type, preserve the current value
    if (type === DistributionType.CONSTANT) {
      newDistribution.parameters = { value: duration.durationLength };
    }
    
    onChange({
      ...duration,
      durationType: DurationType.DISTRIBUTION,
      distribution: newDistribution
    });
  };

  // Handle distribution parameter changes
  const handleDistributionChange = (updatedDistribution: Distribution) => {
    // Update durationLength for CONSTANT distributions to maintain compatibility
    let updatedDuration: Duration = {
      ...duration,
      distribution: updatedDistribution
    };
    
    if (updatedDistribution.distributionType === DistributionType.CONSTANT) {
      const value = (updatedDistribution.parameters as any).value || 0;
      updatedDuration.durationLength = value;
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

  // Get current distribution type
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

## Usage Example

```tsx
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";

// Inside another component
const [duration, setDuration] = useState(new Duration(1, PeriodUnit.MINUTES));

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
- Any other components using duration editing
