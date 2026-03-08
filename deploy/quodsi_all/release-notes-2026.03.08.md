# Release Notes — 2026.03.08

**Version:** 2026.03.08
**Previous Version:** 2026.03.01

---

## 1. Conditional Action Guards (stateCondition)

Actions can now be conditionally executed based on entity state values.

- Added optional `stateCondition` field to all action types (TypeScript and Python)
- Collapsible UI section in ActionEditor with reusable `StateConditionEditor` component
- Python: `state_condition` deserialization, guard check in activity action loop and nested loops
- Version transformation added for `2026.03.01 → 2026.03.08` upgrade path

## 2. Multi-Scenario Comparison Dashboard

New dashboard for comparing simulation results across scenarios side-by-side.

- `ScenarioPicker` component for selecting scenarios to compare
- Data merge utilities for bar charts, timeseries, and table columns/data (with tests)
- `SparklineGrid` extended for multi-series overlays
- `useComparisonData` hook for fetching and caching comparison data
- `scenarioId` added to `CrossRepDataResultMessage`
- Chart icon button on `ScenarioCard` for quick access to results
- Fixes: column grouping, routing, and dashboard spec issues

## 3. Simulation UX Improvements

- Re-run confirmation dialog when simulation results already exist
- Auto-convert connected lines to Connectors when converting shapes to Activity or Generator
- Disabled Time-Distributed generator type (coming soon)
- Validation guards for scenario change request values
- Remaining action type serialization: Split, Create, Dispose, Join, Loop, Branch

## 4. Simulation Engine (Python)

- Full action parsing in JSON reader: Split, Create, Dispose, Join, Loop, Branch
- `ObjectType.MODEL` support in `ScenarioChangeApplicator`
- Dot-path resolution for nested Generator properties (`MAX_ENTITIES`, `ENTITIES_PER_CREATION`)
- Removed broken `INTERVAL`/`DURATION` mappings
- Per-object-type scenario change tests
