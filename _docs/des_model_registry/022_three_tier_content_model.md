# Three-Tier Content Model

Every model entry in SimVault contains content organized into **three tiers**, each representing a different level of abstraction and structure. The tiers progressively converge on executable reality.

The three tiers are framed by a separate first-class concept: **[Scenarios](023_scenarios.md)**, which describe what the model is meant to answer. Scenarios drive what the model must contain; the three tiers below describe the model itself.

## The Three Tiers

### Tier 1 — Raw Context
**What it is:** Everything and anything about the model. Messy, abundant, unstructured.

Examples: voice transcripts, pasted prose, markdown notes, URLs to papers, blog posts, uploaded text files, assumptions noted in a meeting, design decisions, diagrams with captions, case study descriptions.

**Purpose:** Capture all the context that could help a human or AI agent understand or build the model. The asset SimVault is accumulating at scale.

**Structure:** Minimal. Items are tagged with source type, provenance, and optional labels, but the content itself is free-form.

**See:** [027_raw_context_ingestion.md](027_raw_context_ingestion.md)

### Tier 2 — Summary
**What it is:** The cleaned, organized, human-readable view of the model in plain language. Vendor-neutral — any practitioner can read it regardless of what simulation tool they use.

**Purpose:** Make the model understandable at a glance. Communicate the modeling decisions that matter. Serve as the canonical "what is this model" description.

**Structure:** The eight narrative sections — Entities, Resources, Activities, Generators, Queues, Routing, Metrics, Assumptions. Each section is a short narrative, not a checklist.

**See:** [025_modeling_decisions_within_entries.md](025_modeling_decisions_within_entries.md)

### Tier 3 — Model Definition
**What it is:** A concrete, executable (or near-executable) specification of the model in a specific simulation technology's language. Quodsi's format. AnyLogic's. Simio's. FlexSim's.

**Purpose:** Give a practitioner a runnable starting point in their tool of choice. Close the loop between "I understand this model" and "I can run this model."

**Structure:** A git-backed artifact in the target tech's native format. A single SimVault model can have zero, one, or many model definitions — one per target tech.

**See:** [028_model_definitions_and_translators.md](028_model_definitions_and_translators.md)

## How the Tiers Relate

```
Scenarios (what the model must answer)
    ↓
Raw Context       →       Summary       →       Model Definition(s)
(messy, abundant)        (polished, narrative)    (executable, per tech)
```

The tiers flow from abundance to precision:

- **Raw Context** is the richest and most abundant. Multiple sources, formats, and contributors feed into it.
- **Summary** is a curated distillation of the raw context — the key decisions, entities, flows, and assumptions rendered in plain language.
- **Model Definition** is a concrete realization in a specific tech. A summary can produce many model definitions (one per target tech), and each is the product of a translator applied to the summary plus raw context.

## Raw First, Polished Optional

An entry **does not need all three tiers** to be valid. The progression is aspirational, not mandatory:

- **Day-one entry:** Just raw context — a voice transcript or a pasted paper. No summary, no model definition. Still a legitimate stub.
- **Enriched entry:** Raw context plus a summary that captures the key modeling decisions.
- **Full entry:** Raw context, summary, and one or more model definitions covering the target techs the community cares about.

This is the **"raw first, polished optional"** approach. It lowers the contribution barrier to almost zero — if you can describe a model in prose or voice, you can start an entry. Humans and AI agents build up the polished layers over time.

## Why Three Tiers

**Separation of concerns.** Each tier has a different purpose, audience, and editorial process. Raw context is about capture. Summary is about understanding. Model definitions are about execution. Conflating them leads to entries that are either too messy to read or too polished to contribute to.

**AI-native fit.** The three tiers map cleanly onto what AI agents do well. A raw-to-summary agent reads abundant messy context and produces a clean narrative. A summary-to-definition agent (translator) reads the narrative and produces a tech-specific artifact. Each agent has a focused job and a clear input/output contract.

**Progressive value.** A visitor can engage at whatever depth they need. Someone exploring a new domain reads the summary. Someone building a specific model pulls the definition for their tech. Someone doing deep research dives into the raw context. All three are served by the same entry.

**Translator economics.** Because the summary is the canonical structured layer, onboarding a new target tech means writing one translator that operates on summaries — not rewriting existing content. The number of translators grows linearly with the number of target techs, not with the number of entries.
