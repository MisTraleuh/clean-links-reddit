// Report items to the mod queue. No public comment, no removal.

import type { TriggerContext } from "@devvit/public-api";
import type { CleanedLink } from "./url-cleaning.js";

/**
 * Report a post to the mod queue with a reason describing the tracked URL.
 *
 * Uses context.reddit.report() which sends the item to the subreddit mod queue.
 * The reason string is kept short because Reddit truncates long report reasons.
 */
export async function reportPost(
  context: TriggerContext,
  postId: string,
  links: CleanedLink[],
  reason: string
): Promise<void> {
  const post = await context.reddit.getPostById(postId);
  const reportReason = buildReportReason(links, reason);
  await context.reddit.report(post, { reason: reportReason });
}

/**
 * Report a comment to the mod queue.
 */
export async function reportComment(
  context: TriggerContext,
  commentId: string,
  links: CleanedLink[],
  reason: string
): Promise<void> {
  const comment = await context.reddit.getCommentById(commentId);
  const reportReason = buildReportReason(links, reason);
  await context.reddit.report(comment, { reason: reportReason });
}

/**
 * Build a concise report reason string.
 * Reddit truncates report reasons, so we keep it short and append the first
 * cleaned URL if there's room.
 */
function buildReportReason(links: CleanedLink[], template: string): string {
  if (links.length === 0) return template;

  // If only one link, append the cleaned URL for convenience
  if (links.length === 1) {
    const suffix = ` → ${links[0].cleaned}`;
    // Reddit report reasons have a ~100 char limit; stay safe
    if (template.length + suffix.length <= 100) {
      return template + suffix;
    }
  }

  // For multiple links, append count
  if (links.length > 1) {
    const suffix = ` (${links.length} URLs)`;
    if (template.length + suffix.length <= 100) {
      return template + suffix;
    }
  }

  return template;
}
