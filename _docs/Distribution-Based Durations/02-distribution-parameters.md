# Distribution Parameters

## Current Implementation

The current system defines distribution parameters as a union type of various parameter interfaces:

```typescript
export type DistributionParameters =
    | MultinomialParameters
    | UniformParameters
    | TriangularParameters
    // ... other parameter types
```

## Proposed Changes

Add a `ConstantParameters` interface to support CONSTANT as a distribution type:

```typescript
export interface ConstantParameters {
    value: number;
}

export type DistributionParameters =
    | ConstantParameters // New option
    | MultinomialParameters
    | UniformParameters
    | TriangularParameters
    // ... other parameter types
```

## Parameter Interface Definitions

For our initial supported distributions, we'll focus on these parameter types:

```typescript
export interface ConstantParameters {
    value: number;
}

export interface UniformParameters {
    low: number;
    high: number;
}

export interface TriangularParameters {
    left: number;
    mode: number;
    right: number;
}

export interface NormalParameters {
    mean: number;
    std: number;
}
```

## Default Parameter Values

We'll define sensible defaults for each parameter type:

```typescript
export const DEFAULT_CONSTANT_PARAMETERS: ConstantParameters = {
    value: 1
};

export const DEFAULT_UNIFORM_PARAMETERS: UniformParameters = {
    low: 0,
    high: 10
};

export const DEFAULT_TRIANGULAR_PARAMETERS: TriangularParameters = {
    left: 0,
    mode: 5,
    right: 10
};

export const DEFAULT_NORMAL_PARAMETERS: NormalParameters = {
    mean: 5,
    std: 1
};
```

## Parameter Labels and Descriptions

For the UI, we'll define labels and descriptions for each parameter:

```typescript
export interface ParameterMetadata {
    label: string;
    description: string;
    min?: number;
    max?: number;
    step?: number;
}

export const CONSTANT_PARAMETER_METADATA: Record<keyof ConstantParameters, ParameterMetadata> = {
    value: {
        label: "Value",
        description: "The constant duration value",
        min: 0,
        step: 0.1
    }
};

export const UNIFORM_PARAMETER_METADATA: Record<keyof UniformParameters, ParameterMetadata> = {
    low: {
        label: "Minimum",
        description: "The minimum value of the uniform distribution",
        min: 0,
        step: 0.1
    },
    high: {
        label: "Maximum",
        description: "The maximum value of the uniform distribution",
        min: 0,
        step: 0.1
    }
};

// Similar metadata for TRIANGULAR and NORMAL
```

## Implementation Files

```
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\Distribution.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\elements\parameters\metadata.ts (new file)
```
