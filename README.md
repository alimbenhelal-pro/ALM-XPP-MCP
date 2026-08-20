# almxppmcp

[![npm version](https://img.shields.io/npm/v/almxppmcp?logo=npm&color=cb3837)](https://www.npmjs.com/package/almxppmcp)
[![npm downloads](https://img.shields.io/npm/dm/almxppmcp?logo=npm&color=cb3837&label=downloads%2Fmonth)](https://www.npmjs.com/package/almxppmcp)
[![MCP endpoint](https://img.shields.io/endpoint?url=https%3A%2F%2Fapi.almxpp.com%2Fbadge%2Fstatus)](https://api.almxpp.com/mcp)
[![MCP registry](https://img.shields.io/badge/MCP%20registry-listed-0ea5e9?logo=modelcontextprotocol&logoColor=white)](https://registry.modelcontextprotocol.io/?q=alm-xpp-mcp)
[![Score M8ven](https://m8ven.ai/badge/mcp/alimbenhelal-pro-alm-xpp-mcp-1i8l2g?v=32353b85dcc6252a58d8367376c60e8f)](https://m8ven.ai/mcp/alimbenhelal-pro-alm-xpp-mcp-1i8l2g)
[![license](https://img.shields.io/github/license/alimbenhelal-pro/ALM-XPP-MCP?color=34d399)](LICENSE)
[![node](https://img.shields.io/node/v/almxppmcp?logo=node.js&logoColor=white&color=339933)](https://nodejs.org)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Alim%20Ben%20Helal-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/alimbenhelal)

> **npx launcher** for the [ALM XPP](https://almxpp.com) **Cloud MCP** - a Dynamics 365 Finance & Operations AI agent exposing **90 tools** over MCP.

Published in the [official MCP registry](https://registry.modelcontextprotocol.io/?q=alm-xpp-mcp) as
`io.github.alimbenhelal-pro/alm-xpp-mcp`.

The server answers from a pre-built index of the standard D365 F&O codebase:
**200K+ AOT objects**, **1.3M+ code chunks**, **25M+ cross-references** and
**24M+ label translations** -- 392K label ids rendered across 74 languages.

### Why an index rather than a general-purpose model

A general model answers X++ questions from whatever it memorised during training. This server answers
from a specific, versioned copy of the standard D365 codebase:

| | What it means in practice |
|---|---|
| **A known release** | The Cloud MCP answers from the release **the server** has indexed, not from yours. The one currently loaded is reported by [`GET /mcp`](https://api.almxpp.com/mcp) -- check it before relying on a version-sensitive answer |
| **Your own version** | Indexing **your** environment's exact build is what the **Local MCP** is for: it runs next to your D365 SDK and indexes the `PackagesLocalDirectory` on that machine. The Cloud MCP cannot do this -- it never sees your platform binaries |
| **Traceable** | Every result carries the AOT object and model it came from, so you can open it in Visual Studio and check |
| **Your extensions** | Point `D365-Custom-Model-Path` at your metadata, or let it index your Azure DevOps repository, and your own code is searched alongside the standard code |
| **No training on your code** | Your metadata is indexed per session and used to answer your calls. It is not used to train anything |

### Three servers, three roles

Three different MCP servers show up around D365 F&O. This README always calls them by these names:

| Name | What it is | How you get it |
|---|---|---|
| **Cloud MCP** | The hosted ALM XPP server: 90 tools over the indexed D365 codebase | this package -- `npx almxppmcp` |
| **Local MCP** | Runs on your own dev machine, next to the D365 SDK: 121 tools, 36 of which write AOT files, compile X++, sync the database. It is also the only one that can index **your** exact platform build, by reading the `PackagesLocalDirectory` on that machine | separate licensed component, contact <alim@almxpp.com> |
| **Environment MCP** | Microsoft's own **[Dynamics 365 ERP MCP server](https://learn.microsoft.com/dynamics365/fin-ops-core/dev-itpro/copilot/copilot-mcp)**, exposed by your F&O environment itself, serving live data | enabled inside D365FO, then [connected directly from VS Code](https://learn.microsoft.com/dynamics365/fin-ops-core/dev-itpro/copilot/mcp/mcp-vscode) |

This npm package covers the **Cloud MCP** only. The Local MCP is licensed separately, and the Environment
MCP is Microsoft's -- your client connects to it on its own.

## Requirements

- An API token -- get one at the [dashboard](https://almxpp.com/account/dashboard)
- Node.js >= 18, **only** if you use the `npx` launcher described further down

---

## MCP Client Configuration

The Cloud MCP is a **streamable HTTP** MCP server at `https://api.almxpp.com/mcp`, authenticated with the
`X-API-Key` header. Any client that speaks HTTP connects to it directly -- no Node.js, no launcher.

> **Tool calls are served on `api.almxpp.com` only.** `almxpp.com` and `www.almxpp.com` host the website;
> a JSON-RPC POST sent there is refused with a message naming the correct URL. Only the host changes --
> your API key and headers stay the same.

### VS Code / GitHub Copilot -- `.vscode/mcp.json`

```json
{
  "servers": {
    "almxppmcp": {
      "type": "http",
      "url": "https://api.almxpp.com/mcp",
      "headers": {
        "X-API-Key": "YOUR_TOKEN"
      }
    }
  }
}
```

### Headers

`X-API-Key` is the only required header. The others unlock the tools that need your own context --
without them those tools simply report that they are not configured.

| Header | Unlocks |
|---|---|
| `X-API-Key` | **Required.** Your API token. `Authorization: Bearer <token>` works too. |
| `D365-Custom-Model-Path` | Absolute path to your own extension / ISV metadata on the calling machine. Analysis tools read from here |
| `D365-Standard-Model-Path` | Absolute path to `PackagesLocalDirectory`, used as a read-only reference for standard objects |
| `DEVOPS_ORG_URL` | Azure DevOps organisation, e.g. `https://dev.azure.com/MyOrg` |
| `DEVOPS_PROJECT` | Azure DevOps project name. Required alongside `DEVOPS_ORG_URL`. |
| `DEVOPS_PAT` | Azure DevOps token. Indexes your own X++ metadata from the repo and reads work items. |
| `DEVOPS_REPO` | Repository holding the metadata, when the project has several |
| `DEVOPS_BRANCH` | Branch to index, default `main` |
| `DEVOPS_METADATA_PATH` | Folder inside the repo holding the AOT XML, default `Metadata` |
| `D365FO-Url` | Live environment base URL, for the `odata_*` and `dmf_*` tools |
| `D365FO-Tenant-Id` | Entra tenant of that environment |
| `D365FO-Client-Id` | Entra app registered in D365FO under **Microsoft Entra applications** |
| `D365FO-Client-Secret` | Secret of that app |
| `AppInsights-Workspace-Id` | Log Analytics workspace, for the `appinsights_*` tools |
| `AppInsights-Tenant-Id` | Entra tenant of that workspace |
| `AppInsights-Client-Id` | Entra app with *Log Analytics Reader* on the workspace |
| `AppInsights-Client-Secret` | Secret of that app |

The live-environment and telemetry credentials can also be set for the session with
`d365fo_set_connection` and `appinsights_set_connection`, so they never sit in a config file.

[`examples/vscode-mcp.full-headers.json`](examples/vscode-mcp.full-headers.json) puts all of this together
and keeps every secret out of the file by prompting for it through VS Code `inputs`.

---

## The `npx` launcher

Some clients only speak stdio. The `almxppmcp` command covers that case: it reads your token, sends it as
the `X-API-Key` header, and relays the traffic to the Cloud MCP over stdio. It has **no dependencies** --
just the one file, on top of what Node 18 already provides.

```bash
npx almxppmcp --api-key YOUR_TOKEN
```

or set the environment variable:

```bash
export ALMXPPMCP_API_KEY=YOUR_TOKEN
npx almxppmcp
```

> `--api-key` and `ALMXPPMCP_API_KEY` are the two ways of giving the token **to the launcher**.
> Either way it ends up on the wire as the HTTP header `X-API-Key` -- same token, different layer.

### VS Code, if you prefer the launcher -- `.vscode/mcp.json`

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
| `bin/almxppmcp.js` | Resolves the API key and server URL, then bridges your client's stdio to the Cloud MCP over HTTP -- no third-party package involved |
| `server.json` | MCP registry manifest |

The Cloud MCP itself — index, retrieval, the 90 tools and the licensing layer — is
closed source and runs at `https://api.almxpp.com/mcp`. The launcher never sees
your code: it forwards requests over HTTPS with the token you provide.

---

## License

MIT
