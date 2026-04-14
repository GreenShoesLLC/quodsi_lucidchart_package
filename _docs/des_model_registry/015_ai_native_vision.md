# AI-Native Vision

SimVault is designed from the ground up for an era where AI agents are first-class contributors, not afterthoughts. This shapes every aspect of the platform — how content is captured, how it flows through the system, how quality is maintained, and how value is delivered to users.

## The Core Shift

Traditional content platforms treat AI as an add-on feature: a chatbot on the side, a summary button, an autocomplete helper. SimVault treats AI as infrastructure — agents read, write, enrich, discover, evaluate, and translate content continuously, alongside human contributors.

This is a deliberate design stance, not a marketing claim. It has concrete implications:

- **AI agents can author content** that enters the catalog (with clear labeling and human review pathways)
- **The platform actively seeks context** rather than passively accepting submissions
- **Machine readability is a first-order concern** in how every piece of content is stored and exposed
- **Every content item is assumed to be something an AI will read, summarize, or transform** at some point

## The "Build It" Test

The core measure of content value in SimVault is:

> **Does this context help someone (human or AI) actually build this model in a real simulation tool?**

This is the test used to evaluate:
- Whether a piece of raw context is worth keeping
- Whether an entry is useful enough to promote from Stub to Draft
- Whether a model definition is complete
- Whether an AI service is delivering value

Content that fails the "build it" test is either abstract trivia or marketing fluff. Content that passes it is the signal SimVault exists to capture and surface.

## Context Is the Asset

In an AI-native world, the most valuable thing a platform can accumulate is **rich, grounded context** about a topic. Model code, diagrams, prose descriptions, voice memos, papers, assumptions, design decisions, and conversations are all forms of context. They feed both human understanding and AI enrichment.

SimVault treats every model entry as a **context container** — anything that helps someone understand or build the model belongs there. The platform's job is to make that context as accessible as possible to whoever (human or agent) comes looking.

## Agents Are First-Class Citizens

In SimVault, AI agents:
- **Discover** new model candidates across the web (see [045_ai_agent_seeder.md](045_ai_agent_seeder.md))
- **Draft** summary narratives from raw context (see [047_ai_services_catalog.md](047_ai_services_catalog.md))
- **Answer** questions about models grounded in their raw context
- **Evaluate** content against DES criteria (see [018_des_criteria.md](018_des_criteria.md))
- **Translate** summaries into tech-specific model definitions (see [028_model_definitions_and_translators.md](028_model_definitions_and_translators.md))
- **Suggest** missing information and enrichment opportunities

Humans remain the authoritative curators and the final arbiters of quality. But agents do not wait for a human to ask — they operate continuously as part of the platform's normal behavior.

## What This Means for the Product

Several concrete decisions flow from the AI-native stance:

1. **Raw first, polished optional** — an entry that is just a voice transcript or a pasted paper is a legitimate contribution, not a malformed stub
2. **AI Discovered status tier** — agent-found candidates have their own visible tier below human-curated content
3. **Three-tier content model** — Raw Context, Summary, and Model Definition are distinct layers that agents operate on
4. **Translators as configuration, not code** — onboarding a new target simulation tech means teaching an agent about it, not writing a parser
5. **Machine-readable everything** — raw context and structured content are exposed via APIs suitable for agent consumption
6. **DES criteria as a shared rubric** — both humans and agents use the same qualification test so their judgments align

## Why This Stance Matters

Most simulation tools and content platforms were designed before modern AI was viable. SimVault has the rare advantage of being designed after. Every architectural decision can assume agents as participants, which means the platform can:

- **Scale content faster** — agents work continuously without waiting for human contributors
- **Lower the contribution barrier further** — a human describing a model in spoken prose is enough; agents handle structure and translation
- **Deliver higher-quality context Q&A** — readers can explore a model by asking questions, not just by reading static pages
- **Adapt to new simulation tools quickly** — new translators are prompts, not codebases
- **Treat every piece of content as reusable** — raw context fed once can be reused by many downstream agent services

This is the lens through which every other document in the SimVault spec should be read.
