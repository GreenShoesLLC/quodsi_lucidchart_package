# AI Agent Seeder

The AI Agent Seeder is an autonomous service that continuously discovers new DES model candidates across the web and adds them to SimVault. It directly addresses the cold-start problem — the single biggest risk identified in the [competitive landscape analysis](090_competitive_landscape.md).

## Purpose

The Seeder's purpose is to ensure SimVault is never waiting for humans to contribute content. While human curation remains the gold standard, the Seeder operates continuously to:

- Surface new model candidates as they appear in the wild
- Evaluate candidates against the [DES criteria rubric](018_des_criteria.md)
- Capture raw context from qualifying sources
- Propose new entries at the **AI Discovered** tier for human review and promotion

This makes SimVault a platform that grows passively as well as actively.

## Publication Model — Hybrid

The Seeder publishes discoveries using a **hybrid model**:

- Seeder discoveries appear in a clearly separated **"AI Discovered"** area of the site
- This area is visible to users who want to explore the frontier
- The main human-curated catalog is separate and has different quality expectations
- Users can browse both, but the distinction is always clear

Seeder discoveries do **not** enter the main catalog directly. Promotion from AI Discovered to the human-curated Stub tier (and beyond) requires a human editor to review and accept the candidate.

See [040_contributor_editorial_workflow.md](040_contributor_editorial_workflow.md) for how AI Discovered fits into the overall status progression.

## Sources — Start Narrow, Expand to Full Vision

### v1: Start Narrow
The initial Seeder scans a focused set of high-signal sources to prove the concept works before expanding:

- **arXiv** — simulation-related preprints, especially in cs.PF, math.OC, and stat.AP
- **GitHub** — searches for "discrete event simulation," SimPy models, JaamSim projects, tagged DES repositories

These sources are chosen because they have stable APIs, clear signals, and high density of relevant content.

### Vision: Full-Spectrum Sourcing with Trust Weighting
The long-term vision is for the Seeder to monitor **all five source categories**, with each source assigned a **trust weighting** that influences how the Seeder treats its discoveries:

| Source Category | Examples | Trust Weight | Use |
|-----------------|----------|--------------|-----|
| Academic sources | WSC proceedings, open-access journals, arXiv, Google Scholar | **High** | Seed full entries with summary drafts |
| Code repositories | GitHub, GitLab, Zenodo-linked repos | **Medium-High** | Seed entries and propose model definitions |
| Web content | Blog posts, tutorials, YouTube transcripts, vendor case studies | **Medium** | Seed entries as context-only; require review |
| Community signals | Reddit, Stack Overflow, LinkedIn, forums | **Low** | Context only; signal for human attention |
| Conference talks | Slides, recordings, abstracts | **Medium** | Seed entries when full text is accessible |

Trust weighting determines how aggressively the Seeder creates entries, how much effort goes into summarization, and how visible the discovery is before human review.

### Fetchability as an Orthogonal Dimension

Trust weighting by category is not enough. **Practical fetchability** is an orthogonal dimension the Seeder must consider — a high-quality source behind a paywall or anti-scraping protection is useless to automated ingestion.

Each source URL should be evaluated along two axes:

- **Content quality** — what category is this? (academic, code, web, community, conference)
- **Fetchability** — can the Seeder actually retrieve usable text from this URL?

Sources that are high-quality but unfetchable should be **logged for potential human follow-up** rather than silently discarded. A human reviewer may be able to access what the Seeder cannot (e.g., via a library subscription or by downloading a PDF manually).

### Paywalled Content Blind Spot

Some of the best DES content lives behind paywalls (Elsevier, Springer, IEEE, Taylor & Francis). The Seeder has no path to this content in v1. Mitigation options to consider:

- Partner with a library or academic institution for structured access
- Rely on preprint mirrors (arXiv, institutional repositories) where authors self-archive
- Flag unreachable high-value sources for human follow-up and manual ingestion
- Accept the blind spot as a known limitation in v1 and focus on open-access sources

This is documented here so the Seeder's coverage limitations are explicit and intentional rather than accidental.

## Operational Concerns

The Seeder is a long-running, unreliable-world operation. Several concerns affect its practical design:

### Fetch Reliability and Failure Tolerance

Individual fetches fail for many reasons: 403 responses, rate limits, transient network errors, unexpected redirects, JavaScript-heavy pages that don't render in a simple fetch, HTML structure changes. The Seeder must:

- Treat every fetch as potentially failing
- Log failures with enough detail to debug later
- Continue the session when a single source fails — never let one failure halt discovery
- Flag persistent failures (e.g., a source that always 403s) for human review

### Binary Content That Downloads But Won't Parse

A particularly frustrating failure mode is when a source is **reachable and downloadable** but its content cannot be extracted by the Seeder. The canonical example is a PDF with no OCR layer: the document downloads as binary, the fetch reports success, but the text extractor finds only embedded fonts, form objects, and compressed object streams with no readable text.

This is distinct from the 403 or paywall pattern because the fetch itself worked. It is also high-frustration because the source is almost certainly a valuable one — the Seeder located it, the redirect handling worked, the bytes arrived — only the final extraction step failed.

The Seeder's response:

- **Log the attempt as "fetched but unextractable"** with the content size and a brief note about why extraction failed (image-based PDF, graphical document, unusual encoding)
- **Flag as high-priority for human follow-up** — a human opening the document in a browser or PDF reader can almost always read what the automated extractor cannot
- **In future Seeder versions, try OCR as a fallback strategy** before giving up — image-based PDFs can be converted with reasonable accuracy

This pattern was first observed on a Winter Simulation Conference proceedings PDF hosted on a Cambridge repository. The file downloaded successfully but its text layer was inaccessible.

### Vendor Product Pages as a Source Type

Vendor product pages (e.g., 3DHISTECH's Pannoramic 480 page, Aperio's GT 450 page, Agilent's S540MD page) are a **distinct source type** that deserves explicit handling:

- **Fetchability is typically high** — commercial sites want traffic and usually don't bot-block their product pages
- **Content is concrete and authoritative** — product specifications give real parameter values (scan rate, capacity, cycle times) that anchor a model in physical reality
- **Quality is moderate** — vendor marketing bias is present; claims about throughput and efficiency are best-case figures, not field-tested realities
- **Topical provenance is First-party × Direct** — when the entry is about that specific product — or First-party × Adjacent when the entry is about a general workflow and the product serves as a representative example

The Seeder should preferentially include vendor product pages when an entry is about a technology domain with well-known commercial products, and use them to ground scenarios in real numerical parameters. Readers should understand that vendor specs are nominal and may need to be adjusted downward for realistic modeling.

### Source-Domain Memory

The Seeder should accumulate knowledge about which source domains consistently succeed, which require special handling, and which reliably fail. This memory feeds back into triage — a source flagged as "always 403" should be deprioritized or handled with a different fetcher. Without this memory, the Seeder wastes fetch budget repeatedly attempting unreachable sources.

### Code-Aware Parsing for Repositories

For GitHub and other code repositories, README fetching alone is insufficient. Model parameters, scenarios, and resource definitions often live inside:

- Jupyter notebooks (`.ipynb`)
- Python source files (`.py`)
- Configuration files (`.json`, `.yaml`, `.toml`)
- Data files (`.csv`, `.tsv`)

A meaningful Seeder capability is **selective code-aware parsing** — cloning a repo, identifying the relevant files, and extracting parameters and descriptions from them. This is more than an HTTP fetch but far less than running the code. It is a v2 enhancement worth planning for.

## What the Seeder Does with a Candidate

For each candidate source, the Seeder:

1. **Fetches and extracts text content** — paper text, README, blog body, video transcript (see **Multi-Strategy Fetching** below)
2. **Semantic relevance check** — confirms the content is actually about the topic it appears to be about (see below)
3. **Evaluates against DES criteria** — runs the qualification rubric; discards clear non-DES content
4. **Checks for duplicates** — matches against existing entries to avoid re-creating models already in the catalog
5. **Creates or enriches an entry:**
   - If no matching entry exists: creates a new entry at the AI Discovered tier with the source as raw context
   - If a matching entry exists: adds new raw context to it, with provenance tracking
6. **Labels provenance** — every context record from the Seeder is clearly marked with source URL, discovery date, agent version, and provenance type (see [027_raw_context_ingestion.md](027_raw_context_ingestion.md))
7. **Optionally drafts a summary** — for high-trust sources, runs the summary drafting service to propose summary content

## Semantic Relevance Check

Before attaching any source to an existing or new entry, the Seeder must confirm that the source is actually about the topic it appears to be about. **Keyword match is insufficient.**

The canonical example: a search for "ENT clinic" may surface a paper called "ENTIMOS," which has "ENT" at the start of its name but is actually about Multiple Sclerosis infusion suites. A naive keyword-matching Seeder would happily attach this paper to an ENT clinic entry, poisoning the catalog with unrelated content.

The relevance check:

1. Compute a semantic embedding of the candidate source's content
2. Compute a semantic embedding of the target entry (or proposed topic)
3. If similarity is below a threshold, reject the attachment
4. If similarity is borderline, flag for human review rather than auto-attach
5. Log the decision for Seeder governance and future tuning

This check runs in addition to the DES criteria check. The two answer different questions: DES criteria answers "is this DES?" and the relevance check answers "is this the right entry for it?"

## Handling On-Subject But Non-DES Methodology Sources

A third question beyond topical relevance and DES qualification is **methodology**. Some sources are clearly on-topic (they describe the same subject the entry is about) but use analytical methods other than discrete event simulation — decision tree machine learning, linear programming, analytical queueing theory, Markov chains, lean/kaizen analysis, or digital twin tools without the simulation component.

These sources should not be rejected. They typically contain valuable structural and parameter data about the subject — real station counts, cycle times, workforce sizes, process flows, measured metrics — which are directly usable as raw context for a DES entry about the same subject. The Seeder should:

1. **Accept the source** as raw context
2. **Label it clearly** with methodology provenance (see [027_raw_context_ingestion.md](027_raw_context_ingestion.md)) as "Adjacent Method"
3. **Not cite it as a DES implementation** in the entry's suggested model definitions or implementation links (unless it also has a separate DES implementation section)
4. **Use its parameter values** to anchor scenarios in real-world numbers

**Canonical example:** The PMC paper "Production Line Balance Problem Identification and Improvement Based on Decision Tree: A Case Study of Commercial Air Conditioner Production Line" (PMC10949552) is directly on-topic for an assembly line balancing entry. It uses decision tree machine learning rather than DES, but it provides 29-station production line data, 41-worker crew size, 112.5 sec cycle time, and a 68%-to-85% balance rate improvement. These numbers are usable as raw context. The paper cannot be cited as a DES model, but its data strengthens a DES entry significantly.

This handling preserves valuable operational data while maintaining SimVault's authority about what is and is not a DES model.

## Multi-Strategy Fetching

Direct HTTP fetching fails on many valuable sources — commercial sites with bot detection, JavaScript-heavy pages, paywalled content, and occasionally even nominally-open-access academic publishers. The Seeder must have a **ladder of fetch strategies**, trying progressively more capable (and more expensive) approaches before giving up:

1. **Direct fetch** — simple HTTP GET with realistic headers. Fastest, works for many sites.
2. **Alternate URL paths** — try the PDF URL directly, the DOI resolver, the abstract page, or a preprint mirror (arXiv, institutional repository).
3. **Headless browser rendering** — for JavaScript-heavy or aggressively bot-protected sites, render the page in a real browser and extract text from the rendered DOM.
4. **Human follow-up queue** — when all automated paths fail, log the source to a queue for manual review by a human editor.

The cost and latency of each strategy increases down the ladder, so the Seeder should only escalate when lower strategies fail. Persistent failures for a given source domain should be remembered (see **Source-Domain Memory** below) so the Seeder can skip directly to the working strategy on future attempts.

## Human Follow-Up Queue

When the Seeder cannot access a source through any automated strategy, the source is logged to a **human follow-up queue** attached to the relevant entry (or to a general queue if no entry exists yet). Each queue item records:

- **Source URL** — what the Seeder tried to access
- **Reason for failure** — 403, paywall, JavaScript rendering issue, relevance ambiguity, etc.
- **What the Seeder knows about it** — any second-party content gathered from search snippets, abstracts, or citations
- **Suggested human action** — "access via institutional subscription," "open in a browser to bypass bot detection," "check if preprint exists on arXiv," etc.
- **Priority hint** — based on source trust and relevance score

Human editors periodically work through the follow-up queue. Successfully fetched sources become first-party raw context. Sources that remain unreachable can be explicitly flagged as "known but inaccessible" on the entry, which is itself useful — readers can see what the Seeder tried and why it failed.

The follow-up queue turns fetch failures from silent losses into visible, actionable tasks.

## Deduplication

One of the Seeder's hardest problems is deciding whether a newly discovered source is describing a model that already exists in the catalog, or a genuinely new one. A v1 strategy:

- Compute a semantic fingerprint of each discovered source (topic, domain, key entities, structure)
- Compare against fingerprints of existing entries
- If similarity is high: attach as raw context to the existing entry
- If similarity is moderate: flag for human review as a possible merge candidate
- If similarity is low: create a new AI Discovered entry

Deduplication logic evolves as the catalog grows and patterns become clearer.

### Teaching-Assignment Clusters

A specific deduplication pattern deserves explicit handling: **teaching-assignment clusters**. Many DES-related GitHub repositories are independent student implementations of the same canonical course assignment (e.g., Georgia Tech ISYE 6501's airport security homework, or Coursera simulation course assignments). Naive deduplication would either create dozens of near-duplicate entries or miss the connection entirely.

The right handling:

- Detect clusters by matching characteristic parameter sets, problem statements, or code structure
- Merge the cluster into a **single entry** representing the canonical assignment
- Attach individual repo URLs as raw context (implementation references), not as separate entries
- Identify the "base assignment" as the authoritative source if it is publicly documented

This prevents catalog flooding from widely-used teaching problems while preserving the value of each implementation as a reference.

## Seeder Governance

The Seeder is not fire-and-forget. It needs governance:

- **Rate limits** — caps on how many new entries it creates per day to prevent catalog flooding
- **Source whitelists and blacklists** — editors can disable sources that produce too much noise or enable sources that have proven valuable
- **Human override** — any editor can pause or configure the Seeder
- **Audit log** — every Seeder action is logged and reviewable
- **Performance metrics** — percentage of Seeder discoveries that get promoted to Stub or higher is the primary success measure

## Why the Seeder Matters

Without the Seeder, SimVault relies entirely on human effort for growth — the same dynamic that has kept every prior DES model repository small. With the Seeder, the catalog can grow continuously, and human effort shifts from "find and describe models" to the higher-value work of **reviewing, refining, and curating**. This is what makes an AI-native platform structurally different from a traditional Wikipedia-style repository.
