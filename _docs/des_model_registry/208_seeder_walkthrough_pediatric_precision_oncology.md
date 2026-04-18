# Seeder Walkthrough: Pediatric Precision Oncology Clinic

A Mode 2 scoped run triggered by "precision medicine" as the user's topic area. Phase 0 Scoping surfaced five candidates spanning CAR-T supply chains, whole-genome-sequencing systems models, molecular tumor boards, NGS lab turnaround, and pediatric precision clinics. The user selected Candidate E — **Pediatric Precision Oncology Clinic Patient Flow** — which turned out to be the hardest of the five to source cleanly: the only directly-topical paper is a descriptive implementation report (not a DES paper), and all the DES-methodology oncology literature is adjacent-topical (adult chemo scheduling, generic outpatient). This walkthrough exercises **methodology-mismatch handling** as its core friction, similar to the canonical appliance-assembly-line walkthrough (204).

---

## Preamble: Phase 0 Scoping

The user requested "precision medicine." That spans genomic testing, targeted therapy, cell and gene therapy, and multi-disciplinary decision workflows. Five candidate topics were surfaced via light discovery search.

### Candidate Comparison (Phase 0 Output)

| Candidate | Topic | Source density (est.) | Novelty vs. existing catalog | Recommended? |
|-----------|-------|----------------------|------------------------------|--------------|
| A | CAR-T Cell Therapy Supply Chain (centralized vs. decentralized autologous manufacturing) | Very rich (≥4 DES papers) | High — no healthcare + supply chain + manufacturing hybrid yet | **Top recommendation** |
| B | Whole Genome Sequencing Nationwide (Dutch lung cancer model) | Rich (single canonical AnyLogic ABM+DES paper) | High — systems-level model | Strong runner-up |
| C | Molecular Tumor Board Workflow (single institution) | Moderate (BPMN and process papers; DES thinner) | Moderate — conceptually similar to ENT clinic (201) | Moderate |
| D | NGS Genomic Testing Lab Turnaround | Moderate (rich operational literature, thinner DES-specific) | Moderate — parallels pathology scanner (203) | Moderate |
| **E** | **Pediatric Precision Oncology Clinic Patient Flow** | Moderate; thinner than A/B | **Moderate — overlaps ENT clinic (201) flavor but adds multi-week pipeline and batch MTB** | User-selected |

### User Selection

The user selected **Candidate E** despite the Seeder's top recommendation being A. The run proceeds on E.

### Why Candidate E Is Interesting Despite Thinner Source Density

Even as a Seeder-less-obvious pick, Pediatric PMC has distinguishing properties worth documenting:

- **Pediatric-specific constraints** (off-label drug access, family dynamics, age-related tissue volume limits) that adult precision oncology models sidestep
- **Weekly-batched MTB cadence** — a discrete batch-cycle resource that differs structurally from the continuous-flow outpatient DES pattern
- **Low actionability probability** — only ~16% of NGS reports yield gene fusions and only ~6% result in targeted therapy, which creates a pronounced probabilistic-cascade routing structure
- **Single-institution anchor** (Cook Children's Medical Center, Fort Worth TX) — gives the entry a concrete reality-anchor with published parameters

---

## Phase 1 — Discovery Search

### What the Seeder Did

After Phase 0 candidate selection, Phase 1 ran targeted searches specifically on pediatric precision oncology clinic flow:

| Query | Purpose |
|-------|---------|
| `pediatric precision oncology clinic discrete event simulation patient flow` | Direct hit hunt |
| `pediatric oncology molecular profiling workflow simulation` | Workflow-oriented |
| `St Jude children's precision oncology clinic patient pathway simulation` | Named-institution probe |
| `pediatric cancer center outpatient clinic simulation scheduling appointments` | Operational scheduling angle |

### What It Produced

A ~25-candidate raw set spanning three clusters:

1. **Adult-oncology DES papers** (numerous): Alvarado 2018 DEVS-CHEMO (SAGE), PMC10011299 chemo scheduling, PMC5635465 outpatient DES, a SAGE oncology clinic simulation, PMC11580151 systematic review of simulation in cancer care.
2. **Pediatric precision oncology implementation descriptions** (several, mostly non-DES): Cook Children's PMC paper (PubMed 40746881), INFORM program (Nature), MAPPYACTS trial (Nature), 888-tumor profiling paper (Nat Commun).
3. **Hospital websites for real clinics**: Dana-Farber Jimmy Fund Clinic, Johns Hopkins Kimmel, Children's National, Lurie Children's, St. Jude.

### Friction

- **No direct DES + pediatric precision oncology hit.** The two dimensions (DES methodology, pediatric precision topic) do not co-occur in the literature. This matches the systematic review's finding below.
- **St. Jude-specific probe returned institutional pages only**, no operational simulation papers. St. Jude is the obvious pediatric oncology anchor but their operational modeling (if any) isn't published in open sources.

### Spec Implication

The "topic exists but isn't DES-literatured" failure mode is an emerging pattern. Walkthroughs 203 (pathology scanner) and 204 (appliance assembly) hit mild versions. This one hits it head-on. The Seeder needs a clear rubric for **synthesizing topical anchors from non-DES literature with DES-methodology patterns from adjacent topics** — see Lessons Learned.

---

## Phase 2 — Candidate Triage

### Source Policy Pre-Check

Applied `source_policy.md` first. A lot of premium content fell off the table:

| Candidate | Domain | Policy status |
|-----------|--------|---------------|
| Nature `s41698-022-00335-y` (INFORM program) | `nature.com` | **Skip list** — flag for human |
| Nature Communications `s41467-024-49944-0` (888 pediatric tumors) | `nature.com` | **Skip list** |
| Nature Scientific Reports `s41598-024-70541-0` | `nature.com` | **Skip list** |
| Springer Link "Real-world performance of DDA" | `link.springer.com` | **Skip list** |
| Wiley Barrett 2008 "DES Applied to Pediatric Phase I" | `onlinelibrary.wiley.com` | **Skip list** |
| ScienceDirect Barrett SAS-based paper | `sciencedirect.com` | **Skip list** |
| Tandfonline "Precision Pediatric Cancer Nanomedicine" | `tandfonline.com` | **Skip list** |
| MDPI "DES Staff Allocation Clinic/Surgery" | `mdpi.com` | **Skip list** |
| MDPI "Clustering Stochastic Simulation Optimization Chemo" | `mdpi.com` | **Skip list** |
| ResearchGate Alvarado PDF | `researchgate.net` | **Skip list** |
| ACM DL "Simulation Vol 89" open access / overbooking | `dl.acm.org` | **Skip list** |

All routed to Human Follow-Up Queue. **Note: `nature.com` accounts for three of the most relevant direct-topical pediatric precision oncology papers** — a significant loss, but one the skip list correctly predicts. A human with institutional access should pull these.

### Ranked Fetch Plan (Surviving Candidates)

| Rank | Candidate | URL | Expected fetchability | Rationale |
|------|-----------|-----|----------------------|-----------|
| 1 | Wikipedia — Precision medicine | `en.wikipedia.org/wiki/Precision_medicine` | Very High | Canonical definition, domain vocabulary |
| 2 | Wikipedia — Pediatric oncology | `en.wikipedia.org/wiki/Pediatric_oncology` | Very High | Tumor type taxonomy, care pathway |
| 3 | PMC11580151 — Systematic review simulation in cancer care | `pmc.ncbi.nlm.nih.gov/articles/PMC11580151/` | High | Meta-source: 51-paper DES corpus |
| 4 | PMC Cook Children's PMC (via PubMed 40746881) | `pmc.ncbi.nlm.nih.gov/articles/PMC12308242/` | High | Primary topical anchor |
| 5 | PMC5635465 — Resource allocation scheduling | `pmc.ncbi.nlm.nih.gov/articles/PMC5635465/` | High | Generic outpatient DES pattern |
| 6 | PMC10011299 — Chemo fixed-template scheduling | `pmc.ncbi.nlm.nih.gov/articles/PMC10011299/` | High | Chemo infusion parameters (adult) |
| 7 | arXiv 2010.15922 — Italian oncology waiting time | `arxiv.org/abs/2010.15922` | High | Attempt for DES content |
| 8 | Wikipedia — Molecular tumor board | `en.wikipedia.org/wiki/Molecular_tumor_board` | Very High | Institutional definition |
| 9 | SAGE — Alvarado DEVS-CHEMO | `journals.sagepub.com/doi/10.1177/0037549717708246` | Low (SAGE typically paywalled, not yet skip-listed) | Attempt once |
| 10 | JCO Oncology Practice — "Toward Implementing Patient Flow..." | `ascopubs.org/doi/10.1200/JOP.2016.020008` | Medium (ASCO, not in skip list) | Attempt once |

### Friction

**SAGE is not currently on the skip list** but is typically paywalled. One previous walkthrough (none of 200–207) had exercised SAGE. Attempting it here to update skip-list evidence.

### Spec Implication

Consider adding `journals.sagepub.com` to the skip list if this fetch 403s (it did — see Phase 3).

---

## Phase 3 — Multi-Strategy Fetch

Two-wave fetch. Wave 1 fired candidates 1-7 in parallel. Wave 2 fired Cook Children's full-text (PMC12308242), Wikipedia MTB, SAGE Alvarado, and JCO JOP paper.

### Fetch Attempts and Outcomes

| Candidate | URL | Outcome | Content extracted |
|-----------|-----|---------|-------------------|
| Wikipedia — Precision medicine | ✓ Success | Canonical definition, oncology exemplars (Trastuzumab, Imatinib), testing-at-multiple-decision-points workflow |
| Wikipedia — Pediatric oncology | ✓ Success | Tumor type distribution (leukemia 28%, CNS 27%, lymphomas 12%), care pathway stages |
| Wikipedia — Molecular tumor board | ✓ Success | Thin — MTB definition, named institutions (Dartmouth–Hitchcock, Johns Hopkins, Moffitt); no workflow details |
| PMC11580151 — Systematic review | ✓ Success | 51 papers, 80% DES; patient flow 51%, scheduling 35%, resource allocation 22%, cost 14%. **Explicitly: "No mention of precision oncology, genomic testing workflows, or molecular profiling integration appears in this review's scope or findings."** Limited pediatric content. |
| PMC5635465 — Resource allocation (ophthalmology) | ✓ Success | Confirmed DES. 4 patient classes, 12 time blocks, 4.5hr session, 8 MDs + 16 RNs, scheduling discipline comparison (FCFS, SPT, LNS, CP, SQNO, LR, adaptive) |
| PMC10011299 — Chemo fixed template | ✓ Success | Confirmed DES. 33 infusion chairs, 11 RN FTEs, Poisson λ=6-8.4 pt/day, 1-nurse setup + 1:4 monitoring ratio, 15min-8hr infusion, 11,094-day steady-state run. **Adult oncology** |
| arXiv 2010.15922 — Italian oncology wait time | ⚠ Partial (abstract only) | **Agent-based, not DES.** Courier delivery from external pharmacy. Limited extraction. |
| PMC12308242 — Cook Children's PMC (full text) | ✓ Success | See detailed extract below |
| SAGE — Alvarado DEVS-CHEMO | ✗ 403 Forbidden | Confirms SAGE paywall; propose adding to skip list |
| JCO Oncology Practice — "Toward Implementing Patient Flow" | ✗ 403 Forbidden | ASCO pubs blocked automated fetch; propose for skip list consideration |

### Cook Children's Extract (primary anchor source)

From PMC12308242 (open access):

**Institution and history:** Cook Children's Medical Center (CCMC), Fort Worth, TX. Multidisciplinary molecular tumor board established **2019**. Official Precision Medicine Clinic launched **2021**.

**Sequencing vendors:** Foundation Medicine, Tempus, Caris Life Sciences, Natera. The FoundationOne CDx detects "4 main classes of genomic alterations: base substitutions, insertions and deletions, copy number alterations, and rearrangements."

**Workflow stages:**
1. Primary oncologist identifies eligible patient, refers to PMC
2. Tissue sample goes to CCMC Pathology for histological analysis
3. Sample shipped to a commercial NGS vendor (choice depends on tumor type)
4. NGS report returns; medical student volunteers draft a summary (patient history, lab findings, sequencing results, treatment options)
5. Lead oncologist reviews draft for accuracy
6. Weekly PMC meeting discusses one patient case
7. Family attends 1–2 clinic visits post-meeting to discuss results and treatment options
8. Reports and education materials uploaded to EMR; RedCap registry records demographics, biomarkers, decisions
9. Follow-up via "Life After Cancer" program

**Meeting cadence:** Weekly PMC meeting (compared to the predecessor MTB's monthly meeting, before the PMC launched).

**Team composition:** Oncologists (lead + treatment team), pediatric pathologists, molecular pathologists, pharmacists, researchers, research interns, nurse educators, solid tumor coordinator, medical student volunteers, medical science liaison.

**Patient volume:** **69 patients over ~20 months (April 2022–2023)**, ≈3.5 patients/month or ≈0.8 patients/week.

**Molecular findings:** 133 genetic variants across 101 genes related to cell cycling, DNA processing, expression, and cell signaling.

**Actionability cascade:**
- 69 patients sequenced →
- 11 patients with gene fusions (most clinically targetable mutation type) = **~16% "actionable finding" rate** →
- 4 patients received targeted therapy = **~6% "targeted therapy received" rate**

**Tumor type mix (solid tumors):** Ewing sarcoma (largest cohort), rhabdomyosarcoma, osteosarcoma, myoepithelial carcinoma, anaplastic large cell lymphoma, diffuse large B-cell lymphoma, inflammatory myofibroblastic tumor, epithelioid sarcoma.

**Immunotherapy subtesting:** 34 of 69 patients assessed for PD-L1 (20 negative, 14 positive).

**Germline findings** trigger referral to genetic counseling.

**Operational bottlenecks (authors' own):**
1. Physician adoption resistance: oncologists often act on the PMC report without requesting a PMC appointment, reducing clinic throughput attribution
2. Limited sequencing panel coverage — rare variants not detected by some NGS platforms
3. Implementation gap — only 4/69 received targeted therapy; adoption barriers and drug access are persistent
4. Drug access — many targeted therapies are unapproved in pediatrics, lack pediatric pharmacokinetic data, or are financially out of reach

**Referral criteria evolution:** Initially limited to relapsed patients; expanded to all newly-diagnosed and relapsed. Stated goal: **universal NGS testing for all newly-diagnosed patients**.

---

## Phase 4 — Semantic Relevance Check

### Provenance Labels (Three-Axis)

| # | Source | Access | Topical | Methodology | Notes |
|---|--------|--------|---------|-------------|-------|
| 1 | Wikipedia — Precision medicine | First-party | Adjacent | Background | Domain vocabulary |
| 2 | Wikipedia — Pediatric oncology | First-party | Adjacent | Background | Tumor-type taxonomy |
| 3 | Wikipedia — Molecular tumor board | First-party | Adjacent | Background | Institutional definition (thin) |
| 4 | PMC11580151 — Systematic review | First-party | Adjacent | **DES** | Meta-source for oncology DES |
| 5 | PMC5635465 — Outpatient DES (ophthalmology) | First-party | Adjacent | **DES** | Scheduling-discipline pattern |
| 6 | PMC10011299 — Chemo scheduling | First-party | Adjacent | **DES** | Adult chemo; parameter anchor |
| 7 | **PMC12308242 — Cook Children's PMC** | First-party | **Direct** | **Adjacent Method** | **Descriptive, not DES — methodology mismatch** |
| 8 | arXiv 2010.15922 | First-party | Adjacent | Adjacent Method (agent-based) | Limited extraction |

### The Central Friction

**The only First-party × Direct source is methodology-mismatched.** The Cook Children's paper describes the workflow this entry models but is not itself a DES paper. Conversely, every DES-methodology oncology paper is topically adjacent — adult chemo, generic outpatient, ophthalmology.

### How the Seeder Applied the Phase 4 Rule

Per `SKILL.md` Phase 4 methodology-mismatch handling (canonical example 204):

1. **Cook Children's is accepted** as raw context with explicit three-axis labels
2. **Its structural data and parameters anchor the entry** — tumor types, actionability percentages, weekly MTB cadence, referral criteria, team composition
3. **It is NOT cited as a DES implementation** in suggested model definitions or implementation links
4. **The DES structural patterns come from PMC10011299 (chemo scheduling) and PMC5635465 (outpatient DES)** — these supply the formal model skeleton
5. **Synthesis warning** appears in the Summary's `confidence_note` fields

No false-positive topical rejections. The arXiv paper is accepted with the "agent-based, not DES" label so future readers know to treat it with care.

---

## Phase 5 — DES Criteria Check

| Criterion | Type | Result | Justification |
|-----------|------|--------|---------------|
| **Discrete entities** | Required | ✓ PASS | Patients, tissue samples, NGS reports, PMC cases — all discrete and identifiable |
| **Discrete events** | Required | ✓ PASS | Referral, sample accession, NGS kickoff, NGS complete, report drafted, MTB review, family visit, therapy decision |
| **Time progression** | Required | ✓ PASS | Referral → therapy decision turnaround time is the core operational metric |
| **Resource contention / queueing** | Typical | ✓ PASS | Weekly MTB slot (1 case/week), oncologist review time, molecular pathologist time, commercial NGS vendor queue |
| **Stochastic elements** | Typical | ✓ PASS | Referral arrivals, NGS TAT variance, actionability probability cascade (~16% / ~6%), tumor-type mix |

**Verdict:** Pediatric Precision Oncology Clinic QUALIFIES as a DES model. All five criteria pass.

**Modeling nuance:** The weekly-batched MTB is unusual for DES in that the "server" has a 1-case-per-week capacity rather than a service-time distribution. This is well within DES capability but worth highlighting in scenario design.

---

## Phase 6 — Deduplication and Variant Check

### Overlap Check

Only prior walkthrough in the outpatient-clinic space is **201 (ENT Clinic)**.

| Dimension | ENT Clinic (201) | Pediatric PMC (this) |
|-----------|------------------|---------------------|
| Journey | Single-visit, 15–60 min | Multi-week: referral → NGS (3-4 wk) → weekly MTB → family visit → therapy |
| Arrivals | Continuous during clinic hours | Referral-gated, batch-processed |
| Resources | Exam rooms, physicians | Weekly MTB slot (1/wk), NGS vendor queue, oncologists |
| Service model | Service-time distributions | Hybrid: distributions + weekly-batch capacity |
| Specialty | Adult ENT procedures | Pediatric + molecular profiling pipeline |

**Variant test: "Can one summary describe both?"** No. Routing, queueing, and time-scale structures differ substantially.

### Decision

**NEW ENTRY: Pediatric Precision Oncology Clinic.**

**Variants within the new entry** (share one summary, vary in parameters and routing weights):

- **Variant 1 — Baseline (Cook Children's as-observed):** Weekly 1-case MTB; commercial NGS vendors; 3.5 pts/month referral; ~16% actionable; ~6% targeted therapy
- **Variant 2 — Universal NGS:** Every newly-diagnosed pediatric oncology patient receives NGS; referral volume projected 3-5× baseline
- **Variant 3 — Multi-case MTB:** 2-3 cases per weekly meeting; throughput expansion test
- **Variant 4 — In-house NGS lab:** Replace commercial vendors with internal NGS; shorter but capacity-bounded TAT

### Spec Implication

This is the **second batch-cadence service scenario** (M/M/1 in 205 was continuous; this is calendar-batched). A modeling feature tag for "calendar-batched resource availability" may be worth considering — though `resource_schedules` covers the concept adequately.

---

## Phase 7 — Drafting the Entry

The draft entry below represents the AI Discovered tier. Summary sections are marked "AI-generated, needs human review" because the Direct topical source (Cook Children's) does not itself provide model-definition-level DES parameters. Most parameter values are synthesized from Cook Children's + PMC10011299 chemo scheduling + general NGS turnaround literature.

---

# Draft Entry: Pediatric Precision Oncology Clinic

**Status:** AI Discovered (methodology-synthesized — topical source is non-DES, DES patterns are adjacent-topical)
**Domain tags:** `healthcare` [canonical], `Oncology` [pending], `Precision Medicine` [pending]
**DES qualification:** All required criteria PASS (discrete entities, discrete events, time progression); both typical criteria PASS (resource contention, stochastic elements)
**Complexity indicator:** Intermediate to Advanced
**Content provenance:** Synthesized from one First-party × Direct × Adjacent-Method source (Cook Children's PMC paper), three Adjacent-topical × DES sources (PMC11580151, PMC5635465, PMC10011299), and three Background × Background Wikipedia domain references
**Intended audience:** Pediatric oncology precision medicine clinic operators, hospital systems evaluating PMC expansion, healthcare simulation researchers seeking precision medicine models (currently absent from the reviewed DES literature)

## Scenarios

### Scenario 1 — Baseline Steady-State Throughput
- **Flavor:** operational
- **Complexity:** Intermediate
- **What-if question:** Given Cook Children's observed parameters (weekly 1-case MTB, ~3.5 pts/month referrals, ~16% actionable, ~6% targeted therapy), what is steady-state TAT from referral to therapy decision, and where is the bottleneck?
- **Decisions supported:** Whether current 1-case-per-week MTB cadence is adequate; staffing plan validation
- **Model features required:** `resource_schedules` (weekly MTB), `probabilistic_routing` (actionability cascade), `multi_class_entities` (tumor types), `appointment_based_arrivals` (referral-gated)
- **Reference:** Cook Children's PMC paper (PMC12308242)

### Scenario 2 — Universal NGS Expansion
- **Flavor:** operational
- **Complexity:** Advanced
- **What-if question:** Cook Children's stated goal is universal NGS for all newly-diagnosed pediatric oncology patients. If adopted, referral volume could rise 3-5×. Can the weekly 1-case MTB absorb this volume, or what capacity expansion is needed to maintain TAT?
- **Decisions supported:** MTB meeting cadence (add second weekly meeting?); switching to multi-case meetings; hiring molecular pathologist FTEs
- **Model features required:** Scenario 1 features + `time_varying_arrivals` (transition phase); increased arrival rate
- **Reference:** Cook Children's paper; Wikipedia pediatric oncology for tumor-incidence anchoring

### Scenario 3 — Multi-Case MTB Throughput Expansion
- **Flavor:** operational
- **Complexity:** Intermediate
- **What-if question:** Switch from 1 case per weekly meeting to 2 or 3 cases. Throughput gain versus case-discussion quality (modeled as complication rate or decision-confidence metric)?
- **Decisions supported:** Meeting cadence and case-per-meeting parameter; meeting-duration extension
- **Model features required:** `resource_schedules`, `customer_classes` (case complexity), `multi_skill_resources` (case attribution to specialists)
- **Reference:** Cook Children's paper weekly-meeting cadence; PMC11580151 scheduling literature

### Scenario 4 — In-House NGS Lab
- **Flavor:** operational
- **Complexity:** Advanced
- **What-if question:** Replace commercial NGS vendors (Foundation, Tempus, Caris, Natera) with an in-house NGS lab. In-house gives shorter TAT but introduces internal capacity bounds and capital investment. At what referral volume does in-house break even on TAT and cost?
- **Decisions supported:** Capital investment in in-house NGS lab; vendor-mix policy; fallback arrangements during high demand
- **Model features required:** `shared_resources` (commercial vendor — shared across customer institutions), `resource_schedules` (in-house lab hours/shifts), Scenario 1 features
- **Reference:** Cook Children's paper vendor list; general NGS turnaround literature (~10-21 days typical)

## Raw Context

### Ref 1 — Cook Children's Pediatric Oncology Precision Medicine Clinic
- **Provenance:** First-party × Direct × **Adjacent Method** (descriptive implementation paper, not DES)
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted`
- **Source URL:** `https://pmc.ncbi.nlm.nih.gov/articles/PMC12308242/`
- **Extracted content:** (summary) Cook Children's Medical Center (Fort Worth, TX) established a multidisciplinary molecular tumor board in 2019 and launched a formal Pediatric Oncology PMC in 2021. Over 20 months (April 2022 – mid-2023) the PMC processed 69 solid-tumor patients. Commercial NGS vendors: Foundation Medicine, Tempus, Caris, Natera. Weekly PMC meetings discuss one patient each. 133 variants across 101 genes; 11 gene-fusion findings (≈16% actionable); 4 targeted-therapy recipients (≈6%). Tumor mix: Ewing sarcoma (largest), rhabdomyosarcoma, osteosarcoma, and several lymphomas and soft-tissue sarcomas. Authors explicitly cite physician adoption resistance, limited NGS panel coverage, and pediatric drug-access barriers as bottlenecks.
- **Provenance note:** This is the entry's primary topical anchor. It is not a DES paper but supplies the structural workflow, actionability probabilities, weekly cadence, and patient-volume figures that parameterize all four scenarios.

### Ref 2 — Systematic Review of Simulation Methods in Cancer Care Services
- **Provenance:** First-party × Adjacent × DES
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted`
- **Source URL:** `https://pmc.ncbi.nlm.nih.gov/articles/PMC11580151/`
- **Extracted content:** Reviewed 51 peer-reviewed papers on simulation in hospital-based cancer care pre-May 2023. DES dominated (>80% of papers). Problem types: patient flow 51%, scheduling 35%, resource allocation 22%, cost 14%. Limited pediatric content (one paper on children with central venous catheters and febrile ED presentations). **No precision oncology workflows or molecular profiling integration in the 51-paper corpus.**
- **Provenance note:** Authoritative confirmation that pediatric precision oncology clinic DES is a literature gap. Strengthens the claim that this entry fills an underserved area.

### Ref 3 — Online Scheduling Using a Fixed Template: Outpatient Chemotherapy Drug Administration
- **Provenance:** First-party × Adjacent × DES
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted`
- **Source URL:** `https://pmc.ncbi.nlm.nih.gov/articles/PMC10011299/`
- **Extracted content:** Confirmed DES. Adult oncology. 33 infusion chairs, 11 RN FTEs. Poisson arrivals λ=6.0, 6.5, 7.0, 8.0, 8.4 patients/day tested. 1 RN required for chair setup; 1 RN can monitor 4 infusions simultaneously. Breaks reduce nurse availability to 50%. Drug infusion durations 15 min – 8+ hours. 11,094-day steady-state simulation across 20 cases.
- **Provenance note:** Supplies concrete DES parameter anchors for any chemo-infusion-downstream extension of the base model. Adult, not pediatric — pediatric infusion durations and nurse ratios likely differ but order of magnitude preserved.

### Ref 4 — Resource Allocation and Outpatient Appointment Scheduling Using Simulation Optimization
- **Provenance:** First-party × Adjacent × DES
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted`
- **Source URL:** `https://pmc.ncbi.nlm.nih.gov/articles/PMC5635465/`
- **Extracted content:** Confirmed DES, ophthalmology setting (generalizable to outpatient). 4 patient classes with class-specific paths, 12 time blocks over 4.5-hour session, 8 MDs + 16 RNs. Service disciplines tested: FCFS, SPT, LNS, CP, SQNO, LR, adaptive. Metrics: patient wait time, resource overtime, congestion level.
- **Provenance note:** Generic outpatient-DES pattern. Scheduling-discipline comparison from this paper informs Scenario 3 meeting-cadence variants.

### Ref 5 — Wikipedia: Precision Medicine
- **Provenance:** First-party × Adjacent × Background
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted`
- **Source URL:** `https://en.wikipedia.org/wiki/Precision_medicine`
- **Extracted content:** Canonical definition: tailoring medical treatment to individual patient characteristics via molecular profiling. Oncology examples: Trastuzumab (HER2+ breast), Imatinib (BCR-ABL CML), FoundationOne CDx profiling, mutation-burden-guided immunotherapy. Multi-point testing (diagnosis, treatment selection, monitoring).
- **Provenance note:** Domain-defining background. Framing the entry, not parameterizing it.

### Ref 6 — Wikipedia: Pediatric Oncology
- **Provenance:** First-party × Adjacent × Background
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted`
- **Source URL:** `https://en.wikipedia.org/wiki/Pediatric_oncology`
- **Extracted content:** Pediatric oncology covers ages 0–14 (U.S.). Leukemia 28%, CNS tumors 27%, lymphomas 12%. Other: neuroblastoma, Wilms, rhabdomyosarcoma, retinoblastoma. Multidisciplinary team model. Treatment modalities: surgery, chemotherapy, radiation, immunotherapy.
- **Provenance note:** Tumor-type taxonomy used to parameterize arrival-class distribution in Scenario 1. Cook Children's actual mix skews toward solid tumors and sarcomas (Ewing, rhabdo, osteo) rather than the leukemia/CNS majority — note this in Scenario 1 confidence_note.

### Ref 7 — Wikipedia: Molecular Tumor Board
- **Provenance:** First-party × Adjacent × Background
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted_partial`
- **Source URL:** `https://en.wikipedia.org/wiki/Molecular_tumor_board`
- **Extracted content:** MTB = multi-expert team evaluating hard-to-treat cancers using genomic/transcriptomic analysis. Core: clinical oncologists, pathologists. Add-ons: geneticists, bioinformaticians, molecular biologists. Named examples: Dartmouth–Hitchcock, Johns Hopkins, Moffitt.
- **Provenance note:** Thin content. Wikipedia article does not describe workflow or TAT. Useful for confirming canonical MTB composition only.

### Ref 8 — arXiv 2010.15922: A Configurable Computer Simulation Model for Reducing Patient Waiting Time in Oncology Departments
- **Provenance:** First-party × Adjacent × **Adjacent Method (agent-based)**
- **Content format:** `text_html_extracted`
- **Source acquisition method:** `url_fetch`
- **Extraction status:** `extracted_partial`
- **Source URL:** `https://arxiv.org/abs/2010.15922`
- **Extracted content:** Agent-based simulation model of an Italian oncology department. Models courier delivery of chemotherapy from external pharmacy. Compared scenarios to reduce wait times. Full details behind PDF.
- **Provenance note:** **Not DES.** Included in raw context so future readers know the source was considered and classified. Not usable as a DES-methodology template.

## Summary (Draft — AI-Generated, Needs Human Review)

**Entities:**
- **Patient** (primary entity) with attributes: tumor_type (categorical: Ewing, rhabdomyosarcoma, osteosarcoma, lymphoma, leukemia, CNS tumor, neuroblastoma, other), age, referral_status (newly-diagnosed | relapsed), ngs_vendor (FoundationMedicine | Tempus | Caris | Natera | in-house), actionable_finding (bool), targeted_therapy_received (bool)
- **Tissue sample** (flow entity, shadow of patient)
- **NGS report** (document entity, triggers MTB review event)
- **PMC case** (scheduling entity — one patient per weekly meeting in Baseline)

*confidence_note:* Cook Children's sees primarily solid tumors, not the general pediatric oncology mix dominated by leukemia. Arrival-class distribution in the baseline scenario should match observed Cook Children's mix (Ewing-heavy), not the Wikipedia 28%-leukemia figure.

**Resources:**
- **MTB meeting slot** (capacity: 1 case/week in Baseline; 2-3 in Variant 3; calendar-driven availability via `resource_schedules`)
- **Lead oncologist review capacity** (daily; reviews medical-student draft before MTB)
- **Molecular pathologist review capacity** (daily)
- **CCMC Pathology histology line** (shared with non-PMC patients)
- **Commercial NGS vendor slot** (external; modeled as shared-resource queue with long TAT distribution, typically 10-21 days)
- **Clinic-visit slot** (for post-MTB family appointments)
- **Medical student draft capacity** (volunteer-based; may be intermittent)

*confidence_note:* Commercial NGS vendor capacity is not published per-vendor. Modeled as an aggregate shared resource with stochastic TAT.

**Activities:**
- **Referral intake** (oncologist → PMC registry; ~minutes)
- **Tissue processing** (CCMC Pathology; hours to days)
- **NGS vendor processing** (external; **10-21 days typical, variable by vendor and tumor type**)
- **Report drafting** (med student; ~1-3 days)
- **Lead-oncologist review** (lead MD; ~hours, gates MTB)
- **MTB case discussion** (1 case/week; meeting duration ~60 min)
- **Family clinic visit** (1-2 visits; ~30-60 min each)
- **Treatment decision** (oncologist + family; post-visit)

*confidence_note:* Only high-level activity durations available from Cook Children's paper. Fine-grained distributions would come from institutional chart review or NGS vendor SLA data.

**Generators:**
- Referral arrivals: **Baseline ~3.5 patients/month** (0.8/week) from the Cook Children's observation. Test higher rates (3-5×) in Scenario 2. Likely modeled as Poisson on a weekly or monthly basis.
- Tumor-type mix drawn from observed Cook Children's distribution (solid-tumor heavy).
- Actionability: Bernoulli(0.16) for "gene fusion or targetable variant found"; conditional Bernoulli(0.36) for "patient ultimately receives targeted therapy" given actionable finding (4/11 of gene-fusion patients).

**Queues:**
- **MTB review queue** (calendar-batched; 1 per week; FIFO with priority override for clinical urgency — possible scenario variant)
- **NGS vendor queue** (typically not visible — vendor processes on their schedule; modeled as TAT distribution)
- **Lead-oncologist review queue** (short; staff-limited)

**Routing:**
- Patient arrives → CCMC Pathology (serial) → NGS vendor (probabilistic vendor assignment based on tumor type) → NGS report returns → med student drafts → lead MD reviews → MTB queue (calendar-batched, 1/week) → MTB case discussion → family visit
- **Post-MTB branching** (probabilistic):
  - ~16% actionable finding → targeted-therapy discussion branch
    - ~36% of those → actually receive targeted therapy (4/11 ≈ 36%)
    - Remainder → standard care or clinical trial
  - ~84% no actionable finding → standard care
- All patients → long-term follow-up in "Life After Cancer" program
- Germline findings → genetic counseling referral (parallel branch)

**Key Metrics:**
- **Time-to-decision TAT:** referral → MTB-case-discussed (primary)
- **Time-to-therapy TAT:** referral → targeted therapy initiated (conditional on actionability and selection)
- **MTB utilization:** fraction of weekly slots consumed vs. empty
- **Referral queue depth** at steady state
- **Fraction receiving targeted therapy** (calibration: ≈6% at Cook Children's)
- **Fraction with actionable findings** (calibration: ≈16%)
- **Per-vendor TAT and mix** (in variants where vendor choice is a decision variable)

**Assumptions:**
- NGS vendor TAT is modeled as a distribution rather than a queue (vendor internal capacity is opaque)
- Med student draft capacity is treated as always-available (volunteer-based; in practice intermittent)
- Weekly MTB meeting is never missed (deterministic cadence)
- Arrival rate modeled as stationary Poisson after warm-up; real-world would show seasonal effects from school-year referral patterns
- Actionability cascade probabilities (0.16, 0.36-of-actionable) assumed independent of tumor type (simplification; Cook Children's data has too few samples to stratify)
- Pediatric drug access is modeled as a constant denial probability rather than a drug-specific lookup

## Suggested Model Definitions

### Variant 1 — Baseline (Cook Children's As-Observed)
- **des_product_code:** NULL (target tech not committed)
- **realization_status:** `proposed`
- **variant_label:** `baseline`
- **variant_description:** Reproduces Cook Children's 2022-2023 observed parameters: weekly 1-case MTB, commercial NGS vendors, 3.5 pts/month referral rate, ~16% actionability, ~6% targeted therapy. Serves as the validation baseline against which alternative configurations are compared.

### Variant 2 — Universal NGS Expansion
- **des_product_code:** NULL
- **realization_status:** `proposed`
- **variant_label:** `universal-ngs`
- **variant_description:** Referral volume scales to every newly-diagnosed pediatric oncology patient (3-5× baseline). Tests whether the current weekly 1-case MTB cadence can absorb the volume or whether additional expansion is required.

### Variant 3 — Multi-Case MTB
- **des_product_code:** NULL
- **realization_status:** `proposed`
- **variant_label:** `multi-case-mtb`
- **variant_description:** Expand MTB from 1 case per weekly meeting to 2 or 3. Throughput vs. per-case discussion depth. Meeting duration may need to extend from 60 to 90+ minutes.

### Variant 4 — In-House NGS Lab
- **des_product_code:** NULL
- **realization_status:** `proposed`
- **variant_label:** `in-house-ngs`
- **variant_description:** Replace commercial vendor queue with an internal NGS lab. In-house lab has bounded capacity but shorter TAT. Capital-investment threshold analysis: at what referral volume does in-house break even?

## Structured Tags (Canonical Taxonomy)

- **Primary domain:** `healthcare` [canonical]
- **Additional domains:**
  - `Oncology` [pending] — cancer-care sub-domain not yet in canonical seed
  - `Precision Medicine` [pending] — cross-cutting precision/personalized medicine theme not yet in canonical seed
- **Modeling features:**
  - `customer_classes` — tumor types form multiple patient classes with different routing (vendor selection, actionability rates)
  - `multi_class_entities` — patient class (tumor_type, referral_status) is first-class in the model
  - `appointment_based_arrivals` — referrals are gated by primary-oncologist scheduling, not pure random arrivals
  - `probabilistic_routing` — actionability cascade (16% actionable, 36% of those actually receive targeted therapy) is Bernoulli-branched
  - `multi_skill_resources` — oncologists, molecular pathologists, pharmacists have distinct capabilities; lead oncologist is specialized
  - `resource_schedules` — weekly MTB meeting (calendar-batched availability); clinic hours for family visits
  - `shared_resources` — commercial NGS vendors are shared across customer institutions; their queue is external and opaque

## Suggested Implementation Links

No existing implementation reference found. Cook Children's has not published an operational simulation model of their PMC; Johns Hopkins, Moffitt, Dartmouth–Hitchcock, and St. Jude did not surface such a model in the search. If a human follow-up agent can retrieve the following gated sources, they may contain relevant implementation detail:

- Nature INFORM program paper (`s41698-022-00335-y`) — Dutch-adjacent program may have a formal model
- JCO Oncology Practice "Toward Implementing Patient Flow" (`10.1200/JOP.2016.020008`) — adult cancer treatment center DES
- SAGE Alvarado 2018 DEVS-CHEMO — generic DES framework for oncology clinic ops
- Wiley Barrett 2008 "DES Applied to Pediatric Phase I Oncology" — pediatric-specific but trial design rather than clinic flow

## Human Follow-Up Queue

### High-Value Sources Blocked or Unavailable

| Source | URL | Reason skipped | Why it matters |
|--------|-----|---------------|----------------|
| Nature INFORM (pediatric precision oncology drug profiling) | `nature.com/articles/s41698-022-00335-y` | Skip list (nature.com blocked) | **Highest-priority follow-up.** Direct pediatric precision oncology program with published parameters |
| Nature Commun. — 888 pediatric tumors molecular profiling | `nature.com/articles/s41467-024-49944-0` | Skip list | Anchors tumor-type distribution and actionability rates on larger cohort than Cook Children's 69 |
| Nature Scientific Reports — Pediatric extracranial solid tumors low-cost diagnostic | `nature.com/articles/s41598-024-70541-0` | Skip list | Cost-effectiveness anchoring; may suggest cost variant |
| Springer — Real-world performance of Digital Drug Assignment (DDA) | `link.springer.com/article/10.1007/s12519-023-00700-2` | Skip list | Decision-support automation; potential variant for automated pre-MTB triage |
| SAGE — Alvarado DEVS-CHEMO | `journals.sagepub.com/doi/10.1177/0037549717708246` | 403 Forbidden (attempted) | Generic oncology clinic DES framework; reusable structure |
| JCO Oncology Practice — Cancer treatment center patient flow | `ascopubs.org/doi/10.1200/JOP.2016.020008` | 403 Forbidden (attempted) | Adult cancer center DES with wait-time reduction results |
| MDPI — Clustering/Stochastic Simulation for outpatient chemotherapy | `mdpi.com/1660-4601/19/23/15539` | Skip list | Alternative clustering approach to scheduling |

### Suggestions for the Human Follow-Up Agent

- Pull INFORM and Nature Commun. 888-tumor papers via institutional access; extract per-tumor-type actionability rates to refine Scenario 1 routing probabilities
- Request Cook Children's PMC for supplemental operational data (per-vendor TAT, per-tumor-type actionability, weekly MTB utilization)
- Check St. Jude Cloud for any published operational metadata that might anchor a second institutional variant

## Proposed Taxonomy Additions

### Proposal 1 — Oncology domain

- **Target:** `domain`
- **Proposed code:** `oncology`
- **Proposed display_name:** `Oncology`
- **Proposal rationale:** Healthcare is too coarse to distinguish cancer-care blueprints from general hospital operations. This walkthrough and at least 4 of the Phase 0 candidates (CAR-T supply chain, WGS lung cancer, MTB, outpatient chemo scheduling) are all oncology-centric and will accumulate in the catalog. A dedicated sub-domain enables faceted browsing of cancer-care DES models. The existing `060_canonical_domain_seed.csv` has no oncology entry.
- **Source blueprint IDs:** 208 (this walkthrough); anticipated future blueprints from Phase 0 candidates A-D.
- **Status:** pending

### Proposal 2 — Precision Medicine domain (cross-cutting)

- **Target:** `domain`
- **Proposed code:** `precision-medicine`
- **Proposed display_name:** `Precision Medicine`
- **Proposal rationale:** Precision medicine is a cross-cutting theme spanning oncology, pharmacogenomics, rare disease, and companion diagnostics. It is not purely a healthcare sub-domain — it could apply to laboratory operations, drug-development supply chains, or reimbursement workflows. Dedicated domain tag enables faceted browsing across the precision medicine literature that the systematic review (PMC11580151) explicitly identified as a DES literature gap. First blueprint requiring this tag is 208; follow-on blueprints from Phase 0 Candidates A (CAR-T), B (WGS lung cancer), C (MTB), and D (NGS lab) would all share it.
- **Source blueprint IDs:** 208; anticipated future blueprints.
- **Status:** pending

---

# Lessons Learned

## What Went Well

- **Phase 0 Scoping produced five legitimately distinct candidates.** The user's pick of E (rather than the Seeder's top-rec A) validated that Phase 0 should present genuine alternatives, not a rigged vote for the Seeder's preferred option. The fact that E ended up being the "hardest" candidate to source is itself useful — it exercised methodology-mismatch handling in a way that A (rich DES sources) would not have.
- **Canonical-first domain tagging worked cleanly.** `healthcare` from the canonical seed fit immediately; the two proposed additions (`oncology`, `precision-medicine`) have clear forward value from Phase 0's other candidates, not just speculative utility.
- **PMC open-access remained the workhorse.** PMC11580151, PMC12308242, PMC5635465, PMC10011299 all fetched cleanly. The skill's priority ranking (PMC HTML = Top for healthcare) held up.
- **The methodology-mismatch rule from walkthrough 204 transferred cleanly.** The pattern "accept the topical anchor with Adjacent-Method label; source DES parameters from adjacent-topical papers" applied directly and produced a coherent entry.
- **Source policy pre-check saved ~7 fetches.** Nature, Springer, Wiley, Tandfonline, MDPI, ResearchGate, ACM all pre-filtered. Without the skip list, this walkthrough would have spent multiple fetches on 403s before reaching Cook Children's.

## Friction Encountered

- **Direct-topical × DES is a null set in this domain.** The systematic review explicitly confirmed it: precision oncology workflows appear in zero of the 51 reviewed cancer-care DES papers. This is a real literature gap, not a search failure — but it made the entry necessarily synthetic (one Direct source, not-DES; three DES sources, not Direct).
- **SAGE and JCO (ASCO) both returned 403** on automated fetch. SAGE is typical paywall behavior. JCO (ASCO publications) was not previously observed to 403 but did here.
- **Wikipedia Molecular Tumor Board article is thin.** It defines what an MTB is but provides no workflow, turnaround, or pediatric-specific content. This is a Wikipedia limitation, not a Seeder failure, but worth noting as a case where Wikipedia's universal-fallback strength did not fully carry.
- **arXiv 2010.15922 turned out to be agent-based, not DES.** A reminder that arXiv rankings are topical, not methodological — acceptance still requires the semantic-relevance check's methodology axis.

## Spec Gaps and Open Questions Surfaced

### Gap 1 — The "Methodology Gap" Phenomenon Deserves First-Class Treatment

Walkthrough 204 introduced methodology-mismatch handling as an exceptional case. Walkthroughs 208 (this) and likely many future healthcare-adjacent precision-medicine entries will hit it as the **primary** friction, not an exception. The spec currently handles it as a labeling question; it might deserve elevation to a first-class entry property (e.g., a `synthesis_provenance` field in the blueprint schema indicating whether the entry's topical and methodological sources coincide).

### Gap 2 — Batch/Calendar-Cadence Resource Availability

The modeling feature catalog has `resource_schedules` which adequately covers "weekly MTB meeting" but the seed description leans toward shift/break patterns, not calendar-batched discrete events. If other calendar-batched blueprints accumulate (weekly grand rounds, monthly review boards, quarterly capacity planning), consider a dedicated `calendar_batch_cadence` feature or expanding the `resource_schedules` description to make the fit more explicit.

### Gap 3 — Probabilistic Cascades Are a Distinct Sub-Pattern

The Cook Children's routing is not a single probabilistic branch but a **cascade** (16% actionable × 36% of actionable receive therapy = 6% overall). The `probabilistic_routing` feature covers each branch individually but doesn't name the cascade structure. For precision medicine entries specifically (where funnel attrition is the core metric), the cascade is a recurring shape. Consider whether a `probabilistic_cascade` feature or a narrative convention in summaries helps.

## Skill Gaps and Open Questions Surfaced

### Skill Gap 1 — Mode 2 User-Override Signal

In Phase 0, the user overrode the Seeder's top recommendation (A) for a candidate the Seeder ranked lower (E). The skill handled this correctly (proceed on user selection) but doesn't currently explain to the user what happens when the user-selected candidate is lower-quality. The implicit contract — "the Seeder will still do its best on your pick and document the friction honestly" — is present in the output but not in the skill's Phase 0 description. Consider adding a sentence to Phase 0's description: *"If the user overrides the Seeder's top recommendation, the Seeder proceeds on the user's selection and documents any source-density or friction differences honestly in the walkthrough."*

### Skill Gap 2 — JCO (ASCO Publications) Domain Not Yet in Skip List

The `ascopubs.org` domain is not in `source_policy.md`. This walkthrough's 403 from JCO is the first recorded. Per the source-policy update rule ("third consecutive 403 from the same domain across different walkthroughs → propose adding to the Skip List"), a single 403 doesn't justify immediate skip-listing. But note the outcome for future walkthroughs.

### Skill Gap 3 — SAGE Also Not Yet in Skip List

Similarly `journals.sagepub.com` is not in the skip list, and this is the first recorded 403. Same rule applies — one instance does not justify skip-listing. Watch for recurrence.

### Skill Gap 4 — Phase 0 Cross-Comparison Table Format

This walkthrough's Phase 0 comparison used a table similar to the GE Appliances walkthrough (204). The skill describes Phase 0 but does not specify the comparison-table schema. Consider documenting the canonical columns: `# | Candidate | What it models | Relevance | Source density | Fetch difficulty | Novelty | Recommended?` as a reference format. This would help future Phase 0 runs stay consistent.

## Recommendations

### Spec Updates

1. **Consider a `synthesis_provenance` blueprint field** capturing whether topical and methodological sources coincide (healthcare precision-medicine entries will frequently have "synthesized" provenance where the topical anchor and the DES patterns come from different papers). Target file: `quodsi_lucidchart_package/_docs/des_model_registry/027_raw_context_ingestion.md` or `022_three_tier_content_model.md`.
2. **Expand `resource_schedules` description in `050_modeling_feature_seed.csv`** to explicitly mention calendar-batched discrete events (weekly meetings, monthly reviews) in addition to shift/break patterns. Or add a separate `calendar_batch_cadence` feature if the accumulation justifies it.
3. **Consider adding `probabilistic_cascade` as a modeling feature** or documenting cascade-pattern-narrative conventions in `025_modeling_decisions_within_entries.md` summary-section guidance.
4. **Apply proposed domain additions** (`oncology`, `precision-medicine`) to `060_canonical_domain_seed.csv` once reviewed. Both have clear forward value from the four other Phase 0 candidates in this walkthrough and will accumulate quickly.

### Skill Updates

1. **Add explicit Phase 0 user-override handling sentence** to `SKILL.md` Phase 0 description. Something like: *"When the user overrides the Seeder's top recommendation, proceed on the user's selection and document source-density and friction differences in the walkthrough's Preamble."*
2. **Document the canonical Phase 0 comparison-table schema** — columns and their meaning — in `SKILL.md` Phase 0, so future runs produce comparable tables.
3. **Watch JCO Oncology Practice (`ascopubs.org`) and SAGE (`journals.sagepub.com`) domains** for recurrence. Two more 403s from each would justify skip-list additions per the 3-strike rule. Log this in the friction cookbook if that pattern isn't already captured.
4. **Consider adding a "Methodology-Synthesis Walkthrough" reference pattern** distinguished from "Direct-DES Walkthrough." This walkthrough (208), 204 (appliance assembly), and 203 (pathology scanner) all fit the synthesis pattern. 200 (airport security), 205 (M/M/1), 206 (warehouse) are direct-DES. Naming the pattern in `SKILL.md` helps calibrate expectations — synthesis walkthroughs necessarily have longer Phase 4 and Phase 7 sections.

### Source Policy Updates

No immediate updates justified. Watch for:
- A second SAGE `journals.sagepub.com` 403 across walkthroughs
- A second JCO `ascopubs.org` 403 across walkthroughs
- Any opt-out signals from Cook Children's or Johns Hopkins institutional repositories
