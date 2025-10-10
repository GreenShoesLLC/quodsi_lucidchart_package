# Model Operations Messages

Operations on the entire simulation model.

## Messages

### [MODEL_VALIDATE](./model-validate.md)
**Direction:** React → Extension (request), Extension → React (result)
**Purpose:** Validate entire model before simulation

### [MODEL_CONVERT](./model-convert.md)
**Direction:** React → Extension (request), Extension → React (result)
**Purpose:** Convert LucidChart page to simulation model

### [MODEL_REMOVE](./model-remove.md)
**Direction:** React → Extension (request), Extension → React (result)
**Purpose:** Remove model designation from page

### [RESULTS_PAGE_CREATE](./results-page-create.md)
**Direction:** React → Extension (request), Extension → React (result)
**Purpose:** Create dashboard page with simulation results

## Request/Response Pattern

**Request:**
```typescript
{
  pageId?: string,
  options?: object  // Operation-specific
}
```

**Response:**
```typescript
{
  success: boolean,
  result?: object,  // Operation-specific data
  errorMessage?: string
}
```

## Common Workflows

**Validate Model:**
```
User clicks "Validate" → MODEL_VALIDATE →
Extension validates → VALIDATION_RESULT →
React shows validation messages
```

**Convert Page:**
```
User clicks "Convert to Model" → MODEL_CONVERT →
Extension analyzes page → Creates model → CONVERSION_RESULT →
React shows summary
```

**Create Results Dashboard:**
```
Simulation completes → User clicks "View Results" →
RESULTS_PAGE_CREATE → Extension creates page with tables →
CREATE_RESULT → React confirms
```

## Validation System

**Extension Side:**
- `ModelValidationService` validates entire model
- Checks: element counts, connectivity, properties, resources
- Returns: validation messages by severity

**React Side:**
- Displays validation results
- Groups by severity
- Links to problematic elements

## Integration

**Extension:**
- `ModelOpsHandler` processes requests
- `ModelManager` coordinates operations
- `ModelValidationService` validates
- `SimulationResultsDashboard` creates results

**React:**
- `modelOpsSender` creates requests
- `mapModelOps`, `mapValidation` handle results
- Validation panel displays messages
