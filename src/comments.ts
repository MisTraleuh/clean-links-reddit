// Generate and submit bot comments.

import type { TriggerContext } from "@devvit/public-api";
import { dedupeLinks, type CleanedLink } from "./url-cleaning.js";

/** Format a single link for a multi-link list line. */
function formatLinkLine(link: CleanedLink): string {
  if (link.label) {
    return `- ${link.label} → ${link.cleaned}`;
  }
  return `- ${link.cleaned}`;
}

/**
 * Build the markdown body for a bot reply.
 *
 * - Single link with label:  Cleaned link from "Label":\n<url>
 * - Single bare link:        Cleaned link:\n<url>
 * - Multiple links:          Cleaned links:\n- Label → url\n- url
 * - Compact (above threshold): count + first 3 + "...and N more"
 */
export function buildCommentBody(
  cleanedLinks: CleanedLink[],
  includeFooter: boolean,
  compactAbove: number = 0
): string {
  const links = dedupeLinks(cleanedLinks);
  const useCompact = compactAbove > 0 && links.length > compactAbove;
  const lines: string[] = [];

  if (useCompact) {
    const shown = links.slice(0, 3);
    const remaining = links.length - shown.length;
    lines.push(
      `${links.length} tracked URLs were cleaned:`,
      ...shown.map(formatLinkLine)
    );
    if (remaining > 0) {
      lines.push(`- ...and ${remaining} more`);
    }
  } else if (links.length === 1) {
    const link = links[0];
    if (link.label) {
      lines.push(`Cleaned link from "${link.label}":`, link.cleaned);
    } else {
      lines.push("Cleaned link:", link.cleaned);
    }
  } else {
    lines.push("Cleaned links:", ...links.map(formatLinkLine));
  }

  if (includeFooter) {
    lines.push(
      "",
      "---",
      "*Tracking parameters were removed from the original URL(s).*"
    );
  }

  return lines.join("\n");
}

/** Submit a distinguished mod comment with cleaned links. */
export async function submitModComment(
  context: TriggerContext,
  thingId: string,
  cleanedLinks: CleanedLink[],
  includeFooter: boolean,
  compactAbove: number = 0
): Promise<void> {
  const links = dedupeLinks(cleanedLinks);
  if (links.length === 0) return;

  const text = buildCommentBody(links, includeFooter, compactAbove);
  const comment = await context.reddit.submitComment({
    id: thingId,
    text,
  });

  try {
    await comment.distinguish();
  } catch (err) {
    console.error("clean-links: failed to distinguish comment", err);
  }
}
