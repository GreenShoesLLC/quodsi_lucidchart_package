# Phase 1: Core Type Changes

## Overview

Phase 1 focuses on implementing the core type system changes needed to support distribution-based durations. This phase establishes the foundation for the UI implementation and Python integration phases that follow.

## Goals

1. Add CONSTANT to the DistributionType enum
2. Create ConstantParameters interface
3. Update Distribution class to support CONSTANT distributions
4. Create helper functions and factory methods
5. Update serialization/deserialization logic

## Tasks

### 1. Update DistributionType Enum

- **File**: `shared/src/types/elements/DistributionType.ts`
- **Changes**:
  - Add CONSTANT to the enum
  - Add helper function for distribution display names
  - Add helper function to determine if a distribution type is supported

**Estimated Time**: 1 day

### 2. Update Distribution Parameters

- **File**: `shared/src/types/elements/Distribution.ts`
- **New File**: `shared/src/types/elements/parameters/metadata.ts`
- **Changes**:
  - Add ConstantParameters interface
  - Update DistributionParameters type to include ConstantParameters
  - Create metadata for parameters (labels, descriptions, constraints)

**Estimated Time**: 2 days

### 3. Create Factory Methods

- **New File**: `shared/src/types/elements/helpers/DistributionFactory.ts`
- **Changes**:
  - Create methods to generate default distributions of each type
  - Create conversion methods between formats
  - Implement validation logic for parameters

**Estimated Time**: 2 days

### 4. Update Serialization/Deserialization

- **File**: `shared/src/serialization/BaseModelDefinitionSerializer.ts`
- **File**: `shared/src/serialization/ModelDefinitionDeserializer.ts`
- **Changes**:
  - Update serialization to handle CONSTANT as distribution type
  - Update deserialization to convert legacy format
  - Ensure backward compatibility

**Estimated Time**: 3 days

## Dependencies

- None - this is the first phase

## Deliverables

1. Updated DistributionType enum with CONSTANT added
2. ConstantParameters interface and updated DistributionParameters type
3. Parameter metadata with labels and constraints
4. Factory methods for creating and validating distributions
5. Updated serialization/deserialization that handles both formats

## Testing Plan

### Unit Tests

1. **DistributionType Tests**:
   - Test enum values
   - Test display name generation
   - Test supported type checking

2. **Distribution Parameters Tests**:
   - Test parameter interfaces
   - Test metadata consistency

3. **Factory Method Tests**:
   - Test default distribution creation
   - Test format conversion
   - Test parameter validation

4. **Serialization Tests**:
   - Test serializing new format
   - Test deserializing old format
   - Test round-trip serialization/deserialization

### Integration Tests

1. **Model with Mixed Durations**:
   - Create a model with both constant and distribution durations
   - Serialize and deserialize the model
   - Verify all durations are correctly preserved

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing models | High | Ensure backward compatibility in serialization/deserialization |
| Performance impact from type checking | Medium | Add performance tests to ensure no significant slowdown |
| Type inconsistencies | Medium | Comprehensive unit tests for all edge cases |
| Interdependencies with other components | Low | Clear interfaces and documentation |

## Acceptance Criteria

1. CONSTANT is properly defined in DistributionType enum
2. ConstantParameters interface is created and integrated
3. Factory methods correctly create and validate distributions
4. Serialization/deserialization properly handles both old and new formats
5. All unit and integration tests pass
6. No regressions in existing functionality

## Next Steps

Upon completion of Phase 1, proceed to Phase 2: UI Implementation
