# Distribution Type Selector

## Overview

The Distribution Type Selector is a component that allows users to select from available distribution types. It will display a dropdown with options like CONSTANT, UNIFORM, TRIANGULAR, and NORMAL.

## API

```typescript
interface DistributionTypeSelectorProps {
  distributionType: DistributionType;
  onChange: (type: DistributionType) => void;
  disabled?: boolean;
}
```

## Implementation

### File Location

```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\DistributionTypeSelector.tsx
```

### Component Code

```tsx
import React from "react";
import { DistributionType, isDistributionTypeSupported, getDistributionDisplayName } from "@quodsi/shared";

interface DistributionTypeSelectorProps {
  distributionType: DistributionType;
  onChange: (type: DistributionType) => void;
  disabled?: boolean;
}

export const DistributionTypeSelector: React.FC<DistributionTypeSelectorProps> = ({
  distributionType,
  onChange,
  disabled = false,
}) => {
  // Define common/recommended distribution types to show at the top
  const commonDistributions = [
    DistributionType.CONSTANT,
    DistributionType.UNIFORM,
    DistributionType.TRIANGULAR,
    DistributionType.NORMAL,
  ];

  // Define groups for the dropdown
  const groups = [
    {
      label: "Common Distributions",
      options: commonDistributions,
    }
    // Can add more groups in the future for less common distributions
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as DistributionType);
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        Distribution Type
      </label>
      <select
        value={distributionType}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-2 py-1 text-sm border rounded"
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((type) => (
              <option key={type} value={type}>
                {getDistributionDisplayName(type)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};
```

## Display Names

The component uses the `getDistributionDisplayName` helper function to format distribution types for display:

| Distribution Type | Display Name |
|-------------------|--------------|
| CONSTANT          | Constant     |
| UNIFORM           | Uniform      |
| TRIANGULAR        | Triangular   |
| NORMAL            | Normal       |

## Grouping

The component organizes distribution types into groups:

1. **Common Distributions** - The initially supported types (CONSTANT, UNIFORM, TRIANGULAR, NORMAL)
2. Additional groups can be added in the future for less common distributions

## Usage Example

```tsx
import { DistributionTypeSelector } from "./distribution/DistributionTypeSelector";
import { DistributionType } from "@quodsi/shared";

// Inside another component
const [distributionType, setDistributionType] = useState(DistributionType.CONSTANT);

return (
  <DistributionTypeSelector 
    distributionType={distributionType} 
    onChange={setDistributionType} 
  />
);
```
