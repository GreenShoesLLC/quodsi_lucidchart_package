# Parameter Editors

## Overview

Each distribution type requires its own parameter editor component. These components will render the appropriate input fields for each distribution's parameters. We'll create separate components for each of our initially supported distribution types.

## Common Parameter Editor Interface

All parameter editors will share a common interface:

```typescript
interface ParameterEditorProps<T> {
  parameters: T;
  onChange: (paramName: string, value: number) => void;
  disabled?: boolean;
}
```

## Constant Parameters Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\ConstantParametersEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { ConstantParameters } from "@quodsi/shared";
import { CONSTANT_PARAMETER_METADATA } from "@quodsi/shared/src/types/elements/parameters/metadata";

interface ConstantParametersEditorProps {
  parameters: any; // Using any to handle possible type mismatches
  onChange: (paramName: string, value: number) => void;
  disabled?: boolean;
}

export const ConstantParametersEditor: React.FC<ConstantParametersEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Cast to expected type, with fallback
  const typedParams = parameters as ConstantParameters;
  const value = typedParams?.value ?? 0;
  
  // Get metadata for the parameter
  const metadata = CONSTANT_PARAMETER_METADATA.value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("value", isNaN(newValue) ? 0 : newValue);
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        {metadata.label}
      </label>
      <input
        type="number"
        value={value}
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

## Uniform Parameters Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\UniformParametersEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { UniformParameters } from "@quodsi/shared";
import { UNIFORM_PARAMETER_METADATA } from "@quodsi/shared/src/types/elements/parameters/metadata";

interface UniformParametersEditorProps {
  parameters: any;
  onChange: (paramName: string, value: number) => void;
  disabled?: boolean;
}

export const UniformParametersEditor: React.FC<UniformParametersEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Cast to expected type, with fallback
  const typedParams = parameters as UniformParameters;
  const low = typedParams?.low ?? 0;
  const high = typedParams?.high ?? 10;

  // Get metadata
  const lowMetadata = UNIFORM_PARAMETER_METADATA.low;
  const highMetadata = UNIFORM_PARAMETER_METADATA.high;

  const handleLowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("low", isNaN(newValue) ? 0 : newValue);
  };

  const handleHighChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("high", isNaN(newValue) ? 0 : newValue);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {lowMetadata.label}
        </label>
        <input
          type="number"
          value={low}
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
          value={high}
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

## Triangular Parameters Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\TriangularParametersEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { TriangularParameters } from "@quodsi/shared";
import { TRIANGULAR_PARAMETER_METADATA } from "@quodsi/shared/src/types/elements/parameters/metadata";

interface TriangularParametersEditorProps {
  parameters: any;
  onChange: (paramName: string, value: number) => void;
  disabled?: boolean;
}

export const TriangularParametersEditor: React.FC<TriangularParametersEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Cast to expected type, with fallback
  const typedParams = parameters as TriangularParameters;
  const left = typedParams?.left ?? 0;
  const mode = typedParams?.mode ?? 5;
  const right = typedParams?.right ?? 10;

  // Get metadata
  const leftMetadata = TRIANGULAR_PARAMETER_METADATA.left;
  const modeMetadata = TRIANGULAR_PARAMETER_METADATA.mode;
  const rightMetadata = TRIANGULAR_PARAMETER_METADATA.right;

  const handleLeftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("left", isNaN(newValue) ? 0 : newValue);
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("mode", isNaN(newValue) ? 0 : newValue);
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("right", isNaN(newValue) ? 0 : newValue);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {leftMetadata.label}
        </label>
        <input
          type="number"
          value={left}
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
          value={mode}
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
          value={right}
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

## Normal Parameters Editor

### File Location
```
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\distribution\parameters\NormalParametersEditor.tsx
```

### Component Code

```tsx
import React from "react";
import { NormalParameters } from "@quodsi/shared";
import { NORMAL_PARAMETER_METADATA } from "@quodsi/shared/src/types/elements/parameters/metadata";

interface NormalParametersEditorProps {
  parameters: any;
  onChange: (paramName: string, value: number) => void;
  disabled?: boolean;
}

export const NormalParametersEditor: React.FC<NormalParametersEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Cast to expected type, with fallback
  const typedParams = parameters as NormalParameters;
  const mean = typedParams?.mean ?? 5;
  const std = typedParams?.std ?? 1;

  // Get metadata
  const meanMetadata = NORMAL_PARAMETER_METADATA.mean;
  const stdMetadata = NORMAL_PARAMETER_METADATA.std;

  const handleMeanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("mean", isNaN(newValue) ? 0 : newValue);
  };

  const handleStdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange("std", isNaN(newValue) ? 0.1 : newValue);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {meanMetadata.label}
        </label>
        <input
          type="number"
          value={mean}
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
          value={std}
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

## Common Features

All parameter editors share these common features:

1. **Type Casting with Fallbacks**: Each editor casts the received parameters to its expected type and provides fallback values to handle possible type mismatches
2. **Metadata-Driven UI**: Labels, min values, and step values come from metadata definitions
3. **Input Validation**: Ensures numeric inputs and provides appropriate constraints
4. **Consistent Styling**: All editors follow the same visual styling pattern
5. **Disabled State Support**: All inputs support being disabled

## Parameter Editor Helpers

For more complex validation or specialized parameter handling, additional helper functions can be added to each editor component.
