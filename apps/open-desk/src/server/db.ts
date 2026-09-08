import { getDB } from "@clawnify/db";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * `getDB` is typed as a union (D1 in production, a proxy in preview).
 * TypeScript resolves a method call on a union to the intersection of its call
 * signatures, which collapses `.select(projection)` to the zero-argument
 * overload — so every partial select and aggregate fails to typecheck. Both
 * branches expose the identical query-builder surface, so narrowing to one is
 * safe for everything except D1-only extras like `.batch()`, which this app
 * does not use.
 */
export function db(env: { DB: D1Database }): DrizzleD1Database<typeof schema> {
  return getDB(env, { schema }) as DrizzleD1Database<typeof schema>;
}
