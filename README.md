# almxppmcp

> **npx launcher** for the [ALM XPP](https://almxpp.com) **Cloud MCP** - a Dynamics 365 Finance & Operations AI agent exposing **90 tools** over MCP.

The server answers from a pre-built index of the standard D365 F&O codebase:
**200K+ AOT objects**, **1.3M+ code chunks**, **25M+ cross-references** and
**24M+ label translations** -- 392K label ids rendered across 74 languages.

### Three servers, three roles

Three different MCP servers show up around D365 F&O. This README always calls them by these names:

| Name | What it is | How you get it |
|---|---|---|
| **Cloud MCP** | The hosted ALM XPP server: 90 tools over the indexed D365 codebase | this package -- `npx almxppmcp` |
| **Local MCP** | Runs on your own dev machine, next to the D365 SDK: 121 tools, 36 of which write AOT files, compile X++, sync the database | separate licensed component, see <https://almxpp.com> |
| **Environment MCP** | Microsoft's own **[Dynamics 365 ERP MCP server](https://learn.microsoft.com/dynamics365/fin-ops-core/dev-itpro/copilot/copilot-mcp)**, exposed by your F&O environment itself, serving live data | enabled inside D365FO -- most clients connect to it directly, see below |

This npm package ships only the **Cloud MCP** launcher and the command that connects to the **Environment MCP**.
The Local MCP is not distributed here.

## Requirements

- Node.js >= 18
- An API token -- get one at the [dashboard](https://almxpp.com/account/dashboard)

---

## Quick Start

```bash
npx almxppmcp --api-key YOUR_TOKEN
```

or set the environment variable:

```bash
export ALMXPPMCP_API_KEY=YOUR_TOKEN
npx almxppmcp
```

---

## MCP Client Configuration

### VS Code / GitHub Copilot -- `.vscode/mcp.json`

```json
{
  "servers": {
    "almxppmcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "almxppmcp", "--api-key", "YOUR_TOKEN"]
    }
  }
}
```

### Cursor -- `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "almxppmcp": {
      "command": "npx",
      "args": ["-y", "almxppmcp", "--api-key", "YOUR_TOKEN"]
    }
  }
}
```

### Claude Desktop -- `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "almxppmcp": {
      "command": "npx",
      "args": ["-y", "almxppmcp", "--api-key", "YOUR_TOKEN"]
    }
  }
}
```

> **Tip:** replace `YOUR_TOKEN` with the token shown on your dashboard. Set it as an env var to avoid hard-coding it
> (root key is `mcpServers` for Cursor and Claude Desktop, `servers` for VS Code):
>
> ```json
> {
>   "mcpServers": {
>     "almxppmcp": {
>       "command": "npx",
>       "args": ["-y", "almxppmcp"],
>       "env": { "ALMXPPMCP_API_KEY": "YOUR_TOKEN" }
>     }
>   }
> }
> ```

---

## Environment Variables

| Variable | Description |
|---|---|
| `ALMXPPMCP_API_KEY` | Your API token (alternative to `--api-key`) |
| `ALMXPPMCP_SERVER_URL` | Override the MCP endpoint (default: `https://api.almxpp.com/mcp`) |

---

## Connecting to the Environment MCP

The Cloud MCP answers from a pre-built index of the codebase. It does **not** read your environment's data.
Live data comes from Microsoft's **Dynamics 365 ERP MCP server**, which your F&O environment exposes at
`https://<your-env>/mcp` once enabled under `Allowed MCP clients`
([Microsoft documentation](https://learn.microsoft.com/dynamics365/fin-ops-core/dev-itpro/copilot/copilot-mcp)).

> **Most clients do not need anything from this package to reach it.**
> Visual Studio Code, Copilot Studio, Microsoft Cowork and the Finance Agent are allowed by default and
> connect over plain HTTP, VS Code handling the sign-in itself
> ([official VS Code walkthrough](https://learn.microsoft.com/dynamics365/fin-ops-core/dev-itpro/copilot/mcp/mcp-vscode)).
> In VS Code: `MCP: Add Server...` > `HTTP` > `https://<your-env>/mcp`. That is the recommended route.

`almxppmcp-d365fo-proxy` exists only for clients that cannot obtain a Microsoft Entra token themselves.
That is the single problem it solves: it signs in with Azure CLI, keeps the token fresh, and exposes the
Environment MCP over stdio. It adds no tools of its own -- every tool you see comes from your environment.

The token is obtained on your own machine, so nothing about your environment transits through the Cloud MCP.

In the examples below, `d365fo-data` is simply the server name chosen in the config file. Rename it freely.

So the split is:

- **Cloud MCP** (`almxppmcp`): KB, custom code, relations, Azure DevOps, generation
- **Environment MCP** (Dynamics 365 ERP MCP server): live data from your own environment

### What the command does

- runs as a stdio MCP server for Copilot, Cursor, or Claude
- acquires a Microsoft Entra bearer token with `az account get-access-token` and refreshes it every 45 minutes
- forwards JSON-RPC messages to the Environment MCP
- preserves `mcp-session-id` across requests
- handles plain JSON and `text/event-stream` responses

### Configuration

Required environment variables:

| Variable | Description |
|---|---|
| `D365FO_MCP_URL` | Full remote MCP URL, for example `https://your-env.sandbox.operations.dynamics.com/mcp` |
| `D365FO_RESOURCE` | D365FO resource URL, for example `https://your-env.sandbox.operations.dynamics.com` |
| `D365FO_TENANT_ID` | Optional tenant override for Azure CLI token acquisition |

Example VS Code MCP configuration:

```json
{
  "servers": {
    "almxppmcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "almxppmcp"],
      "env": {
        "ALMXPPMCP_API_KEY": "YOUR_TOKEN"
      }
    },
    "d365fo-data": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "-p", "almxppmcp", "almxppmcp-d365fo-proxy"],
      "env": {
        "D365FO_MCP_URL": "https://YOUR-ENV.sandbox.operations.dynamics.com/mcp",
        "D365FO_RESOURCE": "https://YOUR-ENV.sandbox.operations.dynamics.com"
      }
    }
  }
}
```

### Prerequisites for this command

1. Install Azure CLI and run `az login`
2. In D365FO, open `Allowed MCP clients`
3. Add the Azure CLI client id `04b07795-8ddb-461a-bbee-02f9e1bf7b46` and mark it as allowed

> **Weigh this before doing it.** That client id is the *universal* Azure CLI application, shared by every
> Azure CLI user in the tenant. Allowing it opens the Environment MCP to anyone who can run `az login`
> against your tenant. Visual Studio Code has its own dedicated client id and is allowed out of the box,
> so connecting VS Code directly avoids this trade-off entirely.

Note:

- this client id is configured in D365 only
- do not put it in your MCP JSON
- MCP JSON only needs the command and the relevant URL/env values

### Recommended usage pattern

Use the Cloud MCP and the Environment MCP together:

- ask the **Cloud MCP** to identify the table, entity, relations, custom extensions, and related work items
- ask the **Environment MCP** to inspect the real environment data, forms, or custom actions
- cross the results in the chat to connect KB, custom code, work items, and live data

See [`examples/vscode-mcp.d365fo-data.json`](examples/vscode-mcp.d365fo-data.json) for a ready-to-use setup.

---

## What tools are available?

The **Cloud MCP** exposes **90 tools** across 14 categories, listed below.

The **Local MCP** carries the 85 of them that do not depend on the cloud index, plus **36 more** that must
run next to your D365 environment (build, deploy, database sync, workspace writes) -- 121 tools on that side.
Across both servers the toolbox is **126 distinct tools**.

| Category | Tools | Names |
|---|---:|---|
| **Search** | 5 | `search_d365_code`, `search_labels`, `batch_search`, `federated_search`, `search_context_docs` |
| **Retrieve** | 6 | `get_object_details`, `list_objects`, `list_custom_model_objects`, `get_object_context`, `compare_objects`, `get_menu_item_info` |
| **Relations & Impact** | 11 | `find_related_objects`, `find_references`, `find_extensions`, `get_relation_graph`, `find_entity_for_table`, `find_callers`, `find_change_impact`, `find_event_handlers`, `find_relation_path`, `find_similar_implementations`, `trace_field_lineage` |
| **Quality & Analysis** | 7 | `validate_best_practices`, `detect_performance_issues`, `find_error_patterns`, `fix_best_practice_violations`, `recommend_extension_strategy`, `suggest_edt`, `validate_object_naming` |
| **Security & Licensing** | 4 | `trace_security_chain`, `trace_role_license_tree`, `get_security_coverage_for_object`, `generate_security_report` |
| **Code Generation** | 8 | `generate_unit_test`, `suggest_refactoring`, `generate_diagram`, `generate_query`, `create_aot_object`, `generate_data_entity`, `generate_xpp_form`, `generate_xpp_template` |
| **Functional Domain** | 2 | `generate_fdd`, `explain_workflow` |
| **Differentiators** | 2 | `analyze_upgrade_impact`, `map_business_process` |
| **Upgrade & Release Notes** | 6 | `resolve_client_profile`, `save_client_profile`, `list_release_note_inputs`, `prepare_release_note_context`, `generate_release_note_document`, `diff_model_versions` |
| **Live Environment** | 5 | `d365fo_set_connection`, `d365fo_clear_connection`, `odata_export_entity`, `odata_upsert_rows`, `get_data_entity_info` |
| **Data Migration** | 7 | `dmf`, `dmf_create_data_project`, `dmf_apply_entity_filter`, `dmf_import_file`, `dmf_export_package`, `dmf_get_job_status`, `dmf_transform_excel` |
| **Performance Diagnostics** | 4 | `appinsights_set_connection`, `appinsights_clear_connection`, `appinsights_query`, `appinsights_diagnose_slowness` |
| **Orchestration & Reporting** | 6 | `plan_and_execute`, `summarize_for_stakeholder`, `resolve_workspace_roots`, `resync_devops_index`, `healthcheck`, `get_output_page` |
| **Azure DevOps** | 17 | `ado_query_workitems`, `ado_analyze_workitem`, `ado_list_prs`, `ado_analyze_pr_impact`, `ado_gap_fit_analysis`, `ado_estimate_effort`, `ado_post_comment`, `ado_post_pr_comment`, `ado_create_task`, `ado_read_attachment`, `ado_update_workitem`, `ado_review_xpp_pr`, `ado_pr_dependency_map`, `ado_wiki_list`, `ado_wiki_get_page`, `ado_wiki_create_or_update_page`, `ado_wiki_delete_page` |

Beyond code search, the notable capabilities are:

- **Upgrade impact** - compare two D365 versions against *your own* customisations and
  produce the regression report as Word and PowerPoint.
- **Live environment** - connect to a running environment, read and write real records
  over OData, run Data Management projects.
- **Performance diagnostics** - query Application Insights telemetry and get a ranked
  diagnosis of what is actually slow.
- **Azure DevOps** - work items, pull requests, wiki, from analysis to review.

Full reference with parameters and example prompts: <https://www.almxpp.com/docs>

---

## What is in this repository

This repository holds the **client side only** — the `npx` launcher published to
npm as [`almxppmcp`](https://www.npmjs.com/package/almxppmcp):

| Path | Purpose |
|---|---|
| `bin/almxppmcp.js` | Resolves the API key and server URL, then connects your client to the Cloud MCP via `mcp-remote` |
| `bin/almxppmcp-d365fo-proxy.js` | Optional: connects your client to the Environment MCP, obtaining the Entra token for it |
| `examples/` | Ready-to-copy VS Code MCP configurations |
| `server.json` | MCP registry manifest |

The Cloud MCP itself — index, retrieval, the 90 tools and the licensing layer — is
closed source and runs at `https://www.almxpp.com/mcp`. The launcher never sees
your code: it forwards requests over HTTPS with the token you provide.

---

## License

MIT
