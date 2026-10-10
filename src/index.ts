#!/usr/bin/env node
/**
 * @postbasehq/mcp — Model Context Protocol server for Postbase.
 * Lets an AI agent create, schedule, edit, check, retry and cancel posts, add media
 * and read analytics through the Postbase REST API.
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
    "Postbase MCP: POSTBASE_API_KEY is not set. Generate a key in Postbase → Developers and add it to this server's env.",
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

const server = new McpServer({ name: "postbase", version: "0.3.0" });

server.tool(
  "list_channels",
  "List the social channels connected to the Postbase workspace.",
  {},
  async () => ok((await api("GET", "/channels")).channels),
);

const youtube = z
  .object({
    title: z.string().optional().describe("Video title, up to 100 characters."),
    privacy: z.enum(["public", "unlisted", "private"]).optional(),
    made_for_kids: z.boolean().optional().describe("Required to schedule to YouTube; ask the user."),
  })
  .optional()
  .describe("YouTube details, when a YouTube channel is in channel_ids.");

/** Fields shared by create_post and update_post (snake_case, as the REST API takes them). */
const postFields = {
  body: z.string().optional().describe("The post text, for a single post."),
  thread: z.array(z.string()).optional().describe("Several posts to publish as a thread, in order (instead of body)."),
  channel_ids: z.array(z.string()).optional().describe("Channel ids to publish to (from list_channels)."),
  channel_bodies: z
    .record(z.string())
    .optional()
    .describe("Text for particular channels instead of body, keyed by channel id, e.g. a shorter X version."),
  schedule_in_minutes: z.number().optional().describe("Publish this many minutes from now (server clock). Use for relative times."),
  media_ids: z.array(z.string()).optional().describe("Media library ids from list_media, in order."),
  media_urls: z
    .array(z.string())
    .optional()
    .describe("Public https links to images or a video, attached after media_ids and added to the media library (up to 10)."),
  youtube,
};

server.tool(
  "create_post",
  "Create a draft, or schedule a post or thread, on connected channels. Give channel_ids from list_channels and scheduled_at (ISO 8601 with Z or an offset) or schedule_in_minutes; omit both for a draft. Attach media with media_ids (list_media) or media_urls (public https links). channel_bodies gives particular channels their own text. Pass an idempotency_key so a retried call returns the first post instead of a duplicate. YouTube needs a video and youtube.made_for_kids. TikTok posts can only be saved as drafts (the user schedules them in Postbase). Check the outcome later with get_post.",
  {
    ...postFields,
    scheduled_at: z.string().optional().describe("ISO 8601 time with Z or an offset, e.g. 2026-10-01T09:00:00+01:00. Omit for a draft."),
    idempotency_key: z.string().optional().describe("Any unique string for this post; a repeat with the same key returns the first post."),
  },
  async (args) => ok((await api("POST", "/posts", args)).post),
);

server.tool(
  "get_post",
  "Get one post and how it went on each channel: status, the live URL once published, the error if it failed and when it will be retried, and the latest metrics.",
  { post_id: z.string().describe("The post id, from create_post or list_scheduled.") },
  async (args) => ok((await api("GET", `/posts/${encodeURIComponent(args.post_id)}`)).post),
);

server.tool(
  "update_post",
  "Edit a draft or scheduled post before it publishes. Only the fields you pass change. Pass scheduled_at or schedule_in_minutes to reschedule (or schedule a draft); scheduled_at null turns it back into a draft. A post that has started publishing can't be edited.",
  {
    post_id: z.string().describe("The post id to edit."),
    ...postFields,
    scheduled_at: z.string().nullable().optional().describe("New time (ISO 8601 with an offset), or null for a draft."),
  },
  async ({ post_id, ...fields }) => ok((await api("PATCH", `/posts/${encodeURIComponent(post_id)}`, fields)).post),
);

server.tool(
  "retry_post",
  "Send a post again, now, to the channels where it failed. Channels where it already published are left alone. Check get_post first: an expired connection needs reconnecting in Postbase.",
  { post_id: z.string().describe("The post id to retry.") },
  async (args) => ok(await api("POST", `/posts/${encodeURIComponent(args.post_id)}/retry`)),
);

server.tool(
  "get_analytics",
  "How published posts performed: each post's channels with their latest impressions, likes, comments, shares and saves, plus totals. Defaults to the last 30 days, newest first.",
  {
    from: z.string().optional().describe("First day, YYYY-MM-DD."),
    to: z.string().optional().describe("Last day, YYYY-MM-DD (default today)."),
    post_id: z.string().optional().describe("Just this post."),
    channel_id: z.string().optional().describe("Only this channel."),
    platform: z.string().optional().describe("Only this network, e.g. x or linkedin."),
    sort: z.enum(["date", "impressions", "likes", "comments", "shares", "saves", "engagement"]).optional(),
    order: z.enum(["desc", "asc"]).optional(),
    limit: z.number().optional().describe("1 to 100 (default 20)."),
  },
  async (args) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) if (v !== undefined) q.set(k, String(v));
    if (!q.has("limit")) q.set("limit", "20");
    return ok(await api("GET", `/analytics?${q}`));
  },
);

server.tool(
  "add_media",
  "Add an image or video to the Postbase media library from a public https URL and return its id for media_ids. JPG, PNG, WebP, GIF, MP4, MOV or WebM, up to 200 MB.",
  {
    url: z.string().describe("Public https URL of the file."),
    name: z.string().optional().describe("A name for the file in the library."),
  },
  async (args) => ok((await api("POST", "/media", args)).media),
);

server.tool(
  "schedule_thread",
  "Create a thread (several posts, in order) and optionally schedule it. Same as create_post with thread; kept for older setups.",
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
  "List posts in the workspace with their text, time and channels. Scheduled posts by default; pass status for drafts, published or failed ones.",
  { status: z.enum(["scheduled", "draft", "publishing", "published", "failed"]).optional() },
  async (args) => ok((await api("GET", `/posts?status=${args.status ?? "scheduled"}`)).posts),
);

server.tool(
  "cancel_post",
  "Cancel a scheduled post by id. It goes back to being a draft, which update_post can reschedule.",
  { post_id: z.string().describe("The id of the post to cancel.") },
  async (args) => ok(await api("POST", `/posts/${args.post_id}/cancel`)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Postbase MCP running against ${BASE_URL}`);
