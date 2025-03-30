# Distribution Parameters Editor

## Overview

The Distribution Parameters Editor is a dynamic component that renders the appropriate parameter inputs based on the selected distribution type. It will handle switching between parameter editors for CONSTANT, UNIFORM, TRIANGULAR, and NORMAL distributions.

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
import { Distribution, DistributionType, DistributionParameters } from "@quodsi/shared";
import { createDefaultDistribution } from "@quodsi/shared/src/types/elements/helpers/DistributionFactory";
import { ConstantParametersEditor } from "./parameters/ConstantParametersEditor";
import { UniformParametersEditor } from "./parameters/UniformParametersEditor";
import { TriangularParametersEditor } from "./parameters/TriangularParametersEditor";
import { NormalParametersEditor } from "./parameters/NormalParametersEditor";

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

  // Handler for parameter changes
  const handleParameterChange = (
    paramName: string,
    value: number
  ) => {
    const updatedParameters = {
      ...effectiveDistribution.parameters,
      [paramName]: value,
    };

    const updatedDistribution = new Distribution(
      distributionType,
      updatedParameters as DistributionParameters,
      effectiveDistribution.description || ""
    );

    onChange(updatedDistribution);
  };

  // Render the appropriate parameter editor based on distribution type
  const renderParameterEditor = () => {
    switch (distributionType) {
      case DistributionType.CONSTANT:
        return (
          <ConstantParametersEditor
            parameters={effectiveDistribution.parameters}
            onChange={handleParameterChange}
            disabled={disabled}
          />
        );
      case DistributionType.UNIFORM:
        return (
          <UniformParametersEditor
            parameters={effectiveDistribution.parameters}
            onChange={handleParameterChange}
            disabled={disabled}
          />
        );
      case DistributionType.TRIANGULAR:
        return (
          <TriangularParametersEditor
            parameters={effectiveDistribution.parameters}
            onChange={handleParameterChange}
            disabled={disabled}
          />
        );
      case DistributionType.NORMAL:
        return (
          <NormalParametersEditor
            parameters={effectiveDistribution.parameters}
            onChange={handleParameterChange}
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

## Dynamic Parameter Editors

The component dynamically renders one of the following parameter editors based on the selected distribution type:

1. `ConstantParametersEditor` - For CONSTANT distribution
2. `UniformParametersEditor` - For UNIFORM distribution
3. `TriangularParametersEditor` - For TRIANGULAR distribution
4. `NormalParametersEditor` - For NORMAL distribution

## Parameter Handling

When a parameter value changes:
1. The component creates a copy of the current parameters
2. Updates the specific parameter value
3. Creates a new Distribution object with the updated parameters
4. Calls the onChange callback with the updated distribution

## Default Distribution Creation

If the distribution is null or has a different type than what's selected, the component creates a new default distribution of the selected type using the `createDefaultDistribution` helper.

## Usage Example

```tsx
import { DistributionParametersEditor } from "./distribution/DistributionParametersEditor";
import { Distribution, DistributionType } from "@quodsi/shared";

// Inside another component
const [distribution, setDistribution] = useState(createDefaultDistribution(DistributionType.CONSTANT));

return (
  <DistributionParametersEditor 
    distribution={distribution} 
    distributionType={distribution.distributionType}
    onChange={setDistribution} 
  />
);
```
