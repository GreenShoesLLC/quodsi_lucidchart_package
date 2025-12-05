# LLM Prompts for Structured Shape Names

When using LucidChart's AI to generate diagrams, you can instruct it to embed simulation parameters directly in shape names. Quodsi will automatically parse these structured names during conversion and update the shape text to show only the clean name.

## Format Reference

```
key: value | key: value | key: value
```

- Pipe (`|`) separates key-value pairs
- Colon (`:`) separates key from value
- Keys are case-insensitive
- Numbers are automatically parsed
- After conversion, shape text is cleaned up (e.g., `name: Triage | duration: 5` becomes just `Triage`)

### Type Field

Use `type: resource` to explicitly mark a shape as a Resource (instead of relying on connection-based detection):

```
name: Nurse | type: resource | capacity: 3
name: Forklift | type: res | capacity: 2
```

Supported type values and aliases:
- Resource: `resource`, `res`, `r`
- Activity: `activity`, `act`, `a`
- Generator: `generator`, `gen`, `g`
- Entity: `entity`, `ent`, `e`

### Auto-Created Resources from Activities

Since LucidChart AI often doesn't create separate Resource shapes, you can embed resource references directly in Activity names:

```
name: Triage | duration: 5 | capacity: 2 | resource: Nurse
name: Exam | duration: 20 | capacity: 4 | resource: Doctor
name: Treatment | duration: 30 | capacity: 6 | resource: Nurse
```

During conversion, Quodsi will:
1. **Create Resource shapes** automatically on the right side of the diagram
2. **Reuse Resources** - if multiple Activities reference "Nurse", only one Resource is created
3. **Link Activities** - each Activity's operation step is automatically linked to the Resource

This approach is simpler than trying to get the LLM to create separate Resource shapes.

---

## Copy-Paste Prompts

### Healthcare / Emergency Department

**See [prompts/healthcare.md](prompts/healthcare.md) for multiple prompt variations.**

Quick version:

```
Create an emergency department diagram.

STAFF & EQUIPMENT (create as separate shapes with NO connections, place on right):
name: Triage Nurse | type: resource | capacity: 2
name: ER Doctor | type: resource | capacity: 4
name: ER Nurse | type: resource | capacity: 8
name: Bed | type: resource | capacity: 20
name: Wheelchair | type: resource | capacity: 10

PATIENT ARRIVAL:
name: Patient Arrivals | interval: 8 | entities: 1

PROCESS STEPS (connect with arrows):
name: Triage | duration: 5 | capacity: 2
name: Registration | duration: 8 | capacity: 2
name: Exam | duration: 20 | capacity: 4
name: Treatment | duration: 30 | capacity: 6
name: Discharge | duration: 10 | capacity: 4
```

---

### Manufacturing / Production Line

```
Create a manufacturing assembly line process flow diagram showing a product moving from raw materials to finished goods.

For each shape, use this naming format:

ARRIVAL POINTS (where materials enter):
name: [description] | interval: [minutes between arrivals] | entities: [units per arrival]

WORKSTATIONS (processing steps):
name: [station name] | duration: [minutes to complete] | capacity: [units that can be processed simultaneously]

RESOURCES (workers and equipment - these shapes should NOT be connected to the flow):
name: [resource name] | type: resource | capacity: [number of units available]

Example formats:
- name: Assembly | duration: 12 | capacity: 5
- name: Raw Materials | interval: 15 | entities: 10
- name: Operator | type: resource | capacity: 8
- name: Forklift | type: resource | capacity: 3
- name: Quality Inspector | type: resource | capacity: 2

Include realistic workstations, durations, and capacities for a manufacturing line. Add resource shapes for workers (operators, inspectors) and equipment (forklifts, tools, machines). Show parallel operations and quality checkpoints. Leave resource shapes unconnected from the main flow.
```

---

### Call Center / Customer Service

**See [prompts/call_center.md](prompts/call_center.md) for multiple prompt variations.**

Quick version:

```
Create a call center diagram.

STAFF (create as separate shapes with NO connections, place on right):
name: Tier 1 Agent | type: resource | capacity: 20
name: Tier 2 Specialist | type: resource | capacity: 5
name: Technical Expert | type: resource | capacity: 2

CALL ARRIVAL:
name: Incoming Calls | interval: 2 | entities: 1

PROCESS STEPS (connect with arrows):
name: IVR | duration: 1 | capacity: 50
name: Queue | duration: 0 | capacity: 100
name: Agent Handling | duration: 5 | capacity: 20
name: Resolution | duration: 3 | capacity: 20
name: Wrap-up | duration: 2 | capacity: 20
```

---

### Restaurant / Food Service

```
Create a restaurant order fulfillment process flow diagram showing how orders move from customer placement through delivery or pickup.

For each shape, use this naming format:

ARRIVAL POINTS (customer orders):
name: [description] | interval: [minutes between orders] | entities: [orders per arrival]

PROCESS STEPS (kitchen and service stages):
name: [step name] | duration: [minutes to complete] | capacity: [orders that can be handled simultaneously]

RESOURCES (staff and equipment - these shapes should NOT be connected to the flow):
name: [resource name] | type: resource | capacity: [number of units available]

Example formats:
- name: Grill Station | duration: 8 | capacity: 4
- name: Customer Orders | interval: 3 | entities: 1
- name: Line Cook | type: resource | capacity: 4
- name: Server | type: resource | capacity: 6
- name: Grill | type: resource | capacity: 2

Include realistic kitchen stations, preparation steps, and service stages. Add resource shapes for staff (cooks, servers) and equipment (grills, fryers, ovens). Show how orders split across different preparation areas. Leave resource shapes unconnected.
```

---

### Warehouse / Logistics

```
Create a warehouse operations process flow diagram showing both receiving (inbound) and order fulfillment (outbound) processes.

For each shape, use this naming format:

ARRIVAL POINTS (shipments or orders arriving):
name: [description] | interval: [minutes between arrivals] | entities: [units per arrival]

PROCESS STEPS (warehouse operations):
name: [step name] | duration: [minutes to complete] | capacity: [units that can be processed simultaneously]

RESOURCES (workers and equipment - these shapes should NOT be connected to the flow):
name: [resource name] | type: resource | capacity: [number of units available]

Example formats:
- name: Order Picking | duration: 8 | capacity: 20
- name: Truck Arrivals | interval: 60 | entities: 500
- name: Forklift | type: resource | capacity: 5
- name: Picker | type: resource | capacity: 15
- name: Packer | type: resource | capacity: 8

Include realistic receiving, putaway, picking, packing, and shipping operations. Add resource shapes for workers and equipment (forklifts, pallet jacks, scanners). Leave resource shapes unconnected from the process flow.
```

---

### Software Development / CI-CD Pipeline

```
Create a software CI/CD pipeline flow diagram showing how code moves from commit through production deployment.

For each shape, use this naming format:

ARRIVAL POINTS (code changes):
name: [description] | interval: [minutes between commits] | entities: [commits per arrival]

PIPELINE STAGES (build and deploy steps):
name: [stage name] | duration: [minutes to complete] | capacity: [parallel jobs that can run]

RESOURCES (infrastructure - these shapes should NOT be connected to the flow):
name: [resource name] | type: resource | capacity: [number of units available]

Example formats:
- name: Unit Tests | duration: 5 | capacity: 10
- name: Code Commits | interval: 30 | entities: 1
- name: Build Agent | type: resource | capacity: 10
- name: Test Environment | type: resource | capacity: 3
- name: Production Server | type: resource | capacity: 2

Include realistic CI/CD stages like testing, building, scanning, and deployment. Add resource shapes for infrastructure (build agents, environments, servers). Show failure paths and approval gates. Leave resource shapes unconnected.
```

---

### Bank / Loan Processing

```
Create a bank loan application processing flow diagram showing how applications move from submission through funding.

For each shape, use this naming format:

ARRIVAL POINTS (new applications):
name: [description] | interval: [minutes between applications] | entities: [applications per arrival]

PROCESS STEPS (review and approval stages):
name: [step name] | duration: [minutes to complete] | capacity: [applications that can be processed simultaneously]

RESOURCES (staff - these shapes should NOT be connected to the flow):
name: [resource name] | type: resource | capacity: [number of units available]

Example formats:
- name: Underwriting Review | duration: 45 | capacity: 4
- name: Loan Applications | interval: 20 | entities: 1
- name: Loan Officer | type: resource | capacity: 8
- name: Underwriter | type: resource | capacity: 4
- name: Appraiser | type: resource | capacity: 3

Include realistic loan processing steps like document review, verification, underwriting, and closing. Add resource shapes for staff roles. Show parallel verification activities and decision points. Leave resource shapes unconnected.
```

---

## Field Reference by Shape Type

### Activities (Process Steps)
| Key | Aliases | Description | Example |
|-----|---------|-------------|---------|
| `name` | - | Display name | `name: Triage` |
| `type` | `t` | Explicit type (optional) | `type: activity` |
| `duration` | - | Processing time in minutes | `duration: 5` |
| `capacity` | - | Simultaneous entities | `capacity: 2` |
| `inputBuffer` | `input` | Input queue capacity | `inputBuffer: 10` |
| `outputBuffer` | `output` | Output queue capacity | `outputBuffer: 10` |
| `resource` | - | **Auto-create and assign a Resource** | `resource: Nurse` |

> **Auto-Created Resources:** When an Activity includes a `resource` field, Quodsi will automatically create a Resource shape on the page (positioned to the right), convert it, and link the Activity's operation step to it. Multiple Activities can reference the same resource name—only one Resource shape will be created and shared.

### Generators (Arrival Points)
| Key | Aliases | Description | Example |
|-----|---------|-------------|---------|
| `name` | - | Display name | `name: Arrivals` |
| `type` | `t` | Explicit type (optional) | `type: generator` |
| `interval` | - | Time between arrivals (minutes) | `interval: 10` |
| `entities` | `batch` | Entities per arrival | `entities: 2` |
| `max` | `maxEntities` | Maximum total entities | `max: 100` |
| `occurrences` | - | Number of arrival events | `occurrences: 50` |

### Resources (Staff/Equipment)
| Key | Aliases | Description | Example |
|-----|---------|-------------|---------|
| `name` | - | Display name | `name: Doctor` |
| `type` | `t` | **Required for resources** | `type: resource` |
| `capacity` | - | Number of units | `capacity: 3` |

### Entities (Items Being Processed)
| Key | Aliases | Description | Example |
|-----|---------|-------------|---------|
| `name` | - | Display name | `name: Patient` |
| `type` | `t` | Explicit type (optional) | `type: entity` |

---

## Tips

1. **Copy the entire prompt** - Select from the first line to the last line of the code block
2. **Keep the format instructions** - The LLM needs to see the `name: X | duration: Y` pattern
3. **Use `resource:` in Activities** - Embed resource names directly in Activity shapes (e.g., `resource: Nurse`) for automatic Resource creation during conversion
4. **Resources need `type: resource`** - If creating separate Resource shapes, use this to mark them explicitly
5. **Leave resources unconnected** - Resource shapes should not have arrows connecting them to the process flow
6. **Customize the scenario** - Add details about your specific business context
7. **Iterate** - Ask the AI to add more steps or adjust values after initial generation

---

## Simplified Prompt (Using Auto-Resources)

Instead of asking the LLM to create separate Resource shapes (which often fails), use the `resource:` field in Activities:

```
Create an emergency department patient flow diagram.

PATIENT ARRIVAL:
name: Patient Arrivals | interval: 8 | entities: 1

PROCESS STEPS (connect with arrows):
name: Triage | duration: 5 | capacity: 2 | resource: Triage Nurse
name: Registration | duration: 8 | capacity: 2
name: Exam | duration: 20 | capacity: 4 | resource: Doctor
name: Treatment | duration: 30 | capacity: 6 | resource: ER Nurse
name: Discharge | duration: 10 | capacity: 4

Show arrows connecting the process steps in order.
```

During conversion, Quodsi will automatically create three Resource shapes (Triage Nurse, Doctor, ER Nurse) and link them to the appropriate Activities.
