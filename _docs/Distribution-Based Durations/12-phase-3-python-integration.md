# Phase 3: Python Integration

## Overview

Phase 3 focuses on integrating the distribution-based durations with the Python simulation engine (Quodsim). This phase ensures that models created in the UI with various distribution types can be properly executed in the simulation.

## Goals

1. Update Python enums to include CONSTANT distribution type
2. Add support for distribution parameters in Python
3. Update duration serialization/deserialization in Python
4. Implement sampling for each distribution type
5. Ensure backward compatibility with existing models

## Tasks

### 1. Update Distribution Type Enum

- **File**: `quodsim/quodsim/model_definition/enums/distribution_type.py`
- **Changes**:
  - Add CONSTANT to the enum
  - Update deserialization to handle string and dict formats

**Estimated Time**: 1 day

### 2. Add Constant Parameters

- **File**: `quodsim/quodsim/model_definition/distribution_parameters.py`
- **Changes**:
  - Add ConstantParameters dataclass
  - Add from_dict method to create from serialized data
  - Ensure type safety with Union types

**Estimated Time**: 2 days

### 3. Update Distribution Class

- **File**: `quodsim/quodsim/model_definition/distribution.py`
- **Changes**:
  - Update to support CONSTANT distribution type
  - Implement sampling methods for each distribution
  - Add to_dict method for serialization

**Estimated Time**: 3 days

### 4. Update Duration Class

- **File**: `quodsim/quodsim/model_definition/duration.py`
- **Changes**:
  - Update from_dict method to handle both formats
  - Always convert to distribution-based format
  - Add get_value method to sample from distribution
  - Ensure backward compatibility

**Estimated Time**: 2 days

### 5. Update Simulation Logic

- **File**: Various simulation engine files
- **Changes**:
  - Update duration handling in simulation
  - Use distribution sampling for timing
  - Add support for variable durations

**Estimated Time**: 3 days

## Dependencies

- Phase 1: Core Type Changes

## Deliverables

1. Updated Python enums with CONSTANT distribution type
2. Parameter dataclasses in Python
3. Distribution class with sampling methods
4. Duration class with format conversion
5. Updated simulation logic for variable durations

## Testing Plan

### Unit Tests

1. **Distribution Type Tests**:
   - Test enum values
   - Test deserialization from strings and dicts

2. **Parameter Tests**:
   - Test parameter dataclasses
   - Test from_dict and to_dict methods

3. **Distribution Tests**:
   - Test distribution creation
   - Test sampling methods for each type
   - Test serialization/deserialization

4. **Duration Tests**:
   - Test format conversion
   - Test sampling from distributions
   - Test backward compatibility

### Integration Tests

1. **Model Loading Tests**:
   - Test loading models with legacy CONSTANT durations
   - Test loading models with distribution-based durations

2. **Simulation Tests**:
   - Test simulation with various distribution types
   - Verify correct timing behavior
   - Test statistics generation

### Performance Tests

1. **Sampling Performance**:
   - Test performance impact of distribution sampling
   - Test with large models and frequent sampling

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing models | High | Ensure backward compatibility in deserialization |
| Simulation behavior changes | High | Extensive testing with real-world models |
| Performance impact | Medium | Efficient sampling implementations, caching |
| Complex statistical distributions | Medium | Start with simple distributions, add more over time |

## Acceptance Criteria

1. Python enums and dataclasses match the TypeScript implementations
2. Distribution sampling works correctly for all supported types
3. Duration serialization/deserialization handles both formats
4. Existing models continue to work without changes
5. Simulation correctly uses distribution sampling for timing
6. All unit, integration, and performance tests pass

## Post-Implementation Validation

1. **End-to-End Testing**:
   - Create model with distributions in UI
   - Export to Python simulation
   - Run simulation and verify results
   - Analyze timing statistics

2. **Backward Compatibility Check**:
   - Test with existing production models
   - Verify no breaking changes

## Next Steps

Upon completion of Phase 3:
1. Document the distribution system for users
2. Create examples of common distribution patterns
3. Plan for future distribution type additions
