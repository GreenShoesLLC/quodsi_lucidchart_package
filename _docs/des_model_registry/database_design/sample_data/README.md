# SimVault Sample Data

This folder contains **sample row data** for the SimVault schema defined in `../010_tables.csv`, `../020_columns.csv`, and `../030_relationships.csv`. The sample data is sourced from the existing walkthrough documents in `../../200_*.md`, treating each walkthrough's Draft Entry section as if it had been ingested into a real database.

## Folder Structure

Each walkthrough has its **own subfolder** containing a complete, self-contained set of CSV files for the content backbone tables. Subfolders are named to match the walkthrough document they came from.

```
sample_data/
  README.md                                          (this file)
  200_seeder_walkthrough_airport_security/           (processed)
    blueprint.csv
    context.csv
    summary_section.csv
    scenario.csv
    model_definition.csv
    domain.csv
    blueprint_domain.csv
    model_definition_scenario.csv
    related_blueprint.csv
  201_seeder_walkthrough_ent_clinic/                 (future)
  202_seeder_walkthrough_drive_thru/                 (future)
  203_seeder_walkthrough_pathology_scanner/          (future)
  204_seeder_walkthrough_appliance_assembly_line/    (future)
  205_seeder_walkthrough_mm1_queue/                  (future)
  206_seeder_walkthrough_warehouse_order_picking/    (future)
  207_seeder_walkthrough_perioperative/              (future)
```

Each subfolder is **fully self-contained**: IDs start from 1 within the folder, there are no cross-folder foreign key references, and the domain taxonomy is redefined locally as needed. This keeps each walkthrough independent and lets us add, remove, or update a single walkthrough's data without worrying about global ID conflicts.

If a future iteration needs a unified dataset spanning all walkthroughs, that would be a separate exercise — unioning the per-folder CSVs and resolving ID conflicts into a shared namespace.

## Purpose

The exercise of producing this data is a **pressure test of the schema**. If the walkthrough content can be mapped cleanly into rows across the current tables, the schema is adequate for real content. If something doesn't fit, we have surfaced a real schema gap to address before committing.

Each walkthrough processed this way also produces a concrete example that can serve as:

- Test fixtures for a future database implementation
- A reference for contributors to understand what "good" data looks like
- A benchmark for future schema changes (if we modify the schema, the sample data should still map cleanly)

## Conventions

- **ID strategy:** Integer primary keys are used throughout (`1`, `2`, `3`) for human readability. In a production DBMS these would be UUIDs. **IDs are local to each walkthrough subfolder** — each folder restarts its IDs from 1.
- **NULL values:** Represented as an empty cell. Excel will display these as empty; a DBMS would interpret them as NULL.
- **Multi-paragraph content:** Kept on a single line where feasible. Where paragraph structure is important, inline linebreaks (`\n`) are preserved within quoted CSV fields and will display correctly in Excel.
- **Timestamps:** ISO 8601 format with UTC timezone (e.g., `2026-04-11T10:05:00Z`).
- **Seeder-created content:** Rows where `added_by_user_id` is NULL represent content added by the AI Agent Seeder rather than a human user. In a production deployment with Seeder activity logs, these would reference a `seeder_run_id` instead; the Seeder run tables are deferred per `../000_overview.md`.

## What's Captured per Walkthrough Folder

Each walkthrough subfolder contains CSVs for the content backbone tables:

- `blueprint.csv` — the blueprint row for the walkthrough's Draft Entry
- `context.csv` — raw context rows captured during the walkthrough
- `summary_section.csv` — the eight narrative sections from the Draft Entry
- `scenario.csv` — scenarios from the Draft Entry
- `model_definition.csv` — proposed model definitions from the walkthrough
- `domain.csv` — taxonomy domains referenced by the blueprint (redefined locally in each folder)
- `blueprint_domain.csv` — many-to-many domain assignments
- `model_definition_scenario.csv` — scenario support tagging
- `related_blueprint.csv` — cross-blueprint relationships (typically empty per folder since each folder has only one blueprint)

## What's NOT Captured

Things the walkthroughs mention but that map to tables deferred per `../000_overview.md`:

- **Users and contributors.** Every `*_by_user_id` field is NULL in the sample data because the user tables don't exist yet.
- **Seeder run logs.** The walkthroughs describe Seeder runs in detail, but the `seeder_run` and related tables are deferred.
- **Human follow-up queue.** Walkthroughs flag sources for human follow-up (e.g., paywalled papers, bot-blocked sites). The `human_followup_queue` table is deferred; currently these flags are only captured in the walkthrough prose.
- **Failed fetch records.** Embry-Riddle thesis (403) and similar failed fetches from the walkthroughs would live in the deferred human follow-up queue, not in the `context` table (which only holds successfully-captured content).
- **Implementation links** (casual external references, distinct from `model_definition`). The `implementation_link` table is deferred.
- **Revision history / discussions / flags.** All deferred.

## Walkthroughs Processed

| Walkthrough | Folder | Status |
|-------------|--------|--------|
| 200 Airport Security Checkpoint | `200_seeder_walkthrough_airport_security/` | ✅ Processed |
| 201 ENT Clinic | `201_seeder_walkthrough_ent_clinic/` | ✅ Processed |
| 202 Fast Food Drive-Thru | `202_seeder_walkthrough_drive_thru/` | ✅ Processed |
| 203 Pathology Slide Scanner | `203_seeder_walkthrough_pathology_scanner/` | ✅ Processed |
| 204 Home Appliance Assembly Line | `204_seeder_walkthrough_appliance_assembly_line/` | ✅ Processed |
| 205 M/M/1 Single-Server Queue | `205_seeder_walkthrough_mm1_queue/` | ✅ Processed |
| 206 Warehouse Order Picking | `206_seeder_walkthrough_warehouse_order_picking/` | ✅ Processed |
| 207 Perioperative Patient Flow | `207_seeder_walkthrough_perioperative/` | ✅ Processed (first schema-native walkthrough) |

**🎉 All eight walkthroughs (200-207) have now been mapped into sample data.** Walkthrough 207 is the first walkthrough run under the updated schema-aware `simvault-seeder` skill — it produced canonical tags from day one (all 12 modeling features pulled from the canonical seed, `extraction_status='extracted_partial'` used formally for the WSC PDF) and required zero retroactive adjustments during sample data ingestion. Two proposals surfaced: `surgical-services` domain (sub-domain of Healthcare) and `delmia` DES product (Dassault Systèmes).

## Schema Gaps Surfaced by the Airport Security Walkthrough

The exercise of mapping walkthrough 200 to sample rows surfaced these design questions. None of them is a blocker — each is a judgment call or a deferred feature to track.

### 1. Failed Fetches Have No Home

The walkthrough recorded a 403 on the Embry-Riddle thesis. In the current schema, the `context` table is only meant to hold successfully-captured content — a row with `content=NULL, extraction_status=extraction_failed, content_format=?` is awkward because we don't even know the content format for a source we couldn't fetch.

**Resolution for this iteration:** Omit failed fetches entirely. The walkthrough mentions Embry-Riddle in prose but there is no row in `context.csv` for it.

**Design implication:** The deferred `human_followup_queue` table should explicitly include "attempted URL but fetch failed" as one of its entry types. Failed fetches are valuable signals — a human might be able to access what the Seeder couldn't — but they don't belong in the main content tables.

### 2. Aggregated Second-Party Content Has No Source URL

Context row 3 (the Georgia Tech ISYE 6501 canonical parameters) is aggregated from multiple search-engine snippets across several different sources. The schema's `source_url` column is a single VARCHAR and had to be left NULL because no single URL captures the aggregated content.

**Resolution for this iteration:** Left `source_url` NULL and moved the URLs of the contributing sources into the `provenance_note` text field.

**Design implication:** Consider whether an aggregated context row should have a separate `context_source` child table that can hold many URLs per context row. Alternative: stay with the current shape and accept that aggregated rows reference their sources via prose in `provenance_note`. The latter is simpler; the former would be better if querying "which blueprints reference this URL" becomes important.

### 3. Intended Activity Sequence Is Lost in the Activities Section

The walkthrough's "Activities" section describes a process flow: document verification → item placement → parallel scans → optional secondary → exit. The schema's `summary_section.content` is a single TEXT field, so this sequence is represented as a prose description. There's no structured graph of "activity A precedes activity B."

**Resolution for this iteration:** Prose only. The sequence is captured in the text but not queryable.

**Design implication:** A future `activity` table (distinct from summary sections) could model individual activities with structured predecessors. This is out of scope for the content backbone but worth noting. For now the prose representation is adequate.

### 4. Model Definitions With No Git Repo Yet

Both model definitions (SimPy teaching, SIMIO production) were *proposed* by the walkthrough but don't have actual git repos in SimVault's orbit. The `git_repo_url` column is nullable, so the rows work — but they represent "suggested but not yet realized" model definitions, which is slightly different from "live model definitions backed by a real repo."

**Resolution for this iteration:** Set `git_repo_url = NULL`. The rows serve as placeholders.

**Design implication:** Consider adding an `is_proposed` BOOLEAN or a `realization_status` ENUM (`proposed`, `draft`, `live`, `archived`) so the distinction between "suggested by the Seeder but no repo yet" and "actually backed by a repo" is queryable. For v1 iteration, this can be inferred from `git_repo_url IS NULL`, which is workable.

### 5. Domain Classification Beyond the Canonical Taxonomy

The walkthrough tagged the blueprint as "Transportation, Aviation, Service Operations." Transportation is a canonical top-level domain per `050_domain_taxonomy.md`. Aviation fits naturally as a child of Transportation. But "Service Operations" is not in the canonical top-level list — it's a cross-cutting concept that applies to airport security, drive-thru, ED flow, and many others.

**Resolution for this iteration:** Added Service Operations as a top-level domain with `parent_domain_id=NULL` and a note in its description indicating it is a cross-cutting classification. Flagged is_foundational_pattern=false.

**Design implication:** Worth deciding whether SimVault's taxonomy should have a separate kind of "tag" or "theme" alongside the hierarchical industry domains. For now, multi-value tagging via `blueprint_domain` works and treats "Service Operations" as a non-hierarchical domain row.

### 6. Content Format Classification of GitHub READMEs

GitHub serves READMEs as rendered HTML. The Seeder fetched the HTML and extracted text. The current content format catalog has `text_html_extracted` for this case, which is what I used. But GitHub READMEs are semantically more like `text_markdown` than plain HTML because the underlying source is markdown. The extracted version is HTML because that's what the fetch returned.

**Resolution for this iteration:** Used `text_html_extracted` because it describes what was physically captured.

**Design implication:** Minor — no change needed. The format catalog has room for both `text_markdown` and `text_html_extracted`, and the right choice depends on how the content was captured. Future work could add a preference to attempt markdown fetching from GitHub's API before falling back to HTML.

## Schema Changes Applied

The sample data exercise has so far surfaced four concrete schema changes that have been **applied** to the main schema files (`../020_columns.csv`) and propagated into the existing sample data:

1. **Added `search_snippet_aggregation` to the `context.source_acquisition_method` enum.** Used when the Seeder extracts content from search engine result snippets describing a source without successfully fetching the source itself (common for paywalled or bot-blocked URLs). Applied retroactively to `200/context.csv` row 3 (GT ISYE 6501 aggregation) and `201/context.csv` row 2 (IEEE ENT paper via snippets). *Source: gap 8 from the ENT walkthrough.*

2. **Added `complexity_indicator` column to the `scenario` table.** Same allowed values as `blueprint.complexity_indicator` (Beginner / Intermediate / Advanced / Not Classified). Lets a single blueprint hold scenarios of different difficulties. Applied to all 8 scenarios across the two walkthroughs: ENT Scenario 4 (Clinic-to-Surgery Coordination) is now properly tagged `Advanced`, while airport security scenarios have been tagged Beginner/Intermediate/Advanced based on their nature. *Source: gap 9 from the ENT walkthrough.*

3. **Added `confidence_note` column to the `summary_section` table.** Optional free-text meta-commentary about the reliability of a section's content, separated from the narrative itself. Applied to 3 of the 8 ENT summary sections (Activities, Generators, Assumptions) which had `NOTE:` disclaimers baked into the content. Those disclaimers have been extracted from `content` into `confidence_note`. *Source: gap 10 from the ENT walkthrough.*

4. **Added `realization_status` column to the `model_definition` table.** NOT-NULL ENUM with values `proposed`, `draft`, `live`, `archived`. Distinguishes a Seeder-proposed definition (no git repo exists yet) from a live runnable artifact, with intermediate states for drafts-in-progress and archived/deprecated variants. Applied to `200/model_definition.csv` — both rows (SimPy teaching, SIMIO production) are now explicitly `proposed`, matching their NULL `git_repo_url`. `201/model_definition.csv` is empty but its header was updated so any future rows conform to the new schema. *Source: gap 4 from the airport security walkthrough.*

5. **Added `modeling_feature` lookup table and `blueprint_modeling_feature` many-to-many join.** The lookup table enumerates structured modeling features (balking, reneging, priority queueing, time-varying arrivals, etc.) across six categories (customer_behavior, resource_behavior, arrival_pattern, routing, queue_discipline, system). The join table lets a blueprint be tagged with any number of features, with an optional `usage_note` explaining how the blueprint specifically uses each. Seed data lives in `../050_modeling_feature_seed.csv` with 26 features. Applied to all three processed walkthroughs: airport security gets 7 feature tags, ENT clinic gets 4, and drive-thru gets 7 (including `balking` and `physical_queue_capacity` which were the features that surfaced this gap in the first place). *Source: gap 14 from the drive-thru walkthrough.*

6. **Made `model_definition.target_tech_name` nullable.** When a variant is proposed before the target technology is committed, `target_tech_name` should be allowed to be NULL. Natural correlation: `realization_status='proposed'` may have NULL `target_tech_name`; any other status should have it populated (because code exists and the tech is known). Applied to `202/model_definition.csv` — rows 2 (Chick-fil-A case study) and 3 (Hybrid ordering) now have NULL `target_tech_name` instead of the placeholder string `"Not Specified"`. *Source: gap 15 from the drive-thru walkthrough.*

7. **Added `is_canonical` BOOLEAN column to `domain` table, plus `060_canonical_domain_seed.csv`.** The canonical list is seeded from `../../050_domain_taxonomy.md` and contains 11 entries (10 industry top-levels plus Foundational Patterns). Non-canonical domains are still allowed but are explicitly flagged, including sub-domain refinements (e.g., Aviation under Transportation) and cross-cutting themes (e.g., Service Operations, Queue Management) that don't match the canonical taxonomy. Applied retroactively to all three processed walkthroughs:
   - `200/domain.csv` — Transportation is canonical; Aviation and Service Operations are not
   - `201/domain.csv` — Healthcare is canonical; Outpatient Care and Specialty Clinics are not
   - `202/domain.csv` — Food & Beverage (renamed from the walkthrough's original "Food Service" to match the canonical name) and Retail are canonical; Queue Management and Service Operations are not
   *Source: gap 17 from the drive-thru walkthrough.*

8. **Added `paced_arrivals` to the `modeling_feature` seed.** New entry in `050_modeling_feature_seed.csv` under the `arrival_pattern` category with display_order 50. Captures the "deterministic takt time or near-fixed cadence" arrival pattern that characterizes manufacturing assembly lines — distinct from the existing `time_varying_arrivals`, `batch_arrivals`, `priority_arrivals`, and `appointment_based_arrivals` which all assume stochastic or scheduled-but-variable arrivals. Applied to `204/blueprint_modeling_feature.csv` — the appliance assembly line blueprint is now tagged with `paced_arrivals` as its characteristic arrival pattern. *Source: gap 24 from the appliance assembly line walkthrough.*

9. **Added central `proposal` table and `approval_status` column to all taxonomy tables.** The most structurally significant schema change in the exercise so far. Addresses the recurring question "should this feature/domain/vendor be added to the taxonomy?" that came up implicitly in every walkthrough mapping. The answer: the Seeder (or a human contributor) adds it with `approval_status='pending'` and creates a `proposal` row pointing to it; human editors review on their own timeline and either approve, reject, or merge. This directly supports SimVault's AI-native vision where the Seeder continuously proposes new taxonomy entries without polluting the curated seed lists.
   - **New table `proposal`** (workflow category) with columns: `proposal_id`, `target_table`, `target_row_id`, `proposal_type`, `proposed_at`, `proposed_by_agent`, `proposal_rationale`, `source_blueprint_ids`, `status`, `reviewer_user_id`, `reviewed_at`, `review_decision_note`, `merged_into_row_id`. Uses a **polymorphic reference** (target_table + target_row_id) rather than a typed FK to support all taxonomy tables uniformly.
   - **New column `approval_status` ENUM** on `modeling_feature`, `domain`, `content_format`. Allowed values: `seed`, `pending`, `approved`, `rejected`. `seed` = came from the initial curated seed file; other values mirror the proposal workflow.
   - **Seed files** (`040_content_format_seed.csv`, `050_modeling_feature_seed.csv`, `060_canonical_domain_seed.csv`) all now include `approval_status=seed` on every row.
   - **Walkthrough domain.csv files** all now include `approval_status`. Canonical domains (Transportation, Healthcare, Manufacturing, Food & Beverage, Retail) are tagged `seed` (they come from the canonical seed). Non-canonical domains (Aviation, Service Operations, Outpatient Care, Specialty Clinics, Queue Management, Diagnostic Laboratory, Digital Pathology, Home Appliances, Production Engineering, Assembly Line Balancing) are tagged `approved` per the decision to treat them as "proposed by the Seeder run that created them, and accepted when the sample data was applied."
   - **Each walkthrough folder now has an empty `proposal.csv`** with just the header. Future walkthroughs that propose new taxonomy during their run will populate it; currently all rows trace back to seeds or approved historical decisions.
   - **Decision captured:** blueprints can reference pending taxonomy (with a "pending review" badge in the UI). This preserves the information even before editorial approval. If a feature/domain is later rejected or renamed, the blueprint's reference gets updated.
   - **Orthogonal to `is_canonical`:** a domain can be `is_canonical=true AND approval_status=seed`, `is_canonical=false AND approval_status=approved`, or any other combination. They capture different things (canonical = part of the curated taxonomy; approval = has been vetted through the proposal process).
   *Source: user-raised gap 28 during the pathology scanner walkthrough discussion — the question of how the AI-native seeding process should handle taxonomy additions that need human review on a separate timeline.*

10. **Added `extracted_partial` to the `context.extraction_status` enum.** Captures the "fetched successfully but content is incomplete" friction pattern first observed in the warehouse order picking walkthrough (gap 33). Distinct from `extracted` (content is complete), `pending_extraction` (binary captured, extraction pending), `extraction_failed` (attempted and failed), and `not_applicable` (text-native format, no extraction needed). Used when a source returns real text content but the content is known to be truncated — typically because the publisher has a paywall that reveals partial content to unauthenticated fetches. Applied to `206/context.csv` row 4 (Towards Data Science article behind Medium paywall), which now reads `extraction_status='extracted_partial'` instead of `extracted`. Downstream services (narrative drafting, context Q&A, DES criteria check) should treat partial content as less authoritative than complete content — the AI layer can use this signal to decide how much weight to place on a source. *Source: gap 33 from the warehouse order picking walkthrough.*

11. **Added `des_product` lookup table and renamed `model_definition.target_tech_name` → `des_product_code` (FK).** The second substantial structural addition in the exercise (after schema change #9's `proposal` table). Replaces the free-text `target_tech_name` VARCHAR column with a foreign key reference to a curated `des_product` lookup table, enabling structured queries like "show me all blueprints that support Simio" and adding rich metadata per product (vendor, website, primary language, typical use cases).
   - **New table `des_product`** (taxonomy category) with 12 columns: `code`, `display_name`, `vendor_name`, `vendor_website`, `product_type` (ENUM: `commercial`, `open_source`, `freemium`, `academic`, `unknown`), `simulation_paradigms`, `primary_language`, `description`, `is_open_source`, `typical_use_cases`, `display_order`, `approval_status`. Follows the same taxonomy pattern as `modeling_feature` and `content_format`.
   - **New seed file `070_des_product_seed.csv`** with 14 DES products covering all references found in the sample data plus commonly-known tools: **Commercial** — Simio, AnyLogic, Arena, FlexSim, Simul8, ProModel, Witness, Visual Components, Plant Simulation. **Open Source** — SimPy, Salabim, Ciw, JaamSim. **Freemium** — Quodsi.
   - **Renamed `model_definition.target_tech_name` to `model_definition.des_product_code`** and changed it to an FK on `des_product.code`. Column type narrowed from `VARCHAR(128)` to `VARCHAR(64)` to match the seed table's `code` column.
   - **Updated all 7 walkthrough `model_definition.csv` files** to use the new column name and seed product codes:
     - `200/model_definition.csv` — SimPy → `simpy`, SIMIO → `simio`
     - `201/model_definition.csv` — empty, header updated
     - `202/model_definition.csv` — SimPy → `simpy`
     - `203/model_definition.csv` — empty values, header updated; prose references updated to lowercase codes
     - `204/model_definition.csv` — Visual Components → `visual_components`; prose references updated
     - `205/model_definition.csv` — SimPy → `simpy`; prose references updated
     - `206/model_definition.csv` — AnyLogic → `anylogic`; prose references updated
   - **Target tech version** (`model_definition.target_tech_version`) is preserved as a nullable VARCHAR for free-text version tracking like "SimPy 4.1" or "AnyLogic 8.9" — versioning is too variable to move into a lookup table.
   - **`proposal` table extended** — the target_table ENUM now includes `des_product` as a valid target, allowing the Seeder to propose new DES products through the same workflow it uses for modeling features and domains.
   - **Orthogonal to `realization_status`**: a proposed variant can have NULL `des_product_code` (tech not committed) and transition to a specific product when realized. The nullability rule from gap 15 still holds.
   *Source: user-raised gap 36 after the warehouse picking walkthrough — the need to structure DES product references so model definitions can be associated with tools like Simio, AnyLogic, Quodsi, ProModel in a queryable way, rather than as arbitrary free-text strings.*

12. **Added `product_capability` + `des_product_capability` M:N pattern for structured product features.** Generalizes the insight that several scalar columns on `des_product` (originally `simulation_paradigms` TEXT and `is_open_source` BOOLEAN) were actually multi-valued in disguise and better captured as tags against a canonical capability list — same pattern as `modeling_feature` + `blueprint_modeling_feature`. Enables product catalog queries like "show me all products that support agent-based modeling AND Python scripting AND 3D animation."
    - **New table `product_capability`** (taxonomy category) with 6 columns: `code`, `display_name`, `category`, `description`, `display_order`, `approval_status`.
    - **New join table `des_product_capability`** with composite PK (`des_product_code`, `capability_code`) and optional `usage_note` for product-specific implementation details.
    - **Removed `des_product.simulation_paradigms` TEXT column** — replaced by capability rows in the `simulation_paradigm` category.
    - **Removed `des_product.is_open_source` BOOLEAN column** — was redundant with `product_type='open_source'`.
    - **Kept `des_product.primary_language` VARCHAR** — single-valued "primary" language is meaningful for display; the full set of supported scripting languages is captured via the `scripting_language` capability category.
    - **New seed file `080_product_capability_seed.csv`** with 25 capabilities across 6 categories: **Simulation Paradigms** (6) — discrete_event, agent_based, system_dynamics, continuous_simulation, monte_carlo, hybrid_modeling. **Authoring Modalities** (4) — visual_drag_drop_modeling, code_based_modeling, diagram_based_modeling, domain_specific_language. **Scripting Languages** (5) — python_scripting, java_scripting, csharp_scripting, javascript_scripting, vba_scripting. **Visualization** (4) — animation_2d, animation_3d, static_charts, live_dashboards. **Analytical Features** (3) — built_in_optimization, design_of_experiments, output_analysis_tools. **Integration** (3) — database_connectivity, api_programmability, diagramming_tool_integration.
    - **New seed file `090_des_product_capability_seed.csv`** with ~100 M:N rows tagging all 14 seeded products with their capabilities. Each tag includes an optional `usage_note` explaining the product-specific detail (e.g., Simio's 3D animation: "Strong 3D animation is a Simio signature feature"; AnyLogic's Python scripting: "Available via the AnyLogic Python API in AnyLogic 8.8+"; Quodsi's diagram_based_modeling: "Users draw process diagrams in LucidChart, Miro, or diagrams.net and Quodsi interprets them as DES models").
    - **`proposal` table extended** — the target_table ENUM now includes `product_capability` as a valid target, so the Seeder can propose new capabilities through the same workflow.
    - **Not applied to sample_data/** — `product_capability` and `des_product_capability` are root-level taxonomy seeds, not per-walkthrough data. Per-walkthrough folders already reference products via `des_product_code`; the capability tagging lives at the root-level seed files and is shared across all walkthroughs.
    *Source: user-raised question during the des_product design discussion — "could product_type be replicated with the feature capability?" The direct answer was no for product_type (mutually exclusive, stays as ENUM), but the broader pattern applied cleanly to simulation_paradigms and related multi-valued attributes.*

These changes came directly from gaps 4, 8, 9, 10, 14, 15, and 17 surfaced by the walkthrough mappings below. Gap 16 (multi-source vs. single-source snippet aggregation) was explicitly skipped — the added complexity of a `context_source` child table was judged not worth the value at this stage.

## Deferred Gaps

Some surfaced gaps have been explicitly deferred rather than applied, either because they add complexity that doesn't yet earn its keep or because they require a bigger design decision than the content backbone can absorb right now. Each deferred gap is documented below the walkthrough that surfaced it, with the rationale for deferral noted here for quick reference.

| Gap | Surfaced By | Status | Reason for Deferral |
|-----|-------------|--------|---------------------|
| 1. Failed fetches have no home | Airport Security | **Deferred** | Requires designing the `human_followup_queue` table, which is a larger deferred feature |
| 2. Aggregated content has no source URL | Airport Security | **Deferred (design question)** | Could go multiple ways: `context_source` child table or prose-only reference |
| 3. Activity sequence lost in prose | Airport Security | **Deferred** | Would require a new `activity` table with structured predecessors |
| 11. Failed-fetch source identity lost | ENT Clinic | **Deferred** | Same as gap 1 — needs the `human_followup_queue` table |
| 16. Multi-source snippet aggregation | Drive-Thru | **Deferred (skipped)** | Added complexity of `context_source` child table not worth the value at this stage |
| 19. Vendor product references | Pathology Scanner | **Deferred** | Documented but deferred pending more signal. Would be a natural next change (analogous to gap 14 modeling_feature — lookup table plus M:N join with reference_role enum) but not pressing until cross-blueprint vendor queries become a real use case. |
| 20. Parameter values trapped in prose | Pathology Scanner | **Deferred** | Bigger design question — need to decide granularity (blueprint / section / variant / scenario) and metadata shape (units, confidence, citations) before implementing |
| 29. Modeling features at blueprint vs. variant level | M/M/1 | **Deferred** | Canonical M/M/1 has no features but its variants each add one. Current schema tags features at blueprint level, losing the variant-specific granularity. Workable with usage_note prose; a future `model_definition_modeling_feature` join table would formalize it. |
| 31. Related entries pointing to non-existent blueprints | M/M/1 | **Deferred** | Foundational patterns form a natural cluster (M/M/1 → M/M/c → M/G/1 → Jackson Network) but each blueprint only exists after its walkthrough. No mechanism for forward references. Options: placeholder blueprints, target_slug column on related_blueprint, or just wait until enough foundational patterns exist. |

When any of these gaps become a real blocker for a user need, they move from "Deferred" to "Applied" in the Schema Changes Applied section above.

## Schema Gaps Surfaced by the ENT Clinic Walkthrough

The ENT walkthrough stress-tested the schema under degraded conditions (thin sources, rejected false positives, second-party-dominated content). It surfaced several new gaps not seen in the airport security run.

### 7. Rejected False Positives Have No Home

The walkthrough considered and rejected **ENTIMOS**, a paper whose title starts with "ENT" but which is actually about Multiple Sclerosis infusion suites. The rejection was correct and valuable — but it is invisible in the schema. Nothing records "the Seeder considered ENTIMOS and rejected it as a false positive." Without such a record:

- A future Seeder run could re-evaluate and potentially mis-classify the same source
- There is no training signal to improve the semantic relevance check over time
- Humans cannot audit what the Seeder chose to exclude

**Resolution for this iteration:** The rejection is captured in prose inside the blueprint's `summary_of_content_provenance` field. No structured row exists for it.

**Design implication:** A deferred `rejected_candidate` table (or more broadly, a `seeder_decision_log` that records both accepts and rejects) is worth adding to the deferred table list. Fields would include: candidate URL, candidate title, rejection reason, rejecting Seeder run, timestamp, and whether the rejection should be revisited.

### 8. "Search Snippet Aggregation" Is Not a Proper Acquisition Method

Context row 2 is a rich example of a pattern the airport security walkthrough didn't exhibit cleanly: the Seeder gathered **real model content** (parameters, key findings, software used) **about a specific source** (the IEEE paper) **without ever successfully fetching that source**. The content came from multiple search engine result snippets describing the paper.

The current `source_acquisition_method` ENUM has four values: `paste`, `upload`, `url_fetch`, `voice_capture`. None fits:

- It is not `url_fetch` — the URL was never successfully retrieved
- It is not `paste` — no human pasted anything
- It is not `upload` — no file was uploaded
- It is not `voice_capture` — no audio was involved

**Resolution for this iteration:** Used `url_fetch` with `source_url` pointing to the IEEE page and `source_fetched_at=NULL` (no successful fetch). A long prose note in `provenance_note` explains that content was accumulated from snippets. This is a workable approximation but semantically imprecise.

**Design implication:** Propose a new `source_acquisition_method` enum value: **`search_snippet_aggregation`**. Fields like `source_url` would still hold the URL being described (even though it wasn't fetched), `source_fetched_at` would remain NULL, and the aggregated content would be treated as second-party by the provenance taxonomy. This is a small, clean addition that precisely captures a recurring real-world pattern.

### 9. Scenarios Have No Complexity / Advancedness Indicator

Scenario 4 in the ENT walkthrough is explicitly labeled **"(Advanced)"** because it requires a system-level model spanning two subsystems (clinic + surgery). Scenarios 1-3 are single-subsystem models. The walkthrough wanted to flag the difficulty gap between them.

The current schema has `complexity_indicator` on the `blueprint` table but **not on the `scenario` table**. I captured the advancedness by including "(Advanced)" in the scenario name and explaining in the `reference_note`, but this is not queryable.

**Resolution for this iteration:** Advancedness is baked into the scenario's name and `reference_note` text.

**Design implication:** Consider adding a `complexity_indicator` ENUM column to the `scenario` table (same allowed values as on `blueprint`: Beginner, Intermediate, Advanced, Not Classified). This would let readers filter "show me only beginner-friendly scenarios for this blueprint" and would let the platform surface warnings when a user is looking at an advanced scenario. Small addition, clear benefit.

### 10. Summary Sections With Explicit "Inferred / Not Captured" Disclaimers

Several of the ENT walkthrough's Summary sections include disclaimers like:

> "This activity list is inferred from adjacent specialty clinics and general ENT practice, not directly documented in fetched sources."

> "Specific distributions for ENT clinics are not captured in available raw context and would need to be supplied by a contributor with direct clinic data."

These disclaimers are meta-commentary about the reliability of each section. They matter — a reader should know when content is "inferred from adjacent" vs. "directly supported by fetched sources."

**Resolution for this iteration:** The disclaimers are baked into the content text itself (as `NOTE:` sentences). They're visible to readers but not queryable.

**Design implication:** Consider adding a `confidence_note` TEXT field to the `summary_section` table, distinct from `content`. This would separate the "what the model looks like" narrative from the "how confident we are in this description" meta-commentary. Minor convenience, better data hygiene.

### 11. Failed-Fetch Source Identity Is Lost

The walkthrough recorded two failed fetches (MDPI 403, AnyLogic 403) in addition to the rejected ENTIMOS. None of these are in the `context` table. But unlike ENTIMOS (which was rejected because it was the wrong topic), the failed fetches were **correct targets** that simply couldn't be retrieved. We know their URLs, titles, and even what they probably say (from search metadata), but there is no place in the schema to record that knowledge.

**Resolution for this iteration:** Captured in prose inside `blueprint.summary_of_content_provenance`. Human follow-up queue note exists in the walkthrough document but has no database representation.

**Design implication:** The deferred `human_followup_queue` table (mentioned in gap 1 from the airport security walkthrough) should explicitly support three failure modes:
- **Topic-relevant but fetch failed** (MDPI, AnyLogic) — correct target, inaccessible to automation
- **Topic-relevant but paywalled** (IEEE) — correct target, needs subscription access
- **Wrong topic but considered** (ENTIMOS) — belongs in the rejected_candidate log instead

These are distinct cases and each needs a home. The `human_followup_queue` should probably distinguish them.

### 12. Empty Tables Are a Legitimate State — Validated

A positive finding: `model_definition.csv`, `model_definition_scenario.csv`, and `related_blueprint.csv` are all empty for the ENT walkthrough (no implementations were found, no cross-blueprint relationships apply). This is a **legitimate schema state**, not a gap. It validates that the schema correctly treats these tables as zero-to-many children of `blueprint`, and that an entry can be valid even with nothing in them.

**No action needed.** Worth noting so future reviewers don't think it's a bug.

### 13. Domain Hierarchy Works Naturally

Unlike the airport security walkthrough which needed to introduce a cross-cutting "Service Operations" domain that didn't fit the taxonomy cleanly, the ENT walkthrough produced a clean **three-level hierarchy**: Healthcare → Outpatient Care → Specialty Clinics. The existing `parent_domain_id` self-reference on the `domain` table handles this naturally.

**No action needed.** Worth noting as validation that the hierarchical domain model works as intended.

## Schema Gaps Surfaced by the Drive-Thru Walkthrough

The drive-thru walkthrough stress-tested the schema under rich-source but friction-heavy conditions (three fetch attempts, only one successful, rich second-party content from multiple aggregations). It surfaced several new gaps.

### 14. Modeling Feature Tagging Has No Home (Balking, Reneging, etc.)

The drive-thru walkthrough repeatedly surfaces **balking** as a distinguishing modeling feature:
- Queues section: "additional arrivals may block the parking lot or drive away (balking)"
- Metrics section: "Balking rate (customers who leave without being served because the line is too long)"
- Assumptions section: "balking is either ignored or triggered only when the physical lane is full"

Similarly, other modeling features surface across walkthroughs as distinguishing characteristics: reneging (ENT patients don't renege; drive-thru customers do), priority queueing (airport security PreCheck), physical queue capacity constraints (drive-thru lane length), resource schedules, entity priorities, etc.

There is currently **no structured way to tag a blueprint with the modeling features it uses**. This information lives exclusively in prose inside `summary_section.content` and `blueprint.summary_of_content_provenance`, which means it cannot be queried ("show me all blueprints that model balking") or faceted (filter the catalog by modeling features).

**Resolution for this iteration:** The balking mention is baked into the Queues, Metrics, and Assumptions summary sections as prose. No structured record exists.

**Design implication:** Consider adding a **`modeling_feature`** lookup table (similar in shape to `content_format`) with a many-to-many `blueprint_modeling_feature` join. Sample modeling features: `balking`, `reneging`, `priority_queueing`, `resource_schedules`, `physical_queue_capacity`, `time_varying_arrivals`, `multi_class_entities`, `rework_loops`, `preemption`, etc. This is a lightweight addition that would let users filter blueprints by modeling feature and help the Seeder standardize feature tagging. The alternative — a free-text `modeling_features` TEXT column on blueprint — is simpler but not queryable. This is **the most significant concrete schema gap surfaced so far** and the user-raised concern from walkthrough 202's Lessons Learned section (gap 2: "Balking and Reneging as a Modeling Feature").

### 15. `model_definition.target_tech_name` Should Be Nullable for Proposed Variants

When the drive-thru walkthrough proposed three model definition variants, two of them (`case-study` and `hybrid-ordering`) had **no committed target technology**:
- The Chick-fil-A case study variant is based on an INFORMS teaching case that's paywalled — the walkthrough doesn't know what tech the original paper uses
- The hybrid ordering variant is based on literature using multiple tools (Witness, FlexSim, AnyLogic, SimPy) — no single tech is committed

The current schema declares `model_definition.target_tech_name` as `NOT NULL VARCHAR(128)`. Without a committed tech, the sample data had to use the placeholder string `"Not Specified"`, which is awkward and breaks the semantic clarity of the column.

**Resolution for this iteration:** Used `"Not Specified"` as a placeholder string for the two rows. The `variant_description` explains that the target tech is TBD.

**Design implication:** Make `model_definition.target_tech_name` **nullable**. There is a natural correlation: when `realization_status = 'proposed'`, `target_tech_name` may legitimately be NULL (no tech committed yet); when `realization_status IN ('draft', 'live', 'archived')`, `target_tech_name` should be NOT NULL (code exists, tech is known). This is a small concrete schema change that could be applied immediately, analogous to the four we already applied.

### 16. Multi-Source Snippet Aggregation vs. Single-Source Snippet Aggregation

The drive-thru walkthrough produced two different kinds of snippet-aggregated second-party content:

- **Single-source aggregation** (context row 2): Aggregated snippets describing **one specific source** (the INFORMS Chick-fil-A paper). `source_url` points to that specific paper.
- **Multi-source aggregation** (context row 3): Aggregated snippets from **multiple different sources** (Tandfonline + ResearchGate + search summaries). `source_url` is NULL because no single URL captures the aggregation.

Both use `source_acquisition_method = 'search_snippet_aggregation'`, which is the correct enum value for both, but the schema has no way to distinguish the two patterns structurally. The distinction matters because multi-source aggregations have provenance across multiple URLs that aren't individually captured.

**Resolution for this iteration:** Row 2 has `source_url` set to the INFORMS URL; row 3 has `source_url` NULL. The difference is visible by inspection but not by a structured field.

**Design implication:** This is a continuation of gap 2 from the airport security walkthrough (aggregated content has no source URL list). If SimVault adds a `context_source` child table, it should support both single-URL-per-context (for single-source aggregation) and many-URLs-per-context (for multi-source aggregation). For the current iteration, the NULL vs. populated `source_url` pattern is workable but slightly implicit.

### 17. Non-Canonical Domain Names

The drive-thru walkthrough tagged its blueprint with `"Food Service"` even though `050_domain_taxonomy.md` lists `"Food & Beverage"` as the canonical top-level domain. The walkthrough also introduced `"Queue Management"` and `"Service Operations"` as cross-cutting domains, neither of which are canonical top-level entries.

This is not a schema gap per se — the `domain` table is flexible enough to store any domain name, and each walkthrough folder is self-contained. But it raises a **governance question**: should there be a canonical taxonomy lookup that new domains must map against, or can contributors free-type domain names?

**Resolution for this iteration:** Used the walkthrough's literal tags (`"Food Service"` not `"Food & Beverage"`). Added a note in `domain.csv` row 1's description explaining the mismatch.

**Design implication:** Not a schema change. A future governance document or editorial guideline should address how canonical domains are maintained. The cross-folder inconsistency (airport security uses `Transportation`, drive-thru uses `Food Service` non-canonically) would manifest as messy taxonomy if the folders were merged into a unified dataset.

### 18. Scenarios Without Matching Model Definitions Is Valid

Scenario 4 (Dual-Lane Drive-Thru Evaluation) has **no matching model definition** in `model_definition_scenario.csv`. The walkthrough explicitly notes "Common scenario in chain-restaurant simulation literature but not directly captured in fetched sources." It's a scenario that exists independently of any current implementation — a what-if question the blueprint *should* answer, with no code or case study yet.

**Resolution for this iteration:** Scenario 4 exists in `scenario.csv` with a complete description, but there is no row in `model_definition_scenario.csv` tagging any existing model definition as supporting it. The absence is informative.

**Design implication:** This is actually **correct schema behavior**. A scenario can exist without any model definition supporting it yet — that's an open gap the community could fill. No action needed, but worth documenting as another legitimate schema state alongside "empty model_definition table" from the ENT walkthrough.

## Schema Gaps Surfaced by the Pathology Scanner Walkthrough

The pathology scanner walkthrough was the first vendor-anchored walkthrough — built around a specific commercial product (3DHISTECH P480) as the concrete reference for a general workflow blueprint. This anchoring pattern surfaced new gaps that the airport security, ENT, and drive-thru walkthroughs did not.

### 19. Vendor Product References Have No Structured Home

The pathology scanner blueprint is anchored around a specific vendor product — the **3DHISTECH Pannoramic 480** — as the representative high-throughput clinical scanner. Throughout the blueprint:

- The blueprint's `summary_of_content_provenance` names the P480 as the anchor product
- Context row 1 is the P480's vendor product page with concrete specs (480 slides, 40 sec/slide, 90 slides/hour)
- The Resources summary section references P480 (480 slides), Aperio GT 450 (450 slides), Agilent S540MD (540 slides)
- The Routing summary section references the P480's multi-layer capability
- Model Definitions reference the P480, Aperio GT 450, Agilent S540MD, NanoZoomer, Motic EasyScan Infinity, and Grundium Ocus as examples of the clinical and research variants
- Summary mentions the PMC review paper's canonical list of scanner families: NanoZoomer (Hamamatsu), Aperio (Leica Biosystems), IntelliSite (Philips), Pannoramic (3DHISTECH), Axioscan (Zeiss)

**None of these vendor product references are structured.** They live entirely in prose inside `summary_section.content`, `blueprint.summary_of_content_provenance`, and `context.content`. There is no way to query "show me all blueprints that reference the Aperio GT 450" or "list all scanner products referenced across pathology blueprints."

**Resolution for this iteration:** Vendor products are mentioned in prose only. The blueprint works; the references are visible to readers; but there is no queryable structure.

**Design implication:** Consider adding a **`vendor_product`** lookup table (similar in shape to `modeling_feature` and `content_format`) with columns:
- `code` (PK, VARCHAR) — e.g., `3dhistech-p480`, `leica-aperio-gt-450`, `agilent-s540md`
- `display_name` — e.g., "3DHISTECH Pannoramic 480 (P480)"
- `manufacturer` — e.g., "3DHISTECH (Epredia)"
- `product_family` — e.g., "Pannoramic series", "Aperio series"
- `product_category` — ENUM: `simulation_software`, `lab_equipment`, `manufacturing_equipment`, `medical_device`, etc.
- `official_url` — vendor product page
- `short_description` — one-sentence summary
- `key_specs_markdown` — brief markdown snippet with key parameter values

Plus a many-to-many join table **`blueprint_vendor_product`** to tag blueprints with the vendor products they reference (with `reference_role` ENUM: `anchor`, `example`, `alternative`, `cited`).

This would enable:
- Faceted browsing by vendor product ("show me all blueprints that reference a Hamamatsu scanner")
- Vendor-specific cross-references (find all blueprints where a specific product is the anchor)
- A future implementation layer where vendors could claim their product pages and contribute authoritative specs
- Cross-blueprint analysis of which vendor products span which domains

This is the **most significant new gap** from the pathology scanner walkthrough and is a natural next schema change to consider. It's analogous in shape to gap 14 (modeling_feature): a lookup table plus a many-to-many join, seeded with an initial catalog.

### 20. Parameter Values Are Trapped in Prose

Related to gap 19, the pathology scanner walkthrough highlighted another structural issue: **concrete parameter values live only in prose**. Examples from the blueprint:

- P480 scan rate: 40 seconds per slide at 20x magnification
- P480 throughput: up to 90 slides per hour
- P480 slide capacity: 480 per batch
- Aperio GT 450 slide capacity: 450 per batch
- Agilent S540MD slide capacity: 540 per batch
- AS-410M microtome throughput: 250 blocks per 7-hour shift
- Tissue processor batch size and cycle: hours per run (no specific number)

All of these are embedded in `summary_section.content` and `context.content` text fields. None are queryable or comparable across blueprints.

**Resolution for this iteration:** Parameters are in prose only.

**Design implication:** Structured parameters are a bigger design question than a single column or join table. Possible approaches:

1. **Parameters as summary_section attachments.** Add a new `parameter` table keyed to `summary_section_id` with name, value, unit, source_context_id, and confidence fields.
2. **Parameters as blueprint-level metadata.** A `blueprint_parameter` table keyed to blueprint_id with the same fields, independent of summary sections.
3. **Parameters per variant (model_definition).** Since variants may have different parameters, attach parameters to `model_definition_id` instead.
4. **Defer.** Keep parameters in prose for now and revisit when SimVault has enough blueprints that queryability becomes important.

This is **not a small targeted change** like the ones already applied. It requires deciding what level of granularity is right (blueprint / section / variant / scenario) and whether parameter values should carry units, confidence intervals, source citations, etc. Worth flagging as a known gap but **not recommended for immediate application**. The sample data exercise is highlighting the shape of the problem; the solution should wait until there's clearer evidence of which use cases it blocks.

### 21. Methodology Provenance "Background" Covers Vendor Marketing Cleanly

The 3DHISTECH P480 product page is classified as `First-party × Direct × Background` — the vendor page is topically direct (it's about the exact target scanner) but methodologically background (it's marketing content describing specifications, not using any analytical method). The existing provenance taxonomy handles this cleanly.

**Resolution for this iteration:** Used `methodology_provenance = 'Background'` for the vendor page. Worked exactly as designed.

**Design implication:** **No action needed.** This is validation that the three-axis provenance taxonomy introduced via the ENT walkthrough (gap 10) handles vendor marketing content correctly. Worth noting because vendor marketing is a distinct class of content that none of the earlier walkthroughs produced.

### 22. Adjacent Review Papers Validated Again

The PMC lab automation review (PMC11062949) is classified as `First-party × Adjacent × Background`. The ENT walkthrough had a similar pattern (orthopedic clinic paper as `First-party × Adjacent × DES`, where the orthopedic paper was a simulation paper but about a different specialty). The pathology walkthrough extends this: a review paper describing equipment broadly, topically adjacent to the scanner workflow focus but not itself a simulation.

**Resolution for this iteration:** Used `methodology_provenance = 'Background'` to reflect that the review paper is descriptive rather than analytical.

**Design implication:** **No action needed.** Another validation of the provenance taxonomy. The combination of provenance axes is flexible enough to distinguish "review paper about a related topic" (this walkthrough) from "simulation paper about a related topic" (ENT walkthrough's orthopedic paper) without schema changes.

### 23. PDF Text Extraction Failure Has No Schema Home

The Cambridge WSC 2024 PDF was fetched successfully (657.9 KB downloaded) but text extraction failed. This is a distinct failure mode from 403 or paywall — the source was reachable, the bytes arrived, but the content was inaccessible because of PDF structure.

**Resolution for this iteration:** The failed fetch is documented in prose inside `blueprint.summary_of_content_provenance` but has no row in the `context` table. Omitting it is consistent with the airport security walkthrough's handling of failed fetches (gap 1).

**Design implication:** Reinforces the need for the deferred `human_followup_queue` table (raised in gaps 1 and 11). Specifically, this table should support "PDF downloaded but text extraction failed" as a distinct failure reason so human reviewers can open the file in a browser and extract content manually. This is **not a new gap** but another validation that the deferred table should exist.

## Schema Gaps Surfaced by the Appliance Assembly Line Walkthrough

The appliance assembly line walkthrough was the first manufacturing walkthrough processed into sample data. It was rich-but-friction-heavy (two PDF extraction failures plus one 403) and surfaced a characteristic of manufacturing DES that none of the prior walkthroughs exhibited: **paced arrivals driven by takt time, not stochastic arrivals**.

### 24. Paced / Takt-Driven Arrivals Is Not in the Modeling Feature Seed

The appliance assembly line walkthrough's Generators section explicitly says:

> "Entity generation is typically driven by a takt time — a fixed or near-fixed arrival interval that represents the target production rate. Unlike service-industry models where arrivals are stochastic, appliance assembly is typically paced. Stochasticity enters through service time variability at each station rather than through arrivals."

This is a **distinctive and common modeling pattern for manufacturing** — the line runs at a target cadence, and variability comes from service times rather than arrivals. The current `modeling_feature` seed (`050_modeling_feature_seed.csv`) has four arrival-pattern features:
- `time_varying_arrivals`
- `batch_arrivals`
- `priority_arrivals`
- `appointment_based_arrivals`

**None of these captures paced/takt-driven arrivals.** The closest is `appointment_based_arrivals`, but that's conceptually about appointments with stochastic punctuality, not about a deterministic takt.

**Resolution for this iteration:** The takt-driven nature is captured in prose in the Generators section and in the `confidence_note`. The blueprint is tagged with other modeling features but has no feature code representing its characteristic arrival pattern.

**Design implication:** **Small, concrete, immediately actionable.** Add a new row to `050_modeling_feature_seed.csv`:
- **`code`:** `paced_arrivals`
- **`display_name`:** "Paced / Takt-Driven Arrivals"
- **`category`:** `arrival_pattern`
- **`description`:** "Arrivals are driven by a deterministic takt time or near-fixed cadence rather than a stochastic arrival process. Characteristic of manufacturing assembly lines where the line runs at a target production rate and variability enters through service times rather than arrivals."
- **`display_order`:** 50 (last in arrival_pattern category, after appointment_based_arrivals)

Then apply this feature to the appliance assembly line blueprint's `blueprint_modeling_feature.csv`. This is **analogous in shape to the four schema changes already applied earlier** — small, targeted, addresses a specific real case, and follows the existing lookup-table pattern rather than proposing new structures.

### 25. "On-Topic But Non-DES" Methodology Confirmed as Common

The PMC air conditioner paper (context row 1) is classified as `First-party × Direct × Adjacent Method` — it's directly on-topic by subject (home appliance assembly line balancing) but uses decision tree ML rather than DES. This is the **second** walkthrough to exhibit this pattern:
- The ENT clinic walkthrough's orthopedic paper was `First-party × Adjacent × DES` (different specialty, correct method)
- The appliance walkthrough's PMC paper is `First-party × Direct × Adjacent Method` (same specialty, different method)

These are genuinely distinct cases, and the three-axis provenance taxonomy (applied via gap 10 earlier) handles both cleanly. The `methodology_provenance = 'Adjacent Method'` value is doing real work — capturing "the subject matches but the analytical approach doesn't" in a way that `Direct` alone couldn't.

**Resolution for this iteration:** Existing schema handles this correctly.

**Design implication:** **No action needed.** Another validation of the methodology provenance axis. Worth noting that `Adjacent Method` has now been applied in real walkthroughs and works as intended.

### 26. Mixed-Model Sequencing Raises the Task-Precedence Gap Again

Scenario 3 (Mixed-Model Sequencing) and the Activities summary section both reference **task precedence constraints** — activities that must happen in a specific order, particularly across the two sides of a two-sided refrigerator assembly line. This echoes gap 3 from the airport security walkthrough ("Intended Activity Sequence Is Lost in the Activities Section") which is deferred.

The appliance walkthrough gives this gap more urgency: manufacturing assembly lines are characterized by dense precedence graphs, and a "tasks can run in parallel or must be sequenced" concept is structurally important for line balancing scenarios. A single TEXT field in `summary_section.content` can describe these precedence relationships in prose but cannot represent them queryably.

**Resolution for this iteration:** Task precedence lives in prose inside the Activities and Routing summary sections, with a `confidence_note` on the Activities section flagging the lack of structural representation.

**Design implication:** **Reinforces the deferred activity-sequence gap (gap 3).** When the `activity` table is eventually designed, it should include predecessor relationships. For now this stays in the deferred gaps table — the bigger design question of when to commit to a structured `activity` table hasn't changed.

### 27. Empty target_tech_name for Proposed Variants Is Now Routine

Three of the four model definition variants in this walkthrough have NULL `target_tech_name` — consistent with the nullability change applied in gap 15 from the drive-thru walkthrough. The one variant with a populated `target_tech_name` is the washing machine variant, which is explicitly tagged "Visual Components" because the Midea case study documented that tool choice.

**Resolution for this iteration:** No action needed. The gap 15 change is working as intended.

**Design implication:** **No action needed.** Second validation of the nullability change. Proposed variants without committed technology are now handled cleanly across four walkthroughs (202, 203, and 204 all exhibit this pattern; 200 does not because both airport security variants are technology-committed).

## Schema Gaps Surfaced by the M/M/1 Walkthrough

The M/M/1 walkthrough is the first **foundational / pedagogical** walkthrough in the sample data. Every prior walkthrough (200-204) was an applied operational model. M/M/1 is purely theoretical, used for teaching and simulation validation. This difference surfaced several new patterns and gaps.

### 28. ✅ Proposal Workflow End-to-End Validation

This is the **first walkthrough that actually exercises the `proposal` table and `approval_status='pending'`** workflow from schema change #9. Two non-canonical cross-cutting domains — **"Queueing Theory"** and **"Pedagogical Models"** — are tagged as pending proposals because:

1. Neither is in the canonical taxonomy seed
2. They are genuinely new cross-cutting themes that future foundational-pattern walkthroughs (M/M/c, M/G/1, Jackson Network, etc.) would reuse
3. Per the schema change #9 design, the Seeder proposes them as `pending` rather than silently adding them or silently omitting them

**Sample data populated:**
- `205/domain.csv` has 3 rows: Foundational Patterns (canonical, seed), Queueing Theory (pending), Pedagogical Models (pending)
- `205/proposal.csv` has 2 rows: one proposal per pending domain, each with `proposed_by_agent='seeder:205_walkthrough'`, a substantive rationale explaining why the domain is needed, and `status='pending'` awaiting editorial review
- The blueprint still tags itself with all three domains — pending taxonomy is referenceable per decision 1 of the schema change #9 design

**Resolution:** No schema gap — the existing `proposal` + `approval_status` mechanism handles this cleanly. This is **validation**, not a gap. Schema change #9 is working as designed on its first real exercise.

**Design implication:** **No action needed** — the proposal workflow delivered exactly what it was designed for. Worth calling out explicitly in the README so future readers can see a concrete example of the workflow in action.

### 29. Modeling Features at Blueprint vs. Variant Level

M/M/1 surfaces a subtle but real issue: **the canonical pure M/M/1 has NO modeling features**, but its variants each add exactly one:

- **Pure M/M/1** — no features (that's the point: simplest possible DES model)
- **M/M/1/K** — adds `physical_queue_capacity`
- **M/M/1 with reneging** — adds `reneging`
- **M/M/1 with balking** — adds `balking`

The current schema tags features at the **blueprint level** via `blueprint_modeling_feature`, not at the variant level. This means:
- If the blueprint is tagged with `balking`, the implication is "this blueprint uses balking" — but that's only true for one variant, not the canonical form
- If the blueprint is untagged, information about variant features is lost

**Resolution for this iteration:** Tagged the blueprint with `balking`, `reneging`, and `physical_queue_capacity`, with explicit `usage_note` on each row explaining that these features apply to specific variants, not the canonical form. This is a workable but imperfect representation.

**Design implication:** Consider a future **`model_definition_modeling_feature`** many-to-many join table that ties features to specific variants rather than (or in addition to) the blueprint. This would let queries distinguish "blueprints whose canonical form uses balking" from "blueprints whose variants include balking." Bigger design question worth deferring until a clearer use case emerges — for now, blueprint-level tagging with usage_note clarification is adequate.

**Recommendation:** **Defer** to a future iteration. Document as gap 29 in the Deferred Gaps table.

### 30. Pedagogical Flavor Validated in Scenarios

All four M/M/1 scenarios are tagged `flavor='pedagogical'` — the first use of this value. All prior walkthroughs (200-204) used exclusively `flavor='operational'`. Schema change #2 (adding `scenario.complexity_indicator` and `flavor` from ENT gap 9) specifically supported both flavors, and M/M/1 is the first live exercise of the pedagogical flavor.

**Resolution:** No gap — validation that `flavor` handles both values cleanly.

**Design implication:** **No action needed.** Worth noting that schema change #2's forethought paid off: the M/M/1 walkthrough would have been structurally awkward if the scenarios were forced into `operational` flavor when they are genuinely teaching tools.

### 31. Related Entries Pointing to Non-Existent Blueprints

M/M/1's Summary and walkthrough explicitly reference related blueprints that don't exist yet:
- **M/M/c Multi-Server Queue** — natural extension with c > 1 servers
- **M/G/1 General Service Time Queue** — relaxes exponential service
- **G/G/1 General Arrivals and Service** — relaxes both
- **Jackson Network** — network of M/M/c queues
- **M/M/∞ Infinite-Server Queue** — no queueing, delay-only

In the schema, `related_blueprint` is a self-referential FK that requires both endpoints to exist. Since these related blueprints haven't been walked through yet, there are no blueprint rows to point to. The `205/related_blueprint.csv` is empty.

**Resolution for this iteration:** Cross-references captured in prose inside `blueprint.summary_of_content_provenance` and the walkthrough document. No structured representation.

**Design implication:** This is an interesting variant of the "foundational pattern cluster" observation. Foundational patterns (M/M/1, M/M/c, M/G/1, Jackson Network) form a natural graph where each node references others, but none of the nodes exist until they're each walked through independently. A few options:

1. **Add placeholder blueprints** — create stub blueprint rows for M/M/c, M/G/1, etc. with `status='AI Discovered'` and minimal content, so `related_blueprint` can point to them. Each future walkthrough then fleshes out its own blueprint.
2. **Allow unresolved references** — add a `related_blueprint.target_slug TEXT` column that holds a slug of the target blueprint, which can be a future slug not yet instantiated. Resolution happens when the target blueprint is created.
3. **Defer** — wait until enough foundational patterns exist to form real cross-references.

I lean **defer** for now. The prose references are adequate until more foundational patterns are walked through. When M/M/c or M/G/1 gets processed, they can add forward and backward references to M/M/1 at that time.

**Recommendation:** **Defer** to a future iteration. Document as gap 31 in the Deferred Gaps table.

## Schema Gaps Surfaced by the Warehouse Order Picking Walkthrough

The warehouse order picking walkthrough closes the Logistics & Supply Chain canonical domain gap identified in the M/M/1 Mode 3 gap analysis. It exhibits the **"rich-but-friction-heavy" pattern** for the third time (alongside walkthroughs 203 and 204) and becomes the **second walkthrough to exercise the proposal workflow** from schema change #9.

### 32. ✅ Proposal Workflow Validated a Second Time

This is the second walkthrough that actually exercises the `proposal` table and `approval_status='pending'` workflow (after M/M/1 in walkthrough 205). The non-canonical domains **"Warehousing"** and **"E-Commerce"** are tagged as pending proposals:

- **Warehousing** — sub-domain of Logistics & Supply Chain, covering the operational scope inside a warehouse (receiving, putaway, storage, picking, packing, shipping). Future warehouse-focused blueprints would reuse this.
- **E-Commerce** — cross-cutting theme for online retail fulfillment operations with distinctive arrival patterns (same-day commitments, Black Friday/Prime Day surges). Future retail, delivery, and fulfillment blueprints would reuse this.

Both are captured in `206/proposal.csv` with `proposed_by_agent='seeder:206_walkthrough'`, substantive rationales, and `status='pending'`. The blueprint still tags itself with both pending domains per the "pending taxonomy is referenceable" decision from schema change #9.

This walkthrough also includes the already-approved **"Service Operations"** domain (from prior walkthroughs), demonstrating the mixed case where a blueprint references some approved and some pending taxonomy in the same row set.

**Resolution:** No schema gap — the proposal workflow continues to work as designed. This is validation across a second real use case.

**Design implication:** **No action needed.** Worth noting that the proposal workflow now has two validated use cases (205 M/M/1 and 206 warehouse picking), each proposing 2 new domains. The pattern is consistent and repeatable.

### 33. "Partial Fetch" Friction Mode Surfaces in Sample Data

The Towards Data Science article in context row 4 was **fetched successfully but the content was truncated** due to Medium's subscriber paywall. The automated fetch returned the high-level structure (topic, entities, resources, basic activities) but the specific parameter values, metrics, and code examples were behind the paywall and not captured.

This is a distinct friction mode from the ones already encountered:
- **403 Forbidden** — source fully blocked (commercial bot-block, MDPI)
- **PDF text extraction failure** — binary downloaded but text inaccessible (WSC, POMS)
- **Adjacent content** — accessible but wrong subject (orthopedic paper for ENT)
- **Partial fetch** — accessible but content truncated by publisher paywall (Medium, some news sites)

The current schema's `extraction_status` ENUM has values `extracted`, `pending_extraction`, `extraction_failed`, `not_applicable` — none of which quite captures "extracted partially, there is more behind a paywall."

**Resolution for this iteration:** Used `extraction_status='extracted'` with explicit prose in both the `content` field ("PARTIAL EXTRACTION — full parameter details and specific metrics were not accessible, likely due to Medium's subscriber paywall truncating the content visible to automated fetching") and the `provenance_note` field classifying this as a new friction pattern. Workable but semantically imprecise.

**Design implication:** Consider adding a new `extraction_status` ENUM value: **`extracted_partial`**, meaning "text extraction succeeded but the content is known to be incomplete due to publisher-side truncation." This would make partial extractions queryable (e.g., "show me all context rows where there's more content behind a paywall") and give readers a clear signal about content completeness.

**Recommendation:** **Small, concrete, immediately actionable.** This is directly analogous to schema change #1 (adding `search_snippet_aggregation` to the acquisition method enum) — a one-line addition to an existing ENUM that precisely captures a real friction pattern seen in sample data. Worth applying.

### 34. Wikipedia as the Decisive Fallback — Validated Three Times

Walkthroughs 205 (M/M/1) and 206 (warehouse picking) both relied on Wikipedia as a decisive fallback when other sources failed. M/M/1 used Wikipedia as the primary reference (because analytical queueing theory naturally lives there). Warehouse picking used Wikipedia as the backup when MDPI, AnyLogic, and Nature all failed — and Wikipedia's six-strategy taxonomy directly structured the variant section.

The skill's `simvault-seeder` Priority Table already lists Wikipedia as a **top-tier universal fallback** (updated after walkthrough 206 in the spec). This is validation of that choice.

**Resolution:** No schema gap — validation of an existing skill update.

**Design implication:** **No action needed.** Worth noting that Wikipedia's taxonomies are often the most structurally useful contribution to a blueprint — for both M/M/1 (Kendall notation) and warehouse picking (six-strategy taxonomy), Wikipedia provided the exact categorical framework the variant section needed. Future walkthroughs should continue prioritizing Wikipedia as a top-tier source for domains with established taxonomies.

### 35. Mixed Provenance Tagging — Blueprints Referencing Some Pending + Some Approved Domains

The warehouse picking blueprint references a mix of domain `approval_status` values in the same `blueprint_domain.csv`:
- **Logistics & Supply Chain** — seed (canonical)
- **Retail** — seed (canonical)
- **Warehousing** — pending (new proposal)
- **E-Commerce** — pending (new proposal)
- **Service Operations** — approved (already in sample data from prior walkthroughs)

This is the first walkthrough to exhibit all three `approval_status` values on the same blueprint. The schema handles it cleanly — `blueprint_domain.csv` doesn't care what approval state each domain is in — but it's the first validation that the "pending taxonomy is referenceable" decision from schema change #9 works alongside the existing canonical and approved states.

**Resolution:** No schema gap — validation that the schema cleanly supports mixed provenance.

**Design implication:** **No action needed.** The UI layer will need to render these three states differently (canonical = normal, approved = normal with subtle indicator, pending = explicit "pending review" badge) but that's presentation, not schema.
