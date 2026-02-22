# Response to Nicole — Tooltip Improvements

**Subject:** Quodsi Update: Added help tooltips based on your feedback

---

Hi Nicole,

Thank you for the great feedback on Quodsi! Your suggestion about adding more help text when hovering over words was spot-on — we want the tool to be approachable for process professionals, not just simulation engineers.

We've added informational tooltips (hover over the small "i" icons) throughout the editors. Here's what's new:

**Activity Editor**
- **Activity Name** — explains what the name is used for in the model and results
- **Enable Financial Tracking** checkbox — describes what turning this on does: tracks fixed costs, per-entity charges, and time-based rates, with results appearing in simulation output
- **Enable Failure Simulation** checkbox — explains that this simulates equipment breakdowns using MTBF/MTTR timing (directly related to your feedback about needing MTBF and MTTR as activity inputs!)
- **Action Types** — each action type (Delay, Seize Resource, Split Entity, etc.) now shows a plain-language description of what it does directly below the dropdown, so you don't have to guess

**Generator Editor**
- **Advanced Settings** — tooltip explaining what's inside (occurrence count, start delay, batch size, max entities) so you know whether you need to open it

**Resource Editor**
- **Enable Financial Tracking** checkbox — explains the cost types tracked (per-seize charges, hourly utilization/idle rates)

**States Editor**
- Added a tooltip explaining what state variables are and when to use them (conditional routing, tracking attributes like priority level, counting occurrences)

**Resource Requirements**
- **Build Custom** tab — tooltip explaining the ALL/ANY team logic for combining resource needs

These tooltips join the ones we already had on fields like capacity, queue sizes, distribution types, financial cost fields, failure timing, and routing configuration. The goal is that you should be able to hover over any label or "i" icon and get a plain-English explanation of what it means.

We'd love to hear if there are specific fields or concepts that still feel unclear after trying these out. Your "30-60 minutes of playing around" feedback has been incredibly valuable — keep it coming!

Best,
[Your name]
