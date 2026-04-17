# Data Sources

This directory contains modules for accessing data collections stored within LucidChart documents.

## Directory Structure

```
data_sources/
├── base/                      # Base classes and shared utilities
│   └── DataSourceReader.ts    # Abstract base class for data source readers
├── common/                    # Shared constants
├── model/                     # Model metadata reader and repository
└── index.ts                   # Barrel exports
```

## Architecture

Readers extend `DataSourceReader` and provide typed access to specific Lucid data collections. The `model/` reader exposes model metadata; add new readers by creating a new subdirectory, extending the base class, and exporting from the root `index.ts`.
