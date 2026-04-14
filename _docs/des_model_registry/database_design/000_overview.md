# SimVault Database Design — Overview

This folder contains the relational database design for SimVault, captured as a **data dictionary** rather than technology-specific DDL.

## The Core Concept: Blueprint

The central table in SimVault's schema is named **`blueprint`**, not `entry` or `model`. This naming choice is deliberate and worth explaining upfront.

**Why not `model`?** The word "model" is hopelessly overloaded. It collides with:
- The simulation model the blueprint describes
- `model_definition` (the Tier 3 tech-specific realization)
- Machine learning models
- Database models and domain models (DDD)
- Data models and object models

**Why `blueprint`?** The word comes directly from the SimVault spec's own original framing in `000_overview.md`, which described the registry as a "Universal Blueprint" — a conceptual bridge documenting logic flows that act as a starting point for researchers and engineers. The architectural metaphor is precise: a blueprint is a **plan for building something**, not the thing itself. A SimVault blueprint captures what a model is *supposed* to be, with one or more `model_definitions` realizing it in specific simulation technologies. The word relationship (**a blueprint has many model definitions**) mirrors the data relationship cleanly, is distinctive and uncrowded, and avoids the collision problems of `model`.

**Scope of the rename:** This naming choice currently applies only to the database schema in this folder. The broader SimVault spec documents (`020_model_entry_structure.md`, `025_modeling_decisions_within_entries.md`, etc.) still use "entry" terminology. Propagating the rename to those documents is a separate decision to be made later.

## Design Goals

- **Technology-agnostic.** The design does not commit to PostgreSQL, MySQL, SQLite, SQL Server, or any other DBMS. Data types are written in a generic form (TEXT, VARCHAR, INTEGER, BOOLEAN, TIMESTAMP) and can be mapped to any specific database technology later.
- **Iterative.** The schema will evolve as the SimVault product spec evolves. Each iteration adds new tables, columns, or relationships; older iterations can be marked as revised or deprecated without breaking the structure.
- **Scanable in Excel.** Data dictionary content lives in CSV files rather than markdown tables or DDL so the user can open the files in Excel and filter, sort, or pivot freely.
- **Traceable to the spec.** Every table and column should map back to a concept in the SimVault spec documents (`000_overview.md` through `075_user_search_as_seeder_signal.md`). Where a concept is ambiguous in the spec, this folder surfaces the ambiguity rather than inventing a silent resolution.

## Files

| File | Purpose |
|------|---------|
| `000_overview.md` | This document |
| `010_tables.csv` | List of all tables in the schema with category and status |
| `020_columns.csv` | The main data dictionary — one row per column, with type, constraints, description, and notes |
| `030_relationships.csv` | Foreign key relationships between tables with cardinality |
| `040_content_format_seed.csv` | Seed data for the `content_format` lookup table — 18 formats with phase gating metadata |
| `050_modeling_feature_seed.csv` | Seed data for the `modeling_feature` lookup table — 26 features across 6 categories (customer_behavior, resource_behavior, arrival_pattern, routing, queue_discipline, system) |
| `060_canonical_domain_seed.csv` | Seed data for the canonical top-level `domain` taxonomy — 11 entries sourced from `../050_domain_taxonomy.md` |
| `070_des_product_seed.csv` | Seed data for the `des_product` lookup table — 14 DES simulation tools (Simio, AnyLogic, Arena, FlexSim, Simul8, ProModel, Witness, Visual Components, Plant Simulation, SimPy, Salabim, Ciw, JaamSim, Quodsi) |
| `080_product_capability_seed.csv` | Seed data for the `product_capability` lookup table — 25 capabilities across 6 categories (simulation_paradigm, authoring_modality, scripting_language, visualization, analytical_feature, integration) |
| `090_des_product_capability_seed.csv` | Seed data for the `des_product_capability` many-to-many join — tags each of the 14 seeded products with the capabilities it supports |

Future iterations will likely add:

- `100_indexes.csv` — index recommendations (once tech is chosen)
- `110_enums.csv` — other enumerated value lists (status levels, provenance axes, extraction statuses)
- `120_open_questions.md` — tracked design ambiguities and decisions pending

## Naming Conventions

- **Table names:** singular, snake_case (`blueprint`, `context`, `model_definition`)
- **Column names:** snake_case (`blueprint_id`, `created_at`, `is_ai_generated`)
- **Primary key convention:** `<table_name>_id` (e.g., `blueprint_id` in the `blueprint` table)
- **Foreign key convention:** same name as the referenced primary key (e.g., `blueprint_id` in `scenario` references `blueprint.blueprint_id`)
- **Boolean columns:** `is_*` or `has_*` prefix (`is_ai_generated`, `has_been_reviewed`)
- **Timestamp columns:** `*_at` suffix (`created_at`, `published_at`, `last_updated_at`)

## Generic Data Types Used

| Type | Maps To |
|------|---------|
| `ID` | UUID, BIGSERIAL, or equivalent — the specific type is a DBMS decision |
| `TEXT` | Unbounded string (markdown content, descriptions) |
| `VARCHAR(n)` | Bounded string (slugs, names, URLs) |
| `INTEGER` | Whole number |
| `BOOLEAN` | True/false |
| `TIMESTAMP` | Date + time with timezone |
| `ENUM` | Enumerated value — specific allowed values listed in `050_enums.csv` (future) or in the column's `notes` field |

## Scope of the Current Iteration

This iteration focuses on the **content backbone** — the tables that hold the substance of a SimVault blueprint:

- `blueprint` — the core SimVault content unit
- `context` — Tier 1 content (raw source material, multiple formats)
- `content_format` — lookup table governing supported formats and their phase gating
- `summary_section` — Tier 2 content (the 8 narrative sections per blueprint)
- `model_definition` — Tier 3 content (tech-specific realizations of the blueprint)
- `scenario` — first-class scenario objects
- `domain` — taxonomy (with canonical-vs-non-canonical flagging)
- `blueprint_domain` — many-to-many join
- `model_definition_scenario` — many-to-many join for scenario support tagging
- `related_blueprint` — many-to-many self-join for cross-blueprint relationships
- `modeling_feature` — lookup table of structured modeling features (balking, reneging, priority queueing, time-varying arrivals, etc.)
- `blueprint_modeling_feature` — many-to-many join enabling faceted browsing by modeling feature
- `des_product` — lookup table of DES simulation tools (Simio, AnyLogic, SimPy, Quodsi, etc.) with vendor, product type, and primary language metadata. Referenced via FK by `model_definition.des_product_code` to identify the target technology for each variant.
- `product_capability` — lookup table of structured capabilities a DES product may support (simulation paradigms, authoring modalities, scripting languages, visualization, analytical features, integrations). 25 capabilities across 6 categories.
- `des_product_capability` — many-to-many join letting products be tagged with their capabilities, enabling queries like "show me all products that support agent-based modeling AND Python scripting AND 3D animation."
- `proposal` — central editorial queue for proposed changes to taxonomy tables (modeling_feature, domain, content_format, des_product, future vendor_product). Supports the AI-native vision where the Seeder can propose new taxonomy entries continuously while human editors review on a separate timeline. Each taxonomy table has an `approval_status` column tracking whether a row is `seed`, `pending`, `approved`, or `rejected`.
- `user` — local projection of the external identity provider (Kinde for end users, MSAL planned for enterprise). Thin by design: passwords, MFA, sessions, and refresh tokens live in the external provider and are never stored here. This table holds a stable local `user_id` that every `*_by_user_id` FK in the content backbone can target, plus denormalized projections of email/display_name/avatar_url refreshed opportunistically on login. Rows are created via just-in-time (JIT) provisioning on first authenticated request. The table also holds AI agent identities (e.g., `seeder:207_walkthrough`) as first-class rows with `external_provider='system'`, unifying audit trails across human and agent contributors.

## Phase Gating for Content Formats

The schema is designed to accept many content formats (text, documents, audio, images, video, structured data), but not all are activated simultaneously. The `content_format` lookup table (see `040_content_format_seed.csv`) has a `phase_enabled` column that governs which formats are live in which release:

- **v1** — text-native only: plain text, markdown, HTML-extracted text, source code
- **v1.2** — fast-follow documents: PDF, Word, slide decks, LaTeX. Closes the dominant Seeder friction pattern (PDF extraction failures) and opens access to accumulated academic and consultancy content.
- **v2** — structured data: CSV, JSON, spreadsheets. Enables reference parameter tables.
- **v3** — multimodal: audio recordings, audio URLs, raster/vector/diagram images. Opens voice capture and visual content per `027_raw_context_ingestion.md`.
- **future** — video (file and URL). Low priority.
- **disabled** — reserved for deprecated formats.

The application layer enforces phase gating by checking `content_format.phase_enabled` on upload/fetch. The schema itself is format-agnostic — adding a new format is a new row in `content_format`, not a schema migration.

## Content Lineage

The `context` table supports a **lineage self-reference** via `derived_from_context_id`. Derived content rows point back to their source row. This captures four distinct kinds of derivation:

- **`ocr`** — text extracted from an image via optical character recognition
- **`transcription`** — text transcribed from an audio recording
- **`ai_summary`** — AI-generated summary rolled up from one or more raw context rows
- **`manual_extraction`** — text manually extracted or cleaned up from a source
- **`translation`** — content translated from one language to another

Lineage matters for auditability: a reader of a context row can trace back to the original source, and an AI service reading the row can weight derived content appropriately against first-party source content.

## Deferred to Future Iterations

These tables are explicitly out of scope for the current iteration and will be addressed later:

- `contributor`, `organization` — richer identity and accounts concepts beyond the thin `user` projection (contributor profile pages, organizational affiliation, per-org roles)
- `revision_history` — Wikipedia-style edit tracking
- `flag`, `moderation_action` — flagging and moderation workflow
- `discussion`, `comment` — per-blueprint discussions (Hugging Face style)
- `seeder_run`, `seeder_candidate`, `human_followup_queue` — AI Agent Seeder activity logs
- `search_log`, `search_cluster` — user search signal (per `075_user_search_as_seeder_signal.md`)
- `implementation_link` — casual external references (separate from `model_definition`)

These are all valuable and will be designed in future passes once the content backbone is stable.
