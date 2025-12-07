# Backend Definition Changes for SAMPLE Operation

This document summarizes the backend changes required to support the new `SAMPLE` operation for probabilistic state assignment. Use this as a reference for frontend implementation.

---

## 1. Overview

The SAMPLE operation enables **probabilistic state assignment** at entity creation or during activity processing. Instead of assigning a fixed value, the system samples from a probability distribution.

**Key Use Cases:**
- Assign patient severity levels (ESI L1-L5) from a probability distribution at triage
- Assign product quality grades randomly at manufacturing
- Set boolean flags (e.g., "requires inspection") with a given probability

---

## 2. StateOperation Enum Changes

**File:** `quodsim/enums/state_operation.py`

### New Enum Value

```python
class StateOperation(Enum):
    ASSIGN = "="
    ADD = "+="
    SUBTRACT = "-="
    MULTIPLY = "*="
    DIVIDE = "/="
    SAMPLE = "sample"  # NEW
```

### Operation Support by State Type

| State Type | ASSIGN | ADD | SUBTRACT | MULTIPLY | DIVIDE | SAMPLE |
|------------|--------|-----|----------|----------|--------|--------|
| NUMBER     | Yes    | Yes | Yes      | Yes      | Yes    | Yes    |
| STRING     | Yes    | No  | No       | No       | No     | Yes    |
| BOOLEAN    | Yes    | No  | No       | No       | No     | Yes    |
| CATEGORY   | Yes    | No  | No       | No       | No     | Yes    |

**Note:** SAMPLE is supported for ALL state types.

---

## 3. StateModification Schema Changes

**File:** `quodsim/model_definition/state_modification.py`

### New Fields

Two new optional fields have been added to `StateModification`:

| Field | Type | Required for SAMPLE | Description |
|-------|------|---------------------|-------------|
| `distribution_type` | `Optional[str]` | Yes | The distribution type identifier |
| `distribution_parameters` | `Optional[Dict[str, Any]]` | Yes | Distribution-specific parameters |

### Field Details

```python
@dataclass
class StateModification:
    # Existing fields
    state_unique_id: str
    state_name: str
    operation: StateOperation
    value: Union[int, float, str, bool]
    component_unique_id: Optional[str] = None
    target_component_type: Optional[ComponentType] = None

    # NEW fields for SAMPLE operation
    distribution_type: Optional[str] = None
    distribution_parameters: Optional[Dict[str, Any]] = None
```

---

## 4. JSON Import Format

**File:** `quodsim/readers/lucid_model_definition_json_reader.py`

### JSON Field Mappings

| JSON Field (camelCase) | Python Field (snake_case) |
|------------------------|---------------------------|
| `stateUniqueId` | `state_unique_id` |
| `stateName` | `state_name` |
| `operation` | `operation` |
| `value` | `value` |
| `componentUniqueId` | `component_unique_id` |
| `targetComponentType` | `target_component_type` |
| `distributionType` | `distribution_type` |
| `distributionParameters` | `distribution_parameters` |

### Base JSON Schema for SAMPLE Modification

```json
{
  "stateUniqueId": "<state-uuid>",
  "stateName": "<state-name>",
  "operation": "sample",
  "value": null,
  "distributionType": "<distribution-type>",
  "distributionParameters": { ... }
}
```

**Note:** The `value` field can be `null`, `0`, `""`, or `false` for SAMPLE operations - it is ignored at runtime since the value is sampled.

---

## 5. State-Type Specific Schemas

### 5.1 CATEGORY State Sampling

**Distribution Type:** `"sample_multinomial_one"`

**Required Parameters:**
- `probabilities`: Object mapping each category value to its probability (must sum to 1.0)

**Example: ESI Level Assignment**

```json
{
  "stateUniqueId": "state-esi-001",
  "stateName": "ESI",
  "operation": "sample",
  "value": "",
  "distributionType": "sample_multinomial_one",
  "distributionParameters": {
    "probabilities": {
      "L1": 0.10,
      "L2": 0.20,
      "L3": 0.40,
      "L4": 0.20,
      "L5": 0.10
    }
  }
}
```

**Validation Rules:**
- `distributionType` MUST be `"sample_multinomial_one"`
- `probabilities` must include ALL category values defined in the StateDef
- `probabilities` must NOT include any values not in category_values
- All probabilities must be non-negative
- Probabilities MUST sum to exactly 1.0 (within tolerance of 1e-6)

---

### 5.2 NUMBER State Sampling

**Distribution Types:** Any numeric distribution supported by the randomness library

| Distribution Type | Required Parameters | Description |
|-------------------|---------------------|-------------|
| `constant` | `value` | Always returns the same value |
| `uniform` | `low`, `high` | Uniform between low and high |
| `triangular` | `low`, `mode`, `high` | Triangular distribution |
| `exponential` | `scale` | Exponential with given scale (1/rate) |
| `normal` | `loc`, `scale` | Normal with mean=loc, std=scale |
| `lognormal` | `mean`, `sigma` | Log-normal distribution |
| `beta` | `a`, `b` | Beta distribution |
| `gamma` | `shape`, `scale` | Gamma distribution |
| `weibull` | `shape`, `scale` | Weibull distribution |
| `poisson` | `lam` | Poisson with lambda |
| `discrete` | `values`, `probabilities` | Discrete distribution |

**Example: Normal Distribution for Defect Score**

```json
{
  "stateUniqueId": "state-defect-001",
  "stateName": "DefectScore",
  "operation": "sample",
  "value": 0,
  "distributionType": "normal",
  "distributionParameters": {
    "loc": 5.0,
    "scale": 2.0
  }
}
```

**Example: Uniform Distribution**

```json
{
  "stateUniqueId": "state-priority-001",
  "stateName": "Priority",
  "operation": "sample",
  "value": 0,
  "distributionType": "uniform",
  "distributionParameters": {
    "low": 1,
    "high": 10
  }
}
```

---

### 5.3 BOOLEAN State Sampling

**Distribution Type:** `"bernoulli"`

**Required Parameters:**
- `p`: Probability of True (0.0 to 1.0)

**Example: Inspection Flag**

```json
{
  "stateUniqueId": "state-inspect-001",
  "stateName": "RequiresInspection",
  "operation": "sample",
  "value": false,
  "distributionType": "bernoulli",
  "distributionParameters": {
    "p": 0.30
  }
}
```

**Validation Rules:**
- `distributionType` MUST be `"bernoulli"`
- `p` parameter is REQUIRED
- `p` must be between 0.0 and 1.0 (inclusive)

---

## 6. Usage Contexts

State modifications with SAMPLE can be used in these contexts:

### 6.1 Generator Initial State Modifications

Applied when entities are created by the generator.

**JSON Location:** `generators[].initialStateModifications[]`

```json
{
  "generators": [
    {
      "id": "gen-001",
      "name": "PatientArrivals",
      "entityId": "entity-patient-001",
      "initialStateModifications": [
        {
          "stateUniqueId": "state-esi-001",
          "stateName": "ESI",
          "operation": "sample",
          "value": "",
          "distributionType": "sample_multinomial_one",
          "distributionParameters": {
            "probabilities": {
              "L1": 0.10,
              "L2": 0.20,
              "L3": 0.40,
              "L4": 0.20,
              "L5": 0.10
            }
          }
        }
      ]
    }
  ]
}
```

### 6.2 Activity Pre-Processing Modifications

Applied before activity processing begins.

**JSON Location:** `activities[].preProcessingStateModifications[]`

### 6.3 Activity Post-Processing Modifications

Applied after activity processing completes.

**JSON Location:** `activities[].postProcessingStateModifications[]`

---

## 7. Validation Error Messages

The backend validates SAMPLE modifications and returns these error messages:

| Error | Cause |
|-------|-------|
| `"SAMPLE operation requires distribution_type"` | Missing `distributionType` field |
| `"SAMPLE operation requires distribution_parameters"` | Missing `distributionParameters` field |
| `"CATEGORY state SAMPLE requires 'sample_multinomial_one' distribution"` | Wrong distribution type for CATEGORY |
| `"SAMPLE for state 'X' missing probability for category 'Y'"` | Category value missing from probabilities |
| `"SAMPLE for state 'X' has unknown category 'Y'"` | Extra category not in category_values |
| `"Probabilities must sum to 1.0, got X"` | Probabilities don't sum to 1.0 |
| `"BOOLEAN state SAMPLE requires 'bernoulli' distribution"` | Wrong distribution type for BOOLEAN |
| `"BOOLEAN state SAMPLE requires 'p' parameter"` | Missing p parameter for Bernoulli |
| `"'p' must be between 0 and 1"` | Invalid probability value |
| `"NUMBER state SAMPLE requires a numeric distribution"` | Invalid distribution for NUMBER |

---

## 8. Complete Example: Healthcare Triage Model

```json
{
  "states": [
    {
      "id": "state-esi-001",
      "name": "ESI",
      "componentType": "entity",
      "dataType": "category",
      "initialValue": "L3",
      "categoryValues": ["L1", "L2", "L3", "L4", "L5"]
    }
  ],
  "entities": [
    {
      "id": "entity-patient-001",
      "name": "Patient"
    }
  ],
  "generators": [
    {
      "id": "gen-arrivals-001",
      "name": "PatientArrivals",
      "entityId": "entity-patient-001",
      "initialStateModifications": [
        {
          "stateUniqueId": "state-esi-001",
          "stateName": "ESI",
          "operation": "sample",
          "value": "",
          "distributionType": "sample_multinomial_one",
          "distributionParameters": {
            "probabilities": {
              "L1": 0.10,
              "L2": 0.20,
              "L3": 0.40,
              "L4": 0.20,
              "L5": 0.10
            }
          }
        }
      ]
    }
  ]
}
```

---

## 9. Summary of Frontend Changes Required

1. **StateModification Form/Editor:**
   - Add operation dropdown option: `"sample"` (display as "Sample from Distribution")
   - When `operation === "sample"`, show distribution configuration UI instead of value input
   - Distribution UI varies by state type (see sections 5.1-5.3)

2. **CATEGORY State Sampling UI:**
   - Show probability input for each category value
   - Validate probabilities sum to 1.0
   - Auto-populate categories from StateDef.categoryValues

3. **NUMBER State Sampling UI:**
   - Show distribution type dropdown (normal, uniform, exponential, etc.)
   - Show parameter inputs based on selected distribution type

4. **BOOLEAN State Sampling UI:**
   - Show single probability slider/input (0-100% or 0.0-1.0)

5. **JSON Export:**
   - Include `distributionType` and `distributionParameters` fields
   - Use camelCase field names as shown in Section 4
