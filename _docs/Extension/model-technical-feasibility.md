# Model "Technical Feasibility"" Documentation

## Overview

The purpose of this document is to describe what capability exists in the Technical Feasibility version. The Technical Feasibility Model Definition is the core structure that defines a discrete event simulation model. It describes how entities flow through a network of activities, capturing statistics and metrics throughout their journey. The model represents a system where entities (like customers, products, or transactions) move between activities (like service points, workstations, or processing steps) based on defined rules and logic.

## Key Components

### 1. Basic Configuration

- `reps`: Number of simulation replications to run
- `seed`: Random seed for reproducibility

### 2. Time Configuration

The model supports two types of time simulation:

#### Clock-based Timing

- `one_clock_unit`: Base time unit (MINUTES, HOURS, etc.)
- `warmup_clock_period`: Initial warm-up period
- `run_clock_period`: Main simulation run period

#### Calendar-based Timing

- `warmup_date_time`: Calendar-based warm-up time
- `start_date_time`: Simulation start datetime
- `finish_date_time`: Simulation end datetime

### 3. Core Model Elements

#### Entity

- Defines the types of entities that flow through the system
- Contains attributes and properties specific to each entity type
- Entities can represent customers, products, documents, or any discrete item

#### Generator

Generators create entities and introduce them into the system:

- Specifies which entity type to create
- Defines the initial activity where entities are created
- Controls creation frequency and quantity
- Parameters include:
  - `activity_unique_id`: Target activity for created entities
  - `entity_type`: Type of entity to generate
  - `periodic_occurrences`: How many creation cycles
  - `entities_per_creation`: Entities created per cycle
  - `period_interval_duration`: Time between creation cycles

#### Activity

Activities represent processing stations or points where entities undergo operations:

- Contains operation steps and connectors
- Properties:
  - `capacity`: How many entities can be processed simultaneously
  - `input_buffer_capacity`: Queue capacity before the activity
  - `output_buffer_capacity`: Queue capacity after the activity
  - `operation_steps`: List of processing steps
  - `connectors`: List of connections to other activities

#### Connector

Defines the flow paths between activities:

- Properties:
  - `to_activity_unique_id`: Target activity identifier
  - `to_activity_priority`: Priority level for the connection
  - `connect_type`: Type of connection (PROBABILITY or ATTRIBUTE_VALUE)
  - `probability`: Likelihood of selecting this path

#### Operation Step

Describes the actual processing that occurs within an activity:

- Defines processing duration
- Specifies required resources
- Can have complex resource requirements through Resource Set Requests

#### Resource

Defines resources required for operations:

- Resources can represent staff, machines, tools, etc.
- Properties:
  - `capacity`: Number of available units
  - `cost_rate`: Operating cost per time unit
  - `cost_per_use`: Cost per usage

### 4. Resource Requirements

#### Resource Set Request

Enables complex resource requirement definitions:

- Supports AND/OR logic for multiple resources
- Example structures:

  ```python
  # Simple requirement: Single resource
  ResourceSetRequest(
      requests=[ResourceRequest(resource_unique_id="machine_1")]
  )

  # Complex requirement: (Resource1 AND Resource2) OR (Resource3)
  ResourceSetRequest(
      request_type=RequestSetType.OR,
      requests=[
          ResourceSetRequest(
              request_type=RequestSetType.AND,
              requests=[
                  ResourceRequest(resource_unique_id="operator"),
                  ResourceRequest(resource_unique_id="tool")
              ]
          ),
          ResourceSetRequest(
              requests=[ResourceRequest(resource_unique_id="robot")]
          )
      ]
  )
  ```
[Previous sections remain the same up to Operation Step]

### 5. Duration Specifications

#### Duration
Duration represents a length of time in the model and consists of three key components:
- `duration_length`: The numeric value of the time period
- `duration_period_unit`: The unit of time (SECONDS, MINUTES, HOURS, DAYS)
- `duration_type`: Specifies how the duration value should be interpreted (see DurationType below)

Duration is used in multiple contexts:
- Operation step processing times
- Generator creation intervals
- Generator start delays
- Warmup periods
- Run periods

#### Duration Type
DurationType determines how a duration value is interpreted:

1. **CONSTANT**
   - The duration value is fixed
   - Used when processing times are deterministic
   - Example: A task that always takes exactly 5 minutes
   ```python
   Duration(
       duration_length=5,
       duration_period_unit=PeriodUnit.MINUTES,
       duration_type=DurationType.CONSTANT
   )
   ```

2. **DISTRIBUTION**
   - The duration value is sampled from a probability distribution
   - Used when processing times are variable
   - Requires additional distribution parameters
   - Example: A task that follows a normal distribution
   ```python
   Duration(
       duration_length=5,  # mean value
       duration_period_unit=PeriodUnit.MINUTES,
       duration_type=DurationType.DISTRIBUTION,
       distribution=Distribution(type=DistributionType.NORMAL, parameters={"std_dev": 1})
   )
   ```

Common uses of Duration in the model:

1. **In Operation Steps**
```python
OperationStep(
    duration=Duration(
        duration_length=10,
        duration_period_unit=PeriodUnit.MINUTES,
        duration_type=DurationType.CONSTANT
    )
)
```

2. **In Generators**
```python
Generator(
    entity_type="Customer",
    period_interval_duration=Duration(
        duration_length=3,
        duration_period_unit=PeriodUnit.MINUTES,
        duration_type=DurationType.DISTRIBUTION,
        distribution=Distribution(type=DistributionType.EXPONENTIAL)
    )
)
```

3. **In Model Configuration**
```python
ModelDefinition(
    run_clock_period=480,  # 8 hours
    run_clock_period_unit=PeriodUnit.MINUTES,
    warmup_clock_period=60,  # 1 hour warmup
    warmup_clock_period_unit=PeriodUnit.MINUTES
)
```

[Rest of the document remains the same]
## Flow Logic

1. **Entity Creation**: Generators create entities according to their configuration
2. **Activity Processing**:
   - Entities arrive at activities
   - Required resources are acquired
   - Operation steps are executed
   - Resources are released
3. **Flow Control**:
   - Connectors determine the next activity
   - Probability-based or attribute-based routing
4. **Data Collection**:
   - Statistics are gathered throughout the process
   - Metrics include waiting times, resource utilization, throughput
