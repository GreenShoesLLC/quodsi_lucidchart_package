# Modeling Decisions Within Model Entries

This document describes the structure of the **Summary tier** of a model entry — the polished, narrative view that captures the core DES building blocks. The Summary is Tier 2 of the [three-tier content model](022_three_tier_content_model.md), sitting between [Raw Context](027_raw_context_ingestion.md) (Tier 1) and [Model Definitions](028_model_definitions_and_translators.md) (Tier 3).

This document complements [020_model_entry_structure.md](020_model_entry_structure.md), which defines the entry fields at the top level.

## The Spectrum: Description vs. Specification

A key tension in designing SimVault: where on the spectrum does a model entry sit?

**One end — Plain-language description:**
> "Patients arrive at the ED, get triaged, see a doctor, and either go home or get admitted."

**Other end — Full specification:**
> "Entities with 5 attributes (ID, arrival time, acuity, age, insurance). Exponential arrivals at rate 4.2/hr. Three resource pools (triage nurses, doctors, beds) with shift schedules..."

**SimVault's sweet spot is in the middle** — enough detail that a practitioner understands the **modeling decisions** involved, without turning the entry into a configuration form. The goal is not to "build the model in the browser," but to help a reader understand what matters when building it themselves in whatever tool they choose.

Where a specific entry sits on this spectrum can vary. A Stub might lean toward the description end; a Reviewed entry often has more specification-like detail. The vendor implementation links handle the "build it exactly" end by pointing to real, executable models.

**This spectrum is a core design question** and should be discussed early to align contributors, AI drafting behavior, and reader expectations.

---

## The Eight Core Sections

The Summary tier is structured into eight sections, in this order. These sections are a **target shape** that entries grow into over time — not a requirement that every entry must fulfill on day one.

An entry can exist with no summary at all (raw context only), with a partial summary (some sections filled, others empty), or with a complete summary. As an entry matures from AI Discovered to Stub to Draft to Reviewed to Featured, more sections are typically filled in.

When a section is present, its absence of content is itself informative — marking a section "Not applicable to this model" tells readers what doesn't matter, which is a meaningful modeling decision.

### 1. Entities
The things that flow through the system. Examples: Patient, Order, Part, Call, Vehicle.

### 2. Resources
The things that serve or process entities. Examples: Doctor, Machine, Forklift, Teller, Bed.

### 3. Activities / Processes
The steps entities go through. Examples: Triage, Assembly, Inspection, Treatment, Check-in.

### 4. Generators / Arrivals
How entities enter the system. Covers arrival patterns, schedules, and distributions.

### 5. Queues / Buffers
Where entities wait. Examples: Waiting room, input buffer, callback queue.

### 6. Routing Logic
How entities move between activities — probability, condition, priority, etc.

### 7. Key Metrics
What you'd typically measure in this model. Examples: throughput, average wait time, resource utilization, door-to-doctor time.

### 8. Assumptions
Simplifications made in this model versus reality. What's deliberately abstracted away?

---

## Narrative Style, Not Checklists

Each section is written as a short **narrative of what matters** for this particular model — not a checklist of every possible DES feature. The goal is to highlight the **modeling decisions worth noting** so that a reader quickly understands what makes this model interesting or tricky.

### Example: Emergency Department Patient Flow

> **Entities (Patient):** Has priority (acuity level 1-5). Can generate sub-entities representing lab orders and imaging requests, which must complete before the patient can be discharged.
>
> **Resources:** Nurses and doctors operate on shift schedules that vary by time of day. Beds are a finite shared resource — when full, new arrivals must wait or be diverted.
>
> **Activities:** Triage, initial assessment, diagnostic workup, treatment, disposition decision (admit/discharge).
>
> **Generators:** Poisson arrivals with time-of-day variation. Arrival rate peaks in late afternoon.
>
> **Queues:** Waiting room (before triage). Bed queue (after triage if no bed available). Queues are priority-ordered by acuity.
>
> **Routing:** Priority-based — higher acuity patients jump the queue. Probabilistic routing to admit vs. discharge based on disposition.
>
> **Key Metrics:** Door-to-doctor time, total length of stay, left-without-being-seen rate, bed utilization, nurse utilization.
>
> **Assumptions:** No patient re-arrivals (each patient is independent). Shift handoffs are instantaneous. Patient acuity does not change during the visit.

### Example: Single-Server Queue (M/M/1)

> **Entities (Customer):** Featureless — no priority, no attributes beyond identity.
>
> **Resources:** One server with no schedule, no breakdowns.
>
> **Activities:** Single service activity.
>
> **Generators:** Exponential inter-arrival times (Poisson process).
>
> **Queues:** Single FIFO queue in front of the server.
>
> **Routing:** None — there is only one path.
>
> **Key Metrics:** Average wait time, queue length, server utilization, throughput.
>
> **Assumptions:** Infinite queue capacity. Single customer class. Service times are exponential. No reneging or balking.

---

## Why This Structure

- **Consistency** — readers can scan any entry and find the same sections in the same order.
- **Comparability** — side-by-side comparison of two models is immediate and meaningful.
- **Teaching value** — the sections themselves teach newcomers the building blocks of DES thinking.
- **"N/A" is informative** — seeing that a simple model has no routing logic or assumptions worth noting is useful, not empty.
- **Narrative over checklist** — preserves the "art" of simulation modeling; contributors explain *why* a decision matters, not just *whether* a feature is present.
