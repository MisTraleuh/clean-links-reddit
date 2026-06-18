// Privately notify the author that their links were cleaned.
// Sends a subreddit private message so the user is educated even when they
// never see the public bot comment.

import type { TriggerContext } from "@devvit/public-api";
import { dedupeLinks, type CleanedLink } from "./url-cleaning.js";
import { applyTemplate } from "./templating.js";

const DEFAULT_DM_INTRO =
  "Heads up — one or more links in your recent submission contained tracking " +
  "parameters, so they were cleaned. Here are clean versions you can use " +
  "instead. This usually happens when you use a platform's share button; " +
  "copying the URL straight from your browser's address bar avoids it.";

export interface NotifyAuthorOptions {
  /** Author username, without the leading u/. */
  author?: string;
  /** Subreddit name, without the leading r/. */
  subreddit?: string;
  /** Cleaned links to include in the message. */
  cleanedLinks: CleanedLink[];
  /** Optional custom message; supports the same placeholders as the footer. */
  customMessage: string;
}

/**
 * Send the author a private message (from the subreddit) explaining the clean.
 *
 * No-ops when the author or subreddit is unknown, or when there are no cleaned
 * links. The caller is responsible for deciding whether the feature is enabled
 * and for swallowing/logging errors — sending a DM should never block the
 * primary moderation action.
 */
export async function notifyAuthorByDm(
  context: TriggerContext,
  options: NotifyAuthorOptions
): Promise<boolean> {
  const { author, subreddit, customMessage } = options;
  if (!author || !subreddit) return false;

  const links = dedupeLinks(options.cleanedLinks);
  if (links.length === 0) return false;

  const trimmed = customMessage.trim();
  const intro = trimmed
    ? applyTemplate(trimmed, {
        author,
        subreddit,
        count: links.length,
        cleanedLinks: links.map((l) => l.cleaned),
        originalLinks: links.map((l) => l.original),
      })
    : DEFAULT_DM_INTRO;

  const linkList = links.map((l) => `- ${l.cleaned}`).join("\n");
  const text = `${intro}\n\n${linkList}`;

  await context.reddit.sendPrivateMessageAsSubreddit({
    fromSubredditName: subreddit,
    to: author,
    subject: `About links in your recent post in r/${subreddit}`,
    text,
  });
  return true;
}
