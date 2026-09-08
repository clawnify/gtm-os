export interface Source {
  title?: string;
  url?: string;
  note?: string;
}

export interface Draft {
  id: number;
  kind: string;
  title: string | null;
  body: string;
  status: "pending" | "approved" | "rejected" | string;
  author: string | null;
  rationale: string | null;
  openQuestion: string | null;
  sources: Source[];
  meta: Record<string, unknown>;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  destination: string | null;
  destinationAppId: string | null;
  destinationRef: string | null;
  delivery: "sent" | "failed" | null;
  deliveryError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  failed: number;
  by_kind: Array<{ kind: string; pending: number }>;
}
