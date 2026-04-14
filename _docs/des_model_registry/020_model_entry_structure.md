# Model Entry Structure

A model entry is the core unit of content in the registry. Think of it like a Netflix title page — enough to understand what you're looking at and decide if you want to go deeper.

## Required Fields (Minimum for Publication)

- **Title** — e.g., "Emergency Department Patient Flow," "Single-Server Queue," "Job Shop Manufacturing"
- **Domain tag(s)** — At least one. Healthcare, Manufacturing, Logistics, etc.
- **At least one piece of raw context** — a paragraph of prose, a URL, or uploaded text. This is the minimum content an entry must have. See [027_raw_context_ingestion.md](027_raw_context_ingestion.md).

## Standard Fields

- **Status indicator** — How complete/mature the entry is: AI Discovered, Stub, Draft, Reviewed, or Featured. See [040_contributor_editorial_workflow.md](040_contributor_editorial_workflow.md).
- **DES qualification** — Assessment against the [DES criteria rubric](018_des_criteria.md), showing which required and typical criteria the entry meets.

## Content Structure

Every entry has content organized at two levels:

**Framing (what the model is meant to answer):**
- **Scenarios** — first-class list of what-if questions the model is designed to support. Scenarios appear at the top of each entry and drive the model's intended shape. See [023_scenarios.md](023_scenarios.md).

**Three tiers (what the model is):** The [three-tier content model](022_three_tier_content_model.md):
- **Raw Context** — the unstructured, abundant layer of source material (pasted prose, URLs, uploaded text, AI-discovered sources). Always present from day one. See [027_raw_context_ingestion.md](027_raw_context_ingestion.md).
- **Summary** — the polished, eight-section narrative view of the model. Target shape that entries grow into. See [025_modeling_decisions_within_entries.md](025_modeling_decisions_within_entries.md).
- **Model Definitions** — zero, one, or many tech-specific executable artifacts in git-backed repos. See [028_model_definitions_and_translators.md](028_model_definitions_and_translators.md).

## Optional Fields (Grow Over Time)

- **Visual diagram** — A process flow showing the high-level logic. The "poster art" for the entry when present.
- **Variations** — Common alternatives or extensions (e.g., "with triage priority" or "with batch arrivals").
- **Implementation links** — External URLs to this model built in specific software — blog posts, videos, papers. For structured, collaborative, git-backed implementations, see Model Definitions instead.
- **Video links** — Tutorials, walkthroughs, conference talks related to the model.
- **Complexity indicator** — Beginner, Intermediate, or Advanced.
- **Related models** — Links to similar or prerequisite entries in the registry.
- **Revision history** — Wikipedia-style changelog of edits and contributors.

## The Raw-First Principle

An entry with just a title, at least one domain tag, and one piece of raw context is a valid entry. No polished summary required. No visual diagram required. No model definition required. The community and AI agents work over time to draw out the polished layers.

A raw-only entry is not a malformed stub — it is a legitimate contribution. The platform is designed to accumulate messy context first and convert it to structured content over time.
