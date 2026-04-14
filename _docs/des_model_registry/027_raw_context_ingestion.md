# Raw Context Ingestion

Raw Context is Tier 1 of the [three-tier content model](022_three_tier_content_model.md). It is the unstructured, abundant layer of content that makes every other SimVault capability possible.

## What Counts as Raw Context

Raw context is **anything that could help a human or AI agent understand or build this model**, regardless of form or polish. The test is the [build-it test](015_ai_native_vision.md#the-build-it-test) — does this content help someone actually build this model in a real simulation tool?

If the answer is yes, or even plausibly yes, it belongs in raw context.

## Supported Forms (v1)

SimVault v1 focuses on **text in all its forms**. Voice and other multimodal inputs are explicitly deferred.

### Text Inputs
- **Pasted prose** — typed or pasted directly into an entry's context area
- **Markdown** — structured notes with headings, lists, and code blocks
- **Uploaded text files** — `.txt`, `.md` files
- **URLs to fetch** — paper abstracts, blog posts, documentation pages; SimVault fetches and extracts text content

### Voice Input (Deferred)
Voice transcription is a low priority for v1. Users who want to contribute via voice can use external transcription services (many are free or cheap) and paste the resulting text into SimVault. If usage signals suggest voice is a meaningful barrier, integrated voice transcription can be added later.

### Documents, Images, Video (Future)
PDFs, slide decks, Word docs, images, diagrams, and video content are out of scope for v1 but plausible future extensions. When added, they will follow the same principle: the goal is to extract context that helps build the model, not to display rich media for its own sake.

## How Raw Context Is Stored

Each item of raw context is a **context record** with:

- **Content** — the text itself
- **Source type** — pasted, uploaded, fetched URL, AI-discovered, etc.
- **Provenance** — who added it, when, (for URLs) where it came from, and the provenance classification (see below)
- **Optional labels** — e.g., "assumptions," "arrival pattern," "from WSC 2019 paper"

Multiple context records coexist in an entry. There is no merging or deduplication — raw context is additive. A single entry can accumulate dozens of context records over time, each contributing a piece of the picture.

## Content Provenance Taxonomy

Not all raw context is equally trustworthy. Three orthogonal dimensions describe how a context record came to exist, how closely related it is to the entry's subject, and what analytical method (if any) the source itself uses. Every context record is labeled on all three axes so readers know what they are looking at.

### Axis 1 — Access Provenance (How the Content Was Obtained)

**First-party** — The Seeder or a human contributor fetched the source directly and extracted the text from it. The content is an accurate representation of what the source actually says.

**Second-party** — The Seeder or contributor accumulated information *about* the source without fetching it directly. Examples: a summary taken from a search engine result page, a paragraph from a citation, an abstract copied from a paywalled paper's landing page. Second-party content is lower-trust because the intermediary may have abridged, paraphrased, or subtly misrepresented the original.

**Third-party** — The content is inferred from reviews, citations, or secondary reports about the source. Example: an analysis paper that references a model and describes it briefly. Third-party content is lowest-trust because the inference chain is longest.

### Axis 2 — Topical Provenance (How Related the Content Is to the Entry)

**Direct** — The content is about the exact model the entry describes. An ENT clinic paper attached to the ENT clinic entry is direct.

**Adjacent** — The content is about a closely related model whose structure is transferable. An orthopedic outpatient clinic paper attached to the ENT clinic entry is adjacent — the specialty differs, but the entities, resources, activity flow, and scenarios are structurally similar. Adjacent content is useful as a starting point when direct sources are unavailable.

**Background** — The content provides general context but is not a specific model — e.g., a review paper on healthcare DES, a textbook chapter on queueing theory, a government report on ED wait times. Useful for framing but not for model specifics.

### Axis 3 — Methodology Provenance (What Analytical Method the Source Uses)

**DES** — The source describes a discrete event simulation implementation. This is the gold standard for SimVault, since the platform is about DES specifically. DES-method sources can be directly referenced as implementation examples.

**Adjacent Method** — The source addresses the same subject but uses a different analytical method (machine learning, linear programming, analytical queueing theory, Markov chains, digital twin without simulation, decision tree analysis, lean/kaizen process improvement, etc.). These sources often contain valuable **structural and parameter data** about the same subject — station counts, service time distributions, workforce sizes, real-world metrics — which are usable as raw context for a DES entry. They should not be cited as DES implementation references.

**Background** — The source is descriptive, procedural, or operational content with no formal analytical method. Product specifications, operational guides, workflow overviews, and vendor marketing pages fall here. Useful for grounding an entry in real-world terminology and parameter anchors but not for method guidance.

### Example: The "Right Subject, Wrong Method" Case

A paper titled "Production Line Balance Problem Identification and Improvement Based on Decision Tree: A Case Study of Commercial Air Conditioner Production Line" (PMC10949552) is:

- **Access:** First-party (directly fetchable from PMC)
- **Topical:** Direct (about commercial air conditioner assembly line balancing — exactly the entry's subject)
- **Methodology:** Adjacent Method (uses decision tree C4.5 machine learning, not DES)

This labeling makes it clear that the paper's structural and parameter data (29 stations, 41 workers, 112.5 sec cycle time, 33–152 sec service range, 68%-to-85% balance rate improvement) is directly usable as raw context for an assembly line balancing DES entry, but the paper itself cannot be cited as a DES implementation reference. A reader or AI service consuming this context knows exactly how to weight it.

### Display and Trust Signals

When readers view an entry's raw context, each context record shows its provenance on all three axes, typically as badges:

> *"First-party · Direct · DES · Source: pmc.ncbi.nlm.nih.gov/..."*
> *"Second-party · Direct · DES · Via search snippets · Source: ieeexplore.ieee.org/..."*
> *"First-party · Adjacent · DES · Source: pmc.ncbi.nlm.nih.gov/... (orthopedic clinic, structurally similar)"*
> *"First-party · Direct · Adjacent Method · Source: pmc.ncbi.nlm.nih.gov/... (decision tree ML, not DES)"*
> *"First-party · Direct · Background · Source: 3dhistech.com/... (vendor product page)"*

AI services that read the context (narrative drafting, context Q&A, DES criteria check) use these labels to weight the content appropriately. First-party direct DES-method content carries the most weight; third-party background content the least. Adjacent-method content is valuable for its data but should not be cited as a DES implementation.

### Why This Matters

Without provenance labeling, every piece of raw context looks the same to a reader — and an AI drafting service will mix trustworthy and unreliable content indiscriminately. With labeling, both humans and agents can reason about uncertainty explicitly: a summary drafted primarily from adjacent content should be clearly less confident than one drafted from direct first-party papers. Readers who want to verify a fact can trace it back through the provenance chain.

## How Raw Context Is Used

Raw context is the fuel for nearly every other SimVault capability:

- **Summary drafting** — AI agents read the raw context and propose content for the eight summary sections (see [047_ai_services_catalog.md](047_ai_services_catalog.md))
- **Context Q&A** — readers can ask questions about a model and get answers grounded in its raw context
- **Model definition translators** — translators use raw context plus the summary to produce tech-specific model definitions
- **Enrichment suggestions** — AI agents identify gaps in the raw context and prompt humans to fill them
- **DES criteria check** — the criteria check service evaluates raw context to confirm the entry still qualifies as DES

Because the raw context is additive and persistent, every one of these services can be re-run when new context is added, keeping derived content fresh.

## Raw Context Is Public

Raw context is **visible to readers**, not hidden internal data. Anyone browsing an entry can see everything that has been contributed, even if there is no polished summary yet. This has several benefits:

- An entry is useful even at the raw-only stage
- Contributors see exactly what their context looks like to readers
- AI-generated content can be audited against the source material
- The platform stays transparent about what it knows and how it knows it

## Contribution Barrier

Because raw context accepts any text in any form, the barrier to contribution is extremely low. A contributor can:

- Paste a paragraph describing a model they built
- Drop a URL to a paper they read
- Paste a transcript from a recorded conversation
- Upload a text file with notes from a project

Any of these creates a valid entry. The platform and the community then work over time to draw out a summary and, eventually, model definitions.

## The Promise to Contributors

When a contributor adds raw context, they should feel confident that:

- Their contribution is **preserved** — raw context is never discarded even when polished content is produced from it
- Their contribution is **attributed** — provenance is tracked and visible
- Their contribution is **useful** — AI services will read it, readers will see it, and it will help fuel downstream enrichment
- Their contribution is **editable** — they (and other contributors) can refine or replace context records as understanding improves
