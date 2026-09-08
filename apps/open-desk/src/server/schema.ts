import { sqliteTable, text, integer, index } from "@clawnify/db";

/**
 * One piece of work an agent wrote and a human has to sign off on.
 *
 * The body is deliberately untyped prose: a LinkedIn post, a comment, a blog
 * article and whatever comes next are all "text a person has to read and
 * decide about". `kind` is a plain string, not an enum, so adding a new kind
 * costs nothing on the write side — the queue renders anything it is given.
 *
 * The provenance columns exist because the reviewer was not in the session
 * that produced the draft. Without them, approving is guesswork.
 */
export const drafts = sqliteTable(
  "drafts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // Tenant key. Every read and write filters on it.
    orgId: text("org_id").notNull(),

    kind: text("kind").notNull(),
    // Short label for the queue row. Optional: a comment rarely has a title.
    title: text("title"),
    body: text("body").notNull(),

    // The review decision. Delivery outcome is tracked separately below, so a
    // post that was approved but failed to send is not mistaken for pending.
    status: text("status").notNull().default("pending"),

    // ── Provenance: what the reviewer needs to decide in seconds ──
    author: text("author"),
    // Why this draft exists, in the writing agent's own words.
    rationale: text("rationale"),
    // A decision the agent could not make alone. Surfaced prominently.
    openQuestion: text("open_question"),
    // JSON array of { title, url, note } — what the claims rest on.
    sources: text("sources"),
    // JSON, kind-specific: target keyword, channel, variant ids, the URL being
    // replied to. Free-form so a new kind needs no migration.
    meta: text("meta"),

    // ── Review ──
    reviewNote: text("review_note"),
    reviewedAt: text("reviewed_at"),
    reviewedBy: text("reviewed_by"),

    // ── Delivery, once approved ──
    // Which app owns this medium, declared by the agent that deposited the
    // draft, so this app needs no per-org configuration of its own.
    destination: text("destination"),
    destinationAppId: text("destination_app_id"),
    // Set once the destination accepted it — the receipt.
    destinationRef: text("destination_ref"),
    // null | sent | failed. Only meaningful once status = approved.
    delivery: text("delivery"),
    deliveryError: text("delivery_error"),

    createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    // The desk's only hot query: this org's pending work, oldest first.
    index("idx_drafts_org_status").on(t.orgId, t.status, t.createdAt),
  ],
);
