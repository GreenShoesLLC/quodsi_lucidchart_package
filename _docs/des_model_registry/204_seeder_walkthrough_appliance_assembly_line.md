# Seeder Walkthrough: Home Appliance Assembly Line Balancing

This is the fifth end-to-end walkthrough of the AI Agent Seeder role, and the third live-fire invocation of the `simvault-seeder` skill. The candidate is **Home Appliance Assembly Line Balancing** — chosen specifically because SimVault has several early adopters from **GE Appliances**, and this topic is directly relevant to the manufacturing engineering work their team does on refrigerator, washer, dryer, and dishwasher lines at Appliance Park in Louisville.

This walkthrough tests the skill against:

1. A **classic manufacturing DES topic** with rich published literature
2. A domain where the Seeder **encountered repeated PDF text extraction failures** (matching the friction pattern first observed in the pathology scanner walkthrough)
3. A **borderline-methodology edge case** — a highly relevant paper that uses decision tree ML rather than DES, testing the skill's handling of "right subject, wrong method"

## Preamble — Why This Topic

GE Appliances operates large-scale assembly lines for major home appliances. Assembly line balancing — the problem of distributing work across stations to minimize cycle time and eliminate bottlenecks — is a core activity for their manufacturing engineers on every new product launch and line refresh. An early adopter from their team should open this entry and immediately recognize their own work.

The topic was selected after a brief scoping exercise that compared five GE-relevant candidates (assembly line balancing, paint/coating line sequencing, mixed-model assembly sequencing, finished goods warehouse operations, home delivery & installation scheduling). Assembly line balancing was ranked top for relevance and source density.

## Phase 1 — Discovery Search

### What the Seeder Did
Ran two targeted searches:
1. `home appliance manufacturing assembly line discrete event simulation`
2. `assembly line balancing simulation case study refrigerator washing machine production`

### What It Produced
Very rich candidate pool spanning multiple source types:

- **NSF PAR (par.nsf.gov)** — US government open-access "A Case Study in Line Balancing and Simulation"
- **POMS Meetings conference PDF** — "Two-sided assembly line balancing of refrigeration assembly lines"
- **PMC article (PMC10949552)** — Commercial air conditioner production line balancing (open access)
- **Visual Components Midea case study** — washing machine assembly DES case
- **ResearchGate** — "Assembly Line Balancing Using DES and Design of Experiments — A Case Study in a Home Appliances Production Line" (directly on-topic title)
- **Multiple ScienceDirect / Springer papers** — paywalled line balancing literature
- **JSTOR industrial case study** — paywalled but relevant

### Friction
None at the search stage. Assembly line balancing is a classic DES topic with abundant literature.

### Spec Implication
None — rich-source topics continue to work as designed. Worth noting that manufacturing/production DES is one of the best-covered areas in the literature, in contrast to the thin coverage of pathology scanners or ENT clinics.

---

## Phase 2 — Candidate Triage

### What the Seeder Did
Applied the skill's priority table.

### What It Produced

| Source | Fetchability | Quality | Priority | Reason |
|--------|-------------|---------|----------|--------|
| NSF PAR line balancing case study | **High** | **High** | **Top** | US gov open-access archive, usually reliable |
| POMS refrigeration assembly PDF | **High** | **High** | **Top** | Direct conference PDF URL, open |
| PMC PMC10949552 air conditioner line | **High** | **High** | **Top** | PMC always reliable |
| Visual Components Midea case | Medium | Medium (vendor marketing) | High | Real appliance manufacturer example |
| ResearchGate home appliances DES paper | Low (abstract only) | **High** | Low — flag for human | Perfect title match, paywalled |
| ScienceDirect / JSTOR papers | Low | High | Flag for human | Paywalled |

**Fetch plan:** NSF PAR → POMS PDF → PMC → Visual Components (bonus if fetchable).

### Friction
None.

---

## Phase 3 — Multi-Strategy Fetch

### Fetch Attempt 1 — NSF PAR Line Balancing Case Study

**Strategy:** Direct fetch of PDF via par.nsf.gov.
**Outcome:** **PDF downloaded (782.3 KB) but text extraction failed.**
**Observation:** WebFetch reported "raw PDF binary data and encoded streams rather than readable research paper content." The PDF is likely image-based or uses compressed object streams without an OCR layer.

This is the **same friction pattern first observed in the pathology scanner walkthrough** (Cambridge WSC 2024 PDF). The Seeder's Friction Cookbook already documents the response: log as "fetched but unextractable," flag for human follow-up, move on.

**Provenance:** First-party attempt × Direct (unextractable)

### Fetch Attempt 2 — POMS Refrigeration Assembly PDF

**Strategy:** Direct fetch.
**Outcome:** **PDF downloaded (556.9 KB) but text extraction failed again.**
**Observation:** Same pattern — raw PDF binary stream with FlateDecode compressed content. Cannot extract readable text via WebFetch alone.

**Two PDF extraction failures in a row.** This strongly validates the PDF extraction friction pattern as a recurring issue on this walkthrough — not specific to one publisher or venue, but a general property of how academic/conference PDFs are constructed.

**Provenance:** First-party attempt × Direct (unextractable)

### Fetch Attempt 3 — PMC PMC10949552 (Air Conditioner Line)

**Strategy:** Direct fetch.
**Outcome:** **Success.** PMC serves HTML, not PDF, so text extraction works cleanly.
**Provenance:** First-party × Direct (subject) × Non-DES methodology

**Extracted content:**

- **Production line description:** Final assembly line for commercial air conditioners, three sections (final assembly, pre-assembly, testing), 29 stations across two production lines
- **Workforce:** 41 employees (34 assembly workers, 4 inspectors, 2 pre-assembly workers, 2 alternating workers)
- **Activities:** Welding pipelines, electronic control installation, evacuation, gas injection, safety testing. Some activities require special qualifications.
- **Shift operation:** Single 10-hour shift
- **Cycle time before improvement:** 112.5 seconds
- **Service time distribution:** Average 78.22 seconds, range 33.36 to 152.11 seconds (very wide — a 4.6× spread)
- **Bottleneck reduction:** From 96.67 sec to 74.6 sec
- **Balance rate improvement:** From 68% to 85%
- **Hourly output:** Approximately 32 sets
- **Methodology:** **Decision tree model C4.5 with real production data analysis — NOT discrete event simulation**

**Important classification note:** This paper's subject matter is directly on-topic for the entry, but its *methodology* is not DES. The authors used machine learning (decision trees) to identify bottleneck stations from real production data. A naive Seeder might attach this to a DES entry without realizing it isn't describing a DES model. The correct handling is to use the paper's **structural and parameter data** as raw context for an entry about the *same subject*, but not to claim the paper itself is a DES implementation.

### Fetch Attempt 4 — Visual Components Midea Washing Machine Case Study

**Strategy:** Direct fetch of automate.org case study page.
**Outcome:** **403 Forbidden.** Commercial/industry association sites commonly bot-block.
**Action:** Flag for human follow-up. Capture what's known from search snippets.
**Provenance:** Second-party × Direct

**Second-party content captured from search snippets:**
> Midea, the world's largest producer of major appliances, used Visual Components simulation to increase the capacity and flexibility of a high-end washing machine assembly line, while reducing costs by 15%. More than 100 components need to be assembled to produce a high-end washing machine. Line balance was improved by 20 percent, reaching more than 90 percent. The company reduced the floor area for the assembly line by 10 percent while increasing production capacity by 10 percent.

### Fetch Attempt 5 — Refrigerator Case Study (from Search Snippets Alone)

**Strategy:** No direct fetch — content captured from search snippet aggregation across multiple results.
**Outcome:** Useful second-party content about a refrigerator assembly line case study.

**Second-party content captured:**
> A discrete event simulation model was developed to study the performance of a refrigerator assembly line in one of the leading Egyptian manufacturers of home appliances. Refrigerators' assembly encounters a huge number of tasks on both the front and back sides of the product. The number of workstations in the line is 73. Station 7 is identified as the reason for the bottleneck — it has the largest work time of 35 seconds, exceeding the takt time.

**Provenance:** Second-party × Direct

### Phase 3 Summary
Rich content despite two PDF extraction failures. One successful first-party fetch (PMC air conditioner, adjacent methodology), one 403 (Midea case study, commercial site), and two second-party context aggregations (Midea + refrigerator case) rounded out the picture. Total: one first-party + two major second-party sources, enough to build a high-quality entry.

---

## Phase 4 — Semantic Relevance Check

### What the Seeder Did
Confirmed each source is about home appliance assembly line balancing.

### What It Produced
- **PMC air conditioner article:** Direct subject match, **but methodology is decision tree ML, not DES.** Classified as direct by subject, adjacent by method. Usable for raw context; not usable as a DES model implementation.
- **Midea washing machine case:** Direct subject match, Visual Components is a DES-capable simulation tool. Fully on-topic.
- **Refrigerator case study:** Direct subject match, explicitly DES. Fully on-topic.

### Friction
The PMC air conditioner paper raised a subtle classification issue. It is **on-topic** but **off-method**. This is distinct from:
- An off-topic source that should be rejected (like ENTIMOS)
- An adjacent-specialty source that is structurally transferable (like the orthopedic clinic paper for the ENT entry)

It is a third category: **same subject, different analytical method.** The paper's *data and structural descriptions* are directly useful — real cycle times, real balance rates, real workstation descriptions — but the paper itself does not describe a DES model.

### Spec Implication
**The provenance taxonomy may need a third axis:** methodology alignment. Current axes are access provenance (First-party/Second-party/Third-party) and topical provenance (Direct/Adjacent/Background). A third axis — **methodology provenance** — could capture whether the source itself is a DES paper, an adjacent-method paper (ML, optimization, analytical queueing), or background data only. Worth considering as a future spec refinement.

For this walkthrough, I labeled the PMC paper as "First-party × Direct × Non-DES methodology" in the raw context and made the distinction clear in the extracted content.

---

## Phase 5 — DES Criteria Check

**Required criteria:**
- ✅ **Discrete entities** — product units (appliances) moving through stations; components arriving at pre-assembly
- ✅ **Discrete events** — station start, station complete, transfer to next station, buffer operations, defect detection
- ✅ **Time progression** — cycle times (112.5 sec in the air conditioner case), takt times, shift durations (10 hours)

**Typical criteria:**
- ✅ **Resource contention** — 29-station lines, 73-station refrigerator lines, 41-worker crews — all finite
- ✅ **Stochasticity** — service time range of 33.36 to 152.11 seconds in the air conditioner data demonstrates significant variability

**Verdict:** STRONG YES. Assembly line balancing is a textbook DES problem and the captured data confirms it.

---

## Phase 6 — Deduplication and Variant Check

### What the Seeder Did
Considered how to structure the entry given multiple product categories surfacing in sources.

### What It Decided
**Single entry: "Home Appliance Assembly Line Balancing"** with variants captured as model definitions (one per product family):

- **Refrigerator variant** — two-sided assembly, 70+ stations, complex front/back task parallelism
- **Washing machine variant** — high-end washer, 100+ components, ~90% balance rate achievable
- **Air conditioner variant** — 29-station commercial line, 10-hour shifts, welding/gas-injection activities
- **Dishwasher variant** — widely documented in industry literature but not directly surfaced; placeholder for future enrichment
- **Dryer variant** — similar structural concerns to washers; placeholder

All of these share the same conceptual DES model (entities = appliances, resources = stations/workers, activities = assembly tasks, metrics = balance rate / cycle time / throughput). They differ in **specific parameters and activity lists**, not in structural pattern. One entry, many definitions.

### Spec Implication
Reinforces the product-family-as-variant pattern. The drive-thru walkthrough (teaching → case study → hybrid ordering → dual-lane) and the pathology scanner walkthrough (boutique → research → high-throughput) also structured variants this way. It is becoming clear that **variants as distinct model definitions within a single conceptual entry** is the dominant pattern across domains — the spec update from the drive-thru walkthrough is well-validated.

---

## Phase 7 — Drafting the Entry

See the Draft Entry section below.

---

# Draft Entry: Home Appliance Assembly Line Balancing

**Status:** AI Discovered
**Domain tags:** Manufacturing, Home Appliances, Production Engineering, Assembly Line Balancing
**DES qualification:** All required + all typical criteria satisfied
**Content provenance:** One first-party direct (PMC air conditioner paper, non-DES methodology but rich structural data); two second-party direct (Midea washing machine case, Egyptian refrigerator case); two first-party unextractable (NSF PAR and POMS PDFs — flagged for human follow-up)
**Intended audience note:** Targeted at early adopters from GE Appliances manufacturing engineering; scenarios and examples are chosen for direct relevance to their production environment.

## Scenarios

### Scenario 1 — Station Count and Task Allocation for a New Product Launch
**What-if question:** Given a new product design with a defined total work content and target takt time, how many assembly stations are needed and how should tasks be distributed across them to minimize cycle time imbalance?

**Decisions supported:** Initial line design for a new appliance model; greenfield plant capacity planning; retooling decisions for a major product refresh.

**Model features required:** Discrete assembly tasks with precedence constraints; stations as capacity-limited resources; task assignment routines (or external optimization coupled to the simulation); cycle time and balance rate metrics.

**Reference:** The air conditioner paper's improvement from 68% to 85% balance rate represents a canonical example of this scenario being addressed.

### Scenario 2 — Bottleneck Identification and Mitigation on an Existing Line
**What-if question:** Which station is the bottleneck on an existing line, and what interventions (task redistribution, parallel stations, operator addition, equipment speedup) would most effectively address it?

**Decisions supported:** Continuous improvement projects; lean manufacturing kaizen initiatives; targeted capital investment in specific station upgrades.

**Model features required:** Workstation-level utilization tracking; queue length between stations; stochastic service times to reveal bottlenecks that are not obvious from nominal cycle times; scenario comparison across intervention alternatives.

**Reference:** The Egyptian refrigerator case study explicitly identifies Station 7 (35 sec) as the bottleneck exceeding the takt time on a 73-station line. The air conditioner paper reduces the bottleneck from 96.67 sec to 74.6 sec.

### Scenario 3 — Mixed-Model Sequencing and Capacity Impact
**What-if question:** When a single line produces multiple SKUs with different work content, how should models be sequenced to smooth workload and keep stations near their targeted utilization?

**Decisions supported:** Production sequencing policies; daily/weekly line schedules; trade-offs between batching (lower setup) and mixing (smoother flow).

**Model features required:** Multiple entity types with different service time distributions per station; a sequencing policy as a controllable parameter; utilization and flow time metrics segmented by model.

**Reference:** Implicit in the Midea washing machine case (high-end line with flexibility improvements) and widely documented in the broader mixed-model assembly literature.

### Scenario 4 — Shift Structure and Capacity Expansion
**What-if question:** What is the effect of adding a second shift, extending shift length, or reorganizing break schedules on total daily output?

**Decisions supported:** Workforce expansion decisions; capacity increases without capital investment; labor cost vs. throughput trade-offs.

**Model features required:** Shift schedules as a resource availability pattern; start-of-shift warm-up and end-of-shift wind-down modeling; daily output and labor cost metrics.

**Reference:** The PMC air conditioner paper mentions 10-hour single-shift operation as its baseline, implicitly enabling scenario comparisons against 2x shift configurations.

## Raw Context

### Ref 1 — PMC: Commercial Air Conditioner Production Line Balancing
**Provenance:** First-party × Direct (subject) × Non-DES methodology
**Source:** https://pmc.ncbi.nlm.nih.gov/articles/PMC10949552/
**Extracted content:**
> Study of H Company's commercial air conditioner final assembly line. Three sections: final assembly, pre-assembly, testing. **29 stations** across two production lines. Workforce: 41 employees (34 assembly workers, 4 inspectors, 2 pre-assembly workers, 2 alternating workers). Activities include welding pipelines, electronic control installation, evacuation, gas injection, and safety testing — some requiring special qualifications. Single 10-hour shift operation. Pre-improvement cycle time: 112.5 seconds. Service time measured five times per station; average 78.22 seconds, range 33.36 to 152.11 seconds. Hourly output: ~32 sets. Improvement results: bottleneck reduced from 96.67 sec to 74.6 sec; balance rate improved from 68% to 85%. **Methodology: decision tree C4.5 with production data analysis — not DES.**
> Applicability note: Directly on-topic by subject matter (home appliance assembly line balancing). Methodology is not DES, so this paper informs the SimVault entry's raw context rather than serving as a DES implementation reference. The extracted parameter values (29 stations, 41 workers, 112.5 sec cycle, 33-152 sec service range, 10-hour shift, 32 sets/hour, 68%-to-85% balance improvement) are valuable for anchoring Scenarios 1 and 2.

### Ref 2 — Midea High-End Washing Machine Assembly (Visual Components Case Study)
**Provenance:** Second-party × Direct
**Source:** https://www.automate.org/robotics/case-studies/midea-case-study (fetch blocked, 403)
**Extracted content (from search snippets):**
> Midea is the world's largest producer of major appliances. The company used Visual Components simulation to increase capacity and flexibility of a high-end washing machine assembly line. More than 100 components are assembled to produce a high-end washing machine. Results: costs reduced by 15%; line balance improved by 20%, reaching more than 90%; floor area for the assembly line reduced by 10%; production capacity increased by 10%.
> Flag: Recommended for human follow-up — the Midea case study page is accessible via browser and would provide vendor-grade detail on how Visual Components was used to model this line.

### Ref 3 — Egyptian Refrigerator Assembly Line Case Study
**Provenance:** Second-party × Direct
**Source:** Surfaced across multiple search results (original publication venue unclear from snippets)
**Extracted content:**
> A DES model was developed to study the performance of a refrigerator assembly line at a leading Egyptian home appliance manufacturer. Refrigerator assembly involves tasks on both the front and back of the product. The line has 73 workstations. Station 7 was identified as the bottleneck — its work time of 35 seconds exceeds the takt time.
> Flag: Original source should be located and verified for accuracy; the number of stations (73) and specific bottleneck description suggest a full case study worth reading.

### Ref 4 — NSF PAR: A Case Study in Line Balancing and Simulation (EXTRACTION FAILED)
**Provenance:** First-party attempt × Direct (unextractable)
**Source:** https://par.nsf.gov/servlets/purl/10184472
**Status:** PDF downloaded successfully (782.3 KB) but text extraction failed — image-based or graphical PDF without OCR layer.
**Flag:** High-priority human follow-up. NSF PAR is a US government open-access archive; this paper is directly on-topic and should be downloadable and readable in a browser.

### Ref 5 — POMS: Two-Sided Assembly Line Balancing of Refrigeration Assembly Lines (EXTRACTION FAILED)
**Provenance:** First-party attempt × Direct (unextractable)
**Source:** https://pomsmeetings.org/confpapers/051/051-1287.pdf
**Status:** PDF downloaded successfully (556.9 KB) but text extraction failed.
**Flag:** High-priority human follow-up. POMS is a respected production/operations management venue; the title directly mentions "refrigeration assembly lines" which is highly relevant for the refrigerator variant.

### Ref 6 — ResearchGate: Assembly Line Balancing Using DES and DoE in a Home Appliances Production Line
**Provenance:** Third-party × Direct
**Source:** https://www.researchgate.net/publication/325169896
**Status:** ResearchGate typically provides abstract-only without login. Title captured but no content extracted.
**Flag:** Flagged for human follow-up. The title is a near-perfect match for this entry, and the paper may have been published in an accessible venue that can be located from the ResearchGate metadata.

## Summary (Draft — AI-Generated, Needs Human Review)

**Entities:** The primary entities are **appliance units** (refrigerators, washing machines, dryers, dishwashers, air conditioners, ranges, ovens) flowing through the assembly line. Each unit may be differentiated by **product family** (determining which line it goes down), **model/SKU** (which sub-variant of the family, affecting specific tasks required), and **production sequence** (for mixed-model lines where sequence affects station workload). Upstream, components and subassemblies arrive at pre-assembly stations as secondary entities that merge into the main unit flow.

**Resources:** The core resources are **assembly stations** (typically 20 to 80+ stations depending on product complexity — 29 for a commercial air conditioner line, 73 for a refrigerator line), **operators** assigned to stations (typical crew size in the 30-50 range for a single line), **specialized equipment** at certain stations (welding robots, gas injection chambers, test rigs), and **quality inspectors** who handle defect detection and rework routing. Some activities require **specially qualified workers** (e.g., welding or high-voltage electrical work).

**Activities:** The sequence of assembly tasks that an appliance goes through. For an air conditioner, observed activities include welding pipelines, electronic control installation, evacuation, gas injection, and safety testing. For a washing machine, 100+ components must be integrated through a long task sequence. For a refrigerator, tasks are split across front and back of the unit, making the flow more complex (often modeled as two-sided assembly lines).

**Generators:** Entity generation is typically driven by a **takt time** — a fixed or near-fixed arrival interval that represents the target production rate. Unlike service-industry models where arrivals are stochastic, appliance assembly is typically paced. Stochasticity enters through **service time variability** at each station rather than through arrivals. Some lines use **daily production targets** and schedule accordingly; others use continuous flow driven by customer-order backlog.

**Queues:** Queues form **between stations** when one station's service time exceeds the takt time — the bottleneck. In the air conditioner case, the pre-improvement bottleneck was a station operating at 96.67 seconds while the takt was below this. Queue length between stations is a key diagnostic metric. Inter-station buffers may be intentional (to decouple stations) or incidental (caused by imbalance).

**Routing:** Assembly lines are usually **single-path linear flows** — each appliance visits every station in sequence. Routing complexity enters when there are **parallel stations** (two or more operators performing the same task to increase capacity at a bottleneck), **model-dependent task skipping** (optional features that some SKUs have and others don't), or **rework loops** (defects sent back to a rework station). Two-sided assembly lines (refrigerators) have an additional routing dimension — tasks on the front vs. back must be coordinated.

**Key Metrics:**
- **Cycle time** — the longest station time, which dictates line output
- **Takt time** — the target production interval derived from demand
- **Balance rate** — percentage measure of how evenly work is distributed across stations (the air conditioner case improved from 68% to 85%; the Midea washing machine case reached >90%)
- **Throughput** — units produced per hour or per shift (air conditioner example: ~32 sets per hour)
- **Utilization** — per-station and per-operator, often the strongest signal of where to invest
- **Bottleneck station work time** — the maximum service time across all stations; the target for improvement

**Assumptions:** Typical simplifying assumptions include: each station has a single worker with a well-defined task list; task times are independent samples from a fixed distribution (ignoring learning curves, fatigue, and time-of-day effects); buffer capacity between stations is unlimited (or large enough not to bind); rework routing is rare enough to be modeled as a fraction of defective units rather than a separate flow; component supply to pre-assembly stations is always available. Deeper models may relax any of these — for example, modeling labor fatigue across a 10-hour shift, or tracking inter-station buffer constraints that force blocking.

## Suggested Model Definitions

Based on discovered sources and the structural pattern of home appliance manufacturing:

1. **Refrigerator assembly variant** — two-sided line with 70+ stations, front/back task coordination, complex task precedence. Based on the Egyptian case study reference. Serves Scenarios 1 and 2 for refrigeration products specifically.
2. **Washing machine assembly variant** — ~100+ components, high-end configuration options, ~90% achievable balance rate. Based on the Midea Visual Components case study. Serves Scenarios 1, 2, 3 for washing machine lines.
3. **Air conditioner assembly variant** — 29-station commercial AC line, welding/gas-injection activities, 10-hour shifts. Based on the PMC air conditioner paper's structural data. Serves Scenarios 1, 2, 4 for AC products.
4. **Generic home appliance line variant** — teaching-oriented simplified variant suitable for introducing line balancing concepts without domain-specific complexity. Would serve Scenario 1 in a pedagogical context.

No git-backed versions currently exist within SimVault's orbit. The GE Appliances early adopter community could contribute their own implementations.

## Suggested Implementation Links

- https://pmc.ncbi.nlm.nih.gov/articles/PMC10949552/ — PMC air conditioner line study (non-DES methodology but rich parameter data)
- https://www.automate.org/robotics/case-studies/midea-case-study — Midea washing machine Visual Components case (fetch blocked; valuable for vendor-perspective on DES tool use)
- https://par.nsf.gov/servlets/purl/10184472 — NSF PAR line balancing case study (PDF extraction failed; fetchable in browser)
- https://pomsmeetings.org/confpapers/051/051-1287.pdf — POMS refrigeration assembly conference paper (PDF extraction failed; fetchable in browser)
- https://www.researchgate.net/publication/325169896 — ResearchGate home appliances DES/DoE case (abstract only; requires access to the original publication venue)

## Human Follow-Up Queue

1. **Browser-download the NSF PAR line balancing PDF** — text extraction failed but the source is a US government open-access archive, fully accessible to a human reader. This would likely become the richest first-party direct DES source for the entry.
2. **Browser-download the POMS refrigeration assembly PDF** — same situation. Conference venue, direct relevance to the refrigerator variant, readable in a browser.
3. **Access the Midea washing machine Visual Components case study via browser** — bot-blocked but publicly available. Provides vendor-specific detail on how Visual Components was used to model the line and the specific improvement metrics achieved.
4. **Locate the Egyptian refrigerator assembly case study original venue** — referenced in secondary sources but original publication venue unclear. Worth a library or Google Scholar search to find the full paper.
5. **Access the ResearchGate home appliances DES/DoE paper** via the original publication venue. The title is a near-perfect match for this entry and would significantly enrich the methodology section of the summary.
6. **Invite GE Appliances early adopters to contribute real operational data** — line station counts, typical cycle times, balance rates achieved in practice, and lessons learned. The public literature gives nominal values; GE Appliances-specific data would make this entry authoritative for their team.

---

# Lessons Learned

## What Went Well

- **Rich topic with many candidate sources.** Home appliance assembly line balancing is a classic manufacturing DES topic; unlike the ENT or pathology scanner walkthroughs, the challenge was not finding content but handling the high volume.
- **PMC continued to be a reliable fallback.** Three walkthroughs in a row have had at least one successful PMC fetch. PMC's HTML-based rendering makes it the single most reliable source type for the Seeder.
- **The "on-topic but non-DES" classification worked as a new provenance category.** The PMC air conditioner paper was clearly on-topic but used decision tree ML instead of DES. The Seeder handled this cleanly by using the paper's structural data as raw context without mislabeling it as a DES implementation.
- **The variant handling rule held up for a third different pattern.** Product family as variant (refrigerator / washing machine / air conditioner / dishwasher / dryer) is a clean mapping of the existing "variants as distinct model definitions" rule.
- **The scoping step before running the skill was valuable.** Proposing five candidates to the user and getting their pick before diving in prevented a mismatch between the user's intent and the run's output.

## Spec Gaps and Open Questions Surfaced

### 1. Methodology Provenance as a Third Axis
The provenance taxonomy in `027_raw_context_ingestion.md` currently has two axes: access provenance (First-party / Second-party / Third-party) and topical provenance (Direct / Adjacent / Background). A third axis — **methodology provenance** — could explicitly capture whether a source uses DES, an adjacent method (ML, optimization, analytical queueing), or is background data only.

Examples of the three categories:
- **DES** — source describes a discrete event simulation implementation (what SimVault is about)
- **Adjacent method** — source addresses the same subject with a different analytical approach (ML, LP, Markov chains, analytical queueing theory) and provides useful structural or parameter data
- **Background** — source is descriptive, procedural, or operational content with no formal analytical method

This would make it easier to audit entries and decide which sources should count as DES references vs. supporting raw context. **Worth considering as a refinement** to `027_raw_context_ingestion.md`.

### 2. Scoping Step as a Formal Skill Phase
Before running the skill on this walkthrough, I did a brief scoping exercise: searched for GE Appliances-relevant topics, proposed five candidates, and got user selection. This scoping step is not currently a formal phase of the skill. It was valuable enough that it probably should be.

Proposed new **Phase 0 — Scoping** (optional, used when the user asks for a topic area rather than a specific model):

- Interpret the user's request (domain, organization, target audience)
- Search broadly to identify 3-5 candidate topics
- For each candidate, assess GE relevance (or whatever the user's relevance criteria are), source density, and difficulty
- Propose the candidates to the user
- Get user selection
- Proceed with Phase 1 on the selected candidate

Skill update candidate.

### 3. The "Rich But Friction-Heavy" Pattern
This walkthrough had **both** rich sources AND heavy friction (two PDF extraction failures and one 403). This is a new pattern — unlike airport security (rich + smooth), ENT (thin + friction), drive-thru (rich + smooth), or pathology (thin + friction), this run had rich content but accessing it was hard. The Seeder handled it by leaning on search snippets and one successful PMC fetch, but the pattern is worth documenting.

In a rich-but-friction-heavy situation, the recommended response is: capture what can be captured first-party, lean heavily on second-party snippets for the rest, and generate a robust human follow-up queue. The entry is still strong because the topic is well-understood, but the provenance mix shifts from first-party-dominant to second-party-dominant.

## Skill Gaps and Open Questions Surfaced

### 1. Phase 0 — Scoping (New Phase)
See spec gap #2 above. Worth adding as an optional phase at the start of the playbook.

### 2. PDF Extraction Failure Is Now Confirmed as a Dominant Friction Pattern
Three walkthroughs in a row have had PDF extraction failures (pathology scanner WSC PDF, pathology scanner UCL thesis attempt, and now two on this walkthrough). The skill's Friction Cookbook already documents this but the frequency now suggests:

- **Academic and conference PDFs should be triaged with lower fetchability expectations by default**, not the "high" I initially tagged them
- **The Priority Table should be updated** to reflect that PDF-based sources need the "flagged for human follow-up via browser download" treatment as a baseline rather than as an exception

### 3. Methodology-Mismatched Sources Need Explicit Guidance
The PMC air conditioner paper is the first case in five walkthroughs where a source was "on subject but wrong method." The skill's Semantic Relevance Check phase currently focuses on topical mismatch (like ENTIMOS), not methodology mismatch. Worth adding a note that methodology-mismatched sources should be classified as direct-by-subject but labeled as non-DES, and their data used as raw context rather than as DES implementation references.

### 4. Second-Party Content Aggregation Across Multiple Searches
On this walkthrough, I synthesized the "Egyptian refrigerator case study" reference from multiple search result snippets rather than from a single identifiable source. The skill's treatment of second-party content assumes a clear single source. Aggregation across multiple snippets introduces a small trust risk — a human should verify that the aggregated statement is actually what the original paper says. Worth noting as a caveat in the Friction Cookbook.

## Recommendations

### Spec Updates
1. **`027_raw_context_ingestion.md`** — add **methodology provenance** as a third axis (DES / Adjacent Method / Background) alongside access provenance and topical provenance. Would provide more precise classification and make entries more auditable.
2. **`045_ai_agent_seeder.md`** — add "on-subject but non-DES methodology" as a handling pattern, with guidance on using such sources for raw context without misclassifying them as DES implementations.

### Skill Updates
1. **Add Phase 0 — Scoping (Optional)** — when the user asks for a topic area rather than a specific model, the skill should first run a scoping exercise to propose 3-5 candidate topics before running a full walkthrough on any one of them.
2. **Revise Phase 2 Priority Table** — academic/conference PDF sources should default to "Medium fetchability, flag for human follow-up via browser download" rather than "High fetchability." Three walkthroughs of confirmed pattern.
3. **Add methodology-mismatch handling** to Phase 4 Semantic Relevance Check — currently the phase only covers topical mismatch. Methodology mismatch is a second category worth explicit handling.
4. **Add aggregation caveat** to the Friction Cookbook under the second-party content row — aggregating snippets from multiple search results introduces a small verification risk, and aggregated statements should be flagged for human verification.

These refinements are small additive improvements. The core skill structure has now held up across five walkthroughs spanning classic services, niche healthcare, classic retail, niche clinical technology, and classic manufacturing. The refinements that accumulate per run are consistently about friction handling and edge cases rather than structural changes to the playbook — a strong signal that the skill is converging on a stable shape.
