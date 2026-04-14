# Competitive Landscape

Research into existing platforms, repositories, and communities in the DES model sharing space.

## Key Finding: The Gap is Real

No vendor-neutral, community-curated catalog of DES models exists. Every existing simulation model collection is either vendor-locked, scattered across GitHub, or buried in academic papers. The closest analogs are in other domains (BioModels for biology, Hugging Face for ML).

---

## Direct Competitors

**There are essentially none.** No existing website serves as a vendor-neutral, community-curated catalog of DES models.

### Simulation Interoperability Standards Organization (SISO)
- URL: https://www.sisostds.org/
- Standards body for simulation interoperability (primarily defense/military)
- Maintains HLA (High Level Architecture) and SEDRIS standards
- Not a model catalog — purely a standards organization, defense-focused

---

## Vendor-Specific Model Libraries

### AnyLogic Cloud
- URL: https://cloud.anylogic.com/
- **The closest thing to SimVault's vision, but locked to one vendor**
- 100+ public models, interactive and runnable in-browser
- Good categorization (supply chain, manufacturing, healthcare)
- Missing: vendor neutrality, community curation, peer review, rich search

### Simio Model Gallery / Exchange
- URL: https://www.simio.com/resources/
- Example models, demo videos, academic model exchange
- Strong academic program with university partnerships
- Missing: vendor-neutral, limited community contribution, not a rich browsable catalog

### Arena (Rockwell Automation)
- Example models bundled with software (~40-60 models + ~100 "Smart files")
- Classic, well-documented examples used in thousands of university courses
- Missing: completely closed, no web presence, requires license to open

### FlexSim
- URL: https://www.flexsim.com/resources/
- Example models, case studies, video demos, community forum
- Strong 3D visualization and manufacturing focus
- Missing: vendor-locked, more marketing than repository

### SIMUL8
- URL: https://www.simul8.com/resources/
- Example models and templates, strong in healthcare/NHS
- Missing: vendor-locked, small collection

### ExtendSim
- URL: https://www.extendsim.com/
- Well-organized examples by domain and complexity level
- Missing: vendor-locked, desktop-only

### Open-Source DES Tools (SimPy, Salabim, JaamSim)
- Each ships with examples but none have a searchable, community-curated model catalog
- Models scattered across documentation, GitHub repos, and forums
- These communities would be natural early adopters of SimVault

---

## Academic Repositories

### Winter Simulation Conference (WSC)
- URL: https://www.informs-sim.org/
- The center of the DES academic community, annual since 1967
- Papers describe models in detail but don't provide downloadable/executable models
- No structured model catalog — a gap SimVault could fill

### Healthcare DES Repositories
- NHS simulation community (UK) has shared some models
- HSMA programme at University of Exeter has published SimPy models on GitHub
- Domain-specific, practical, real-world validated
- Scattered across individual repos, no central catalog

### GitHub (Unstructured)
- Hundreds of repos for "discrete event simulation"
- Mix of student projects, library implementations, and occasional high-quality models
- No curation, no quality control, no standardized metadata
- SimVault could serve as the curated index layer on top of GitHub-hosted models

---

## Standards for Describing DES Models

### Key Finding: No Dominant Standard Exists

There is no SBML-equivalent (like biology has) for DES. This is both a challenge and an opportunity.

| Standard | Domain | Relevance |
|----------|--------|-----------|
| BPMN | Business processes | Can represent process flows but lacks simulation constructs (distributions, resource schedules) |
| CMSD | Manufacturing | Vendor-neutral manufacturing simulation data exchange. Low adoption, complex, narrow scope. Last updated ~2010. |
| XMILE | System dynamics | Standard for SD model interchange. Shows standards can work when scope is focused, but not DES. |
| PNML | Petri nets | Well-defined and tool-neutral but too low-level for practical DES |
| SED-ML | Computational biology | Separates model from experiment — an excellent pattern SimVault should adopt |

**Opportunity:** SimVault could define a lightweight "model card" schema — analogous to ML model cards — that becomes the de facto standard for describing DES models.

---

## Adjacent Platforms (Design Inspirations)

### Hugging Face (ML Models)
- URL: https://huggingface.co/
- **#1 design inspiration for SimVault**
- 500k+ models with model cards, standardized metadata, interactive demos
- Community features: likes, discussions, versioning, API access
- Shows what a model registry can become at scale

### BioModels (Computational Biology)
- URL: https://www.ebi.ac.uk/biomodels/
- **Closest existing analog in another domain**
- 1,000+ curated, peer-reviewed models in standardized format (SBML)
- Cross-referenced with publications, excellent metadata and search
- Curation model, metadata schema, and publication linkage are directly applicable patterns

### Kaggle (Data Science)
- URL: https://kaggle.com/
- Community engagement through competitions, notebooks for reproducibility
- "Dataset + notebook" pattern maps to "model + experiment" in SimVault

### MATLAB File Exchange
- URL: https://www.mathworks.com/matlabcentral/fileexchange/
- Community-contributed code with ratings, reviews, download counts
- Shows that even vendor-specific exchanges generate significant engagement

### Modelica Libraries
- URL: https://www.modelica.org/
- Proves that a vendor-neutral modeling ecosystem can work with competing commercial interests
- Governance model is instructive for SimVault

---

## Community Forums & Presence

| Platform | Activity Level | Notes |
|----------|---------------|-------|
| r/simulation | Small (~5k members) | Mix of DES and other simulation types, no organized catalog |
| AnyLogic Community | Most active DES forum | Users share fragments but not complete downloadable models |
| Simio Forums | Active academic community | Vendor-specific |
| FlexSim Answers | Moderate | Community forum with some model files |
| Stack Overflow (simpy tag) | ~1.5k questions | Pure Q&A, no model sharing |
| LinkedIn "Simulation" group | ~30k members | Mostly job postings and vendor marketing |
| Discord/Slack | No significant DES servers | DES is a niche within broader OR servers |

---

## Strategic Insights

### Natural First Communities
1. **SimPy / Python DES users** — open-source, no vendor infrastructure, technically savvy
2. **Academic/teaching community** — huge demand for shareable example models
3. **Healthcare DES practitioners** — active community, many published models, strong sharing culture
4. **JaamSim users** — free tool with no community platform

### Competitive Moats to Build
1. **Vendor neutrality** — no existing platform offers this
2. **Community curation** — quality signals (status badges, reviews, verified models)
3. **Standardized metadata** — make models discoverable and comparable
4. **Publication linkage** — connect models to the papers that describe them
5. **Educational pathways** — organized learning sequences using catalog models

### Risks to Monitor
1. **Cold start problem** — need content before users arrive and users before content arrives
2. **Vendor resistance** — commercial DES vendors may not want models on a neutral platform
3. **Quality control** — unvalidated models could undermine trust
4. **Sustainability** — free platform needs a long-term funding model
