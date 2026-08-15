# almxppmcp

> **npx launcher** for the [ALM XPP MCP](https://almxpp.com) cloud server - a Dynamics 365 Finance & Operations AI agent exposing **90 tools** over MCP.

The server answers from a pre-built index of the standard D365 F&O codebase:
**200K+ AOT objects**, **1.3M+ code chunks**, **25M+ cross-references** and
**392K+ labels** indexed in every language.

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

> **Tip:** replace `YOUR_TOKEN` with the token shown on your dashboard. Set it as an env var to avoid hard-coding it:
>
> ```json
> {
>   "mcpServers": {
>     "almxppmcp": {
>       "command": "npx",
>     "args": ["-y", "almxppmcp"],
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

## Dedicated D365FO Data Environment

Use the bundled `almxppmcp-d365fo-proxy` when you want a second MCP server dedicated to the live D365FO environment data layer.

It now supports both modes:

- local direct mode: your machine gets the D365FO token with Azure CLI and calls the environment directly
- cloud bridge mode: the launcher calls your hosted ALM XPP endpoint, which acquires the D365FO token server-side

This is intentionally separate from `almxppmcp`:

- `almxppmcp`: KB, custom code, relations, Azure DevOps, generation
- `almxppmcp-d365fo-proxy`: live D365FO environment MCP endpoint over Azure CLI auth

### What it does

- runs as a local stdio MCP server for Copilot, Cursor, or Claude
- fetches Azure AD bearer tokens with `az account get-access-token`
- forwards JSON-RPC messages to the D365FO remote MCP endpoint
- preserves `mcp-session-id` across requests
- handles plain JSON and `text/event-stream` responses

### Local direct mode

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

### Cloud bridge mode

Required environment variables:

| Variable | Description |
|---|---|
| `D365FO_PROXY_URL` | Hosted ALM XPP proxy endpoint, for example `https://www.almxpp.com/api/d365fo/mcp` |
| `D365FO_PROXY_API_KEY` | ALM XPP API token used to call the hosted proxy |
| `D365FO_MCP_URL` | Optional but recommended per-user target environment URL |
| `D365FO_RESOURCE` | Optional but recommended per-user resource URL |

In multi-user scenarios, keep the environment URL in each user's MCP config (not in ACA global variables).
The launcher forwards these values to the cloud bridge per request.

Example VS Code MCP configuration:

```json
{
  "servers": {
    "d365fo-data": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "-p", "almxppmcp", "almxppmcp-d365fo-proxy"],
      "env": {
        "D365FO_PROXY_URL": "https://www.almxpp.com/api/d365fo/mcp",
        "D365FO_PROXY_API_KEY": "YOUR_ALMXPP_TOKEN",
        "D365FO_MCP_URL": "https://YOUR-ENV.sandbox.operations.dynamics.com/mcp",
        "D365FO_RESOURCE": "https://YOUR-ENV.sandbox.operations.dynamics.com"
      }
    }
  }
}
```

### D365FO prerequisites

1. Install Azure CLI and run `az login`
2. In D365FO, open `Allowed MCP clients`
3. Add Azure CLI client id `04b07795-8ddb-461a-bbee-02f9e1bf7b46`
4. Mark it as allowed for the target environment

Note:

- this universal client id is configured in D365 only
- do not put this client id in MCP JSON
- MCP JSON only needs the proxy command and the relevant URL/env values

### Recommended usage pattern

Use the two MCP servers together:

- ask `almxppmcp` to identify the table, entity, relations, custom extensions, and related work items
- ask `d365fo-data` to inspect the real environment data, forms, or custom actions
- cross the results in the chat to connect KB, custom code, work items, and live data

See `npm/examples/vscode-mcp.d365fo-data.json`, `npm/examples/vscode-mcp.d365fo-data.cloud.json`, and `docs/D365FO_DATA_ENVIRONMENT_SETUP.md` for ready-to-use setups.

---

## What tools are available?

The cloud server exposes **90 tools** across 14 categories. A companion local
server adds 58 more for anything that must run next to your D365 environment
(build, deploy, database sync, workspace writes).

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

## License

MIT
