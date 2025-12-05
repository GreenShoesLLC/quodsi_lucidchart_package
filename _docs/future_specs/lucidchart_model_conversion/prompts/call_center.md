# Call Center / Customer Service Prompts

Multiple prompt variations for generating call center diagrams with LucidChart AI. Try different versions to see which works best.

---

## Version 1: Explicit Shape Instructions

```
Create a customer service call center workflow diagram.

IMPORTANT: Create THREE types of shapes:

1. ONE ARRIVAL SHAPE (green oval or rectangle) for incoming calls:
   name: Incoming Calls | interval: 2 | entities: 1

2. PROCESS SHAPES (rectangles) connected by arrows showing the call flow:
   name: [step name] | duration: [minutes] | capacity: [number]

3. RESOURCE SHAPES (separate rectangles placed to the SIDE of the diagram, NOT connected by arrows):
   name: [resource name] | type: resource | capacity: [number]

   Create these resource shapes:
   - name: Tier 1 Agent | type: resource | capacity: 20
   - name: Tier 2 Specialist | type: resource | capacity: 5
   - name: Technical Expert | type: resource | capacity: 2

The resource shapes represent staff who work at the process steps. Place them near the right side of the diagram, separate from the main flow. Do NOT draw arrows to or from resource shapes.

For the process flow, include steps like: IVR Menu, Queue, Agent Handling, Issue Resolution, Escalation, and Wrap-up.
```

---

## Version 2: Resources First

```
Create a customer service call center diagram with STAFF RESOURCES and a PROCESS FLOW.

FIRST, create these staff resource shapes (place on the right side, no connections):
- name: Tier 1 Agent | type: resource | capacity: 20
- name: Tier 2 Specialist | type: resource | capacity: 5
- name: Technical Expert | type: resource | capacity: 2

THEN, create the call flow process with these shapes connected by arrows:
- Arrival: name: Incoming Calls | interval: 2 | entities: 1
- Process steps: name: [step] | duration: [minutes] | capacity: [number]

Include IVR, queue, agent handling, escalation tiers, resolution, and wrap-up steps.
```

---

## Version 3: Two Sections Layout

```
Create a call center diagram with two sections:

LEFT SIDE - THE CALL FLOW:
Draw connected shapes showing how calls move through the system.
- Start shape: name: Incoming Calls | interval: 2 | entities: 1
- Process shapes: name: [step] | duration: [minutes] | capacity: [number]

RIGHT SIDE - STAFF POOL (3 separate unconnected shapes):
Draw 3 separate shapes representing available staff:
- name: Tier 1 Agent | type: resource | capacity: 20
- name: Tier 2 Specialist | type: resource | capacity: 5
- name: Technical Expert | type: resource | capacity: 2

These staff shapes should have NO arrows connecting them to anything.
```

---

## Version 4: Numbered Steps with Resources

```
Create a call center workflow diagram following these exact steps:

STEP 1 - Create 3 RESOURCE shapes on the right side of the canvas (no arrows):
Shape 1: name: Tier 1 Agent | type: resource | capacity: 20
Shape 2: name: Tier 2 Specialist | type: resource | capacity: 5
Shape 3: name: Technical Expert | type: resource | capacity: 2

STEP 2 - Create the ARRIVAL shape on the left:
Shape: name: Incoming Calls | interval: 2 | entities: 1

STEP 3 - Create PROCESS shapes and connect them with arrows:
- name: IVR Menu | duration: 1 | capacity: 50
- name: Queue Hold | duration: 0 | capacity: 100
- name: Agent Greeting | duration: 1 | capacity: 20
- name: Issue Identification | duration: 3 | capacity: 20
- name: Basic Troubleshooting | duration: 5 | capacity: 20
- name: Tier 2 Escalation | duration: 10 | capacity: 5
- name: Issue Resolution | duration: 3 | capacity: 20
- name: Call Wrap-up | duration: 2 | capacity: 20

STEP 4 - Connect the process shapes to show call flow from Incoming Calls through to Wrap-up, with escalation path to Tier 2.
```

---

## Version 5: Simple with Emphasis

```
Create a call center diagram.

You MUST create these exact shapes:

STAFF (create as separate shapes with NO connections):
name: Tier 1 Agent | type: resource | capacity: 20
name: Tier 2 Specialist | type: resource | capacity: 5
name: Technical Expert | type: resource | capacity: 2

CALL ARRIVAL:
name: Incoming Calls | interval: 2 | entities: 1

PROCESS STEPS (connect these with arrows):
name: IVR | duration: 1 | capacity: 50
name: Queue | duration: 0 | capacity: 100
name: Agent Handling | duration: 5 | capacity: 20
name: Resolution | duration: 3 | capacity: 20
name: Wrap-up | duration: 2 | capacity: 20

Place the staff shapes on the right side. Connect the process steps to show the call flow.
```

---

## Version 6: Minimal

```
Draw a call center flowchart.

Create 3 staff shapes (no arrows, place on right):
- name: Tier 1 Agent | type: resource | capacity: 20
- name: Tier 2 Agent | type: resource | capacity: 5
- name: Expert | type: resource | capacity: 2

Create the call flow (connect with arrows):
- name: Calls | interval: 2 | entities: 1
- name: IVR | duration: 1 | capacity: 50
- name: Queue | duration: 0 | capacity: 100
- name: Handle Call | duration: 5 | capacity: 20
- name: Resolve | duration: 3 | capacity: 20
- name: End | duration: 2 | capacity: 20
```

---

## Tips for Getting Resources Created

1. **Be explicit** - Say "create X separate shapes" rather than just listing them
2. **Specify placement** - "place on the right side" or "to the side of the diagram"
3. **Emphasize no connections** - "these shapes should NOT have arrows"
4. **Use numbered steps** - LLMs often follow numbered instructions better
5. **List resources first** - Put resources before the process flow in your prompt
6. **Use caps for emphasis** - "MUST", "IMPORTANT", "NO connections"
7. **Give exact shape names** - Provide the complete structured name to copy

---

## Field Reference

### Process Steps
```
name: [step name] | duration: [minutes] | capacity: [number]
```

### Arrival Points
```
name: [description] | interval: [minutes between] | entities: [per arrival]
```

### Resources (Staff)
```
name: [resource name] | type: resource | capacity: [number]
```
