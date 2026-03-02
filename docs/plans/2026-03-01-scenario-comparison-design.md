# Scenario Comparison Design

**Date:** 2026-03-01
**Status:** Approved
**Approach:** Client-side merge (Approach A) — no backend changes except echoing `scenarioId` in responses

## Overview

Users can compare simulation results across multiple completed scenarios side by side. The existing `SimulationRunAnalysisDashboard` evolves to support 1-to-N selected scenarios. Charts overlay multiple color-coded series; tables merge into scenario-prefixed columns. All 11 data types are supported.

## Entry Point

A "Compare" button is added to the existing `SimulationRunAnalysisDashboard` header. It is visible whenever the user is viewing a scenario that has results.

**Flow:**

1. User clicks "View Results" on a ScenarioCard — existing results modal opens (unchanged)
2. User clicks "Compare" inside the modal
3. The scenario picker appears, pre-loaded with the current scenario
4. User selects additional scenarios from the picker
5. The dashboard transitions to comparison mode (overlaid charts, merged tables)

There is no separate comparison modal. The existing dashboard handles both single and multi-scenario views.

## Scenario Picker

Always visible at the top of the content area, between the header and the Summary/Detailed toggle.

**1 scenario selected (default, subtle):**

```
[Baseline x]  [+ Add Scenario v]
```

**2+ scenarios selected (colored chips matching chart colors):**

```
* Baseline x   * Scenario 2 x   [+ Add v]
```

**Behavior:**

- The `[+ Add]` dropdown shows only scenarios with completed results (`hasResults === true`)
- Already-selected scenarios are grayed out in the dropdown
- Any scenario can be removed as long as at least 1 remains
- Maximum 5 scenarios selected. Dropdown disables at the cap with tooltip: "Maximum 5 scenarios for comparison"
- Colors are assigned from a fixed palette in selection order (blue, orange, green, red, purple)

**Populating the dropdown:**

On mount, the component sends `SIMULATION_RUNS_LIST_REQUEST` (reusing the existing message). On receiving `SIMULATION_RUNS_LIST_RESULT`, it filters to runs where `hasResults === true` to populate `availableScenarios`. No new extension or data connector code needed.

## State Model

The dashboard gains multi-scenario awareness:

```typescript
// New state
selectedScenarios: { id: string; name: string; color: string }[]
availableScenarios: { id: string; name: string }[]
scenarioDataCache: Map<string, Map<string, any[]>>  // scenarioId -> dataType -> data[]

// Existing state (unchanged)
viewType: "summary" | "detailed"
dataType: CrossRepDataType
viewMode: "table" | "chart" | "both"
selectedMetric: string
selectedActivity: string
```

**Cache strategy:**

- Keyed by `(scenarioId, dataType)`
- Lives for the lifetime of the modal — no time-based expiration (simulation results are immutable)
- When the user selects a data type, only scenarios missing from the cache are fetched
- When the user adds a scenario, only that scenario's data is fetched for the current data type

## Data Pipeline

### Fetching

When the user selects a data type or adds a scenario:

```
for each selectedScenario:
    if cache has (scenarioId, dataType):
        use cached data
    else:
        getCrossRepData(documentId, scenarioId, dataType)
```

All fetches use the existing `CROSS_REP_DATA_REQUEST` / `CROSS_REP_DATA_RESULT` messages. The data connector is called once per scenario — no new endpoints.

### Required Extension Change

The `SimulationRunHandler.handleCrossRepDataRequest` currently does NOT echo `scenarioId` back in the `CROSS_REP_DATA_RESULT` response. The dashboard needs this to route responses to the correct cache slot.

**Change:** Include `scenarioId` in the `CROSS_REP_DATA_RESULT` envelope's data payload.

This is the **only change outside of React** for the entire feature.

**Shared library change:** Add `scenarioId` to the `CrossRepDataResultMessage` type definition.

### Response Handling

```
on CROSS_REP_DATA_RESULT:
    extract { dataType, scenarioId, data }
    cache.set(scenarioId, dataType, data)
    if all selectedScenarios have cached data for current dataType:
        set loading = false
        merge and render
```

### Loading States

- Per-scenario: subtle spinner on that scenario's chip while its data loads
- Global: full loading state only if no scenarios have data yet
- Partial: render what's available, show placeholder columns/series for pending scenarios

## Visual Layout: Summary View

### 1 Scenario (unchanged)

Renders exactly as today: scenario info card, system performance stats, activities table, resources table with drill-down to detailed view.

### 2+ Scenarios

Transforms into comparison tables:

**System Performance:**

```
+--------------+----------+------------+-----------+
|              | Baseline | Scenario 2 | Scenario 3|
+--------------+----------+------------+-----------+
| Throughput   |    142   |     168    |     155   |
| Total Cost   |  1,240   |   1,890    |   1,520   |
| Avg Cycle    |   12.4   |    10.1    |    11.3   |
| Time in Sys  |   18.7   |    14.2    |    16.1   |
| Avg # in Sys |    3.2   |     2.8    |     3.0   |
+--------------+----------+------------+-----------+
```

**Activities:**

```
+------------+----------------+--------------+
|            |  Utilization   |  Cycle Time  |
| Activity   | Base | Sc2    | Base | Sc2   |
+------------+------+--------+------+-------+
| Check In   | 82%  |  71%   | 5.2  |  4.1  |
| Processing | 94%  |  88%   | 12.1 | 10.3  |
+------------+------+--------+------+-------+
```

**Resources:** Same pattern as activities (utilization + cost per scenario).

Activities and resources retain drill-down behavior. Clicking a row navigates to detailed view filtered to that item, with all selected scenarios preserved.

With 4-5 scenarios, tables scroll horizontally (existing `overflow-x-auto` pattern).

## Visual Layout: Detailed View

### Charts — Bar Charts (2+ scenarios)

Grouped bars per scenario, color-coded:

```
  Utilization (Mean)
  +----------------------------------+
  |  ## %%    ## %%    ## %%         |
  |  ## %%    ## %%    ## %%         |
  |  ## %%    ## %%    ## %%         |
  +----------------------------------+
     Check In  Processing  Dispatch
     ## Baseline  %% Scenario 2
```

Recharts handles this natively with multiple `<Bar>` components per scenario.

### Charts — Timeseries (2+ scenarios)

Multiple overlaid lines with a shared legend:

```
  Entity Throughput
  +----------------------------------+
  |      ___/---- Scenario 2         |
  |    /                             |
  |   / __/----- Baseline            |
  |  //                              |
  | /                                |
  +----------------------------------+
   0    100    200    300    400
     -- Baseline  -- Scenario 2
```

For sparkline grid view: each object (activity/entity) gets its own sparkline cell with N overlaid lines per scenario. Clicking expands to the full timeseries chart with all scenario lines.

### Tables — Merged Columns (2+ scenarios)

```
+-----------+-------------+------------+--------------+-----+
| Activity  | Util (Base) | Util (Sc2) | Cycle (Base) | ... |
+-----------+-------------+------------+--------------+-----+
| Check In  |    82.1%    |   71.3%    |    5.21      |     |
| Process   |    94.0%    |   88.4%    |   12.10      |     |
+-----------+-------------+------------+--------------+-----+
```

The name/identifier column stays fixed. Each numeric metric gets one sub-column per selected scenario. Column headers show abbreviated scenario names with color indicators.

### Charts — 1 Scenario (unchanged)

Renders exactly as today. Single series, no legend needed.

### Tables — 1 Scenario (unchanged)

Renders exactly as today. No scenario prefixes on columns.

## Edge Cases

### Mixed data availability

Not all scenarios produce the same data types (e.g., one scenario may not use states).

- Missing data for a scenario: show "-" in table cells, omit from chart with note
- Fetch failure for a scenario: show error badge on its chip, exclude from merged view (don't block others)
- Merged tables show rows for items in at least one scenario. Missing cells get "-"

### Object name alignment

Activities/resources/entities are joined by name across scenarios. If Scenario A has "Check In" but Scenario B doesn't, that row shows "-" for Scenario B's columns.

For timeseries: series are independent per scenario, overlaid by time axis. No join needed.

### Race conditions

- Scenario removed while fetch is in-flight: ignore response (check `selectedScenarios` before updating cache)
- Data type changed while fetches are in-flight: track a request epoch counter, discard stale responses
- Scenario added: only fetch for the new scenario (cache handles existing ones)

### Horizontal space with many scenarios

With 4-5 scenarios, comparison tables get wide. Handled with:

- `overflow-x-auto` on table containers
- Abbreviated scenario names in headers, full name on hover/tooltip
- Color dot indicators for visual identification without reading names

## Out of Scope

These are explicitly deferred:

- **No delta/diff view** — raw values per scenario only, no "+15% vs Baseline" display
- **No saved comparisons** — user picks scenarios each time the modal opens
- **No cross-document comparison** — all scenarios belong to the same document
- **No comparison data export** — ZIP download remains per-scenario
- **No auto-refresh during comparison** — for completed runs only

All of these can be added incrementally in future iterations.

## Changes by Layer

| Layer | Change | Scope |
|-------|--------|-------|
| Data Connector | None | — |
| Extension (`SimulationRunHandler`) | Echo `scenarioId` in `CROSS_REP_DATA_RESULT` | 1 line |
| Shared (`@quodsi/shared`) | Add `scenarioId` to `CrossRepDataResultMessage` type | Type update |
| React (`SimulationRunAnalysisDashboard`) | Multi-scenario state, cache, scenario picker, merged rendering | Major |
| React (new components) | `ScenarioPicker`, merged table builder, chart overlay logic | New |
| React (existing components) | `ComparisonBarChart`, `TimeseriesChart` — accept multi-scenario data | Minor |

## Future Refactor Path

If parallel client-side fetches prove too slow, the architecture supports a clean migration to server-side merge (Approach B): add new data connector actions that accept `scenarioId[]`, return merged datasets, and swap the fetch logic in the dashboard. The UI layer stays identical.
