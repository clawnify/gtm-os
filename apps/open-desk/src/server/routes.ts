import { OpenAPIHono, createRoute, z, user, orgId } from "@clawnify/app";
import { eq, and, desc, asc, sql, like, or } from "@clawnify/db";
import * as schema from "./schema";
import { db as getDb } from "./db";
import { deliver, callSiblingApp } from "./deliver";

type Env = {
  Bindings: {
    DB: D1Database;
    // Injected by the builder — authorizes calls to sibling apps in this org.
    CLAWNIFY_TOKEN?: string;
  };
};

const api = new OpenAPIHono<Env>();

// ── Shapes ──

const SourceSchema = z.object({
  title: z.string().optional(),
  url: z.string().optional(),
  note: z.string().optional(),
});

const DraftSchema = z
  .object({
    id: z.number(),
    kind: z.string(),
    title: z.string().nullable(),
    body: z.string(),
    status: z.string(),
    author: z.string().nullable(),
    rationale: z.string().nullable(),
    openQuestion: z.string().nullable(),
    sources: z.array(SourceSchema),
    meta: z.record(z.unknown()),
    reviewNote: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    reviewedBy: z.string().nullable(),
    destination: z.string().nullable(),
    destinationAppId: z.string().nullable(),
    destinationRef: z.string().nullable(),
    delivery: z.string().nullable(),
    deliveryError: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Draft");

const CreateDraftSchema = z
  .object({
    kind: z.string().min(1).describe("social_post | comment | article | anything else"),
    body: z.string().min(1).describe("The draft itself, as the human will read it"),
    title: z.string().optional().describe("Short label for the queue row"),
    author: z.string().optional().describe("Which agent wrote this"),
    rationale: z.string().optional().describe("Why this draft exists, in your own words"),
    open_question: z
      .string()
      .optional()
      .describe("A decision you could not make alone. Shown prominently to the reviewer."),
    sources: z.array(SourceSchema).optional().describe("What the claims rest on"),
    meta: z
      .record(z.unknown())
      .optional()
      .describe(
        "Kind-specific context: target_keyword, channel_ids, scheduled_at, replying_to_url, variant ids",
      ),
    destination: z
      .string()
      .optional()
      .describe("Which app publishes this once approved, e.g. 'openpost'. Omit for manual work."),
    destination_app_id: z.string().optional().describe("The destination app's UUID"),
  })
  .openapi("CreateDraft");

const UpdateDraftSchema = z
  .object({
    title: z.string().optional(),
    body: z.string().min(1).optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .openapi("UpdateDraft");

const RejectSchema = z
  .object({ note: z.string().min(1).describe("Why. The writing agent reads this back.") })
  .openapi("Reject");

const IdParamSchema = z.object({ id: z.string() });

const ListQuerySchema = z.object({
  status: z.string().optional(),
  kind: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ListSchema = z
  .object({
    drafts: z.array(DraftSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
  .openapi("DraftList");

const StatsSchema = z
  .object({
    pending: z.number(),
    approved: z.number(),
    rejected: z.number(),
    failed: z.number(),
    by_kind: z.array(z.object({ kind: z.string(), pending: z.number() })),
  })
  .openapi("Stats");

// ── Helpers ──

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type Row = typeof schema.drafts.$inferSelect;

function present(row: Row) {
  return {
    ...row,
    sources: parseJson<Array<Record<string, string>>>(row.sources, []),
    meta: parseJson<Record<string, unknown>>(row.meta, {}),
  };
}

/**
 * The tenant key. Null for callers the platform could not place in an org
 * (agent-browser, public, bypass) — treated as no access, never as a wildcard.
 */
function requireOrg(c: any): string | null {
  return orgId(c) ?? null;
}

const noOrg = { error: "No organization on this request." } as const;

// ── Routes ──

api.openapi(
  createRoute({
    method: "post",
    path: "/api/drafts",
    summary: "Deposit a draft for human approval",
    description:
      "The write target for agents. Everything an agent would otherwise leave in a markdown file goes here instead.",
    request: { body: { content: { "application/json": { schema: CreateDraftSchema } } } },
    responses: {
      201: { description: "Stored", content: { "application/json": { schema: DraftSchema } } },
      403: { description: "No organization on this request" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);

    const b = c.req.valid("json");
    const db = getDb(c.env);
    const [row] = await db
      .insert(schema.drafts)
      .values({
        orgId: org,
        kind: b.kind.trim(),
        title: b.title?.trim() || null,
        body: b.body,
        author: b.author?.trim() || null,
        rationale: b.rationale || null,
        openQuestion: b.open_question || null,
        sources: b.sources ? JSON.stringify(b.sources) : null,
        meta: b.meta ? JSON.stringify(b.meta) : null,
        destination: b.destination || null,
        destinationAppId: b.destination_app_id || null,
      })
      .returning();
    return c.json(present(row), 201);
  },
);

api.openapi(
  createRoute({
    method: "get",
    path: "/api/drafts",
    summary: "List drafts",
    description: "Bounded page, newest last for pending so the oldest is reviewed first.",
    request: { query: ListQuerySchema },
    responses: {
      200: { description: "A page of drafts", content: { "application/json": { schema: ListSchema } } },
      403: { description: "No organization on this request" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);

    const q = c.req.valid("query");
    const limit = q.limit ?? 25;
    const offset = q.offset ?? 0;
    const db = getDb(c.env);

    const filters = [eq(schema.drafts.orgId, org)];
    if (q.status) filters.push(eq(schema.drafts.status, q.status));
    if (q.kind) filters.push(eq(schema.drafts.kind, q.kind));
    if (q.search) {
      const needle = `%${q.search}%`;
      // Parenthesised by and(or(...)) so the OR cannot void the org filter.
      filters.push(
        or(like(schema.drafts.title, needle), like(schema.drafts.body, needle))!,
      );
    }
    const where = and(...filters);

    // Pending is a work queue: oldest first, so nothing starves at the bottom.
    // Everything else is history: newest first.
    const order =
      q.status === "pending" ? asc(schema.drafts.createdAt) : desc(schema.drafts.createdAt);

    const rows = await db
      .select()
      .from(schema.drafts)
      .where(where)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.drafts)
      .where(where);

    return c.json({ drafts: rows.map(present), total: Number(count), limit, offset });
  },
);

api.openapi(
  createRoute({
    method: "get",
    path: "/api/stats",
    summary: "Counts for the desk header",
    responses: {
      200: { description: "Counts", content: { "application/json": { schema: StatsSchema } } },
      403: { description: "No organization on this request" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);
    const db = getDb(c.env);

    const rows = await db
      .select({
        status: schema.drafts.status,
        delivery: schema.drafts.delivery,
        kind: schema.drafts.kind,
        count: sql<number>`count(*)`,
      })
      .from(schema.drafts)
      .where(eq(schema.drafts.orgId, org))
      .groupBy(schema.drafts.status, schema.drafts.delivery, schema.drafts.kind);

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let failed = 0;
    const byKind = new Map<string, number>();
    for (const r of rows) {
      const n = Number(r.count);
      if (r.status === "pending") {
        pending += n;
        byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + n);
      } else if (r.status === "rejected") rejected += n;
      else if (r.status === "approved") {
        approved += n;
        if (r.delivery === "failed") failed += n;
      }
    }

    return c.json({
      pending,
      approved,
      rejected,
      failed,
      by_kind: [...byKind.entries()]
        .map(([kind, n]) => ({ kind, pending: n }))
        .sort((a, b) => b.pending - a.pending),
    });
  },
);

api.openapi(
  createRoute({
    method: "get",
    path: "/api/drafts/:id",
    summary: "Read one draft",
    request: { params: IdParamSchema },
    responses: {
      200: { description: "The draft", content: { "application/json": { schema: DraftSchema } } },
      404: { description: "Not found" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);
    const db = getDb(c.env);
    const [row] = await db
      .select()
      .from(schema.drafts)
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, Number(c.req.valid("param").id))));
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(present(row));
  },
);

api.openapi(
  createRoute({
    method: "patch",
    path: "/api/drafts/:id",
    summary: "Edit a draft before approving it",
    description: "Only pending drafts can be edited; an approved one has already gone out.",
    request: {
      params: IdParamSchema,
      body: { content: { "application/json": { schema: UpdateDraftSchema } } },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: DraftSchema } } },
      404: { description: "Not found" },
      409: { description: "Already reviewed" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);
    const id = Number(c.req.valid("param").id);
    const b = c.req.valid("json");
    const db = getDb(c.env);

    const [existing] = await db
      .select()
      .from(schema.drafts)
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, id)));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.status !== "pending") {
      return c.json({ error: `Already ${existing.status}; edit is only for pending drafts.` }, 409);
    }

    const patch: Partial<typeof schema.drafts.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (b.title !== undefined) patch.title = b.title;
    if (b.body !== undefined) patch.body = b.body;
    if (b.meta !== undefined) patch.meta = JSON.stringify(b.meta);

    const [row] = await db
      .update(schema.drafts)
      .set(patch)
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, id)))
      .returning();
    return c.json(present(row));
  },
);

api.openapi(
  createRoute({
    method: "post",
    path: "/api/drafts/:id/approve",
    summary: "Approve a draft and send it to its destination",
    description:
      "Approving is the decision; delivery is reported separately, so a post that was approved but failed to send never reads as a clean send.",
    request: { params: IdParamSchema },
    responses: {
      200: { description: "Approved", content: { "application/json": { schema: DraftSchema } } },
      404: { description: "Not found" },
      409: { description: "Already reviewed" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);
    const id = Number(c.req.valid("param").id);
    const db = getDb(c.env);

    const [existing] = await db
      .select()
      .from(schema.drafts)
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, id)));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.status !== "pending") {
      return c.json({ error: `Already ${existing.status}.` }, 409);
    }

    const result = await deliver({
      token: c.env.CLAWNIFY_TOKEN,
      destination: existing.destination,
      destinationAppId: existing.destinationAppId,
      body: existing.body,
      meta: parseJson<Record<string, unknown>>(existing.meta, {}),
    });

    const reviewer = user(c);
    const [row] = await db
      .update(schema.drafts)
      .set({
        status: "approved",
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer?.name ?? reviewer?.email ?? null,
        updatedAt: new Date().toISOString(),
        // No destination means approved-for-a-human; leave delivery null
        // rather than inventing a send that never happened.
        delivery: result === null ? null : result.error ? "failed" : "sent",
        destinationRef: result?.ref ?? null,
        deliveryError: result?.error ?? null,
      })
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, id)))
      .returning();
    return c.json(present(row));
  },
);

api.openapi(
  createRoute({
    method: "post",
    path: "/api/drafts/:id/reject",
    summary: "Reject a draft, with the reason",
    description: "The note is the point: the writing agent reads it back and rewrites against it.",
    request: {
      params: IdParamSchema,
      body: { content: { "application/json": { schema: RejectSchema } } },
    },
    responses: {
      200: { description: "Rejected", content: { "application/json": { schema: DraftSchema } } },
      404: { description: "Not found" },
      409: { description: "Already reviewed" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);
    const id = Number(c.req.valid("param").id);
    const { note } = c.req.valid("json");
    const db = getDb(c.env);

    const [existing] = await db
      .select()
      .from(schema.drafts)
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, id)));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.status !== "pending") {
      return c.json({ error: `Already ${existing.status}.` }, 409);
    }

    const reviewer = user(c);
    const [row] = await db
      .update(schema.drafts)
      .set({
        status: "rejected",
        reviewNote: note,
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer?.name ?? reviewer?.email ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, id)))
      .returning();
    return c.json(present(row));
  },
);

api.openapi(
  createRoute({
    method: "delete",
    path: "/api/drafts/:id",
    summary: "Discard a draft outright",
    description:
      "For junk — a misfiring agent depositing duplicates, or a test row. Rejecting is the reviewer's tool, because it leaves a reason the writer reads back; deleting leaves nothing, so reach for it only when the row should never have existed.",
    request: { params: IdParamSchema },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
      404: { description: "Not found" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);
    const id = Number(c.req.valid("param").id);
    const db = getDb(c.env);
    const [gone] = await db
      .delete(schema.drafts)
      .where(and(eq(schema.drafts.orgId, org), eq(schema.drafts.id, id)))
      .returning();
    if (!gone) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  },
);

const ChannelSchema = z
  .object({
    id: z.number(),
    platform: z.string(),
    name: z.string(),
    profile_name: z.string().nullable(),
    profile_handle: z.string().nullable(),
    profile_avatar_url: z.string().nullable(),
    profile_headline: z.string().nullable(),
  })
  .openapi("Channel");

api.openapi(
  createRoute({
    method: "get",
    path: "/api/channels",
    summary: "The publishing channels a preview should render as",
    description:
      "Read live from the app that owns the channels, so a preview shows the real account rather than a copy of it that can go stale.",
    request: { query: z.object({ app_id: z.string() }) },
    responses: {
      200: {
        description: "Channels",
        content: { "application/json": { schema: z.array(ChannelSchema) } },
      },
      403: { description: "No organization on this request" },
    },
  }),
  async (c) => {
    const org = requireOrg(c);
    if (!org) return c.json(noOrg, 403);
    const token = c.env.CLAWNIFY_TOKEN;
    if (!token) return c.json([]);

    const res = await callSiblingApp(token, c.req.valid("query").app_id, "/api/channels", {
      method: "GET",
    });
    if (!res.ok || !Array.isArray(res.body)) return c.json([]);

    // Only the fields a preview renders. Whatever else the owning app returns
    // is its business, not ours to forward.
    return c.json(
      res.body.map((ch: Record<string, unknown>) => ({
        id: Number(ch.id),
        platform: String(ch.platform ?? ""),
        name: String(ch.name ?? ""),
        profile_name: (ch.profile_name as string | null) ?? null,
        profile_handle: (ch.profile_handle as string | null) ?? null,
        profile_avatar_url: (ch.profile_avatar_url as string | null) ?? null,
        profile_headline: (ch.profile_headline as string | null) ?? null,
      })),
    );
  },
);

api.openapi(
  createRoute({
    method: "get",
    path: "/api/me",
    summary: "Who is reviewing",
    description:
      "A comment goes out under the reviewer's own name, and there is no channel row to read it from — so the preview uses this.",
    responses: {
      200: {
        description: "The signed-in reviewer, or nulls for a non-human caller",
        content: {
          "application/json": {
            schema: z.object({ name: z.string().nullable(), avatarUrl: z.string().nullable() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const u = user(c);
    return c.json({ name: u?.name ?? null, avatarUrl: u?.avatarUrl ?? null });
  },
);

export default api;
