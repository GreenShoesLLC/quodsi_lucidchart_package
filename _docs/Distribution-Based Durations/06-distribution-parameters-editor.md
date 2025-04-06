# Distribution Parameters Editor

## Overview

The Distribution Parameters Editor is a dynamic component that renders the appropriate parameter inputs based on the selected distribution type. It will handle switching between parameter editors for CONSTANT, UNIFORM, TRIANGULAR, and NORMAL distributions. The component leverages our class-based distribution implementations to create and validate parameters.

## API

```typescript
interface DistributionParametersEditorProps {
  distribution: Distribution | null;
  distributionType: DistributionType;
  onChange: (updatedDistribution: Distribution) => void;
  disabled?: boolean;
}
```

## Implementation

### File Location

```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\DistributionParametersEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { Distribution, DistributionType } from "@quodsi/shared";
import { createDefaultDistribution } from "@quodsi/shared/src/types/elements/distributions/DistributionFactory";
import { 
  ConstantParameters, 
  UniformParameters, 
  TriangularParameters, 
  NormalParameters 
} from "@quodsi/shared/src/types/elements/distributions";
import { ConstantParameterEditor } from "./parameters/ConstantParameterEditor";
import { UniformParameterEditor } from "./parameters/UniformParameterEditor";
import { TriangularParameterEditor } from "./parameters/TriangularParameterEditor";
import { NormalParameterEditor } from "./parameters/NormalParameterEditor";

interface DistributionParametersEditorProps {
  distribution: Distribution | null;
  distributionType: DistributionType;
  onChange: (updatedDistribution: Distribution) => void;
  disabled?: boolean;
}

export const DistributionParametersEditor: React.FC<DistributionParametersEditorProps> = ({
  distribution,
  distributionType,
  onChange,
  disabled = false,
}) => {
  // If distribution is null or has a different type, create a new default distribution
  const effectiveDistribution = distribution?.distributionType === distributionType
    ? distribution
    : createDefaultDistribution(distributionType);

  // Handler for parameter updates
  const handleParameterUpdate = (updatedParameters: any) => {
    const updatedDistribution = new Distribution(
      distributionType,
      updatedParameters,
      effectiveDistribution.description || ""
    );

    onChange(updatedDistribution);
  };

  // Render the appropriate parameter editor based on distribution type
  const renderParameterEditor = () => {
    switch (distributionType) {
      case DistributionType.CONSTANT:
        return (
          <ConstantParameterEditor
            parameters={effectiveDistribution.parameters as ConstantParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.UNIFORM:
        return (
          <UniformParameterEditor
            parameters={effectiveDistribution.parameters as UniformParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.TRIANGULAR:
        return (
          <TriangularParameterEditor
            parameters={effectiveDistribution.parameters as TriangularParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.NORMAL:
        return (
          <NormalParameterEditor
            parameters={effectiveDistribution.parameters as NormalParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      default:
        return (
          <div className="text-sm text-red-500">
            Unsupported distribution type: {distributionType}
          </div>
        );
    }
  };

  return (
    <div className="parameters-editor">
      {renderParameterEditor()}
    </div>
  );
};
```

## Key Implementation Details

1. **Dynamic Parameter Editors**:
   - The component dynamically selects and renders the appropriate parameter editor based on the distribution type
   - Each parameter editor is designed specifically for its corresponding distribution type

2. **Type-Safe Parameters**:
   - Uses proper type casting to provide type-safe parameter editing
   - Each editor receives the correctly typed parameters object

3. **Default Distribution Creation**:
   - Uses the createDefaultDistribution factory method to create a new distribution when needed
   - Ensures that the editor always has a valid distribution to work with

4. **Parameter Update Handling**:
   - Receives complete parameter objects from the parameter editors
   - Creates a new Distribution with the updated parameters
   - Passes the updated distribution to the onChange callback

## Parameter Editor Components

The component works with the following parameter editor components:

1. **ConstantParameterEditor**:
   - Edits parameters for CONSTANT distributions (value)
   - Uses ConstantParameters interface

2. **UniformParameterEditor**:
   - Edits parameters for UNIFORM distributions (low, high)
   - Uses UniformParameters interface

3. **TriangularParameterEditor**:
   - Edits parameters for TRIANGULAR distributions (left, mode, right)
   - Uses TriangularParameters interface

4. **NormalParameterEditor**:
   - Edits parameters for NORMAL distributions (mean, std)
   - Uses NormalParameters interface

## Usage Example

```tsx
import { DistributionParametersEditor } from "./distribution/DistributionParametersEditor";
import { Distribution, DistributionType } from "@quodsi/shared";
import { createDefaultDistribution } from "@quodsi/shared/src/types/elements/distributions/DistributionFactory";

// Inside another component
const [distribution, setDistribution] = useState(
  createDefaultDistribution(DistributionType.CONSTANT)
);

return (
  <DistributionParametersEditor 
    distribution={distribution} 
    distributionType={distribution.distributionType}
    onChange={setDistribution} 
  />
);
```

## Parameter Editor API

Each parameter editor follows this common interface pattern:

```typescript
// Example for ConstantParameterEditor
interface ConstantParameterEditorProps {
  parameters: ConstantParameters;
  onChange: (updatedParameters: ConstantParameters) => void;
  disabled?: boolean;
}
```

## Testing Considerations

1. **Dynamic Type Handling**:
   - Test switching between different distribution types
   - Verify that the correct parameter editor is rendered for each type

2. **Parameter Updates**:
   - Test updating parameters for each distribution type
   - Verify that parameter changes are properly propagated to the parent component

3. **Default Distribution Creation**:
   - Test behavior when distribution is null
   - Test behavior when distribution type doesn't match distributionType prop

4. **Error Handling**:
   - Test behavior with unsupported distribution types
   - Verify appropriate error messaging
