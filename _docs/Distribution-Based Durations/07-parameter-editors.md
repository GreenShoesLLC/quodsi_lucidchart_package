# Parameter Editors

## Overview

Each distribution type requires its own parameter editor component. These components will render the appropriate input fields for each distribution's parameters and incorporate validation from our distribution classes. We'll create separate components for each of our initially supported distribution types.

## Common Parameter Editor Interface

All parameter editors will share a common interface pattern, although the parameter type will be specific to each distribution:

```typescript
interface ParameterEditorProps<T> {
  parameters: T;
  onChange: (updatedParameters: T) => void;
  disabled?: boolean;
}
```

## Constant Parameter Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\ConstantParameterEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { 
  ConstantParameters, 
  CONSTANT_PARAMETER_METADATA,
  ConstantDistribution 
} from "@quodsi/shared/src/types/elements/distributions";

interface ConstantParameterEditorProps {
  parameters: ConstantParameters;
  onChange: (updatedParameters: ConstantParameters) => void;
  disabled?: boolean;
}

export const ConstantParameterEditor: React.FC<ConstantParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata for the parameter
  const metadata = CONSTANT_PARAMETER_METADATA.value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const updatedParams: ConstantParameters = {
      ...parameters,
      value: isNaN(newValue) ? 0 : newValue
    };
    
    // Only update if the parameters are valid
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

## Uniform Parameter Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\UniformParameterEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { 
  UniformParameters, 
  UNIFORM_PARAMETER_METADATA,
  UniformDistribution 
} from "@quodsi/shared/src/types/elements/distributions";

interface UniformParameterEditorProps {
  parameters: UniformParameters;
  onChange: (updatedParameters: UniformParameters) => void;
  disabled?: boolean;
}

export const UniformParameterEditor: React.FC<UniformParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata
  const lowMetadata = UNIFORM_PARAMETER_METADATA.low;
  const highMetadata = UNIFORM_PARAMETER_METADATA.high;

  const handleLowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const updatedParams: UniformParameters = {
      ...parameters,
      low: isNaN(newValue) ? 0 : newValue
    };
    
    // Only update if the parameters are valid
    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleHighChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const updatedParams: UniformParameters = {
      ...parameters,
      high: isNaN(newValue) ? 0 : newValue
    };
    
    // Only update if the parameters are valid
    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {lowMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.low}
          onChange={handleLowChange}
          disabled={disabled}
          min={lowMetadata.min}
          step={lowMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {highMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.high}
          onChange={handleHighChange}
          disabled={disabled}
          min={highMetadata.min}
          step={highMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
    </div>
  );
};
```

## Triangular Parameter Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\TriangularParameterEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { 
  TriangularParameters, 
  TRIANGULAR_PARAMETER_METADATA,
  TriangularDistribution 
} from "@quodsi/shared/src/types/elements/distributions";

interface TriangularParameterEditorProps {
  parameters: TriangularParameters;
  onChange: (updatedParameters: TriangularParameters) => void;
  disabled?: boolean;
}

export const TriangularParameterEditor: React.FC<TriangularParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata
  const leftMetadata = TRIANGULAR_PARAMETER_METADATA.left;
  const modeMetadata = TRIANGULAR_PARAMETER_METADATA.mode;
  const rightMetadata = TRIANGULAR_PARAMETER_METADATA.right;

  const handleParameterChange = (paramName: keyof TriangularParameters, value: number) => {
    const updatedParams: TriangularParameters = {
      ...parameters,
      [paramName]: value
    };
    
    // Only update if the parameters are valid
    if (TriangularDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleLeftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('left', isNaN(newValue) ? 0 : newValue);
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('mode', isNaN(newValue) ? 0 : newValue);
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('right', isNaN(newValue) ? 0 : newValue);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {leftMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.left}
          onChange={handleLeftChange}
          disabled={disabled}
          min={leftMetadata.min}
          step={leftMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {modeMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.mode}
          onChange={handleModeChange}
          disabled={disabled}
          min={modeMetadata.min}
          step={modeMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {rightMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.right}
          onChange={handleRightChange}
          disabled={disabled}
          min={rightMetadata.min}
          step={rightMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
    </div>
  );
};
```

## Normal Parameter Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\NormalParameterEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { 
  NormalParameters, 
  NORMAL_PARAMETER_METADATA,
  NormalDistribution 
} from "@quodsi/shared/src/types/elements/distributions";

interface NormalParameterEditorProps {
  parameters: NormalParameters;
  onChange: (updatedParameters: NormalParameters) => void;
  disabled?: boolean;
}

export const NormalParameterEditor: React.FC<NormalParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata
  const meanMetadata = NORMAL_PARAMETER_METADATA.mean;
  const stdMetadata = NORMAL_PARAMETER_METADATA.std;

  const handleParameterChange = (paramName: keyof NormalParameters, value: number) => {
    const updatedParams: NormalParameters = {
      ...parameters,
      [paramName]: value
    };
    
    // Only update if the parameters are valid
    if (NormalDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleMeanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('mean', isNaN(newValue) ? 0 : newValue);
  };

  const handleStdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('std', isNaN(newValue) ? 0.1 : newValue);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {meanMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.mean}
          onChange={handleMeanChange}
          disabled={disabled}
          min={meanMetadata.min}
          step={meanMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {stdMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.std}
          onChange={handleStdChange}
          disabled={disabled}
          min={stdMetadata.min}
          step={stdMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
    </div>
  );
};
```

## Key Implementation Features

### 1. Type-Safe Parameter Editing

Each editor is strongly typed with the specific parameter interface for its distribution type:
- ConstantParameterEditor uses ConstantParameters
- UniformParameterEditor uses UniformParameters
- TriangularParameterEditor uses TriangularParameters
- NormalParameterEditor uses NormalParameters

### 2. Class-Based Validation

Each editor uses the static validation methods from the distribution classes:
- ConstantDistribution.validateParameters
- UniformDistribution.validateParameters
- TriangularDistribution.validateParameters
- NormalDistribution.validateParameters

This ensures consistent validation across the application.

### 3. Metadata-Driven UI

Each editor uses metadata from the distribution files to define:
- Field labels
- Minimum values
- Step increments
- Other constraints

This centralizes UI configuration and keeps it consistent.

### 4. Complete Parameter Objects

Unlike the original design, which updated individual parameters, these editors return complete parameter objects:
- Creates a copy of the current parameters
- Updates the specific parameter
- Validates the entire parameter set
- Returns the complete updated parameter object

### 5. Shared Patterns

All editors follow the same implementation pattern:
- Consistent styling for input fields
- Consistent validation approach
- Consistent error handling
- Consistent disabled state support

## Usage Example

```tsx
import { ConstantParameterEditor } from "./parameters/ConstantParameterEditor";
import { ConstantParameters, DEFAULT_CONSTANT_PARAMETERS } from "@quodsi/shared/src/types/elements/distributions";

// Inside another component
const [parameters, setParameters] = useState<ConstantParameters>({
  ...DEFAULT_CONSTANT_PARAMETERS
});

return (
  <ConstantParameterEditor 
    parameters={parameters} 
    onChange={setParameters} 
  />
);
```

## Testing Considerations

### 1. Validation Logic
- Test that invalid parameter values are rejected
- Test edge cases (zero values, minimum values, etc.)
- Verify that validation uses the distribution class methods

### 2. Parameter Updates
- Test that valid parameter changes are accepted
- Test that invalid parameter changes are rejected
- Verify that the complete parameter object is updated correctly

### 3. Metadata Usage
- Verify that labels, minimums, and steps are applied correctly
- Test that metadata changes propagate to the UI

### 4. Disabled State
- Test that inputs are properly disabled when the disabled prop is true
- Verify that no parameter changes occur in the disabled state
