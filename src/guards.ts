// Decide if the bot should act on a given item.

import type { CleanSettings } from "./settings.js";

const BOT_NAME_PATTERN = /bot$/i;
const AUTOMODERATOR = "automoderator";

export interface AuthorInfo {
  name?: string;
}

/**
 * Returns true if the bot should skip this author based on settings.
 * Callers should return early when this returns true.
 */
export function shouldIgnoreAuthor(
  author: AuthorInfo,
  settings: CleanSettings
): boolean {
  const name = (author.name ?? "").toLowerCase();
  if (!name) return false;

  if (settings.ignoreAutoModerator && name === AUTOMODERATOR) {
    return true;
  }

  if (settings.ignoreBots && BOT_NAME_PATTERN.test(name)) {
    return true;
  }

  return false;
}

/**
 * Returns true if the author is the app itself.
 * Prevents the bot from replying to its own comments in a loop.
 */
export function isSelfComment(
  authorName: string | undefined,
  appName: string | undefined
): boolean {
  if (!authorName || !appName) return false;
  return authorName.toLowerCase() === appName.toLowerCase();
}
