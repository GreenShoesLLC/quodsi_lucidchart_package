# Swimlane Overview

## What are Swimlanes?

Swimlanes are a fundamental diagramming feature in LucidChart used to organize process flows into parallel sections. Each section (lane) typically represents a different entity responsible for activities within that lane.

### Visual Structure

```
┌─────────────────────────────────────────────────────┐
│ Swimlane Container                                  │
├─────────────────────────────────────────────────────┤
│ Lane 1: Customer Service                           │
│  ┌──────┐    ┌──────┐    ┌──────┐                 │
│  │ Task │───►│ Task │───►│ Task │                  │
│  └──────┘    └──────┘    └──────┘                  │
├─────────────────────────────────────────────────────┤
│ Lane 2: Sales Department                           │
│         ┌──────┐    ┌──────┐                       │
│         │ Task │───►│ Task │                        │
│         └──────┘    └──────┘                        │
├─────────────────────────────────────────────────────┤
│ Lane 3: Warehouse                                   │
│              ┌──────┐    ┌──────┐                  │
│              │ Task │───►│ Task │                   │
│              └──────┘    └──────┘                   │
└─────────────────────────────────────────────────────┘
```

## Common Use Cases

### 1. Cross-Functional Processes
Swimlanes show which department or team is responsible for each step in a process.

**Example: Order Fulfillment**
- **Lane 1 (Sales):** Receive order, create quote
- **Lane 2 (Warehouse):** Pick items, pack shipment
- **Lane 3 (Shipping):** Schedule delivery, ship order
- **Lane 4 (Billing):** Generate invoice, process payment

### 2. Responsibility Assignment
Lanes clearly delineate ownership and accountability for process steps.

**Example: Software Development**
- **Lane 1 (Developer):** Write code, create PR
- **Lane 2 (QA Tester):** Test functionality, report bugs
- **Lane 3 (DevOps):** Deploy to staging, monitor
- **Lane 4 (Product Manager):** Review, approve release

### 3. Resource Pool Visualization
Lanes represent pools of interchangeable resources that can be allocated to tasks.

**Example: Hospital Emergency Department**
- **Lane 1 (Triage Nurses):** Initial assessment
- **Lane 2 (ER Doctors):** Diagnosis and treatment
- **Lane 3 (Radiologists):** X-rays and imaging
- **Lane 4 (Lab Technicians):** Blood work and tests

## Swimlane Types

### Horizontal Swimlanes
Lanes run horizontally across the diagram, with process flow typically moving left to right.

```
Lane 1 ──────►──────►──────►
Lane 2     ──────►──────►
Lane 3 ──────►──────►──────►
```

**Best for:**
- Sequential processes
- Time-based flows
- Traditional left-to-right reading

### Vertical Swimlanes
Lanes run vertically down the diagram, with process flow typically moving top to bottom.

```
│ Lane 1 │ Lane 2 │ Lane 3 │
│   ▼    │        │   ▼    │
│   ▼    │   ▼    │   ▼    │
│        │   ▼    │        │
```

**Best for:**
- Hierarchical structures
- Parallel workstreams
- Space-constrained diagrams

## Lanes as Organizational Units

### Properties of a Lane

Each lane typically has:

1. **Name/Label:** Identifies the entity (e.g., "Customer Service", "Bob Smith")
2. **Boundary:** Visual separation from other lanes
3. **Contents:** Activities/tasks that belong to that entity
4. **Capacity:** Implied or explicit resource constraints

### Lane Granularity

Lanes can represent different levels of abstraction:

| Granularity | Example | Capacity Implication |
|-------------|---------|---------------------|
| **Department** | "Sales Department" | Multiple people, high capacity |
| **Role** | "Sales Representative" | Several people with that role |
| **Individual** | "John Smith" | Single person, limited capacity |
| **Resource Type** | "Conference Room" | Specific quantity (e.g., 3 rooms) |
| **Process Phase** | "Initial Review" | Stage with specific throughput |

## Why Map Lanes to Quodsi Resources?

### Conceptual Alignment

**Swimlane Lane:**
- Represents an entity that performs work
- Has implicit or explicit capacity
- Shows responsibility for activities
- Demonstrates resource allocation

**Quodsi Resource:**
- Represents a constrained resource
- Has explicit capacity property
- Required by activities to execute
- Shows resource utilization in simulation

### Natural Mapping

The swimlane metaphor naturally maps to discrete event simulation:

```
Lane "Customer Service (3 agents)"
    ↓ converts to ↓
Resource {
    name: "Customer Service",
    capacity: 3
}
```

Activities placed in that lane automatically require that resource:

```
Activity in "Customer Service" lane
    ↓ converts to ↓
Activity {
    name: "Handle Customer Call",
    resourceRequirements: [
        { resourceId: "CustomerService", quantity: 1 }
    ]
}
```

### User Workflow Benefits

1. **Familiar Paradigm:** Users already understand swimlanes
2. **Visual Clarity:** Lane boundaries show resource constraints
3. **Faster Modeling:** Drag activities to lanes instead of manual requirement setup
4. **Automatic Requirements:** Lane placement implies resource needs
5. **Maintenance:** Moving activity to different lane updates requirements

## Real-World Example

### Hospital Emergency Room Diagram

**LucidChart Diagram with Swimlanes:**

```
┌─────────────────────────────────────────────────────┐
│ Triage Nurse (2 available)                         │
│  ┌────────────┐                                     │
│  │ Initial    │───┐                                 │
│  │ Assessment │   │                                 │
│  └────────────┘   │                                 │
├───────────────────┼─────────────────────────────────┤
│ ER Doctor (3 available)                            │
│                   │   ┌─────────┐    ┌──────────┐  │
│                   └──►│ Examine │───►│ Prescribe│  │
│                       │ Patient │    │ Treatment│  │
│                       └─────────┘    └──────────┘  │
├─────────────────────────────────────────────────────┤
│ Radiologist (1 available)                          │
│                       ┌─────────┐                  │
│                       │ Perform │                   │
│                       │ X-Ray   │                   │
│                       └─────────┘                   │
└─────────────────────────────────────────────────────┘
```

**Converted to Quodsi Model:**

```typescript
// Resources (from lanes)
Resource {
    id: "triage-nurse",
    name: "Triage Nurse",
    capacity: 2
}

Resource {
    id: "er-doctor",
    name: "ER Doctor",
    capacity: 3
}

Resource {
    id: "radiologist",
    name: "Radiologist",
    capacity: 1
}

// Activities (with auto-assigned resources)
Activity {
    id: "initial-assessment",
    name: "Initial Assessment",
    operationSteps: [{
        requirementId: "triage-nurse-req",
        quantity: 1,
        duration: { value: 10, unit: MINUTES }
    }]
}

Activity {
    id: "examine-patient",
    name: "Examine Patient",
    operationSteps: [{
        requirementId: "er-doctor-req",
        quantity: 1,
        duration: { value: 20, unit: MINUTES }
    }]
}

// Resource Requirements (auto-generated)
ResourceRequirement {
    id: "triage-nurse-req",
    name: "Triage Nurse Required",
    rootClauses: [{
        resourceRequests: [{
            resourceId: "triage-nurse",
            quantity: 1
        }]
    }]
}
```

### Simulation Insights

With this mapping, the simulation can answer questions like:

- **Bottleneck Identification:** Which resource (lane) causes the longest wait times?
- **Capacity Planning:** How many doctors are needed to meet service level targets?
- **Utilization:** What percentage of time are radiologists busy?
- **Scenario Analysis:** What if we add 1 more triage nurse?

## Lane Characteristics Relevant to Resources

### Explicit Capacity

Some swimlane diagrams explicitly show capacity in the lane label:

```
Customer Service (5 agents)
Warehouse Workers (8 people)
Conference Rooms (3 rooms)
```

This can be parsed and mapped directly to Resource.capacity.

### Implicit Capacity

Other diagrams don't specify capacity:

```
Customer Service
Warehouse
Conference Rooms
```

Default to capacity = 1 or prompt user for capacity value.

### Lane Metadata

Additional information might be stored as:

- **Shape Properties:** Custom data fields
- **Text Areas:** Supplementary text on the lane
- **Visual Styling:** Colors, icons indicating resource type

## Integration with Activity Mapping

### Automatic Resource Requirement Generation

When an activity shape is contained within a lane:

1. **Detect** which lane contains the activity
2. **Identify** the Resource associated with that lane
3. **Create** ResourceRequirement automatically
4. **Add** OperationStep linking activity to resource

### Multi-Lane Activities

Some activities might span multiple lanes, indicating collaboration:

```
┌─────────────────────────────────┐
│ Developer                       │
│  ┌─────────────┐               │
│  │ Code Review │               │
├──┼─────────────┼────────────────┤
│  │             │                │
│  └─────────────┘                │
│ QA Tester                       │
└─────────────────────────────────┘
```

**Interpretation:** Activity requires BOTH Developer AND QA Tester

```typescript
ResourceRequirement {
    rootClauses: [{
        mode: REQUIRE_ALL,
        resourceRequests: [
            { resourceId: "developer", quantity: 1 },
            { resourceId: "qa-tester", quantity: 1 }
        ]
    }]
}
```

## Limitations and Considerations

### Not All Lanes are Resources

Some lane meanings don't map well to Quodsi Resources:

- **Process Phases:** "Phase 1: Planning" isn't a resource
- **Locations:** "New York Office" might be informational only
- **Time Periods:** "Q1 2024" is temporal, not a resource

**Solution:** Allow users to choose which lanes to convert or provide detection heuristics.

### Capacity Ambiguity

Lane labels rarely specify exact capacity:

- "Sales Team" - how many people?
- "Manufacturing" - how many machines?

**Solution:**
- Parse capacity from labels when available
- Default to capacity = 1
- Prompt user for capacity during conversion

### Nested Swimlanes

Some diagrams have nested swimlanes (swimlane within swimlane):

```
┌─────────────────────────────────┐
│ Operations                      │
│  ┌───────────────────────────┐ │
│  │ Warehouse                 │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │ Shipping                  │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Interpretation:** Hierarchical resource structure

**Solution:** Flatten to individual Resources or support resource hierarchies.

## LucidChart Swimlane Features

### How Users Create Swimlanes

**In LucidChart:**
1. Select swimlane shape from shape library (Flowchart or BPMN libraries)
2. Drag onto canvas
3. Add or remove lanes using built-in controls
4. Label each lane
5. Place activities/tasks within lanes

### Swimlane Controls

LucidChart provides:
- Add lane button
- Remove lane button
- Resize lane by dragging dividers
- Reorder lanes
- Lane header text editing

### Swimlane Shape Classes

Common swimlane-related block classes in Lucid:
- `SwimLaneBlock` (hypothetical - needs verification)
- `TableBlockProxy` (tables can act as swimlanes)
- Container-type blocks with lane properties

## Next Steps

Now that you understand swimlanes conceptually:

1. **[SDK Reference](./02_sdk_reference.md):** Learn the Lucid SDK APIs for programmatic access
2. **[Detection Strategies](./03_detection_strategies.md):** Explore approaches for identifying lanes
3. **[Implementation Guide](./04_implementation_guide.md):** Build the lane-to-Resource mapping feature

## Additional Resources

**LucidChart User Documentation:**
- [Add and format swim lanes in Lucidchart](https://help.lucid.co/hc/en-us/articles/16266057248660-Add-and-format-swim-lanes-in-Lucidchart)
- [Flowchart with swimlanes template](https://www.lucidchart.com/pages/templates/flowchart-with-swimlanes)
- [Using swimlanes in project management](https://www.lucidchart.com/blog/swimlanes-project-management)

**BPMN Standard:**
- Swimlanes are part of the BPMN (Business Process Model and Notation) standard
- Pools and Lanes distinguish between organizations and roles

**Related Concepts:**
- Kanban boards use similar column-based organization
- Gantt charts show resource allocation over time
- RACI matrices show responsibility assignment

---

**Next:** [SDK Reference](./02_sdk_reference.md) - Learn the Lucid SDK APIs for working with swimlanes
