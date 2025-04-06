# Distribution Type Selector

## Overview

The Distribution Type Selector is a component that allows users to select from available distribution types. It will display a dropdown with options like CONSTANT, UNIFORM, TRIANGULAR, and NORMAL. The component uses the helper functions from DistributionType.ts to determine which distribution types to display and how to format their names.

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
import { DistributionType, getDistributionDisplayName, isDistributionTypeSupported } from "@quodsi/shared";

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
  // Filter distribution types to only show supported ones
  const supportedTypes = Object.values(DistributionType)
    .filter(type => isDistributionTypeSupported(type));
  
  // Define groups for the dropdown - in future versions, we might add more groups
  const groups = [
    {
      label: "Common Distributions",
      options: supportedTypes,
    }
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

## Key Implementation Details

1. **Distribution Type Filtering**:
   - Uses `isDistributionTypeSupported` from the DistributionType.ts file
   - Only shows distribution types that are supported (CONSTANT, UNIFORM, TRIANGULAR, NORMAL)

2. **Display Name Formatting**:
   - Uses `getDistributionDisplayName` from the DistributionType.ts file
   - Formats distribution types for display (e.g., "CONSTANT" → "Constant")

3. **Grouping Structure**:
   - Groups distribution types into categories (currently just "Common Distributions")
   - Provides a structure that can be extended with additional groups in the future

## Display Names

The component uses the `getDistributionDisplayName` helper function to format distribution types for display:

| Distribution Type | Display Name |
|-------------------|--------------|
| CONSTANT          | Constant     |
| UNIFORM           | Uniform      |
| TRIANGULAR        | Triangular   |
| NORMAL            | Normal       |

## Future Extensions

The component structure allows for easy extension in the future:

1. **Additional Groups**: More distribution types can be added in separate groups (e.g., "Advanced Distributions")
2. **Filtering Options**: Add filtering functionality to show/hide certain distribution types
3. **Custom Rendering**: Customize the rendering of each distribution type option

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

## Testing Considerations

1. **Supported Types**:
   - Verify that only supported distribution types are displayed
   - Test that new types are displayed when added to the supported list

2. **Selection Change**:
   - Test that the onChange handler is called with the correct distribution type
   - Verify that the selected value is properly displayed

3. **Display Names**:
   - Verify that distribution types are formatted correctly
   - Test with different distribution types to ensure proper formatting

4. **Disabled State**:
   - Test that the component respects the disabled prop
   - Verify that no onChange events occur when disabled
