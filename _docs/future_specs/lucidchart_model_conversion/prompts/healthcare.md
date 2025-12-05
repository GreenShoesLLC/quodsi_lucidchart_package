# Healthcare / Emergency Department Prompts

Prompts for generating emergency department diagrams with LucidChart AI. These prompts use the `resource:` field in Activity shapes, which Quodsi will automatically convert to Resource shapes during conversion.

---

## Version 1: Standard Emergency Department

```
Create a hospital emergency department patient flow diagram.

PATIENT ARRIVAL:
name: Patient Arrivals | interval: 8 | entities: 1

PROCESS STEPS (connect with arrows showing patient flow):
name: Triage | duration: 5 | capacity: 2 | resource: Triage Nurse
name: Registration | duration: 8 | capacity: 2 | resource: Registration Clerk
name: Nurse Assessment | duration: 10 | capacity: 4 | resource: ER Nurse
name: Doctor Exam | duration: 20 | capacity: 4 | resource: ER Doctor
name: Treatment | duration: 30 | capacity: 6 | resource: ER Nurse
name: Discharge | duration: 10 | capacity: 4

Connect the shapes with arrows to show patient flow from Arrivals through Discharge.
```

---

## Version 2: With Lab and Imaging

```
Create an emergency department diagram with diagnostic testing.

PATIENT ARRIVAL:
name: Patient Arrivals | interval: 8 | entities: 1

PROCESS STEPS (connect with arrows):
name: Triage | duration: 5 | capacity: 2 | resource: Triage Nurse
name: Registration | duration: 8 | capacity: 2
name: Nurse Assessment | duration: 10 | capacity: 4 | resource: ER Nurse
name: Doctor Exam | duration: 20 | capacity: 4 | resource: ER Doctor

After Doctor Exam, create TWO parallel branches:
name: Lab Tests | duration: 15 | capacity: 3 | resource: Lab Tech
name: X-Ray | duration: 20 | capacity: 2 | resource: Radiology Tech

Both branches merge back to:
name: Results Review | duration: 10 | capacity: 4 | resource: ER Doctor
name: Treatment | duration: 30 | capacity: 6 | resource: ER Nurse
name: Discharge | duration: 10 | capacity: 4
```

---

## Version 3: Acuity-Based Triage

```
Create an emergency department with patient acuity levels.

PATIENT ARRIVAL:
name: Patient Arrivals | interval: 8 | entities: 1

INITIAL STEPS:
name: Triage | duration: 5 | capacity: 2 | resource: Triage Nurse

After Triage, split into THREE paths based on acuity:

HIGH ACUITY PATH (critical patients):
name: Trauma Bay | duration: 60 | capacity: 2 | resource: Trauma Surgeon
name: Critical Care | duration: 120 | capacity: 4 | resource: Critical Care Nurse

MEDIUM ACUITY PATH (standard patients):
name: Acute Care Exam | duration: 30 | capacity: 4 | resource: ER Doctor
name: Treatment Room | duration: 45 | capacity: 6 | resource: ER Nurse

LOW ACUITY PATH (minor issues):
name: Fast Track Exam | duration: 15 | capacity: 4 | resource: Nurse Practitioner
name: Quick Treatment | duration: 20 | capacity: 4

All paths end at:
name: Discharge | duration: 10 | capacity: 4
```

---

## Version 4: Minimal

```
Create a simple emergency department flowchart.

PATIENT FLOW (connect with arrows):
name: Arrivals | interval: 8 | entities: 1
name: Triage | duration: 5 | capacity: 2 | resource: Nurse
name: Registration | duration: 8 | capacity: 2
name: Exam | duration: 20 | capacity: 4 | resource: Doctor
name: Treatment | duration: 30 | capacity: 6 | resource: Nurse
name: Discharge | duration: 10 | capacity: 4

Show arrows connecting the steps in order.
```

---

## How Auto-Resources Work

When you include `resource: ResourceName` in an Activity shape, Quodsi will:
1. **Create a Resource shape** automatically on the right side of the diagram
2. **Reuse Resources** - multiple Activities referencing "ER Nurse" share one Resource
3. **Link Activities** - each Activity's operation step is automatically linked to the Resource

This is simpler than trying to get the LLM to create separate Resource shapes.

---

## Common Healthcare Resources

Use these names in your `resource:` fields:

**Staff:**
- Triage Nurse
- ER Nurse
- ER Doctor
- Attending Physician
- Nurse Practitioner
- Physician Assistant
- Lab Tech / Lab Technician
- Radiology Tech
- Registration Clerk
- Trauma Surgeon
- Critical Care Nurse

**Equipment (optional):**
- Bed
- Wheelchair
- X-Ray Machine
- CT Scanner
- Ultrasound Machine
- EKG Machine

---

## Field Reference

### Process Steps (Activities)
```
name: [step name] | duration: [minutes] | capacity: [number] | resource: [staff/equipment]
```

### Arrival Points (Generators)
```
name: [description] | interval: [minutes between] | entities: [per arrival]
```

### Resource Field
The `resource:` field is optional. When included, Quodsi auto-creates the Resource during conversion.
```
resource: Nurse
resource: ER Doctor
resource: Lab Tech
```
