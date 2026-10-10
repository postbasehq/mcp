# @postbasehq/mcp

[![CI](https://github.com/postbasehq/mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/postbasehq/mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@postbasehq/mcp?color=3B5BDB)](https://www.npmjs.com/package/@postbasehq/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@postbasehq/mcp?color=3B5BDB)](https://www.npmjs.com/package/@postbasehq/mcp)
[![license](https://img.shields.io/npm/l/@postbasehq/mcp?color=3B5BDB)](./LICENSE)
[![Node](https://img.shields.io/node/v/@postbasehq/mcp?color=3B5BDB)](https://nodejs.org)

The **Model Context Protocol** server for [Postbase](https://www.postbase.so), the
open-source social media scheduler. Add it to Claude, Cursor or any MCP client and
let your AI agent draft and schedule posts and threads to **X, LinkedIn, Bluesky
and Mastodon**. (TikTok and YouTube need a video, so schedule those in the app.)

> Post everywhere. Even from your AI.

## Hosted server (no API key)

Postbase also runs this server for you at `https://mcp.postbase.so/mcp`, with
OAuth sign-in instead of an API key. Add that URL as a custom connector in Claude
or ChatGPT, or as a remote MCP server in Cursor, VS Code, Windsurf, Claude Code or
Gemini CLI. The [MCP config generator](https://www.postbase.so/tools/mcp-config)
prints the exact setup for each one.

Use this npm package when you want an API key instead, or a self-hosted Postbase.

## Quick start

1. Create an API key in your Postbase dashboard under **Developers**.
2. Add the server to your MCP client config (see examples below).
3. Ask your agent: _"Schedule this thread for 9am to X and Bluesky."_

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
| `create_post` | Create a draft, or schedule a post or `thread`: `channel_ids`, `scheduled_at` (ISO 8601 with an offset) or `schedule_in_minutes`, `channel_bodies` for per-channel text, `media_ids` or `media_urls`, `youtube` details, and an `idempotency_key` so retries can't post twice. TikTok posts can only be drafts. |
| `get_post` | How a post went on each channel: status, live URL, error, retry time and latest metrics. |
| `update_post` | Edit or reschedule a draft or scheduled post; only the fields you pass change. |
| `retry_post` | Send a post again to the channels where it failed. |
| `get_analytics` | Impressions, likes, comments, shares and saves per post and channel, with totals. |
| `list_media` | List images and videos in your Postbase media library, to attach by id. |
| `add_media` | Add an image or video to the media library from a public https link. |
| `list_scheduled` | List scheduled posts, or drafts, published or failed ones with `status`. |
| `cancel_post` | Cancel a scheduled post by id (it goes back to a draft). |
| `schedule_thread` | Create a thread (`tweets` in order). Kept for older setups; `create_post` with `thread` does the same. |

## Environment

| Variable | Required | Default |
|---|---|---|
| `POSTBASE_API_KEY` | yes | — |
| `POSTBASE_API_URL` | no | `https://www.postbase.so/api/v1` |

For local development against a Postbase instance on your machine, set
`POSTBASE_API_URL=http://localhost:3000/api/v1`.

## License

AGPL-3.0-or-later. Part of the open-source Postbase project.
