# @postbasehq/mcp

[![npm version](https://img.shields.io/npm/v/@postbasehq/mcp?color=3B5BDB)](https://www.npmjs.com/package/@postbasehq/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@postbasehq/mcp?color=3B5BDB)](https://www.npmjs.com/package/@postbasehq/mcp)
[![license](https://img.shields.io/npm/l/@postbasehq/mcp?color=3B5BDB)](./LICENSE)
[![Node](https://img.shields.io/node/v/@postbasehq/mcp?color=3B5BDB)](https://nodejs.org)

The **Model Context Protocol** server for [Postbase](https://postbase.so) — the
open-source, MCP-native social scheduler. Add it to Claude, Cursor, or any MCP client
and let your AI agent schedule and publish across your channels.

> Post everywhere. Even from your AI.

## Quick start

1. Generate an API key in your Postbase dashboard → **MCP & API**.
2. Add the server to your MCP client config (see examples below).
3. Ask your agent: _“Schedule this thread for 9am to X and LinkedIn.”_

## Example configs

**Any MCP client** — the minimal config:

```json
{
  "mcpServers": {
    "postbase": {
      "command": "npx",
      "args": ["@postbasehq/mcp"],
      "env": { "POSTBASE_API_KEY": "pb_live_your_key_here" }
    }
  }
}
```

**Claude Desktop** — add the same block to your config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Then restart Claude Desktop.

**Cursor** — add it to `~/.cursor/mcp.json` (or Settings → MCP):

```json
{
  "mcpServers": {
    "postbase": {
      "command": "npx",
      "args": ["@postbasehq/mcp"],
      "env": { "POSTBASE_API_KEY": "pb_live_your_key_here" }
    }
  }
}
```

**Local development** — point at a Postbase instance running on your machine:

```json
{
  "mcpServers": {
    "postbase": {
      "command": "npx",
      "args": ["@postbasehq/mcp"],
      "env": {
        "POSTBASE_API_KEY": "pb_live_your_key_here",
        "POSTBASE_API_URL": "http://localhost:3000/api/v1"
      }
    }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `list_channels` | List the channels connected to your workspace. |
| `create_post` | Create a post — `body`, `channel_ids`, optional ISO `scheduled_at` (omit for a draft). |
| `list_scheduled` | List posts scheduled to publish. |
| `cancel_post` | Cancel a scheduled post by id. |

## Environment

| Variable | Required | Default |
|---|---|---|
| `POSTBASE_API_KEY` | yes | — |
| `POSTBASE_API_URL` | no | `https://postbase.so/api/v1` |

For local development against a Postbase instance on your machine, set
`POSTBASE_API_URL=http://localhost:3000/api/v1`.

## License

AGPL-3.0-or-later. Part of the open-source Postbase project.
