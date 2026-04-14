# User Search as Seeder Signal

Every user search on SimVault is a data point about what practitioners actually need. Failed searches — where a user looked for something SimVault does not have or does not cover well — are an especially valuable signal: a user is effectively saying, "I expected to find a model of X here, and I did not." That is exactly what the [AI Agent Seeder](045_ai_agent_seeder.md) should prioritize discovering next.

This document describes how user search behavior feeds the Seeder's priority queue.

## The Core Idea

The Seeder's search budget is limited. It can only pursue so many candidates per cycle. The question is how to prioritize. Several obvious strategies exist:

- **Breadth-first over a fixed source list** — systematically work through arXiv, GitHub, PMC, etc.
- **Topic-based crawling** — follow citations and links from known good content
- **Domain coverage gaps** — target domains where SimVault has little content (e.g., energy, mining)

User search behavior is a fourth and arguably strongest signal: **let the people tell the Seeder what to hunt for next.**

## How It Works

### Capture
Every search query on SimVault is logged with minimal metadata:

- The query text
- The number of results returned
- Whether the user clicked any result
- Timestamp and (optionally) anonymized user or session identifier

No personally identifying information is stored. The goal is aggregate topic signal, not individual tracking.

### Classify
Searches are classified into three buckets:

- **Successful** — returned relevant results, the user engaged with one
- **Thin** — returned results but the user didn't engage, suggesting the match was weak
- **Empty** — returned no results at all

**Empty and thin searches are the priority feed.** They represent unmet demand.

### Aggregate
Queries are normalized and aggregated to surface patterns:

- Individual searches are embedded semantically
- Similar queries are clustered (e.g., "ENT clinic model," "otolaryngology patient flow," "ENT outpatient simulation" all cluster together)
- Clusters are ranked by frequency, recency, and source diversity (searches from many different users > repeated searches from one user)

### Feed to the Seeder
Top-ranked clusters enter the Seeder's **search priority queue**. The next Seeder cycle uses these clusters to drive targeted discovery:

- Reformulate the cluster into an effective search query
- Run the discovery pipeline (search → fetch → evaluate → add)
- Create or enrich entries addressing the cluster topic
- Log the cluster's status — did the Seeder successfully add content? Or is the topic still uncovered?

### Close the Loop
When the Seeder successfully adds content for a cluster, the next time a user searches for that topic they find something. This is the **feedback loop** that turns user needs into catalog growth.

## Why This Matters

### It Solves the Prioritization Problem
Without user signal, the Seeder's priorities are arbitrary — whoever designed the source list decides what gets covered first. With user signal, priorities are **demand-driven**. The catalog grows in the directions users actually care about.

### It Turns Failure Into Fuel
Empty searches would otherwise be pure friction — a user came, didn't find what they needed, and left. Capturing the query transforms that failure into a concrete improvement task. The next user searching for the same thing may find something.

### It Surfaces Niche Topics the Team Wouldn't Think Of
No team, no matter how experienced, can anticipate every topic practitioners care about. User search captures the **long tail** — rare but valuable topics that would never make a hand-authored priority list. ENT clinic models are a good example: unlikely to be in anyone's top-50 topic list, but real practitioners genuinely need them.

### It Makes the Platform Feel Responsive
A user who returns a week later and finds that their previously-empty search now has content experiences SimVault as an **active, growing** platform rather than a static catalog. This compounds over time — users learn that searching is worth doing because the platform listens.

## Privacy and Ethics

User search is sensitive data, even when it's non-personal. Some principles:

- **Log queries, not identities** — aggregate demand, not individual behavior
- **Anonymize quickly** — session IDs can help detect bot spam but should not persist
- **Don't surface raw search logs** — aggregate signals, not individual queries, should be visible to editors
- **Respect explicit opt-outs** — users who prefer their searches not be logged should have that option

The goal is measuring topic demand, not profiling users.

## v1 Scope

SimVault v1 can start minimally:

- Log query text and result counts
- Daily batch aggregation into simple clusters
- A dashboard showing the top N unmet search topics
- Editorial team manually adds top unmet topics to the Seeder's priority list

Full automated feedback (Seeder reads the cluster list directly, no human intermediary) is a v2 enhancement. Even the manual version delivers most of the value — human editors get a weekly list of "topics our users searched for and didn't find" and can immediately direct the Seeder at them.

## Vision

In the full-featured version, the feedback loop runs automatically and continuously:

- Searches are logged and clustered in real time
- The Seeder pulls its next batch of targets from the top of the search cluster list
- Successful additions update the cluster's status, deprioritizing it
- Failed attempts (Seeder couldn't find sources for a cluster) are flagged for human attention
- Users who previously searched for a cluster topic could optionally receive a notification when content appears — though this requires account-linked search history and crosses into personalization territory that may or may not fit v1's privacy stance

In this vision, SimVault becomes genuinely **demand-driven** — the catalog's growth direction is set by its users, moderated by human editors and the AI Seeder working together.

## Relationship to Other Seeder Signals

User search signal is one of several inputs to the Seeder's priority queue. Others include:

- **Domain coverage gaps** — editor-identified domains that are underrepresented
- **Freshness decay** — entries whose underlying sources are aging out and need refresh
- **Citation chains** — papers that cite models already in the catalog (likely new variants or related work)
- **Trending external activity** — a sudden spike in GitHub stars, paper downloads, or conference talks on a topic

User search is likely the **highest-signal** of these for a consumer-facing platform, because it directly measures what people actually came looking for. A robust Seeder combines all of these signals rather than relying on any one.
