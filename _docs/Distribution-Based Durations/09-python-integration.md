# Python Integration

## Overview

The Python simulation engine (Quodsim) needs to be updated to handle the new approach where CONSTANT is a distribution type. This requires changes to the Python dataclasses and serialization/deserialization logic.

## Current Python Implementation

Currently, the Python side has:

1. A `Duration` class with:
   - `duration_length` property
   - `duration_period_unit` property
   - `duration_type` property (CONSTANT or DISTRIBUTION)
   - Optional `distribution` property

2. A `Distribution` class with:
   - `distribution_type` property
   - `parameters` property
   - No CONSTANT distribution type

## Required Changes

### 1. Update Distribution Type Enum

#### File Location
```
C:\_source\Greenshoes\quodsim\quodsim\model_definition\enums\distribution_type.py
```

#### Updated Code

```python
from enum import Enum
from typing import Union


class DistributionType(Enum):
    CONSTANT = "constant"  # New type
    UNIFORM = "uniform"
    TRIANGULAR = "triangular"
    NORMAL = "normal"
    # ... existing distribution types
    
    @classmethod
    def deserialize(cls, value: Union[str, dict]) -> "DistributionType":
        if isinstance(value, str):
            # Handle string values (from JSON)
            value_lower = value.lower()
            for member in cls:
                if member.value.lower() == value_lower:
                    return member
            raise ValueError(f"Unknown distribution type: {value}")
        elif isinstance(value, dict) and "value" in value:
            # Handle dict representations
            return cls.deserialize(value["value"])
        else:
            raise TypeError(f"Expected str or dict, got {type(value)}")
```

### 2. Add Constant Parameters Dataclass

#### File Location
```
C:\_source\Greenshoes\quodsim\quodsim\model_definition\distribution_parameters.py
```

#### Updated Code

```python
from dataclasses import dataclass
from typing import List, Union, Dict, Any


@dataclass
class ConstantParameters:
    value: float
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConstantParameters":
        return cls(value=float(data.get("value", 0)))


@dataclass
class UniformParameters:
    low: float
    high: float
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UniformParameters":
        return cls(
            low=float(data.get("low", 0)),
            high=float(data.get("high", 10))
        )

# ... existing parameter classes
```

### 3. Update Distribution Class

#### File Location
```
C:\_source\Greenshoes\quodsim\quodsim\model_definition\distribution.py
```

#### Updated Code

```python
from dataclasses import dataclass
from typing import Union, Dict, Any, Optional

from quodsim.model_definition.enums import DistributionType
from quodsim.model_definition.distribution_parameters import (
    ConstantParameters,
    UniformParameters,
    TriangularParameters,
    NormalParameters,
    # ... other parameter types
)


# Type for all parameter classes
DistributionParametersType = Union[
    ConstantParameters,
    UniformParameters,
    TriangularParameters,
    NormalParameters,
    # ... other parameter types
]


@dataclass
class Distribution:
    distribution_type: DistributionType
    parameters: DistributionParametersType
    description: str = ""
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Distribution":
        dist_type = DistributionType.deserialize(data.get("distributionType", "uniform"))
        params_data = data.get("parameters", {})
        
        # Create parameters object based on distribution type
        if dist_type == DistributionType.CONSTANT:
            parameters = ConstantParameters.from_dict(params_data)
        elif dist_type == DistributionType.UNIFORM:
            parameters = UniformParameters.from_dict(params_data)
        elif dist_type == DistributionType.TRIANGULAR:
            parameters = TriangularParameters.from_dict(params_data)
        elif dist_type == DistributionType.NORMAL:
            parameters = NormalParameters.from_dict(params_data)
        # ... other distribution types
        else:
            raise ValueError(f"Unsupported distribution type: {dist_type}")
        
        return cls(
            distribution_type=dist_type,
            parameters=parameters,
            description=data.get("description", "")
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "distributionType": self.distribution_type.value,
            "parameters": self._parameters_to_dict(),
            "description": self.description
        }
    
    def _parameters_to_dict(self) -> Dict[str, Any]:
        # Convert parameters to dictionary based on type
        if isinstance(self.parameters, ConstantParameters):
            return {"value": self.parameters.value}
        elif isinstance(self.parameters, UniformParameters):
            return {"low": self.parameters.low, "high": self.parameters.high}
        # ... other parameter types
        else:
            return vars(self.parameters)
    
    def sample(self) -> float:
        """Sample a value from this distribution"""
        if self.distribution_type == DistributionType.CONSTANT:
            return self.parameters.value
        elif self.distribution_type == DistributionType.UNIFORM:
            import random
            return random.uniform(self.parameters.low, self.parameters.high)
        # ... implement sampling for other distributions
        else:
            raise NotImplementedError(f"Sampling not implemented for {self.distribution_type}")
```

### 4. Update Duration Class

#### File Location
```
C:\_source\Greenshoes\quodsim\quodsim\model_definition\duration.py
```

#### Updated Code

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

from quodsim.model_definition.enums import DurationType, PeriodUnit, DistributionType
from quodsim.model_definition.distribution import Distribution
from quodsim.model_definition.distribution_parameters import ConstantParameters


@dataclass
class Duration:
    duration_length: float
    duration_period_unit: PeriodUnit
    duration_type: DurationType
    distribution: Optional[Distribution] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Duration":
        # Get basic properties
        length = float(data.get("durationLength", 0))
        period_unit = PeriodUnit.deserialize(data.get("durationPeriodUnit", "MINUTES"))
        dur_type = DurationType.deserialize(data.get("durationType", "CONSTANT"))
        
        # Handle legacy CONSTANT format
        if dur_type == DurationType.CONSTANT:
            # Convert to new format with CONSTANT distribution
            return cls(
                duration_length=length,
                duration_period_unit=period_unit,
                duration_type=DurationType.DISTRIBUTION,
                distribution=Distribution(
                    distribution_type=DistributionType.CONSTANT,
                    parameters=ConstantParameters(value=length)
                )
            )
        
        # Handle distribution format
        dist_data = data.get("distribution")
        distribution = None
        
        if dist_data:
            distribution = Distribution.from_dict(dist_data)
        else:
            # If no distribution but type is DISTRIBUTION, create a CONSTANT distribution
            distribution = Distribution(
                distribution_type=DistributionType.CONSTANT,
                parameters=ConstantParameters(value=length)
            )
        
        return cls(
            duration_length=length,
            duration_period_unit=period_unit,
            duration_type=DurationType.DISTRIBUTION,  # Always use DISTRIBUTION type
            distribution=distribution
        )
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "durationPeriodUnit": self.duration_period_unit.value,
            "durationType": self.duration_type.value,
        }
        
        # For backward compatibility
        if (self.distribution and 
            self.distribution.distribution_type == DistributionType.CONSTANT):
            # Set durationLength to match CONSTANT value
            result["durationLength"] = self.distribution.parameters.value
        else:
            result["durationLength"] = self.duration_length
        
        # Include distribution
        if self.distribution:
            result["distribution"] = self.distribution.to_dict()
        
        return result
    
    def get_value(self) -> float:
        """Get effective value of this duration"""
        if self.distribution:
            return self.distribution.sample()
        return self.duration_length
```

## Sampling Implementation

For each distribution type, we need to implement proper sampling logic:

```python
def sample(self) -> float:
    """Sample a value from this distribution"""
    if self.distribution_type == DistributionType.CONSTANT:
        return self.parameters.value
    
    elif self.distribution_type == DistributionType.UNIFORM:
        import random
        return random.uniform(self.parameters.low, self.parameters.high)
    
    elif self.distribution_type == DistributionType.TRIANGULAR:
        import random
        return random.triangular(
            self.parameters.left,
            self.parameters.right,
            self.parameters.mode
        )
    
    elif self.distribution_type == DistributionType.NORMAL:
        import random
        # Ensure we don't return negative values for durations
        value = random.normalvariate(self.parameters.mean, self.parameters.std)
        return max(0, value)
    
    # ... other distribution types
    
    else:
        raise NotImplementedError(f"Sampling not implemented for {self.distribution_type}")
```

## Testing Strategy

1. Test deserializing old format:
   ```python
   old_format = {
     "durationLength": 5,
     "durationPeriodUnit": "MINUTES",
     "durationType": "CONSTANT",
     "distribution": None
   }
   duration = Duration.from_dict(old_format)
   # Should have distribution.distribution_type=CONSTANT, distribution.parameters.value=5
   ```

2. Test sampling from different distributions:
   ```python
   # Test CONSTANT
   constant_dist = Distribution(
       distribution_type=DistributionType.CONSTANT,
       parameters=ConstantParameters(value=5)
   )
   assert constant_dist.sample() == 5
   
   # Test UNIFORM
   uniform_dist = Distribution(
       distribution_type=DistributionType.UNIFORM,
       parameters=UniformParameters(low=0, high=10)
   )
   sample = uniform_dist.sample()
   assert 0 <= sample <= 10
   
   # Similar tests for other distributions
   ```

3. Test integration with simulation engine to ensure distributions affect timing correctly
