# Model Definitions and Translators

Model Definitions are Tier 3 of the [three-tier content model](022_three_tier_content_model.md). They are concrete, executable (or near-executable) specifications of a model in a specific simulation technology's language. This is where SimVault closes the loop between "I understand this model" and "I can run this model."

## Architectural Inspiration: Hugging Face

**Hugging Face is the architectural inspiration for the Model Definition tier** — specifically its UX patterns, not its underlying hosting architecture.

Hugging Face is git-based under the hood — every model, dataset, and Space is literally a git repository. But users don't experience it as a git hosting service. They see rendered model cards, file browsers, commit history, discussions, and runnable demos. Contributors push via git CLI, edit in the browser, or propose community PRs. The platform wraps git with a domain-specific experience.

SimVault's Model Definition tier borrows this **feel** — polished model cards, file browsing, visible commit history, discussions, AI-enriched summaries — while making a different choice about **where the git actually lives**.

## Important Clarification: HF's Architecture vs. SimVault's Likely Architecture

It is worth being precise about how Hugging Face actually works, because the architectural decision for SimVault is a real fork in the road with significant implications.

### How Hugging Face Actually Works

Hugging Face is a **hybrid**: git repos for content plus conventional databases for everything else.

- **Git repos are the source of truth for file content** — model weights, README, configs, tokenizer files. Every model lives at `huggingface.co/<user>/<repo>.git` and can be cloned like any git repo. **HF hosts these repos themselves, on their own infrastructure. They are not on GitHub.**
- **A metadata/indexing layer** reads the repos and extracts structured data — YAML frontmatter from README.md becomes the model card's structured fields, file listings, tags, and so on. This layer stays in sync with the git state.
- **Conventional application databases** hold everything that isn't git content: user accounts, discussions, likes, follower relationships, download counts, inference API usage. These live in HF's own systems, not in git.

Crucially:

- **HF Discussions are internal to Hugging Face**, not surfacing GitHub discussions or issues. They live in HF's own database, are tied to HF-hosted repos, and use HF's markdown renderer and notification system.
- **HF Community PRs are internal too** — they propose changes to HF-hosted repos, not to any GitHub repo.
- **HF does have a GitHub org** (`github.com/huggingface`) for their open-source Python libraries like `transformers` and `datasets`. But those are the *tooling* that consumes HF content, not the content itself. The model repos are on HF's git, not GitHub.

### Three Architectural Options for SimVault

Given that SimVault will likely not build and operate its own git hosting in v1, the realistic options are:

#### Option 1 — HF-Style: SimVault Hosts Its Own Git
- SimVault runs git hosting (Gitea, Forgejo, or a SaaS equivalent)
- Model definitions are native SimVault content, exactly like HF models
- Discussions, PRs, and commit history are fully internal and integrated
- **Pro:** Cleanest UX, single source of truth, closest to the HF experience
- **Con:** Significant infrastructure commitment, higher ops burden, auth to build, a new git service for contributors to adopt

#### Option 2 — GitHub-Linked: SimVault Points to External Repos
- Model definitions live on GitHub; SimVault stores the link
- SimVault uses the GitHub API to fetch repo content and surface a rich integrated view — model card, file browser, commit history, stars, license
- SimVault's Discussions are **internal to SimVault**, not connected to GitHub Issues
- GitHub PRs remain on GitHub; SimVault may surface them as a read-only feed ("open proposals") but does not manage them
- Webhooks notify SimVault when a linked repo updates, triggering the AI to regenerate the model card summary
- **Pro:** Minimal infrastructure, contributors already have GitHub accounts, no git service to build
- **Con:** Two places for conversation (SimVault discussions plus GitHub issues), no unified PR flow, dependent on GitHub availability and API limits

#### Option 3 — Hybrid
- Simple single-file model definitions live in a lightweight SimVault-hosted git
- Complex multi-file projects link to external GitHub repos
- Contributors choose which path fits their work
- **Pro:** Flexibility for both simple and complex cases
- **Con:** Two modes to maintain, inconsistent UX across entries

### The Pragmatic v1 Choice

Given the cold-start constraints (small team, no dedicated infrastructure engineer, need to prove the concept quickly), **Option 2 (GitHub-linked) is the pragmatic v1 choice**. It reuses existing infrastructure and user habits and minimizes what SimVault has to build and operate.

The important honest framing: **Option 2 means SimVault is not a literal clone of HF's architecture.** SimVault is inspired by HF's UX patterns — model cards, file browsers, visible commit history, discussions — while relying on GitHub for the actual git hosting. The Discussions, AI enrichment, model cards, translators, and catalog experience are SimVault's own value layer built on top of GitHub-hosted content.

This is closer to how **Papers With Code** works than how HF works: it points to external repos and adds value through curation, metadata, and cross-referencing, rather than owning the repos outright.

### What SimVault Can Surface from a Linked GitHub Repo

Even without hosting git itself, SimVault can deliver a rich, integrated view of each linked repo by using the GitHub API:

- **Model card** — fetch `README.md`, parse YAML frontmatter, render as the SimVault model card
- **File browser** — list the repo's contents
- **Commit history** — show recent commits with authors and messages
- **Repo metadata** — stars, last commit, license, primary language
- **Optional Issues feed** — surface open GitHub Issues in a read-only sidebar for visibility
- **Webhooks** — GitHub pings SimVault on updates; AI regenerates the model card summary

### What GitHub-Linked Can't Do Easily

- **Integrated PRs** — contributors file PRs on GitHub, not in SimVault
- **Unified auth** — contributing to a linked repo requires a GitHub account
- **Guaranteed persistence** — if the GitHub repo is deleted, SimVault's cached view becomes stale or broken
- **Single conversation surface** — SimVault Discussions and GitHub Issues are two separate threads

### Future Migration Path

Nothing about Option 2 prevents moving to Option 1 or Option 3 later. If SimVault grows to the point where owning git hosting makes sense — for quality control, independence from GitHub, or unified UX — model definitions can be migrated from external GitHub links to SimVault-hosted repos. The public URL of a model definition can remain stable across that migration, since SimVault owns the canonical entry.

## Revisiting the Hugging Face Analogy

With this clarification in place, the accurate framing is:

> **SimVault's Model Definition tier adopts Hugging Face's UX patterns — model cards, rich repo views, community features, AI-enriched summaries — while (in v1) outsourcing the git hosting itself to GitHub.**

This is a deliberate choice to minimize infrastructure in v1. The HF-inspired experience is what contributors and readers will see. The GitHub dependency is an implementation detail that can evolve as the platform matures.

## What a Model Definition Is

A Model Definition is:

- **Tech-specific** — expressed in the native format of one simulation technology (Quodsi, AnyLogic, Simio, FlexSim, SimPy, JaamSim, etc.)
- **Git-backed** — stored in or linked to a git repository so contributors can collaborate, track history, and fork
- **Executable or near-executable** — the goal is that a practitioner can clone the repo and run the model in the target tech with minimal additional work
- **Derived or hand-authored** — may be produced by a translator from the summary, or contributed directly by a human who built the model

## Zero to Many per Entry

A single SimVault entry can have **zero, one, or many** model definitions:

- **Zero** — the entry has raw context and maybe a summary, but no concrete tech-specific implementation yet
- **One** — a contributor has built the model in one specific tech and linked the repo
- **Many** — the same model exists in multiple techs (e.g., Quodsi, AnyLogic, and SimPy versions), each as its own model definition

The number of model definitions grows as contributors or AI translators produce them. There is no requirement that every tech be represented.

## Variants: Production vs. Teaching, Simple vs. Complex

A single conceptual model often exists at multiple resolutions. An Emergency Department model might have a **teaching variant** (simplified, pedagogical, covers only basic patient flow) and a **production variant** (full workforce scheduling, multiple patient classes, realistic arrival patterns). An Airport Security Checkpoint model might have a **SimPy teaching variant** from a homework assignment and a **SIMIO production variant** from a consulting engagement.

**Variants of the same conceptual model are captured as distinct model definitions within a single entry, not as separate entries.**

This decision has several benefits:

- **Single canonical entry per conceptual model** — readers see one page for "Emergency Department Patient Flow," not three variants of it
- **Scenario-to-variant matching** — the entry's scenarios list indicates which variants support which scenarios, so a reader looking to answer a specific what-if can pick the right variant directly
- **Shared raw context** — all variants draw from the same accumulated evidence and narrative summary
- **Simple definition becomes a teaching entry point, complex definition becomes a practitioner tool** — both audiences are served by the same model card

If two variants diverge to the point that their summaries, entities, or core assumptions differ significantly, that is a signal they are different conceptual models and should become separate entries. The test: **can one summary describe both, or do they need different summaries?**

## Scenario Support

A single model definition can support multiple [scenarios](023_scenarios.md), and a single entry can have many scenarios served by a subset of its model definitions. **Model definitions can be tagged with the scenarios they support** so readers can quickly find the right definition for their what-if question.

Example: an ED entry has four scenarios and three model definitions.
- The Quodsi definition supports scenarios 1, 2, and 3
- The AnyLogic definition supports all four scenarios
- The SimPy definition is a simplified teaching version that only supports scenario 1

This scenario-to-definition linkage is part of the full-featured vision for scenarios (see [023_scenarios.md](023_scenarios.md)). In v1, scenarios are lightweight and this structured linkage is deferred.

## Relationship to Implementation Links

Model definitions are the **premium, structured form** of implementation links (see [060_vendor_ecosystem.md](060_vendor_ecosystem.md)):

- **Implementation Links** — external URLs to where a model is built in a specific tech. These remain valid for blog posts, videos, papers, and loose references that don't need collaboration infrastructure.
- **Model Definitions** — first-class, collaborative, git-backed artifacts within SimVault's orbit. Translator-compatible, model-card-rendered, discussable.

Both coexist. A casual reference gets an implementation link. A serious collaborative asset gets a model definition.

## Unified Model Definition View

Regardless of which hosting option is chosen, every model definition in SimVault presents a unified, AI-enriched view to readers:

- **Model card** — an AI-generated summary of the repo's purpose, target tech, current state, and key files
- **File browser** — navigable listing of the repo's contents
- **Commit history and contributors** — who changed what and when
- **Repo metadata** — stars, last commit, license
- **Runnable status** — where possible, an indicator of whether the model is ready to run as-is
- **Discussion** — comments and questions tied to the model definition (always internal to SimVault)

The AI-generated model card is refreshed when the underlying repo is updated. This aligns with the broader AI-native philosophy: every context source, including a repo, is something an agent reads, summarizes, and keeps fresh.

## Translators

A **translator** produces a model definition from the entry's summary and raw context. Translators are **not code** — they are AI prompt templates, schema definitions, and example mappings, one configuration per target tech.

### How a Translator Works

When a user requests "produce a Quodsi model definition for this entry":

1. The platform loads the entry's summary and raw context
2. The platform loads the **Quodsi translator configuration** — a prompt template, target-tech schema, example mappings, and style guidance
3. An AI agent is invoked with the configuration and the entry content
4. The agent produces a draft model definition in Quodsi's format
5. The draft is saved to a git repo (new or existing) as a proposed model definition
6. Humans can review, edit, refine, and merge before it becomes published

### Why Configuration, Not Code

Treating translators as configuration rather than code has significant implications:

- **New target techs are cheap to onboard** — write a prompt template and provide example mappings, don't build and maintain a parser
- **Community contribution is realistic** — a vendor or practitioner who knows a tech can contribute a translator configuration without being a SimVault engineer
- **Translators improve over time** — as underlying AI models improve, existing translator configurations produce better output without any changes
- **Translators can be updated incrementally** — add an example, refine the prompt, adjust the schema, ship immediately
- **Quality is measurable** — translators can be evaluated by running them across many entries and comparing outputs against ground truth

### The Translator Library

SimVault maintains a library of translator configurations, one per supported target tech. Each translator has:

- **Target tech identity** — name, version, official documentation link
- **Prompt template** — how to instruct the AI agent
- **Schema definition** — what a valid model definition in this tech looks like
- **Example mappings** — a handful of (summary → model definition) examples the agent can pattern-match against
- **Maintainer** — the person or organization responsible for keeping the translator current
- **Evaluation status** — how well the translator performs in practice

Quodsi will contribute a translator for its own tech. Other translators can come from vendors, academics, or the community.

## Bidirectional Potential (Future)

Translators in v1 operate in one direction: summary → model definition. A longer-term possibility is **reverse translation** — given an existing model definition in a known tech, produce a summary and populate raw context. This would enable bulk import of existing model libraries (e.g., "ingest all JaamSim examples") without human authoring. It's out of scope for v1 but a natural future extension.
