/**
 * Delivery adapters — where an approved draft goes.
 *
 * OpenDesk deliberately owns no publishing machinery. Each medium already has
 * an app that knows how to post to it (channels, credentials, per-platform
 * limits, previews); duplicating that here would mean maintaining it twice.
 * So approving hands the work to whichever app owns the medium and records the
 * receipt.
 *
 * The destination is declared per draft by the agent that deposited it, not
 * configured per deployment, so this app carries no org-specific settings.
 */

const PLATFORM_API = "https://provision.clawnify.com";

export interface DeliveryResult {
  ref: string | null;
  error: string | null;
}

/**
 * Call a sibling app in the same org. The callee sees caller() === "app" and
 * the same orgId; there is no person behind a service token.
 */
export async function callSiblingApp(
  token: string,
  appId: string,
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${PLATFORM_API}/v1/apps/${appId}/proxy${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

/**
 * Hand a social post to OpenPost, which owns the channels and the publishing.
 *
 * `meta.scheduled_at` (ISO-8601) schedules it; without one it goes out now,
 * which is the point of approving during a review session.
 */
async function deliverToOpenPost(
  token: string,
  appId: string,
  body: string,
  meta: Record<string, unknown>,
): Promise<DeliveryResult> {
  const channelIds = Array.isArray(meta.channel_ids) ? meta.channel_ids : undefined;
  const scheduledAt = typeof meta.scheduled_at === "string" ? meta.scheduled_at : undefined;

  const created = await callSiblingApp(token, appId, "/api/posts", {
    method: "POST",
    body: {
      content: body,
      status: scheduledAt ? "scheduled" : "draft",
      scheduled_at: scheduledAt,
      channel_ids: channelIds,
      media_urls: Array.isArray(meta.media_urls) ? meta.media_urls : undefined,
    },
  });

  if (!created.ok || !created.body?.id) {
    return { ref: null, error: describe("OpenPost rejected the post", created) };
  }
  const postId = String(created.body.id);

  // Scheduled posts are already in OpenPost's queue; it owns the clock.
  if (scheduledAt) return { ref: postId, error: null };

  const published = await callSiblingApp(token, appId, `/api/posts/${postId}/publish`, {
    method: "POST",
  });
  if (!published.ok) {
    // The post exists and is recoverable in OpenPost, so hand back its id
    // alongside the reason rather than losing the draft entirely.
    return { ref: postId, error: describe("Saved to OpenPost but publishing failed", published) };
  }

  // OpenPost publishes per channel and reports each one; a post can be
  // "published" overall while one channel failed, and that must not read as
  // a clean send.
  const results: Array<{ channel?: string; success?: boolean; error?: string }> =
    published.body?.results ?? [];
  const failed = results.filter((r) => r.success === false);
  if (failed.length > 0) {
    const detail = failed.map((r) => `${r.channel ?? "channel"}: ${r.error ?? "failed"}`).join("; ");
    return { ref: postId, error: `Published with failures — ${detail}` };
  }

  return { ref: postId, error: null };
}

function describe(prefix: string, res: { status: number; body: any }): string {
  const detail =
    res.body?.error ??
    res.body?.message ??
    (typeof res.body === "string" ? res.body : null) ??
    `HTTP ${res.status}`;
  return `${prefix}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
}

/**
 * Route an approved draft to its destination.
 *
 * A draft with no destination is not an error: plenty of work is approved for
 * a human or an agent to carry out by hand — a comment nobody may post through
 * an API, an article whose CMS shape a skill has to build. Those return a null
 * ref with no error, and the approval stands on its own.
 */
export async function deliver(opts: {
  token: string | undefined;
  destination: string | null;
  destinationAppId: string | null;
  body: string;
  meta: Record<string, unknown>;
}): Promise<DeliveryResult | null> {
  const { token, destination, destinationAppId } = opts;
  if (!destination) return null;

  if (!token) {
    return { ref: null, error: "No platform token available, so nothing could be delivered." };
  }
  if (!destinationAppId) {
    return { ref: null, error: `Destination "${destination}" needs a destination_app_id.` };
  }

  switch (destination) {
    case "openpost":
      return deliverToOpenPost(token, destinationAppId, opts.body, opts.meta);
    default:
      return { ref: null, error: `Unknown destination "${destination}".` };
  }
}
