# Python Integration

## Overview

The Python simulation engine (Quodsim) needs to be updated to handle our class-based distribution implementation. This requires implementing similar class-based structures in Python to match the TypeScript implementation, including distribution-specific classes with validation and sampling methods.

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

## Implementation Approach

We'll implement a similar class-based structure in Python with:

1. Distribution-specific classes for each distribution type
2. Parameter dataclasses for each distribution type
3. Static methods for creation, validation, and sampling
4. A registry to manage distribution types

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
            
    @classmethod
    def get_supported_types(cls) -> list["DistributionType"]:
        """Get list of supported distribution types"""
        return [
            cls.CONSTANT,
            cls.UNIFORM,
            cls.TRIANGULAR,
            cls.NORMAL
        ]
        
    @classmethod
    def is_supported(cls, dist_type: "DistributionType") -> bool:
        """Check if a distribution type is supported"""
        return dist_type in cls.get_supported_types()
```

### 2. Create Distribution-Specific Modules

#### Directory Structure
```
quodsim/
├── model_definition/
│   ├── distributions/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── constant.py
│   │   ├── uniform.py
│   │   ├── triangular.py
│   │   ├── normal.py
│   │   └── registry.py
```

#### Base Distribution Module
```python
# base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, TypeVar, Generic

from ..enums import DistributionType


class DistributionParameters(ABC):
    """Base class for all distribution parameter classes"""
    
    @classmethod
    @abstractmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DistributionParameters":
        """Create parameters from dictionary"""
        pass
    
    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert parameters to dictionary"""
        pass


P = TypeVar('P', bound=DistributionParameters)


class DistributionBase(Generic[P], ABC):
    """Base class for all distribution classes"""
    
    @classmethod
    @abstractmethod
    def create_default(cls) -> "Distribution":
        """Create a default distribution of this type"""
        pass
    
    @classmethod
    @abstractmethod
    def create(cls, *args, **kwargs) -> "Distribution":
        """Create a distribution with the specified parameters"""
        pass
    
    @staticmethod
    @abstractmethod
    def validate_parameters(params: P) -> bool:
        """Validate parameters for this distribution type"""
        pass
    
    @staticmethod
    @abstractmethod
    def sample(params: P) -> float:
        """Sample a value from this distribution"""
        pass
```

#### Constant Distribution Module
```python
# constant.py
from dataclasses import dataclass
from typing import Dict, Any, ClassVar

from ..enums import DistributionType
from ..distribution import Distribution
from .base import DistributionParameters, DistributionBase


@dataclass
class ConstantParameters(DistributionParameters):
    """Parameters for a CONSTANT distribution"""
    value: float = 1.0
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConstantParameters":
        """Create parameters from dictionary"""
        return cls(value=float(data.get("value", 1.0)))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert parameters to dictionary"""
        return {"value": self.value}


class ConstantDistribution(DistributionBase[ConstantParameters]):
    """Implementation of CONSTANT distribution"""
    
    @classmethod
    def create_default(cls) -> Distribution:
        """Create a default CONSTANT distribution"""
        return cls.create(1.0)
    
    @classmethod
    def create(cls, value: float) -> Distribution:
        """Create a CONSTANT distribution with the specified value"""
        params = ConstantParameters(value=value)
        return Distribution(
            distribution_type=DistributionType.CONSTANT,
            parameters=params
        )
    
    @staticmethod
    def validate_parameters(params: ConstantParameters) -> bool:
        """Validate CONSTANT distribution parameters"""
        return isinstance(params.value, (int, float)) and params.value >= 0
    
    @staticmethod
    def sample(params: ConstantParameters) -> float:
        """Sample a value from this CONSTANT distribution"""
        return params.value
        
    @staticmethod
    def get_effective_value(params: ConstantParameters) -> float:
        """Get effective value for UI display"""
        return params.value
```

#### Distribution Registry Module
```python
# registry.py
from typing import Dict, Type, Any, Optional

from ..enums import DistributionType
from .base import DistributionBase, DistributionParameters
from .constant import ConstantDistribution, ConstantParameters
from .uniform import UniformDistribution, UniformParameters
from .triangular import TriangularDistribution, TriangularParameters
from .normal import NormalDistribution, NormalParameters


class DistributionRegistry:
    """Registry of distribution handlers"""
    
    _handlers: Dict[DistributionType, Type[DistributionBase]] = {
        DistributionType.CONSTANT: ConstantDistribution,
        DistributionType.UNIFORM: UniformDistribution,
        DistributionType.TRIANGULAR: TriangularDistribution,
        DistributionType.NORMAL: NormalDistribution
    }
    
    @classmethod
    def get_handler(cls, dist_type: DistributionType) -> Type[DistributionBase]:
        """Get handler for a distribution type"""
        handler = cls._handlers.get(dist_type)
        if not handler:
            # Default to CONSTANT if not found
            return cls._handlers[DistributionType.CONSTANT]
        return handler
    
    @classmethod
    def create_default(cls, dist_type: DistributionType) -> "Distribution":
        """Create a default distribution of the specified type"""
        handler = cls.get_handler(dist_type)
        return handler.create_default()
    
    @classmethod
    def validate_parameters(cls, dist_type: DistributionType, params: DistributionParameters) -> bool:
        """Validate parameters for a distribution type"""
        handler = cls.get_handler(dist_type)
        return handler.validate_parameters(params)
    
    @classmethod
    def sample(cls, dist_type: DistributionType, params: DistributionParameters) -> float:
        """Sample from a distribution with the given parameters"""
        handler = cls.get_handler(dist_type)
        return handler.sample(params)
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

from .enums import DistributionType
from .distributions import (
    DistributionParameters,
    ConstantParameters,
    UniformParameters,
    TriangularParameters,
    NormalParameters
)


# Type for all parameter classes
DistributionParametersType = Union[
    ConstantParameters,
    UniformParameters,
    TriangularParameters,
    NormalParameters
]


@dataclass
class Distribution:
    """Represents a statistical distribution for simulation"""
    
    distribution_type: DistributionType
    parameters: DistributionParametersType
    description: str = ""
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Distribution":
        """Create a Distribution from a dictionary"""
        from .distributions.registry import DistributionRegistry
        
        # Get distribution type
        dist_type = DistributionType.deserialize(data.get("distributionType", "constant"))
        params_data = data.get("parameters", {})
        
        # Create distribution using registry
        handler = DistributionRegistry.get_handler(dist_type)
        
        # Create parameters
        if dist_type == DistributionType.CONSTANT:
            parameters = ConstantParameters.from_dict(params_data)
        elif dist_type == DistributionType.UNIFORM:
            parameters = UniformParameters.from_dict(params_data)
        elif dist_type == DistributionType.TRIANGULAR:
            parameters = TriangularParameters.from_dict(params_data)
        elif dist_type == DistributionType.NORMAL:
            parameters = NormalParameters.from_dict(params_data)
        else:
            raise ValueError(f"Unsupported distribution type: {dist_type}")
        
        return cls(
            distribution_type=dist_type,
            parameters=parameters,
            description=data.get("description", "")
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "distributionType": self.distribution_type.value,
            "parameters": self.parameters.to_dict(),
            "description": self.description
        }
    
    def sample(self) -> float:
        """Sample a value from this distribution"""
        from .distributions.registry import DistributionRegistry
        return DistributionRegistry.sample(self.distribution_type, self.parameters)
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

from .enums import DurationType, PeriodUnit, DistributionType
from .distribution import Distribution
from .distributions import ConstantDistribution


@dataclass
class Duration:
    """Represents a duration in the simulation model"""
    
    duration_length: float
    duration_period_unit: PeriodUnit
    duration_type: DurationType
    distribution: Optional[Distribution] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Duration":
        """Create a Duration from a dictionary"""
        # Get basic properties
        length = float(data.get("durationLength", 0))
        period_unit = PeriodUnit.deserialize(data.get("durationPeriodUnit", "MINUTES"))
        dur_type = DurationType.deserialize(data.get("durationType", "DISTRIBUTION"))
        
        # Handle legacy CONSTANT format
        if dur_type == DurationType.CONSTANT:
            # Convert to new format with CONSTANT distribution
            dist = ConstantDistribution.create(length)
            return cls(
                duration_length=length,
                duration_period_unit=period_unit,
                duration_type=DurationType.DISTRIBUTION,
                distribution=dist
            )
        
        # Handle distribution format
        dist_data = data.get("distribution")
        distribution = None
        
        if dist_data:
            distribution = Distribution.from_dict(dist_data)
        else:
            # If no distribution but type is DISTRIBUTION, create a CONSTANT distribution
            distribution = ConstantDistribution.create(length)
        
        return cls(
            duration_length=length,
            duration_period_unit=period_unit,
            duration_type=DurationType.DISTRIBUTION,  # Always use DISTRIBUTION type
            distribution=distribution
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = {
            "durationPeriodUnit": self.duration_period_unit.value,
            "durationType": self.duration_type.value,
        }
        
        # For compatibility with other components
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
        """Sample a value for this duration"""
        if self.distribution:
            return self.distribution.sample()
        return self.duration_length
```

## Key Benefits of This Approach

1. **Separation of Concerns**:
   - Each distribution type has its own module
   - Parameter classes are separated from distribution logic

2. **Type Safety**:
   - Strong typing through Python's type hints
   - Generic base classes ensure consistent interfaces

3. **Consistent Interfaces**:
   - All distribution classes implement the same interface
   - Registry pattern provides a unified access point

4. **Extensibility**:
   - Easy to add new distribution types
   - Registry automatically handles new distributions

5. **Compatibility with TypeScript Implementation**:
   - Mirrors the class-based approach in TypeScript
   - Same structure and method names for consistency

## Testing Strategy

### 1. Distribution Classes

```python
def test_constant_distribution():
    # Test creation
    dist = ConstantDistribution.create(5)
    assert dist.distribution_type == DistributionType.CONSTANT
    assert isinstance(dist.parameters, ConstantParameters)
    assert dist.parameters.value == 5
    
    # Test validation
    assert ConstantDistribution.validate_parameters(ConstantParameters(value=5))
    assert not ConstantDistribution.validate_parameters(ConstantParameters(value=-1))
    
    # Test sampling
    assert ConstantDistribution.sample(ConstantParameters(value=5)) == 5
```

### 2. Distribution Registry

```python
def test_registry():
    # Test get_handler
    handler = DistributionRegistry.get_handler(DistributionType.CONSTANT)
    assert handler == ConstantDistribution
    
    # Test create_default
    dist = DistributionRegistry.create_default(DistributionType.UNIFORM)
    assert dist.distribution_type == DistributionType.UNIFORM
    assert isinstance(dist.parameters, UniformParameters)
    
    # Test validate_parameters
    params = UniformParameters(low=0, high=10)
    assert DistributionRegistry.validate_parameters(DistributionType.UNIFORM, params)
    
    # Test sample
    value = DistributionRegistry.sample(DistributionType.CONSTANT, ConstantParameters(value=5))
    assert value == 5
```

### 3. Serialization/Deserialization

```python
def test_distribution_serialization():
    # Create distribution
    dist = ConstantDistribution.create(5)
    
    # Serialize
    data = dist.to_dict()
    assert data["distributionType"] == "constant"
    assert data["parameters"]["value"] == 5
    
    # Deserialize
    deserialized = Distribution.from_dict(data)
    assert deserialized.distribution_type == DistributionType.CONSTANT
    assert deserialized.parameters.value == 5
```

### 4. Integration with Simulation

```python
def test_simulation_integration():
    # Create process with distribution-based duration
    process = Process(
        duration=Duration(
            duration_length=0,
            duration_period_unit=PeriodUnit.MINUTES,
            duration_type=DurationType.DISTRIBUTION,
            distribution=UniformDistribution.create(3, 7)
        )
    )
    
    # Run simulation and check durations
    simulation = Simulation(process)
    results = simulation.run()
    
    # Check that process duration varies between runs
    durations = [run.process_duration for run in results.runs]
    assert min(durations) >= 3
    assert max(durations) <= 7
```

## Implementation Schedule

1. **Week 1**: Implement distribution type enum and base classes
2. **Week 2**: Implement distribution-specific classes and registry
3. **Week 3**: Update Distribution and Duration classes
4. **Week 4**: Integrate with simulation engine and test

## Conclusion

The Python implementation will mirror our class-based TypeScript approach, providing a consistent interface across both environments. This will make it easier to add new distribution types in the future and ensure that both the UI and simulation engine handle distributions in the same way.
