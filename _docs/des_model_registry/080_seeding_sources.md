# Seeding Sources for SimVault

Research into potential sources for initial content to populate the registry.

## Tier 1 — Start Here (Open, Accessible, Large Volume)

### CoMSES Net / OpenABM (Computational Model Library)
- URL: https://www.comses.net/codebases/
- 1,000+ computational models with metadata, documentation, and downloadable code
- While focused on agent-based models, many include DES components
- All publicly accessible, licenses vary per model
- Probably the single most important external source

### SimPy Ecosystem
- URL: https://simpy.readthedocs.io/ and hundreds of GitHub repos
- ~10-15 official examples (machine shop, gas station, bank, car wash, movie theater)
- 500+ community repos on GitHub searching "simpy simulation"
- Domains: healthcare, manufacturing, networking, logistics, transportation
- Mostly MIT/Apache/BSD licensed

### JaamSim Examples
- URL: https://jaamsim.com/ and https://github.com/jaamsim/jaamsim
- ~15-20 example models, fully open source (Apache 2.0)
- Domains: mining, manufacturing, logistics
- Professional quality, well-documented

### AnyLogic Cloud Public Models
- URL: https://cloud.anylogic.com/
- 100+ publicly runnable models with descriptions
- Domains: healthcare (ED patient flow), manufacturing, logistics, supply chain, retail, transportation
- Check individual model licenses; models are runnable in-browser

### Classic/Foundational Model Descriptions
- ~30-40 canonical models that are public-domain knowledge
- These should be written first as they establish the quality standard

## Tier 2 — High Value, Some Effort

### Winter Simulation Conference (WSC) Proceedings
- URL: https://www.informs-sim.org/
- The premier DES conference, annual since 1967
- Thousands of papers, many freely available (papers >2 years old)
- Particularly valuable: "Introductory Tutorials," "Case Studies," and "Applications" tracks

### Ciw (Python DES Library)
- URL: https://github.com/CiwPython/Ciw
- Python library focused on queueing networks
- ~10-15 example models (queueing networks, healthcare)
- MIT license

### Salabim (Python DES Library)
- URL: https://github.com/salabim/salabim
- Python DES library with animation
- ~30+ example models
- MIT license

### Simio Free Textbook
- "Modeling and Simulation with Simio" available as free PDF
- Model descriptions are freely published

### Open-Access Journals
- International Journal of Simulation Modelling (IJSIMM) — open access, ~200+ papers
- Journal of Simulation (Taylor & Francis)
- Simulation Modelling Practice and Theory (Elsevier)

## Tier 3 — Valuable but Restricted Access

### Vendor Example Libraries
- Arena ships ~40-60 models plus ~100+ "Smart files"
- FlexSim ships ~30-40 examples; community forum has hundreds of threads with models
- SIMUL8 ships ~20-30 examples, strong in healthcare/NHS
- ProModel ships ~15-20 models
- ExtendSim ships ~20-30 examples
- Can describe models conceptually without reproducing vendor files

### Textbook Models
- "Simulation Modeling and Analysis" by Averill Law — ~30-40 model specs
- "Simulation with Arena" by Kelton, Sadowski, Zupick — ~25-30 models
- "Discrete-Event System Simulation" by Banks, Carson, Nelson, Nicol — ~20-25 models
- Cannot reproduce verbatim, but model types and parameterizations are standard knowledge

### Industry Case Studies
- NHS (UK) — extensive DES for capacity planning (ED patient flow, surgical scheduling, bed management)
- MIMAC semiconductor fab datasets — 5-6 standardized fab models widely used in research
- Port operations — published DES models of container terminal operations

---

## Classic / Foundational DES Models

These should form the core seed content — the building blocks every practitioner should know.

### Queueing Models
| Model | Description | Domain |
|-------|-------------|--------|
| M/M/1 Queue | Single server, Poisson arrivals, exponential service | Universal |
| M/M/c Queue | Multi-server extension | Call centers, service |
| M/G/1 Queue | General service time distribution | Manufacturing |
| G/G/c Queue | General arrivals and service | General purpose |
| M/M/1/K Queue | Finite capacity (blocking) | Manufacturing buffers |
| Jackson Network | Open queueing network | Job shops, networks |
| Gordon-Newell Network | Closed queueing network | Computer systems |
| Fork-Join Queue | Parallel processing with synchronization | Assembly, MapReduce |

### Manufacturing Models
| Model | Description |
|-------|-------------|
| Job Shop | Multiple machine types, varied routings |
| Flow Shop | Linear sequence of operations |
| Flexible Manufacturing System (FMS) | Multi-product, shared resources, AGVs |
| Kanban Pull System | Toyota-style pull production |
| Assembly Line Balancing | Workstation assignment and balancing |
| Machine Breakdown/Repair | Reliability modeling |
| Batch Processing | Furnace, oven, chemical reactor models |

### Service Systems
| Model | Description |
|-------|-------------|
| Bank Teller | Multi-teller with customer types |
| Emergency Department | Triage, treatment, bed assignment |
| Call Center | Multi-skill agents, abandonment, callbacks |
| Airport Security Checkpoint | Screening, secondary inspection |
| Fast Food Restaurant | Order, prep, serve pipeline |
| Hospital Bed Management | Admission, transfer, discharge |

### Logistics & Supply Chain
| Model | Description |
|-------|-------------|
| Inventory (s,S) Policy | Reorder point, order-up-to |
| Newsvendor Problem | Single-period inventory |
| (R,Q) Inventory Policy | Periodic review |
| Warehouse Order Picking | Pick, pack, ship |
| Container Terminal | Ship, crane, truck operations |
| Vehicle Routing / Dispatching | Fleet management |

### Other Classic Models
| Model | Description |
|-------|-------------|
| Barbershop (reneging/balking) | Customer impatience |
| Carwash | SimPy's classic example |
| Gas Station | Finite resource contention |
| Elevator System | Dispatching algorithms |
| Traffic Intersection | Signal timing optimization |

---

## Estimated Initial Catalog Size

| Source | Estimated Models |
|--------|-----------------|
| Classic/foundational descriptions | 30-40 |
| SimPy ecosystem (GitHub) | 100-200 |
| CoMSES Net (DES subset) | 50-100 |
| JaamSim examples | 15-20 |
| AnyLogic Cloud (public) | 50-100 |
| WSC proceedings (model extractions) | 50-100 |
| Ciw + Salabim examples | 30-40 |
| Open-access journal papers | 30-50 |
| **Total initial seed** | **350-650 models** |
