# Status.json Error Schema Documentation

## Overview

This document describes how Python simulation runners should write error and progress data to `status.json` files in Azure Blob Storage. This data flows from the Python runner through the data connector to the React UI, allowing users to see detailed error information and simulation progress.

## File Location

Each scenario has its own `status.json` file stored at:
```
{documentId}/{scenarioId}/status.json
```

For example:
```
abc123-def456/2025-01-08_143022_scenario_1/status.json
```

## Data Flow

```
Python Runner → Azure Blob Storage (status.json) → Data Connector → Extension → React UI
```

1. **Python Runner**: Writes status.json with error/progress fields
2. **Azure Blob Storage**: Stores the file in the scenario folder
3. **Data Connector**: Reads and parses status.json (listScenariosAction)
4. **Extension**: Receives scenario data via messaging
5. **React UI**: Displays errors and progress to users

## Core Schema

### Required Fields

```json
{
  "id": "2025-01-08_143022_scenario_1",
  "name": "My Scenario Name",
  "runState": "RAN_WITH_ERRORS",
  "reps": 100,
  "lastUpdated": "2025-01-08T14:35:22.123Z"
}
```

### RunState Values

The `runState` field must be one of these exact values:

| Value | Description | When to Use |
|-------|-------------|-------------|
| `NOT_RUN` | Scenario not yet started | Initial state |
| `RUNNING` | Simulation in progress | While executing replications |
| `RAN_SUCCESSFULLY` | Completed without errors | All reps completed successfully |
| `RAN_WITH_ERRORS` | Completed with errors | Any error occurred during execution |

**IMPORTANT**: Use `RAN_WITH_ERRORS` (not `FAILED` or `ERROR`) when errors occur.

## Progress Tracking

### currentReplication Field

Track which replication is currently executing:

```json
{
  "runState": "RUNNING",
  "reps": 100,
  "currentReplication": 42
}
```

**Field Details**:
- **Type**: Integer (1 to reps)
- **Range**: 1 ≤ currentReplication ≤ reps
- **Update Frequency**: Update periodically (e.g., after each replication completes)
- **UI Display**: Shows progress as "Replication 42 of 100"

**Example Progress Updates**:

```json
// Starting first replication
{
  "runState": "RUNNING",
  "currentReplication": 1,
  "lastUpdated": "2025-01-08T14:30:00.000Z"
}

// Halfway through
{
  "runState": "RUNNING",
  "currentReplication": 50,
  "lastUpdated": "2025-01-08T14:32:15.000Z"
}

// Completed successfully
{
  "runState": "RAN_SUCCESSFULLY",
  "currentReplication": 100,
  "lastUpdated": "2025-01-08T14:35:00.000Z"
}
```

## Error Handling

### Error Fields

When `runState` is `RAN_WITH_ERRORS`, include these fields:

```json
{
  "runState": "RAN_WITH_ERRORS",
  "error": "User-friendly error message",
  "errorType": "VALIDATION_ERROR",
  "errorDetails": "Technical details and stack trace",
  "errorSuggestions": [
    "First actionable suggestion",
    "Second actionable suggestion"
  ],
  "lastUpdated": "2025-01-08T14:35:22.123Z"
}
```

### Field Specifications

#### 1. error (required)
- **Type**: String
- **Purpose**: User-friendly error message displayed prominently in UI
- **Length**: Keep under 200 characters for readability
- **Tone**: Clear, non-technical language
- **Example**: "Resource capacity cannot be negative"

#### 2. errorType (required)
- **Type**: String (category identifier)
- **Purpose**: Categorize errors for filtering and analytics
- **Format**: SCREAMING_SNAKE_CASE

**Recommended Error Types**:

| Error Type | When to Use |
|------------|-------------|
| `VALIDATION_ERROR` | Model definition validation failures |
| `RUNTIME_ERROR` | Python exceptions during execution |
| `RESOURCE_ERROR` | Out of memory, disk space, etc. |
| `TIMEOUT_ERROR` | Execution exceeded time limit |
| `DATA_ERROR` | Invalid input data or missing files |
| `CONFIGURATION_ERROR` | Invalid model parameters |
| `NETWORK_ERROR` | Azure Storage or network issues |
| `UNKNOWN_ERROR` | Uncategorized errors |

#### 3. errorDetails (optional but recommended)
- **Type**: String
- **Purpose**: Technical details for debugging
- **Content**: Stack traces, exception details, variable values
- **Length**: No limit (can be very long)
- **Audience**: Developers and support team

**Example**:
```json
"errorDetails": "Traceback (most recent call last):\n  File \"simulation.py\", line 142, in run_replication\n    entity.process_activity(activity)\n  File \"entity.py\", line 67, in process_activity\n    duration = activity.get_duration()\nValueError: Duration cannot be negative: -5.2"
```

#### 4. errorSuggestions (optional but highly valuable)
- **Type**: Array of strings
- **Purpose**: Actionable guidance for fixing the error
- **Length**: 2-5 suggestions per error
- **Tone**: Imperative ("Check...", "Verify...", "Ensure...")
- **Specificity**: Reference specific model elements when possible

**Good Suggestions Example**:
```json
"errorSuggestions": [
  "Check that all Activity duration distributions have positive parameters",
  "Verify that the 'Assembly' activity duration is not set to a negative value",
  "Ensure all Triangular distributions have min ≤ mode ≤ max"
]
```

## Complete Error Examples

### Example 1: Validation Error

```json
{
  "id": "2025-01-08_143022_scenario_1",
  "name": "Production Model v1",
  "runState": "RAN_WITH_ERRORS",
  "reps": 100,
  "runClockPeriod": 480,
  "runClockPeriodUnit": "Minutes",
  "simulationTimeType": "Clock",
  "currentReplication": 1,
  "lastUpdated": "2025-01-08T14:30:15.000Z",
  "error": "Activity 'Assembly' has invalid duration parameters",
  "errorType": "VALIDATION_ERROR",
  "errorDetails": "ValidationError: Activity 'Assembly' (id: act_123) has a Triangular distribution with invalid parameters:\n  min: 10\n  mode: 5\n  max: 15\nMode (5) must be between min (10) and max (15).",
  "errorSuggestions": [
    "Verify that the 'Assembly' activity Triangular distribution has min ≤ mode ≤ max",
    "Check if min and mode values were accidentally swapped",
    "Ensure all duration parameters are positive and logically ordered"
  ]
}
```

### Example 2: Runtime Error

```json
{
  "id": "2025-01-08_150000_scenario_2",
  "name": "Warehouse Simulation",
  "runState": "RAN_WITH_ERRORS",
  "reps": 50,
  "currentReplication": 23,
  "lastUpdated": "2025-01-08T15:12:45.000Z",
  "error": "Resource 'Forklift' capacity became negative during replication 23",
  "errorType": "RUNTIME_ERROR",
  "errorDetails": "RuntimeError at time 247.5 (replication 23 of 50):\n  Resource: Forklift (res_456)\n  Current capacity: -2\n  Cause: Entity ent_789 attempted to seize 3 units but only 1 was available\n  \nStack trace:\n  File \"simulation.py\", line 234, in process_entity\n    resource.seize(required_units)\n  File \"resource.py\", line 89, in seize\n    raise RuntimeError(f'Capacity became negative: {self.available}')",
  "errorSuggestions": [
    "Check if 'Forklift' resource capacity is set correctly in the model",
    "Verify that all activities releasing 'Forklift' are properly configured",
    "Ensure resource seizure amounts match resource capacity constraints",
    "Review the resource requirement for activities using 'Forklift'"
  ]
}
```

### Example 3: Resource/Timeout Error

```json
{
  "id": "2025-01-08_160000_scenario_3",
  "name": "Large Hospital Model",
  "runState": "RAN_WITH_ERRORS",
  "reps": 1000,
  "currentReplication": 127,
  "lastUpdated": "2025-01-08T16:58:30.000Z",
  "error": "Simulation exceeded maximum execution time of 60 minutes",
  "errorType": "TIMEOUT_ERROR",
  "errorDetails": "TimeoutError: Execution terminated after 3600 seconds\n  Completed replications: 127 of 1000\n  Average time per replication: 28.3 seconds\n  Estimated total time: 7.9 hours\n  Maximum allowed time: 1.0 hours",
  "errorSuggestions": [
    "Reduce the number of replications from 1000 to a smaller number (e.g., 100)",
    "Decrease the simulation duration (runClockPeriod) to reduce execution time",
    "Simplify the model by reducing the number of entities or activities",
    "Contact support if you need longer execution time limits"
  ]
}
```

### Example 4: Data Error

```json
{
  "id": "2025-01-08_170000_scenario_4",
  "name": "Customer Service Model",
  "runState": "RAN_WITH_ERRORS",
  "reps": 200,
  "currentReplication": 1,
  "lastUpdated": "2025-01-08T17:00:45.000Z",
  "error": "Generator 'Customer Arrivals' has invalid interarrival distribution",
  "errorType": "DATA_ERROR",
  "errorDetails": "DataError: Generator 'Customer Arrivals' (gen_111) has an Exponential distribution with invalid lambda parameter:\n  lambda: 0\n  \nExponential distribution requires lambda > 0.\n  \nLocation: model.json -> generators -> gen_111 -> interarrivalTime -> distribution -> parameters -> lambda",
  "errorSuggestions": [
    "Set the 'Customer Arrivals' generator lambda parameter to a positive value",
    "Verify that the exponential distribution mean is greater than zero",
    "Check if the interarrival time was configured correctly"
  ]
}
```

## Best Practices

### DO ✅

1. **Write error immediately**: Update status.json as soon as an error occurs
2. **Be specific**: Reference exact model element names and IDs in error messages
3. **Provide context**: Include replication number, simulation time, and state when error occurred
4. **Update timestamps**: Always set `lastUpdated` to current ISO timestamp
5. **Use actionable language**: Suggestions should tell users exactly what to check or fix
6. **Include technical details**: Put stack traces and debug info in `errorDetails`
7. **Update progress regularly**: Write `currentReplication` every few replications
8. **Handle partial completion**: If 50 of 100 reps complete before error, indicate that

### DON'T ❌

1. **Don't use generic messages**: Avoid "An error occurred" or "Simulation failed"
2. **Don't skip errorType**: Always categorize errors for better UX
3. **Don't write suggestions for users to "debug" or "check logs"**: They don't have access to logs
4. **Don't leave runState as RUNNING**: Always update to RAN_WITH_ERRORS or RAN_SUCCESSFULLY
5. **Don't exceed 1 hour without updates**: UI marks scenarios as timed out after 1 hour of no status.json updates
6. **Don't use FAILED or ERROR**: Use `RAN_WITH_ERRORS` as the runState value

## Update Frequency

### During Execution (RUNNING)

Update status.json periodically to prevent timeout detection:

- **Every 5-10 replications**: Update `currentReplication`
- **At least every 30 minutes**: Update `lastUpdated` even if currentReplication hasn't changed
- **On any state change**: Immediately update when starting, completing, or failing

### Timeout Detection

The data connector marks scenarios as failed if:
- `runState` is `RUNNING`
- More than **1 hour** has passed since `lastUpdated`

**To prevent false timeouts**:
```python
import json
from datetime import datetime

# Update status every 5 replications
if current_replication % 5 == 0:
    status = {
        "runState": "RUNNING",
        "currentReplication": current_replication,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }
    write_status_json(status)
```

## Example Python Implementation

```python
import json
from datetime import datetime
from enum import Enum

class RunState(Enum):
    NOT_RUN = "NOT_RUN"
    RUNNING = "RUNNING"
    RAN_SUCCESSFULLY = "RAN_SUCCESSFULLY"
    RAN_WITH_ERRORS = "RAN_WITH_ERRORS"

class SimulationStatus:
    def __init__(self, scenario_id, scenario_name, reps):
        self.scenario_id = scenario_id
        self.scenario_name = scenario_name
        self.reps = reps
        self.run_state = RunState.NOT_RUN
        self.current_replication = 0
        self.error = None
        self.error_type = None
        self.error_details = None
        self.error_suggestions = []

    def to_dict(self):
        """Convert status to dictionary for JSON serialization"""
        status = {
            "id": self.scenario_id,
            "name": self.scenario_name,
            "runState": self.run_state.value,
            "reps": self.reps,
            "lastUpdated": datetime.utcnow().isoformat() + "Z"
        }

        if self.current_replication > 0:
            status["currentReplication"] = self.current_replication

        if self.run_state == RunState.RAN_WITH_ERRORS:
            status["error"] = self.error
            status["errorType"] = self.error_type
            if self.error_details:
                status["errorDetails"] = self.error_details
            if self.error_suggestions:
                status["errorSuggestions"] = self.error_suggestions

        return status

    def write_to_blob(self, blob_client):
        """Write status to Azure Blob Storage"""
        status_json = json.dumps(self.to_dict(), indent=2)
        blob_client.upload_blob(status_json, overwrite=True)

# Usage example
def run_simulation(model, scenario_id, scenario_name, reps, blob_client):
    status = SimulationStatus(scenario_id, scenario_name, reps)

    try:
        # Mark as running
        status.run_state = RunState.RUNNING
        status.write_to_blob(blob_client)

        # Run replications
        for rep in range(1, reps + 1):
            status.current_replication = rep

            # Update every 5 reps
            if rep % 5 == 0:
                status.write_to_blob(blob_client)

            # Run the replication
            run_single_replication(model, rep)

        # Mark as successful
        status.run_state = RunState.RAN_SUCCESSFULLY
        status.current_replication = reps
        status.write_to_blob(blob_client)

    except ValidationError as e:
        # Handle validation errors
        status.run_state = RunState.RAN_WITH_ERRORS
        status.error = f"Validation failed: {e.user_message}"
        status.error_type = "VALIDATION_ERROR"
        status.error_details = str(e) + "\n\n" + e.stack_trace
        status.error_suggestions = e.suggestions
        status.write_to_blob(blob_client)
        raise

    except RuntimeError as e:
        # Handle runtime errors
        status.run_state = RunState.RAN_WITH_ERRORS
        status.error = f"Runtime error at replication {status.current_replication}: {e.user_message}"
        status.error_type = "RUNTIME_ERROR"
        status.error_details = str(e) + "\n\n" + e.stack_trace
        status.error_suggestions = [
            "Review the model configuration for the element that caused the error",
            "Check resource capacities and entity requirements",
            "Verify all distribution parameters are valid"
        ]
        status.write_to_blob(blob_client)
        raise

    except Exception as e:
        # Handle unexpected errors
        status.run_state = RunState.RAN_WITH_ERRORS
        status.error = f"Unexpected error: {type(e).__name__}"
        status.error_type = "UNKNOWN_ERROR"
        status.error_details = str(e)
        status.error_suggestions = [
            "Contact support with the scenario ID",
            "Check that the model definition is valid"
        ]
        status.write_to_blob(blob_client)
        raise
```

## Testing Your Error Messages

Before deploying, test that your error messages will display well in the UI:

1. **Check message length**: Error messages over 200 characters may wrap awkwardly
2. **Verify specificity**: Does the error reference exact element names from the model?
3. **Test suggestions**: Are they actionable without access to logs or server details?
4. **Validate JSON**: Ensure status.json is valid JSON (no trailing commas, proper escaping)
5. **Test timeout handling**: Verify that long-running simulations update status within 1 hour

## Questions?

For questions about this schema or the error handling system, contact the Quodsi development team.

---

**Last Updated**: January 2025
**Schema Version**: 1.0
