# Quodsi Page Status Monitoring Requirements

## Overview
Quodsi needs to track the simulation status of LucidChart pages by monitoring Azure storage containers and their contents. This monitoring system runs independently of simulation triggering and needs to work for multiple simultaneous users viewing the same document.

## PageStatus Definition
```typescript
interface PageStatus {
    hasContainer: boolean;      // Whether Azure storage container exists for document
    scenarios: Scenario[];      // Array of scenarios from scenarios.json
    statusDateTime: DateTime;   // Timestamp of status check
}
```

## Status Storage
Each LucidChart page will maintain two custom data properties:
- `q_status_prior`: Previous status snapshot (JSON)
- `q_status_current`: Current status snapshot (JSON)

## Status Checking Process
1. **Frequency**: Check status every 30 seconds (configurable)

2. **Check Process**:
   - Look for Azure storage container matching document ID
   - If container exists:
     - Set `hasContainer` to true
     - Look for scenarios.json file
     - If scenarios.json exists, parse and populate scenarios array
   - If container doesn't exist:
     - Set `hasContainer` to false
     - Set empty scenarios array

3. **Status Update Process**:
   - On successful status check:
     - Move current status to prior (`q_status_current` → `q_status_prior`)
     - Set new current status (`q_status_current`)
   - On failed status check:
     - Do not update prior status
     - Log error appropriately

## Change Detection
After each successful status update, compare prior and current status to detect:
- New scenarios added
- Changes in existing scenario status

## Multi-User Considerations
- Multiple users can be active in same document/page
- Status monitoring must work correctly for all active users
- Status updates should be visible to all active users

## Implementation Notes
- Status monitoring is independent from simulation triggering
- Existing simulation trigger functionality (`simulateaction.ts`) remains unchanged
- Status monitoring is about observing state, not controlling simulations

## Error Handling
- Failed status checks should not corrupt existing status data
- Prior status should only be updated on successful new status check
- Errors should be logged appropriately
- UI should indicate status check failures to users

## Technical Context
Status data is stored using LucidChart's page custom data functionality, similar to existing model data storage:
```typescript
shapeDataHandler.setObjectTypeAndData(SimulationObjectType.Model, data);
```
