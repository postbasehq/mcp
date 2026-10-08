#!/usr/bin/env node
/**
 * @postbasehq/mcp — Model Context Protocol server for Postbase.
 * Lets an AI agent list channels and schedule/cancel posts through the Postbase API.
 *
 * Config (in your MCP client):
 *   { "command": "npx", "args": ["@postbasehq/mcp"],
 *     "env": { "POSTBASE_API_KEY": "pb_live_…" } }
 *
 * Optional env: POSTBASE_API_URL (default https://www.postbase.so/api/v1) — set
 * to http://localhost:3000/api/v1 for local development.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.POSTBASE_API_KEY;
const BASE_URL = process.env.POSTBASE_API_URL ?? "https://www.postbase.so/api/v1";

if (!API_KEY) {
  console.error(
    "Postbase MCP: POSTBASE_API_KEY is not set. Generate a key in your Postbase dashboard (MCP & API) and add it to this server's env.",
  );
  process.exit(1);
}

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      (json.error as string) ?? `Postbase API error ${res.status}`,
    );
  }
  return json;
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "postbase", version: "0.2.0" });

server.tool(
  "list_channels",
  "List the social channels connected to the Postbase workspace.",
  {},
  async () => ok((await api("GET", "/channels")).channels),
);

server.tool(
  "create_post",
  "Create a post. Provide channel_ids from list_channels and an ISO 8601 scheduled_at to schedule it (omit to save as a draft). Attach images or a video with media_ids from list_media; YouTube needs a video and youtube.made_for_kids. TikTok posts can only be saved as drafts (the user schedules them in Postbase).",
  {
    body: z.string().optional().describe("The post text."),
    media_ids: z.array(z.string()).optional().describe("Media library ids from list_media, in order."),
    youtube: z
      .object({
        title: z.string().optional().describe("Video title, up to 100 characters."),
        privacy: z.enum(["public", "unlisted", "private"]).optional(),
        made_for_kids: z.boolean().optional().describe("Required to schedule to YouTube; ask the user."),
      })
      .optional()
      .describe("YouTube details, when a YouTube channel is in channel_ids."),

    channel_ids: z
      .array(z.string())
      .optional()
      .describe("Channel ids to publish to (from list_channels)."),
    scheduled_at: z
      .string()
      .optional()
      .describe("ISO 8601 time to publish, e.g. 2026-09-12T09:00:00Z. Omit for a draft."),
  },
  async (args) =>
    ok(
      (
        await api("POST", "/posts", {
          body: args.body ?? "",
          channel_ids: args.channel_ids ?? [],
          scheduled_at: args.scheduled_at ?? null,
          media_ids: args.media_ids ?? [],
          youtube: args.youtube,
        })
      ).post,
    ),
);

server.tool(
  "schedule_thread",
  "Create an X thread (multiple tweets, in order) and optionally schedule it. The first tweet is the post; the rest reply in a chain.",
  {
    tweets: z.array(z.string()).min(1).describe("The tweets, in order. First is the lead tweet."),
    channel_ids: z
      .array(z.string())
      .optional()
      .describe("Channel ids to publish to (from list_channels)."),
    scheduled_at: z
      .string()
      .optional()
      .describe("ISO 8601 time to publish, e.g. 2026-09-12T09:00:00Z. Omit for a draft."),
  },
  async (args) =>
    ok(
      (
        await api("POST", "/posts", {
          thread: args.tweets,
          channel_ids: args.channel_ids ?? [],
          scheduled_at: args.scheduled_at ?? null,
        })
      ).post,
    ),
);

server.tool(
  "list_media",
  "List images and videos in the workspace's Postbase media library (newest 50). Pass their ids to create_post as media_ids.",
  {
    type: z.enum(["image", "video"]).optional().describe("Only images or only videos."),
    search: z.string().optional().describe("Match part of the file name."),
  },
  async (args) => {
    const q = new URLSearchParams();
    if (args.type) q.set("type", args.type);
    if (args.search) q.set("search", args.search);
    const qs = q.toString();
    return ok((await api("GET", `/media${qs ? `?${qs}` : ""}`)).media);
  },
);

server.tool(
  "list_scheduled",
  "List posts that are scheduled to publish.",
  {},
  async () => ok((await api("GET", "/posts?status=scheduled")).posts),
);

server.tool(
  "cancel_post",
  "Cancel a scheduled post by id (returns it to draft).",
  { post_id: z.string().describe("The id of the post to cancel.") },
  async (args) => ok(await api("POST", `/posts/${args.post_id}/cancel`)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Postbase MCP running against ${BASE_URL}`);
