# ALM X++ MCP Server

<!-- mcp-name: io.github.alimbenhelal-pro/alm-xpp-mcp -->

[![MCP Registry Approved](https://img.shields.io/badge/MCP_Registry-Approved-4ade80?style=flat-square)](https://modelcontextprotocol.io/registry)
[![Version](https://img.shields.io/badge/version-1.2.0-0ea5e9?style=flat-square)](https://www.almxpp.com)
[![Tools](https://img.shields.io/badge/tools-50-a78bfa?style=flat-square)](https://www.almxpp.com/docs)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)

**ALM X++ MCP** is a cloud-hosted Model Context Protocol server purpose-built for **Dynamics 365 Finance & Operations** professionals. It connects any MCP-compatible AI assistant to a pre-built index of the entire D365 F&O standard codebase -- 300,000+ AOT objects, 900,000+ label entries, compiled call graphs, and security chain data -- and delivers accurate, real-time answers inside your IDE with zero local setup required.

Compatible with GitHub Copilot Chat, Microsoft 365 Copilot, Claude Desktop, Cursor, and Visual Studio 2022 17.14+.

---

## 50 Available Tools

### Knowledge Base & Discovery

| Tool | Description |
|---|---|
| `search_d365_code` | Natural language and keyword search across the D365 F&O codebase. Finds tables, classes, forms, views, enums, EDTs, security objects, and code chunks ranked by relevance. Use when the exact object name is unknown. |
| `get_object_details` | Returns the complete metadata for a named AOT object: fields, methods, relations, base classes, implemented interfaces, and source code preview. Use when the exact name is known. |
| `list_objects` | Lists every AOT object matching a type (e.g. AxTable, AxClass, AxForm) and optionally a model name. Returns the full inventory with counts. |
| `get_index_stats` | Returns indexed chunk counts broken down by AOT type and model. Useful for understanding index coverage and verifying that a custom model was ingested correctly. |
| `healthcheck` | Reports the server status, loaded index version, custom model path, and count of active tools. Use to confirm the server is up and the expected index is loaded. |
| `list_custom_model_objects` | Scans a local custom AOT model folder on disk and lists all objects found. Requires the custom model path to be configured. |

### Relations & Cross-References

| Tool | Description |
|---|---|
| `get_relation_graph` | Returns the complete bidirectional relation graph for an AOT object in O(1) time. Includes foreign keys, table inheritance, composite data sources, form data sources, and entity mappings. |
| `find_related_objects` | Traverses foreign-key and data-source relations from a starting object and returns all directly and transitively related tables, forms, and entities. |
| `find_references` | Impact analysis: finds every object in the index that references a given table, class, method, EDT, or enum. Essential before renaming or deleting anything. |
| `find_extensions` | Discovers all Chain-of-Command (CoC) extensions, event handler subscriptions, table extensions, and form extensions that target a specific base object. |
| `find_callers` | Uses the compiled XRef call graph to find every method that calls a specific method across the entire codebase. Returns caller file, class, and method name. |
| `find_entity_for_table` | Finds all OData and DMF data entities that expose a given table. Returns entity name, public collection name, and the fields surfaced. |

### Code Quality & Validation

| Tool | Description |
|---|---|
| `validate_best_practices` | Scans an AOT object for D365 coding standard violations: missing RecId/DataAreaId handling, unsafe casting, improper transaction usage, select without firstOnly, and security exposure. |
| `detect_performance_issues` | Detects performance anti-patterns: N+1 query loops, row-by-row processing that should be set-based, missing firstonly hints, and unindexed field access in WHERE clauses. |
| `explain_code_complexity` | Calculates cyclomatic complexity, nesting depth, and method length for every method in an object. Highlights the most complex methods and suggests where to split logic. |
| `find_error_patterns` | Matches a runtime error message or symptom against a knowledge base of known D365 error patterns and returns the likely source location, root cause, and recommended fix. |
| `validate_aot_pattern` | Validates an AOT object against schema and naming convention rules: required fields (RecId, DataAreaId, RecVersion), naming prefixes, mandatory relations, and security assignments. |

### Code Generation

| Tool | Description |
|---|---|
| `generate_data_entity` | Generates a complete D365 data entity AOT XML definition from a table specification. Includes field mappings, public collection name, security privilege stubs, and OData annotations. |
| `generate_query` | Generates a correct X++ select statement and equivalent T-SQL query for a given table with joins, range filters, and sort order. Takes into account the actual table relations from the index. |
| `generate_diagram` | Generates Mermaid diagrams: entity-relationship (ER) diagrams from table relations, security chain diagrams from role/duty/privilege trees, and execution flow diagrams from method call graphs. |
| `generate_unit_test` | Generates a SysTest unit test class for an AOT object or method. Populates test data using real field names from the index and creates mock stubs where needed. |
| `suggest_refactoring` | Analyses an object's methods and suggests concrete refactoring improvements: extract method, replace nested conditionals with guard clauses, convert row-by-row loops to set-based operations. |
| `generate_fdd_telemetry` | Generates D365 telemetry and instrumentation stubs (SysTelemetry, EventSource) aligned with a Functional Design Document. Creates event classes and listener registrations. |
| `generate_release_package_manifest` | Builds a structured release package manifest from a sprint's work items. Lists included objects, impacted modules, deployment steps, and rollback notes. |

### Security & Licensing

| Tool | Description |
|---|---|
| `trace_security_chain` | Traverses the full D365 security model downward: Role -> Duty -> Privilege -> Entry Point and table permissions. Returns the complete chain with all intermediate objects. |
| `trace_role_license_tree` | Builds the complete license assignment tree rooted at a security role. Maps every duty and privilege to its inferred license type (Activity, Team Member, Operations). |
| `analyze_license_architecture` | Analyses the full license architecture of a D365 environment model. Summarises license demand by role, identifies over-licensed users, and flags roles requiring premium licenses. |

### Azure DevOps Integration

| Tool | Description |
|---|---|
| `ado_query_workitems` | Queries Azure DevOps work items using WIQL or natural language. Supports filtering by type (Bug, Task, User Story, FDD, RDD), sprint, area path, tag, and assignment. |
| `ado_analyze_workitem` | Performs deep technical analysis of a single work item. Enriches the description with live D365 knowledge base data: related objects, impacted code paths, and suggested implementation steps. |
| `ado_post_comment` | Posts a formatted comment on a work item. Supports rich text with tables and code blocks. Used by agents to document analysis results directly in ADO. |
| `ado_create_task` | Creates a development task under a parent work item with correct title formatting (FDD/RDD/IDD naming conventions), branch suggestion, and estimated hours. |
| `ado_list_prs` | Lists pull requests in an Azure DevOps project. Filters by status (active, completed, abandoned), author, target branch, and date range. |
| `ado_analyze_pr_impact` | Analyses the D365 impact of a pull request's file changes. Cross-references modified objects against the knowledge base to identify downstream risks, broken CoC chains, and missing test coverage. |
| `ado_post_pr_comment` | Posts an automated code review comment on a pull request. Formats findings as structured review threads with severity levels. |
| `ado_gap_fit_analysis` | Performs a Gap/Fit analysis between a business requirement (from a work item) and standard D365 functionality. Classifies each requirement as Fit, Gap, or Workaround with supporting evidence from the codebase. |
| `ado_estimate_effort` | Generates a structured effort estimate for a work item broken into phases: Analysis, Development, Testing, and Deployment. Takes into account codebase complexity discovered from the index. |
| `ado_auto_test_scenario` | Generates test scenarios and acceptance criteria from a work item's description and acceptance criteria fields. Produces step-by-step functional test cases. |
| `ado_changelog_from_prs` | Builds a formatted release changelog from merged pull requests in a date range or sprint. Groups changes by module and highlights breaking changes. |
| `ado_knowledge_gap_detector` | Analyses a sprint's work items and identifies knowledge gaps: objects without documentation, areas with no indexed code, and tasks that reference unknown components. |
| `sprint_capacity` | Analyses a sprint's work item load against team member capacity. Identifies overloaded members, unassigned items, and items without estimates. |

### Functional Domain Analysis

| Tool | Description |
|---|---|
| `generate_fdd` | Generates a Functional Design Document for a D365 business process or feature area. Structures the output with scope, process flow, configuration requirements, and gap analysis. |
| `explain_security_role` | Produces a plain-language explanation of what a D365 security role grants access to: which modules, forms, tables, and operations are permitted, and what license it requires. |
| `explain_workflow` | Explains a D365 workflow configuration: the approval steps, conditions, escalation paths, and the objects and tables involved in the workflow lifecycle. |
| `describe_report` | Describes a D365 SSRS or Electronic Reporting (ER) report: data sources, parameters, output format, and the business process it supports. |
| `translate_error_for_business` | Translates a technical D365 error message or stack trace into a plain-language explanation suitable for a functional consultant or end user, with suggested resolution steps. |

### Business Intelligence & Process

| Tool | Description |
|---|---|
| `map_business_process` | Maps a standard D365 business process (Order-to-Cash, Procure-to-Pay, Record-to-Report, etc.) to the underlying tables, classes, forms, and menu items that implement it. |
| `analyze_upgrade_impact` | Assesses the risk of upgrading a D365 environment by analysing CoC extensions and event handlers against changes in the standard codebase. Flags broken customisations and high-risk overlaps. |
| `explain_for_business` | Generates a non-technical, business-readable description of an AOT object or process. Explains what the object does, which business scenarios it supports, and how it fits the broader module. |

### Label Resolution

| Tool | Description |
|---|---|
| `search_labels` | Resolves D365 label IDs (e.g. @SYS12345, @FIN001, @TRX900) to their text values in any supported language (EN, FR, DE, NL, AR, and more). Also supports reverse lookup: find a label ID from its text. Covers 900,000+ entries across all label files. |

### Orchestration & Diagnostics

| Tool | Description |
|---|---|
| `plan_and_execute` | Chains multiple tools autonomously to complete a multi-step analysis goal. The agent plans the required tool calls, executes them in sequence, and synthesises a final structured answer. |
| `analyze_trace` | Parses and analyses a D365 X++ execution trace file. Identifies the most expensive method calls, call chains, and potential bottlenecks, then cross-references them with the codebase index. |

---

## Connect

### GitHub Copilot / VS Code -- `.vscode/mcp.json`

```json
{
  "servers": {
    "alm-xpp-mcp": {
      "type": "http",
      "url": "https://www.almxpp.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_LICENSE_KEY"
      }
    }
  }
}
```

### Cursor -- `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "alm-xpp-mcp": {
      "url": "https://www.almxpp.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_LICENSE_KEY"
      }
    }
  }
}
```

### Claude Desktop -- `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "alm-xpp-mcp": {
      "url": "https://www.almxpp.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_LICENSE_KEY"
      }
    }
  }
}
```

> A license key is required. Request one at [almxpp.com](https://www.almxpp.com).

---

## Links

- Website: [www.almxpp.com](https://www.almxpp.com)
- Docs: [www.almxpp.com/docs](https://www.almxpp.com/docs)
- Support: [www.almxpp.com/support](https://www.almxpp.com/support)