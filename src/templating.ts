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
}

/**
 * Replace placeholders in a moderator-authored message.
 *
 * Supported placeholders:
 * - `{author}`        → `u/<name>` (or "the author" if unknown)
 * - `{subreddit}`     → `r/<name>` (or "this community" if unknown)
 * - `{count}`         → number of cleaned links
 * - `{cleaned_links}` → newline-separated list of cleaned URLs
 *
 * Unknown placeholders are left untouched so a stray brace never eats text.
 */
export function applyTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{author\}/g, vars.author ? `u/${vars.author}` : "the author")
    .replace(
      /\{subreddit\}/g,
      vars.subreddit ? `r/${vars.subreddit}` : "this community"
    )
    .replace(/\{count\}/g, String(vars.count))
    .replace(/\{cleaned_links\}/g, vars.cleanedLinks.join("\n"));
}
