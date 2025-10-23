# Swimlane Resources - Mapping Lanes to Quodsi Resources

## Overview

This documentation provides comprehensive guidance for mapping LucidChart swimlane lanes to Quodsi Resource simulation components. Swimlanes are commonly used in process diagrams to represent organizational roles, departments, or resources - making them a natural fit for Quodsi's Resource concept.

## What You'll Learn

- How swimlanes and lanes work in LucidChart
- Lucid SDK APIs for programmatic swimlane detection
- Multiple strategies for identifying if a selection is a lane
- Step-by-step implementation guide for lane-to-Resource mapping
- Practical code examples integrated with Quodsi patterns
- Testing and debugging techniques

## Use Case

**Problem:** Users create process diagrams with swimlanes where each lane represents a department, role, or resource pool. They want to automatically map these lanes to Quodsi Resources without manual recreation.

**Solution:** Detect when a user selects a swimlane lane and automatically convert or map it to a Quodsi Resource simulation object.

**Benefits:**
- Faster model creation from existing diagrams
- Leverage familiar swimlane visual metaphor
- Automatic resource identification from diagram structure
- Reduce manual data entry and errors

## Documentation Structure

### [01. Swimlane Overview](./01_swimlane_overview.md)
**What it covers:**
- Introduction to swimlanes in LucidChart
- Lane structure and properties
- Common swimlane patterns (horizontal/vertical)
- User workflows with swimlanes
- Why lanes map well to Resources

**When to read:** Start here to understand swimlanes conceptually

**Time estimate:** 5 minutes

---

### [02. SDK Reference](./02_sdk_reference.md)
**What it covers:**
- Complete Lucid SDK API reference for swimlanes
- `this.$lanes` attribute documentation
- `BlockProxy` properties and methods
- `TableBlockProxy` class (swimlanes may use table structure)
- Container detection with `$contents`
- Links to official Lucid developer documentation

**When to read:** When you need specific API details

**Time estimate:** 10 minutes

---

### [03. Detection Strategies](./03_detection_strategies.md)
**What it covers:**
- Strategy 1: Block class name inspection (`getClassName()`)
- Strategy 2: Property-based detection
- Strategy 3: Parent-child relationship analysis
- Strategy 4: `$lanes` attribute access
- Pros/cons comparison
- Recommended approach for Quodsi

**When to read:** Before implementing lane detection

**Time estimate:** 15 minutes

---

### [04. Implementation Guide](./04_implementation_guide.md)
**What it covers:**
- Architecture considerations for Quodsi
- Where to add lane detection code
- Creating a `LaneDetectionService`
- Integrating with `SelectionHandler`
- Updating `LucidPageAnalyzer`
- Data storage patterns for lane-Resource mappings
- Step-by-step implementation checklist

**When to read:** When ready to implement

**Time estimate:** 20 minutes

---

### [05. Code Examples](./05_code_examples.md)
**What it covers:**
- Complete TypeScript implementations
- Lane detection function
- Selection handler integration
- Resource creation from lanes
- Testing utilities
- Real code matching Quodsi patterns

**When to read:** During implementation for copy-paste examples

**Time estimate:** 15 minutes

---

### [06. Testing Guide](./06_testing_guide.md)
**What it covers:**
- Creating test swimlanes in LucidChart
- Inspection techniques (logging block properties)
- Console debugging patterns
- Verifying lane detection
- Common issues and solutions
- Platform-specific gotchas

**When to read:** When testing your implementation

**Time estimate:** 10 minutes

---

## Quick Start

**Want to get started immediately?**

1. Read [Swimlane Overview](./01_swimlane_overview.md) to understand the concepts
2. Review [Detection Strategies](./03_detection_strategies.md) to choose your approach
3. Follow [Implementation Guide](./04_implementation_guide.md) step-by-step
4. Use [Code Examples](./05_code_examples.md) for working implementations
5. Test with [Testing Guide](./06_testing_guide.md)

## Key Concepts

### Swimlane
A container shape in LucidChart that divides a diagram into parallel sections (lanes). Used to show organizational boundaries, process phases, or resource ownership.

### Lane
An individual section within a swimlane. Each lane typically represents a distinct entity (department, role, resource pool).

### Resource (Quodsi)
A simulation component representing a constrained resource that activities require. Examples: people, machines, rooms, tools.

### Mapping
The process of linking a LucidChart lane to a Quodsi Resource object, either through conversion or reference.

## Lucid SDK Documentation

**Official References:**
- [Lucid Developer Documentation](https://developer.lucid.co/docs/)
- [Attributes Syntax ($lanes)](https://developer.lucid.co/docs/attributes-syntax)
- [lucid-extension-sdk Package](https://developer.lucid.co/docs/lucid-extension-sdk)
- [BlockProxy API Reference](https://developer.lucid.co/docs/blocks)
- [Extension API](https://developer.lucid.co/extension-api/)

**Local SDK Documentation:**
- [BlockProxy Reference](../lucid_offline_sdk_docs/BlockProxy.md)
- [Blocks Guide](../lucid_offline_sdk_docs/Blocks.md)
- [TableBlockProxy](../lucid_offline_sdk_docs/TableBlockProxy.md)

## Related Quodsi Documentation

**Architecture:**
- [Selection Handling](../../editorextensions/quodsi_editor_extension/_docs/architecture/messaging/selection/)
- [Element Operations](../../editorextensions/quodsi_editor_extension/_docs/architecture/messaging/element-ops/)
- [Model Definition](../prompts/Model%20Definition%20Related/)

**Resource Documentation:**
- [Resource Type Overview](../../shared/src/types/elements/Resource.ts)
- [ResourceLucid Implementation](../../editorextensions/quodsi_editor_extension/src/types/ResourceLucid.ts)

**Development:**
- [Development Setup](../development/)
- [Getting Started](../../GETTING_STARTED.md)
- [CLAUDE.md](../../CLAUDE.md)

## Research Notes

This documentation is based on research conducted in October 2024, including:

- Analysis of Lucid SDK documentation (developer.lucid.co)
- Web search for `$lanes` attribute and swimlane APIs
- Review of existing Quodsi block detection patterns
- Examination of `LucidPageAnalyzer` and `SelectionHandler` implementations

**Key Finding:** The Lucid SDK provides a `this.$lanes` attribute that returns an array of object references to individual lanes of a swimlane shape. This is documented in the [Attributes section](https://developer.lucid.co/docs/attributes-syntax).

## Contributing

When updating this documentation:

1. Keep links to official Lucid SDK docs current
2. Update code examples if Quodsi patterns change
3. Add new detection strategies as discovered
4. Include real-world examples and edge cases
5. Cross-reference related Quodsi documentation

## Getting Help

**Issues with lane detection?**
1. Check [Testing Guide](./06_testing_guide.md) troubleshooting section
2. Review browser console logs (F12)
3. Inspect block properties using techniques in [SDK Reference](./02_sdk_reference.md)
4. Compare with [Code Examples](./05_code_examples.md)

**Questions about Resources?**
- See [Resource Type documentation](../../shared/src/types/elements/Resource.ts)
- Review existing Resource editor implementation

**General Quodsi questions?**
- See [CLAUDE.md](../../CLAUDE.md) for project overview
- Check [Development Documentation](../development/)

---

**Ready to start?** → [Swimlane Overview](./01_swimlane_overview.md)

**Know the basics?** → [Detection Strategies](./03_detection_strategies.md)

**Ready to code?** → [Implementation Guide](./04_implementation_guide.md)
