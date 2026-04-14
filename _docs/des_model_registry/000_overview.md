# DES Model Registry — Overview

## What Is This?

A free, open, community-curated catalog of discrete event simulation models — "Netflix for DES." Practitioners from any domain can discover, learn from, and contribute simulation model blueprints in a vendor-neutral format.

DES modeling is part art, part science. The registry captures the collective wisdom of the simulation community. AI helps scale content creation, but human practitioners vet and refine entries — ensuring the "art" is preserved alongside the science.

## Working Name

**SimVault** (see [001_naming_candidates.md](001_naming_candidates.md) for alternatives)

## Core Principles

- **AI-native** — built for the era of AI agents, with agents as first-class contributors alongside humans (see [015_ai_native_vision.md](015_ai_native_vision.md))
- **Open access** — all content is public, no paywall, no gated content
- **Vendor-neutral** — model entries link to implementations in any DES software as equals
- **Community-curated** — Wikipedia-inspired editorial model with AI drafting and human review
- **Raw first, polished optional** — an entry with just raw context is a legitimate contribution; polished content grows over time
- **Start with the end in mind** — [scenarios](023_scenarios.md) (what-if questions the model answers) are first-class content and drive the model's intended shape
- **Three-tier content** — Raw Context → Summary → Model Definition, with each tier progressively converging on executable reality (see [022_three_tier_content_model.md](022_three_tier_content_model.md))
- **Standalone community resource** — Quodsi brand asset second, educational value first

## Document Index

| Document | Description |
|----------|-------------|
| [010 — Product Vision](010_product_vision.md) | Mission, positioning, and relationship to Quodsi |
| [015 — AI-Native Vision](015_ai_native_vision.md) | AI-first philosophy, the "build it" test, agents as first-class contributors |
| [018 — DES Criteria](018_des_criteria.md) | Qualification rubric for what counts as a DES model |
| [020 — Model Entry Structure](020_model_entry_structure.md) | What a model entry contains (required, standard, optional fields) |
| [022 — Three-Tier Content Model](022_three_tier_content_model.md) | Raw Context → Summary → Model Definition |
| [023 — Scenarios](023_scenarios.md) | First-class what-if questions the model answers; "start with the end in mind" |
| [025 — Modeling Decisions Within Entries](025_modeling_decisions_within_entries.md) | Summary tier detail: the eight narrative sections |
| [027 — Raw Context Ingestion](027_raw_context_ingestion.md) | Raw Context tier detail: what forms, how stored, how used |
| [028 — Model Definitions & Translators](028_model_definitions_and_translators.md) | Model Definition tier detail: Hugging Face inspiration, git repos, translators |
| [029 — Hugging Face Design Lessons](029_hugging_face_design_lessons.md) | Specific HF patterns and features worth adapting for SimVault |
| [030 — Discovery & Browsing](030_discovery_and_browsing.md) | Homepage, search, domain browsing, model entry pages |
| [040 — Contributor & Editorial Workflow](040_contributor_editorial_workflow.md) | Accounts, entry creation, status progression, review process |
| [045 — AI Agent Seeder](045_ai_agent_seeder.md) | Autonomous model discovery, AI Discovered tier, source strategy |
| [047 — AI Services Catalog](047_ai_services_catalog.md) | The v1 AI services (drafting, Q&A, criteria check, enrichment) |
| [075 — User Search as Seeder Signal](075_user_search_as_seeder_signal.md) | Failed searches feed the Seeder's priority queue; demand-driven growth |
| [050 — Domain Taxonomy](050_domain_taxonomy.md) | Domain categories, foundational patterns, curated collections |
| [060 — Vendor Ecosystem](060_vendor_ecosystem.md) | Implementation links, vendor neutrality, Quodsi's role |
| [070 — Content Quality & Trust](070_content_quality_and_trust.md) | Quality signals, moderation, governance, dispute handling |
| [080 — Seeding Sources](080_seeding_sources.md) | Sources for initial content (open-source, academic, vendor, classic models) |
| [090 — Competitive Landscape](090_competitive_landscape.md) | Market analysis, adjacent platforms, strategic insights |
| [200 — Seeder Walkthrough: Airport Security](200_seeder_walkthrough_airport_security.md) | Worked example of the AI Agent Seeder role; real sources, real friction, draft entry, spec gaps surfaced |
| [201 — Seeder Walkthrough: ENT Clinic](201_seeder_walkthrough_ent_clinic.md) | Second walkthrough under thin-source conditions; false positives, paywalled content, adjacent-specialty transfer |
| [202 — Seeder Walkthrough: Fast Food Drive-Thru](202_seeder_walkthrough_drive_thru.md) | Third walkthrough; first live-fire invocation of the `simvault-seeder` skill; rich-source contrast to ENT |
| [203 — Seeder Walkthrough: Pathology Slide Scanner](203_seeder_walkthrough_pathology_scanner.md) | Fourth walkthrough; vendor-specific anchor (3DHISTECH P480); new friction pattern (PDF text extraction failure) |
| [204 — Seeder Walkthrough: Home Appliance Assembly Line Balancing](204_seeder_walkthrough_appliance_assembly_line.md) | Fifth walkthrough; targeted at GE Appliances early adopters; rich-but-friction-heavy source pattern; on-subject-but-non-DES methodology edge case |
| [205 — Seeder Walkthrough: M/M/1 Single-Server Queue](205_seeder_walkthrough_mm1_queue.md) | Sixth walkthrough; first Mode 3 (Gap-Driven) live-fire; foundational/pedagogical content; zero friction; HTML-dominant sources |
| [206 — Seeder Walkthrough: Warehouse Order Picking & E-Commerce Fulfillment](206_seeder_walkthrough_warehouse_order_picking.md) | Seventh walkthrough; first Mode 2 (Scoped) live-fire with a topic area; rich-but-friction-heavy; Wikipedia pivot as fallback; closes Logistics & Supply Chain gap |
| [database_design/](database_design/000_overview.md) | Relational database schema design for SimVault as a technology-agnostic CSV data dictionary |

## Key Inspirations

- **Hugging Face** — UX, model cards, community features
- **BioModels** — curation model, metadata schema, publication linkage
- **Wikipedia** — editorial governance, revision history, low barrier to contribute
- **Netflix** — rich browsing experience, curated collections, visual previews

## Roadmap (High-Level)

**Phase 1 — Visual Baseline:** Static catalog of model entries organized by domain. Foundational/classic models seeded first (~30-40 entries) to establish quality standard.

**Phase 2 — Interactive Library:** Full browsing and search experience. Community accounts, contribution workflow, AI-assisted drafting. Vendor implementation links.

**Phase 3 — Universal Standard:** Refine a lightweight "model card" schema for vendor-neutral DES model description. Curated collections, educational pathways, trusted contributor program.
