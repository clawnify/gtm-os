import type { Draft, Stats } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface Page {
  drafts: Draft[];
  total: number;
  limit: number;
  offset: number;
}

export interface Channel {
  id: number;
  platform: string;
  name: string;
  profile_name: string | null;
  profile_handle: string | null;
  profile_avatar_url: string | null;
  profile_headline: string | null;
}

export const api = {
  async me(): Promise<{ name: string | null; avatarUrl: string | null }> {
    return json(await fetch("/api/me"));
  },

  async channels(appId: string): Promise<Channel[]> {
    return json<Channel[]>(await fetch(`/api/channels?app_id=${encodeURIComponent(appId)}`));
  },

  async list(params: Record<string, string | number | undefined>): Promise<Page> {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    return json<Page>(await fetch(`/api/drafts?${q}`));
  },

  async stats(): Promise<Stats> {
    return json<Stats>(await fetch("/api/stats"));
  },

  async approve(id: number): Promise<Draft> {
    return json<Draft>(await fetch(`/api/drafts/${id}/approve`, { method: "POST" }));
  },

  async reject(id: number, note: string): Promise<Draft> {
    return json<Draft>(
      await fetch(`/api/drafts/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      }),
    );
  },

  async update(id: number, patch: { title?: string; body?: string }): Promise<Draft> {
    return json<Draft>(
      await fetch(`/api/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
  },
};
