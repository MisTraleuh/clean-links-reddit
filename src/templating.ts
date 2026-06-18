// Substitute moderator-facing placeholders in custom messages.
// Pure functions, no Devvit dependencies.

export interface TemplateVars {
  /** Author username, without the leading u/. */
  author?: string;
  /** Subreddit name, without the leading r/. */
  subreddit?: string;
  /** Number of cleaned links in this action. */
  count: number;
  /** Cleaned URLs, in display order. */
  cleanedLinks: string[];
  /** Original (dirty) URLs, in the same order as cleanedLinks. */
  originalLinks?: string[];
}

/**
 * Replace placeholders in a moderator-authored message.
 *
 * Supported placeholders:
 * - `{author}`        → `u/<name>` (or "the author" if unknown)
 * - `{subreddit}`     → `r/<name>` (or "this community" if unknown)
 * - `{count}`         → number of cleaned links
 * - `{cleaned_links}` → newline-separated list of cleaned URLs
 * - `{dirty_links}`   → newline-separated list of original (dirty) URLs
 * - `{cleaned_link}`  → the first cleaned URL (the user's actual link)
 * - `{dirty_link}`    → the first original (dirty) URL (the user's actual link)
 *
 * The singular `{dirty_link}`/`{cleaned_link}` placeholders let moderators
 * tailor instructions to the user's real, immediate link instead of a mockup.
 *
 * Unknown placeholders are left untouched so a stray brace never eats text.
 */
export function applyTemplate(template: string, vars: TemplateVars): string {
  const originalLinks = vars.originalLinks ?? [];
  return template
    .replace(/\{author\}/g, vars.author ? `u/${vars.author}` : "the author")
    .replace(
      /\{subreddit\}/g,
      vars.subreddit ? `r/${vars.subreddit}` : "this community"
    )
    .replace(/\{count\}/g, String(vars.count))
    // Singular forms first so they don't get shadowed by the plural regex.
    .replace(/\{cleaned_link\}/g, vars.cleanedLinks[0] ?? "")
    .replace(/\{dirty_link\}/g, originalLinks[0] ?? "")
    .replace(/\{cleaned_links\}/g, vars.cleanedLinks.join("\n"))
    .replace(/\{dirty_links\}/g, originalLinks.join("\n"));
}
