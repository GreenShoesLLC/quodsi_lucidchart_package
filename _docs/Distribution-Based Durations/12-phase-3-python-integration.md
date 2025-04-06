# Phase 3: Python Integration

## Overview

Phase 3 focuses on integrating the distribution-based durations with the Python simulation engine (Quodsim). This phase ensures that models created in the UI with various distribution types can be properly executed in the simulation. The Python implementation will mirror the class-based approach used in TypeScript.

## Goals

1. Update Python enums to include CONSTANT distribution type
2. Create distribution-specific classes in Python
3. Implement sampling methods for each distribution type
4. Update duration serialization/deserialization
5. Ensure backward compatibility with existing models

## Tasks

### 1. Update Distribution Type Enum

- **File**: `quodsim/quodsim/model_definition/enums/distribution_type.py`
- **Changes**:
  - Add CONSTANT to the enum
  - Update deserialization to handle string and dict formats

**Estimated Time**: 1 day

### 2. Create Distribution Parameter Classes

- **New Files**:
  - `quodsim/quodsim/model_definition/distributions/constant.py`
  - `quodsim/quodsim/model_definition/distributions/uniform.py`
  - `quodsim/quodsim/model_definition/distributions/triangular.py`
  - `quodsim/quodsim/model_definition/distributions/normal.py`
  - `quodsim/quodsim/model_definition/distributions/__init__.py`
- **Changes**:
  - Create parameter dataclasses for each distribution type
  - Implement factory methods for creating distributions
  - Implement sampling methods for each distribution type
  - Implement validation methods

**Estimated Time**: 4 days

### 3. Example Distribution Class Implementation

```python
# constant.py
from dataclasses import dataclass
from typing import Dict, Any

from ..enums import DistributionType
from ..distribution import Distribution


@dataclass
class ConstantParameters:
    """Parameters for a CONSTANT distribution."""
    value: float = 1.0
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConstantParameters":
        """Create ConstantParameters from a dictionary."""
        return cls(
            value=float(data.get("value", 1.0))
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert parameters to a dictionary."""
        return {
            "value": self.value
        }


class ConstantDistribution:
    """Functions for working with CONSTANT distributions."""
    
    @staticmethod
    def create_default() -> Distribution:
        """Create a default CONSTANT distribution."""
        return ConstantDistribution.create(1.0)
    
    @staticmethod
    def create(value: float) -> Distribution:
        """Create a CONSTANT distribution with specified value."""
        params = ConstantParameters(value=value)
        return Distribution(
            distribution_type=DistributionType.CONSTANT,
            parameters=params
        )
    
    @staticmethod
    def validate_parameters(params: ConstantParameters) -> bool:
        """Validate CONSTANT distribution parameters."""
        return isinstance(params.value, (int, float)) and params.value >= 0
    
    @staticmethod
    def sample(params: ConstantParameters) -> float:
        """Sample from a CONSTANT distribution."""
        return params.value
```

### 4. Update Distribution Class

- **File**: `quodsim/quodsim/model_definition/distribution.py`
- **Changes**:
  - Update to support CONSTANT distribution type
  - Add factory method to create distributions
  - Add sampling method that delegates to specific distribution classes

**Estimated Time**: 3 days

### 5. Update Duration Class

- **File**: `quodsim/quodsim/model_definition/duration.py`
- **Changes**:
  - Update from_dict method to handle both formats
  - Always convert to distribution-based format
  - Add get_value method to sample from distribution
  - Ensure backward compatibility

**Estimated Time**: 2 days

### 6. Update Simulation Logic

- **File**: Various simulation engine files
- **Changes**:
  - Update duration handling in simulation
  - Use distribution sampling for timing
  - Add support for variable durations

**Estimated Time**: 3 days

## Dependencies

- Phase 1: Core Type Changes with class-based distribution implementations

## Deliverables

1. Updated Python enums with CONSTANT distribution type
2. Distribution-specific Python classes with parameter dataclasses
3. Distribution sampling methods for each distribution type
4. Updated Duration class with format conversion
5. Updated simulation logic for variable durations

## Implementation Notes

### Distribution Registry

For distributing type-specific functionality, we'll create a registry in Python:

```python
# registry.py
from typing import Dict, Type, Any

from .enums import DistributionType
from .distributions import (
    ConstantDistribution,
    UniformDistribution,
    TriangularDistribution,
    NormalDistribution
)

class DistributionRegistry:
    """Registry of distribution type handlers."""
    
    _handlers = {
        DistributionType.CONSTANT: ConstantDistribution,
        DistributionType.UNIFORM: UniformDistribution,
        DistributionType.TRIANGULAR: TriangularDistribution,
        DistributionType.NORMAL: NormalDistribution
    }
    
    @classmethod
    def get_handler(cls, distribution_type: DistributionType):
        """Get the handler for a specific distribution type."""
        handler = cls._handlers.get(distribution_type)
        if not handler:
            return cls._handlers[DistributionType.CONSTANT]
        return handler
    
    @classmethod
    def sample(cls, distribution_type: DistributionType, parameters: Any) -> float:
        """Sample from a distribution with the given type and parameters."""
        handler = cls.get_handler(distribution_type)
        return handler.sample(parameters)
    
    @classmethod
    def validate_parameters(cls, distribution_type: DistributionType, parameters: Any) -> bool:
        """Validate parameters for a distribution type."""
        handler = cls.get_handler(distribution_type)
        return handler.validate_parameters(parameters)
```

## Testing Plan

### Unit Tests

1. **Distribution Type Tests**:
   - Test enum values
   - Test deserialization from strings and dicts

2. **Distribution Class Tests**:
   - Test distribution creation
   - Test parameter validation
   - Test sampling methods for each type
   - Test serialization/deserialization

3. **Duration Tests**:
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

1. Python distribution classes mirror the TypeScript implementations
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
