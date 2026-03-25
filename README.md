# almxppmcp

> **npx launcher** for the [ALM XPP MCP](https://almxpp.com) cloud server - a D365 Finance & Operations AI Agent with 34 tools.

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

The server exposes 34 tools across 6 categories:

| Category | Tools |
|---|---|
| **Discovery** | `search_d365_code`, `get_object_details`, `list_objects`, `get_relation_graph`, `find_related_objects` |
| **References & Impact** | `find_references`, `find_extensions`, `find_callers` |
| **Code Generation** | `generate_xpp_template`, `generate_query`, `generate_d365_solution`, `generate_unit_test` |
| **Quality & Validation** | `validate_best_practices`, `detect_performance_issues`, `validate_aot_pattern`, `explain_code_complexity`, `suggest_refactoring` |
| **Security & Licensing** | `trace_security_chain`, `trace_role_license_tree`, `generate_security_governance_report` |
| **Azure DevOps** | `ado_query_workitems`, `ado_create_task`, `ado_list_prs`, `ado_analyze_pr_impact`, `ado_post_comment`, `ado_post_pr_comment`, `ado_changelog_from_prs`, `ado_analyze_workitem`, `ado_estimate_effort`, `ado_auto_test_scenario`, `ado_gap_fit_analysis`, `ado_knowledge_gap_detector`, `ado_sprint_capacity` |

See the [dashboard](https://almxpp.com/account/dashboard) for the full tool list.

---

## License

MIT
