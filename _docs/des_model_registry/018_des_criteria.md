# DES Qualification Criteria

SimVault is a catalog of **discrete event simulation** models specifically. Other simulation paradigms — continuous simulation, system dynamics, pure optimization, agent-based models without discrete event mechanics — are out of scope for the main catalog.

This document defines the rubric used to decide whether a candidate model qualifies for inclusion. Both human editors and the [AI Agent Seeder](045_ai_agent_seeder.md) use this same rubric so their judgments align.

## The Rubric

### Required Criteria (all must be present)

A candidate qualifies as a DES model only if it exhibits **all three** of the following:

1. **Discrete entities** — The model includes identifiable things that flow through the system. These can be patients, parts, orders, calls, vehicles, customers, packets, etc. Continuous quantities or aggregate levels alone do not qualify.

2. **Discrete events** — State changes happen at specific points in simulated time, not continuously. Something happens, the system changes, time advances to the next event.

3. **Time progression** — The model has an explicit notion of simulated time that advances between events. Models without a time dimension (static optimization problems, snapshot calculations) are out of scope.

### Typical but Not Required

The following are characteristic of most DES models but are not required for qualification:

4. **Resource contention or queueing** — Entities compete for limited capacity at one or more points in the system. This is present in most DES models but not all. A model that simulates "how long does this process take" with just activities and durations is still a valid DES model even without resources.

5. **Stochastic elements** — At least one source of randomness, such as inter-arrival times, service durations, or routing probabilities. Stochasticity is typical but not required — deterministic DES models are valid (useful for teaching, best-case analysis, and scenario comparison).

## Rationale for Being Strict

Being strict keeps SimVault focused and authoritative. Several paradigms that are sometimes lumped with DES are deliberately excluded:

- **Continuous simulation** (differential equations, fluid flow, physical dynamics) — different mechanics, different tools, different audience
- **System dynamics** (stocks and flows, feedback loops) — different mental model, different tools (Vensim, Stella)
- **Pure optimization** (LP, MIP, scheduling) — no time progression, no simulated execution
- **Agent-based models without discrete events** — if the model is purely about agent interactions without queueing, service activities, or event scheduling, it's ABM not DES

Borderline cases are handled by community review. When in doubt, an entry can be flagged with a note about its qualification and promoted or demoted as editors reach consensus.

## How the Rubric Is Used

### By the AI Agent Seeder
When the Seeder finds a candidate source (paper, repo, blog post, video), it evaluates the candidate against the rubric before creating a new entry. Candidates that clearly fail are discarded. Candidates that clearly pass enter the AI Discovered tier. Ambiguous candidates are flagged for human review.

### By Human Editors
When reviewing a new contribution or promoting an entry from one status to the next, editors check that the model still satisfies the required criteria. If an entry drifts into non-DES territory (e.g., a contributor added extensive continuous dynamics), editors can flag the qualification status and either split the content or move the entry out of the catalog.

### By the AI Criteria Check Service
A dedicated service runs the rubric against new context as it's added to an entry, flagging when the content might no longer satisfy the required criteria. See [047_ai_services_catalog.md](047_ai_services_catalog.md).

## Adjacent-But-Not-DES Content

SimVault may eventually support an "Adjacent" section for related modeling paradigms (system dynamics, ABM, continuous simulation), clearly separated from the main DES catalog. This is out of scope for v1 but worth keeping in mind as a future expansion that respects the strict core while acknowledging practitioner interest in adjacent techniques.

---

## Worked Example: Airport Security Checkpoint

As a concrete demonstration, here is how the rubric applies to an Airport Security Checkpoint Passenger Flow model (see [the Seeder walkthrough](200_seeder_walkthrough_airport_security.md) for the full discovery exercise this example came from).

### Required Criteria

**Discrete entities — PASS.** Passengers are discrete, identifiable entities flowing through the system. Carry-on bags are also discrete (and may be modeled as sub-entities).

**Discrete events — PASS.** State changes happen at specific moments: passenger arrives, passenger begins document check, document check completes, passenger begins X-ray, X-ray completes, secondary screening begins, etc. Nothing changes continuously.

**Time progression — PASS.** The model has an explicit simulated clock that advances across a full day of operations, with events scheduled at specific times.

### Typical Criteria

**Resource contention — PASS.** Travel Document Checkers, Transportation Security Officers, X-ray machines, AIT scanners, and screening lanes are all finite-capacity resources that passengers compete for. Queue formation is central to the model's purpose.

**Stochasticity — PASS.** Passenger interarrival times follow a Poisson process (often time-varying). Service times are typically exponential or uniform. Secondary screening is triggered by a stochastic alarm rate.

### Verdict

**Strong qualification.** All three required criteria and both typical criteria are satisfied. This is a textbook DES model and belongs in the main catalog.

### What a Borderline Case Might Look Like

For contrast, consider a candidate that would fail:

- An agent-based crowd simulation showing pedestrian movement through an airport terminal, with no queueing at service points and no scheduled events — **fails on discrete events** (movement is modeled continuously by agent rules)
- A pure linear programming model that solves for optimal TSO allocation given a given passenger demand profile — **fails on time progression** (no simulated execution, just an optimization snapshot)
- A Markov chain analysis of the security system's steady-state behavior — **fails on discrete events and time progression** (analytic solution, no event-driven simulation)

Each of these is valuable in its own right, but none of them is DES.
