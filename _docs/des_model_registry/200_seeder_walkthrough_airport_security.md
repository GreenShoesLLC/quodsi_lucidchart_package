# Seeder Walkthrough: Airport Security Checkpoint

This document captures an end-to-end simulation of the AI Agent Seeder playing its role, using **Airport Security Checkpoint Passenger Flow** as the candidate model. The walkthrough is deliberately honest — it documents dead ends, ambiguous calls, and friction points alongside the successes. The goal is to pressure-test the SimVault spec against a realistic discovery session.

## Meta: How This Walkthrough Is Structured

Each phase of the Seeder workflow is presented as:

1. **What the Seeder did**
2. **What it produced**
3. **Friction or ambiguity encountered**
4. **Spec implications** — what this reveals about the design

The walkthrough ends with a **draft model entry** (what would actually be created in SimVault) and a **lessons learned** section.

---

## Phase 1 — Discovery Search

### What the Seeder Did
Executed a targeted web search: `airport security checkpoint discrete event simulation model`.

### What It Produced
Ten candidate sources, a mix of:
- Peer-reviewed academic papers (Sage, ScienceDirect, IEEE, PMC)
- Dissertations (Embry-Riddle Commons)
- ResearchGate listings
- Transportation research database listings (TRID)

### Friction
- Multiple sources were paywalled or authentication-gated
- Source URLs varied in reliability — some open-access, some not, and it wasn't always obvious in advance

### Spec Implication
The Seeder needs a **source trust rubric** that includes practical fetchability, not just content quality. A high-quality source behind a paywall is useless to the Seeder. The initial v1 source strategy should prioritize source types that are reliably fetchable (arXiv, PMC, GitHub, public blogs). This validates the "start narrow, expand" stance already documented in `045_ai_agent_seeder.md`.

---

## Phase 2 — Candidate Triage

### What the Seeder Did
Ranked the ten candidates by expected fetchability and quality before attempting any fetches.

### What It Produced
Triage decisions:

| Source | Priority | Reason |
|--------|----------|--------|
| PMC (pmc.ncbi.nlm.nih.gov/articles/PMC12043019/) | **High** | Open access guaranteed |
| Embry-Riddle thesis (commons.erau.edu) | **Medium** | Probably open, dissertations usually are |
| Sage, ScienceDirect, IEEE | Low | Paywalled, skip |
| ResearchGate | Low | Abstract only |
| TRID | Low | Just a listing |

### Friction
The Seeder has to guess about fetchability before spending the fetch budget. Wrong guesses waste time.

### Spec Implication
The Seeder should learn from past fetches — which domains succeed, which fail, which require special handling. This is a **Seeder memory** concern that isn't captured in the current spec. Worth adding as a future capability: the Seeder maintains a per-source-domain success/failure history and uses it to adjust its triage.

---

## Phase 3 — Fetching Source #1 (PMC Paper)

### What the Seeder Did
Fetched `https://pmc.ncbi.nlm.nih.gov/articles/PMC12043019/` with a prompt asking to extract abstract, model description, entities, resources, activities, arrival patterns, metrics, and scenarios.

### What It Produced
A rich, well-structured extract. The fetch returned:

**Model scope:** Single checkpoint at Phoenix Sky Harbor Airport, full day of operations.

**Entities:**
- Passengers (regular and PreCheck)
- Carry-on baggage
- Checked baggage

**Resources:**
- Travel Document Checkers (TDCs)
- Transportation Security Officers (TSOs)
- X-ray inspection machines
- Advanced Imaging Technology (AIT) body scanners
- Walk-through metal detectors (WTMDs)
- Conveyor belts
- Screening lanes

**Activities:** document verification → item placement on conveyor → X-ray inspection → AIT body scan → (optional) secondary inspection → exit.

**Arrival patterns:** Interarrival times discretized into 15-minute periods across a full day of operations.

**Metrics:**
- Average passenger cycle time
- Throughput (passengers processed)
- TDC utilization
- Queue lengths

**Scenarios tested in the paper:**
- Benchmark (industry standard proportional allocation)
- Best-case (fully staffed throughout the day)
- Simulation-optimization (dynamic allocation based on predicted flows)
- Reactive staffing (add staff when cycle time > 20 min)
- Proactive staffing (add staff when predicted cycle time > 10 min)

**Tech:** SIMIO + OptQuest optimizer.

### Friction
None — the fetch was clean and the content was well-structured.

### Spec Implication
**The structure of academic DES papers maps almost perfectly to SimVault's summary spec.** The paper's "Model" section produces Entities/Resources/Activities content, the "Results" section produces Metrics content, and the "Experiments" section produces Scenarios content. This is a strong signal that the summary tier's eight sections are well-aligned with how academic DES work is already written up.

---

## Phase 4 — Fetching Source #2 (Embry-Riddle Thesis)

### What the Seeder Did
Attempted to fetch `https://commons.erau.edu/cgi/viewcontent.cgi?article=1046&context=edt`.

### What It Produced
**403 Forbidden.** No content extracted.

### Friction
A source flagged as "probably open access" actually blocked automated fetching. The Seeder wasted a fetch attempt.

### Spec Implication
The Seeder needs **failure tolerance** — one failed fetch shouldn't stop the session, and failed attempts should be logged for potential human review. Also, `.edu` commons/repository URLs often have anti-scraping protection despite hosting open-access content. Worth building a heuristic: if an open-access repository blocks automated access, flag the URL for a human to review manually.

---

## Phase 5 — Pivoting to a Different Source Type (GitHub)

### What the Seeder Did
Shifted strategy: instead of more academic papers, searched for code repositories implementing the same model. Query: `github airport security checkpoint simulation simpy python`.

### What It Produced
Ten candidates, mostly SimPy-based Jupyter notebooks. A pattern quickly emerged: several of these are implementations of the **same Georgia Tech ISYE 6501 homework assignment**, which uses specific canonical parameters.

### Friction
**Detection of a teaching-assignment cluster.** Multiple repos are independent implementations of the same assignment. The Seeder needs to recognize this pattern and not create duplicate entries for what is essentially the same model at the same resolution.

### Spec Implication
Deduplication must handle **teaching-assignment fingerprints** — when many sources are all implementing the same canonical assignment, they should all contribute raw context to a single entry, not create ten parallel entries. The canonical assignment itself becomes the "base model," and the individual repos become implementation references.

---

## Phase 6 — Fetching GitHub Source

### What the Seeder Did
Fetched the README of `https://github.com/aschatz1995/Airport-Security-Wait-Sim`.

### What It Produced
A one-line project description and repo stats. The real content (model parameters, scenarios tested) lives inside a `.ipynb` notebook that WebFetch can't parse directly.

**Fallback:** The earlier search result snippet contained the canonical GT assignment parameters:
- Arrivals: Poisson, λ = 5 passengers/min
- ID check: exponential, μ = 0.75 min
- Personal scanner: Uniform(0.5, 1.0) min
- Several servers, shortest-queue routing for personal scanning

### Friction
**GitHub READMEs frequently underdescribe the actual model.** The meaningful content is in code files and notebooks the Seeder can't easily traverse without repo cloning. The fetch alone is insufficient — the Seeder has to fall back to search-snippet content, which is lossy.

### Spec Implication
The Seeder needs **code-aware fetching**. For GitHub sources, the minimal Seeder capability is to fetch README + parse one or two additional files (notebooks, Python files, configs) to extract parameters. This is more than a simple HTTP fetch but much less than running the code. Worth adding as a phase 2 Seeder capability.

---

## Phase 7 — Deduplication Call

### What the Seeder Did
Considered whether the PMC paper and the GT homework cluster should produce one entry or two.

### What It Decided
**One entry** — "Airport Security Checkpoint Passenger Flow" — with both sources contributing raw context. The PMC paper represents a **high-resolution production variant**; the GT homework represents a **simplified teaching variant**. They are the same conceptual model at different resolutions.

### Friction
The current spec doesn't explicitly address model variants. Should high-resolution and teaching versions be:
- (a) The same entry with multiple summary sections describing each variant?
- (b) Two separate entries, cross-linked?
- (c) One entry with variants captured as a summary subsection?
- (d) One entry with variants captured as separate model definitions, each with its own scenarios?

My instinct says (d) — **variants are best captured as distinct model definitions within a single entry**, each tagged with the scenarios it supports. The PMC paper's production variant supports workforce optimization scenarios; the GT homework's teaching variant supports only the simple capacity sizing scenario. Same conceptual model, different resolution, served by different definitions.

### Spec Implication
**The model-definition tier naturally absorbs variant-handling.** This is a win for the existing design — no new concept needed. However, it means the entry's top-level scenarios list should cover the **union** of scenarios across all variants, and each scenario's "supported by" list indicates which variants work.

---

## Phase 8 — DES Criteria Check

### What the Seeder Did
Ran the [DES qualification rubric](018_des_criteria.md) against the accumulated context.

### What It Produced
**All three required criteria pass:**
- ✅ **Discrete entities** — passengers, carry-on bags, checked bags
- ✅ **Discrete events** — arrival, check-in, screening, exit are discrete state changes
- ✅ **Time progression** — full-day simulation with explicit clock

**Both typical criteria also pass:**
- ✅ **Resource contention** — TDCs, TSOs, machines, lanes all have finite capacity
- ✅ **Stochasticity** — Poisson arrivals, exponential service times

**Qualification: STRONG YES.** This is a textbook DES model.

### Friction
None — the criteria check was straightforward.

### Spec Implication
The rubric works as intended for clear cases. The harder test would be a borderline candidate (an agent-based crowd flow model, or a pure optimization problem dressed up as a simulation). This walkthrough doesn't exercise those cases.

---

## Phase 9 — Drafting the Entry

### What the Seeder Did
Assembled a draft model entry at the **AI Discovered** tier, combining context from both sources.

### What It Produced

The draft entry is in the next section.

---

# Draft Entry: Airport Security Checkpoint Passenger Flow

**Status:** AI Discovered
**Domain tags:** Transportation, Aviation, Service Operations
**DES qualification:** All required + all typical criteria satisfied

## Scenarios

### Scenario 1 — Checkpoint Capacity Sizing
**What-if question:** How many ID check stations and screening lanes do we need to keep average passenger wait time under a target threshold (e.g., 10 or 20 minutes)?

**Decisions supported:** Capital spending on screening lanes; number of TDC stations to staff; equipment purchase decisions for WTMDs and AIT scanners.

**Model features required:** Discrete passenger entities; ID check and screening as separate activities; finite-capacity resources; per-activity queue metrics.

### Scenario 2 — Workforce Scheduling Strategy
**What-if question:** Given a daily passenger demand curve, how should TSOs and TDCs be scheduled across the day to minimize average cycle time while meeting a fixed labor budget?

**Decisions supported:** Shift allocation; break placement; cross-training tradeoffs.

**Model features required:** Time-varying arrival rates; resource schedules; multiple staffing policies; cycle-time metric.

### Scenario 3 — Reactive vs. Proactive Staffing
**What-if question:** Is it better to add staff when current cycle time exceeds a threshold (reactive) or to add staff based on predicted near-future demand (proactive)?

**Decisions supported:** Operational staffing policy; prediction model investment.

**Model features required:** Dynamic resource adjustment; measurement feedback; predictive input (or its proxy).

### Scenario 4 — PreCheck Lane Allocation
**What-if question:** How many lanes should be dedicated to TSA PreCheck passengers versus regular passengers, given known mix ratios?

**Decisions supported:** Lane signage and routing policy; staffing ratios.

**Model features required:** Passenger classes (regular vs. PreCheck); class-based routing; class-specific metrics.

## Raw Context

**Source 1 — Academic paper (open access):**
> Ruiz et al., "Simulation Study: Airport Security Screening Checkpoints," NCBI PMC. Extended an existing SIMIO-based DES model to represent a single checkpoint at Phoenix Sky Harbor Airport. Modifications included 15-minute interarrival discretization, full-day simulation, and TSO shift modeling. Compared benchmark proportional allocation, fully-staffed best-case, and simulation-optimization strategies. Found a 31.4% improvement in passenger cycle time with the optimization-driven approach. Uses SIMIO with OptQuest.
> Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC12043019/

**Source 2 — Teaching model cluster (GitHub + Georgia Tech ISYE 6501):**
> Canonical homework parameters widely implemented: Poisson arrivals with λ = 5 passengers/min to ID check queue; exponential ID check service with μ = 0.75 min; personal scanner with Uniform(0.5, 1.0) min service; shortest-queue routing for scanner assignment. Multiple SimPy-based implementations exist on GitHub (aschatz1995, pkusunbx, slimhindrance, olivierzach, adpoe). Typical use: find minimal count of ID check queues and scanners such that average wait time stays under a threshold.
> Sources: https://github.com/aschatz1995/Airport-Security-Wait-Sim, https://github.com/slimhindrance/SimPy_airport

## Summary (Draft — AI-Generated, Needs Human Review)

**Entities:** Passengers are the primary entities flowing through the system. They may be differentiated by class (regular vs. PreCheck) and by carry-on baggage characteristics. Carry-on bags may be modeled as sub-entities that must complete screening independently of their owner.

**Resources:** Travel Document Checkers (TDCs) verify boarding passes at the entry. Transportation Security Officers (TSOs) operate screening stations. Physical resources include X-ray machines, Advanced Imaging Technology (AIT) body scanners, Walk-Through Metal Detectors (WTMDs), conveyor belts, and screening lanes. Resources have schedules that vary by time of day.

**Activities:** Document verification at the TDC station; placement of carry-on items on the conveyor; parallel passenger body scan (AIT or WTMD) and carry-on X-ray; secondary screening if either scan flags an alert; checkpoint exit.

**Generators:** Passenger arrivals follow a time-varying pattern, typically modeled as a Poisson process with rate parameter that changes across the day (often discretized into 15-minute intervals). Simplified teaching versions use a constant-rate Poisson process.

**Queues:** Primary queue forms at the TDC station. Secondary queues form at each screening lane. In shortest-queue variants, passengers join the lane with the fewest waiting passengers. Secondary screening may have its own queue.

**Routing:** Regular vs. PreCheck passengers route to different lanes where applicable. Within a class, passengers may use shortest-queue routing or fixed-lane routing. After screening, a fraction of passengers are routed to secondary inspection based on scan results (modeled as a Bernoulli outcome).

**Key Metrics:**
- Average passenger cycle time (entry-to-exit)
- Throughput (passengers per hour)
- Queue length at TDC and screening lanes
- Resource utilization (TDCs, TSOs, machines)
- Percentage of passengers flagged for secondary screening

**Assumptions:** Passengers do not renege. Scan alarm rates are exogenously specified (not modeled from passenger attributes). Equipment breakdowns are typically not modeled. Shift handoffs are instantaneous. Carry-on baggage flow is often simplified to stay with the passenger rather than modeled as a separate entity stream.

## Suggested Model Definitions

Based on the sources discovered, two model definitions are natural candidates:

1. **SimPy (teaching variant)** — matches the GT ISYE 6501 assignment. Serves Scenario 1 only (capacity sizing). Small, simple, self-contained. Ideal for pedagogical use.

2. **SIMIO (production variant)** — matches the Ruiz et al. Phoenix Sky Harbor model. Serves Scenarios 1–4. Full workforce scheduling, time-varying arrivals, OptQuest integration. Closer to consulting-grade work.

No git repos for these exist within SimVault's orbit yet — they would be contributed or linked externally.

## Suggested Implementation Links

- `https://pmc.ncbi.nlm.nih.gov/articles/PMC12043019/` — Ruiz et al. academic paper (PDF + abstract)
- `https://github.com/aschatz1995/Airport-Security-Wait-Sim` — SimPy implementation example
- `https://github.com/slimhindrance/SimPy_airport` — alternative SimPy implementation

---

# Lessons Learned

## What Went Well

- **DES criteria rubric is robust for clear cases.** Airport security is a textbook DES model and the rubric handled it cleanly.
- **The eight summary sections map cleanly to academic DES papers.** Seeder output from a well-written paper fits the template almost directly.
- **Scenarios emerged naturally from the source material.** The PMC paper's experimental design translated directly into scenarios at the SimVault level. This is strong validation that scenarios-as-first-class is the right framing.
- **Two distinct source types (academic + code) produced complementary context.** The paper gave depth and realism; the GitHub cluster gave implementation references and simplified parameters for teaching.

## Spec Gaps and Open Questions Surfaced

1. **Fetch reliability is an implicit Seeder capability** — the spec doesn't currently call out that the Seeder needs failure tolerance, source-domain memory, or fallback strategies. Worth adding to `045_ai_agent_seeder.md`.

2. **GitHub Seeder support needs more than README fetching.** The Seeder must be able to parse Jupyter notebooks, Python files, and config files to extract model parameters. This is a meaningful capability that should be documented as a v2 Seeder enhancement.

3. **Variant handling is implicit in the model definition tier.** The spec doesn't explicitly say "variants are captured as distinct model definitions." It works out that way, but it should be stated so contributors understand the pattern.

4. **Deduplication against teaching-assignment clusters** is a specific case worth noting in `045_ai_agent_seeder.md`. Multiple independent repos implementing the same canonical assignment should merge into one entry, not produce N near-duplicates.

5. **Source fetchability should influence the trust weighting in `045_ai_agent_seeder.md`.** Currently the trust weighting table talks about source category only. Practical fetchability is an orthogonal dimension the Seeder needs to consider.

6. **Paywalled high-quality sources are a blind spot.** SimVault has no path today to access WSC proceedings, Elsevier papers, etc. Worth thinking about whether SimVault could partner with a library or publisher for special access, or whether the Seeder should stop at the abstract and flag these for human follow-up.

7. **The draft summary's "Needs Human Review" label is consistent with the spec** but there's no mechanism described for how a human reviewer actually engages with AI drafts. This is a UX gap worth addressing.

## Recommendations

Based on this walkthrough, I recommend minor updates to:

- **`045_ai_agent_seeder.md`** — add a section on Seeder operational concerns (fetch reliability, source-domain memory, failure handling, code-aware parsing)
- **`028_model_definitions_and_translators.md`** — add a brief note that model variants (e.g., teaching vs. production versions of the same conceptual model) are captured as distinct model definitions, not as separate entries
- **`018_des_criteria.md`** — possibly add a section showing a worked example of the rubric (this walkthrough's Phase 8 could serve as one)

These are small, targeted additions. The core design held up well against the walkthrough, which is a strong signal that the overall architecture is sound.
