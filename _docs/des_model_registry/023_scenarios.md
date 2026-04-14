# Scenarios: What the Model Is Meant to Answer

A **scenario** is a specific what-if question a model is designed to answer. Scenarios are first-class content within a SimVault entry — they sit alongside the Summary and Model Definitions, not inside them.

This document defines what scenarios are, why they matter, and how they fit into the model entry structure.

## The Consultant's Principle

Experienced DES practitioners start with the end in mind. Before they decide what entities, resources, and activities a model should contain, they decide **what decisions the model needs to support**. The intended use drives the model's shape, not the other way around.

A common pitfall — and one of the most expensive mistakes in simulation consulting — is to design a model at a particular resolution, invest in building it, and then discover that a stakeholder's new question requires features the model cannot support. The model has to be rebuilt or significantly extended. Time and trust are lost.

SimVault captures this principle by making scenarios a first-class, upfront concept. An entry's scenarios tell readers what the model is meant to answer **before** they read how the model is built.

## Two Flavors: Operational and Pedagogical

Scenarios in SimVault come in two related but distinct flavors:

**Operational scenarios** address real-world managerial decisions — "should we add four fast-track beds to the ED?" or "how should TSOs be scheduled across a full day?" The "decisions supported" field for an operational scenario names concrete stakeholder decisions that the model is built to inform. Most entries in SimVault — applied case studies of specific operations — will have operational scenarios.

**Pedagogical scenarios** address learning objectives and conceptual understanding — "what happens to average wait time as utilization approaches 1?" or "why does variability in service times increase congestion even when the mean is the same?" The "decisions supported" field for a pedagogical scenario names concepts the student or practitioner gains understanding of, not managerial choices. **Foundational pattern entries** (M/M/1 single-server queue, job shop, bank teller, etc.) typically have pedagogical scenarios because their purpose is teaching and validation rather than supporting specific operational decisions.

Both flavors follow the same structural template (name, what-if question, decisions supported, model features required, reference). The flavor is implicit in the nature of the "decisions supported" content — operational if it names stakeholders and choices, pedagogical if it names concepts and learning outcomes.

**Canonical example of pedagogical scenarios:** The M/M/1 Single-Server Queue entry's four scenarios (`205_seeder_walkthrough_mm1_queue.md`) illustrate this pattern: learn basic queueing behavior, validate a simulation against closed-form theory, explore the effect of variability, and demonstrate Little's Law empirically. Each is a genuine what-if question but the value is conceptual rather than managerial.

## Example: Emergency Department

An ED patient flow entry might have these scenarios:

- **Fast-Track Capacity Sizing** — what if we add N fast-track beds? Used by ED directors and consultants to justify capital spending.
- **Staffing Optimization** — what if we shift N nurses from night shift to afternoon? Used by operations managers for budget and schedule decisions.
- **Pediatric Area Feasibility** — what if we dedicate part of the ED to pediatric patients? Used by hospital leadership for capital planning.
- **Triage Protocol Change** — what if we implement a see-and-treat protocol for low-acuity patients? Used by medical directors for clinical workflow decisions.

Each scenario requires the model to contain certain features. Fast-track sizing requires fast-track and main-ED as distinct resources. Staffing optimization requires resource schedules. Pediatric area feasibility requires entity attributes (age) and routing logic that depends on them. Triage protocol change requires activity-level flexibility in the acuity assignment step.

If a reader is trying to answer one of these questions, they can look at the entry's scenarios and immediately see whether this model supports their need — or whether they should look at a different entry (or variant) that does.

## Relationship to the Three-Tier Content Model

Scenarios are a **framing concept** that sits above the [three-tier content model](022_three_tier_content_model.md):

```
Scenarios (what the model must answer)
    ↓
Raw Context → Summary → Model Definition(s)
(evidence)   (the model)   (runnable artifacts)
```

- **Scenarios define the requirements.** What questions must this model answer?
- **Summary describes the shape** that satisfies those requirements — entities, resources, activities, etc.
- **Model Definitions realize** that shape in specific simulation technologies.
- **Raw Context provides evidence** across all tiers — including evidence about scenarios themselves.

A scenario-vs-summary mismatch is an important signal:
- If a scenario requires features not in the summary, either the summary needs to grow, the scenario is out of scope, or a variant entry is needed.
- If the summary describes features no scenario requires, the model may be over-built — a design smell worth noting.

## Model Definitions and Scenario Support

A single model entry can have many scenarios and many model definitions, and the two are not necessarily 1:1. **Model definitions can be tagged with the scenarios they support.**

Example: an ED entry has four scenarios and three model definitions.
- The Quodsi model definition supports scenarios 1, 2, and 3.
- The AnyLogic model definition supports all four.
- The SimPy model definition is a simplified teaching version that only supports scenario 1.

A reader looking for a model to answer scenario 4 would see immediately that the AnyLogic definition is the one to pull.

## v1 Scope: Lightweight

SimVault v1 treats scenarios as a lightweight concept: a dedicated **Scenarios** section at the top of each entry, containing a list of scenarios in a consistent narrative format.

### v1 Structure per Scenario

Each scenario in v1 is captured as a short narrative with four fields:

- **Name** — a short descriptive label, e.g., "Fast-Track Capacity Sizing"
- **What-if question** — the specific question the scenario addresses, e.g., "What impact does adding 4 fast-track beds have on average door-to-doctor time?"
- **Decisions supported** — what real-world decisions this scenario informs, e.g., "Capital spending on new beds; medical director approval of layout changes"
- **Model features required** — what the underlying model must contain to support this scenario, e.g., "Fast-track as a separate resource pool; acuity-based routing; door-to-doctor metric tracking"

### What's NOT in v1

Deliberately deferred to later phases:

- **Per-scenario pages** — scenarios are inline on the entry page, not standalone URLs
- **Per-scenario raw context** — context records are still associated with the entry as a whole
- **Per-scenario discussions** — no threaded conversation per scenario
- **Per-scenario parameter ranges** — no structured representation of typical what-if parameters
- **Per-scenario results archive** — no storage of past run results
- **Structured tagging** — scenarios are not yet linked to model definitions in a machine-readable way

These are part of the full-featured vision but add significant complexity and are not needed to prove the concept.

## Vision: Scenarios as First-Class Objects

Over time, scenarios can evolve into full first-class objects within SimVault:

- **Dedicated scenario pages** at stable URLs, each a rich content container
- **Per-scenario raw context** — consulting notes, past engagements, stakeholder interviews, published case studies that describe real uses of this scenario
- **Per-scenario discussions** — practitioners share how they applied a scenario to a real decision, what worked, what they'd do differently
- **Structured scenario-to-model-definition linkage** — machine-readable tags showing which definitions support which scenarios
- **Typical parameter ranges** — the common values and ranges practitioners use when running the scenario
- **Results archive** — anonymized or abstracted results from past runs, to help practitioners set expectations
- **AI services per scenario** — narrative drafting, Q&A, and enrichment suggestions applied at the scenario level, not just the entry level

In this vision, SimVault catalogs not just models but **models plus their uses**. That's a meaningfully richer knowledge asset than any existing DES repository.

## Why This Matters

Scenarios make SimVault more than a catalog of simulation structures — they make it a catalog of **why and how** simulation models get used in practice. That closes the gap between academic model descriptions and practitioner reality.

For a consultant or operations manager coming to SimVault to solve a real problem, the most valuable first question is **"has someone already worked on something like my decision?"** Scenarios answer that question directly. Without them, readers have to reverse-engineer applicability from the model's structure — exactly the kind of work SimVault should eliminate.
