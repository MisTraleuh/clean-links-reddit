// Idempotency: track processed items in Redis/KV to avoid duplicate actions.
// Uses atomic SETNX to prevent race conditions between concurrent triggers.

import type { TriggerContext } from "@devvit/public-api";

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function storageKey(type: "post" | "comment", id: string): string {
  return `processed:${type}:${id}`;
}

/**
 * Atomically claim an item for processing.
 * Returns true if this call claimed it (proceed with action).
 * Returns false if already processed (skip).
 *
 * Uses Redis SETNX (nx: true) so that check + mark is a single atomic
 * operation — no race window between isAlreadyProcessed and markProcessed.
 */
export async function claimForProcessing(
  context: TriggerContext,
  type: "post" | "comment",
  id: string
): Promise<boolean> {
  const key = storageKey(type, id);
  const result = await context.redis.set(key, "1", {
    nx: true,
    expiration: new Date(Date.now() + TTL_MS),
  });
  // redis.set with nx may return "OK", true, or falsy depending on Devvit version
  return !!result;
}
