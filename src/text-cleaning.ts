// Extract URLs from text and clean them. No Devvit dependencies.

import {
  cleanUrl,
  dedupeLinks,
  isDomainAllowed,
  type CleanedLink,
} from "./url-cleaning.js";

type UrlReplacement = {
  original: string;
  cleaned: string;
  /** Label text from a markdown link, if any. */
  label?: string;
  sourceType: "markdown" | "bare";
};

/** Check if a URL string passes domain filtering. */
function passesFilter(
  urlString: string,
  allowlist: string[],
  denylist: string[]
): boolean {
  if (allowlist.length === 0 && denylist.length === 0) return true;
  try {
    return isDomainAllowed(new URL(urlString), allowlist, denylist);
  } catch {
    return true;
  }
}

export interface TextCleanResult {
  cleanedLinks: CleanedLink[];
}

/**
 * Find and clean URLs in a text body.
 * Handles both markdown links [label](url) and bare URLs.
 */
export function cleanTextLinks(
  text: string,
  trackingParams: string[],
  sensitiveParams: string[],
  allowlist: string[] = [],
  denylist: string[] = []
): TextCleanResult {
  const replacements: UrlReplacement[] = [];
  const markdownRanges: Array<{ start: number; end: number }> = [];

  // Pass 1: markdown links [label](url)
  const markdownRegex = /\[([^\]]*)]\((https?:\/\/[^\s)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = markdownRegex.exec(text)) !== null) {
    const label = match[1].trim() || undefined;
    const original = match[2];
    if (!passesFilter(original, allowlist, denylist)) continue;

    const cleaned = cleanUrl(original, trackingParams, sensitiveParams);
    const fullStart = match.index;
    const fullEnd = match.index + match[0].length;
    markdownRanges.push({ start: fullStart, end: fullEnd });
    if (cleaned && cleaned !== original) {
      replacements.push({ original, cleaned, label, sourceType: "markdown" });
    }
  }

  // Pass 2: bare URLs
  const bareRegex = /https?:\/\/[^\s)]+/g;
  while ((match = bareRegex.exec(text)) !== null) {
    const original = match[0];
    const start = match.index;
    const end = start + original.length;
    if (
      markdownRanges.some((range) => start >= range.start && start < range.end)
    )
      continue;
    if (!passesFilter(original, allowlist, denylist)) continue;

    const cleaned = cleanUrl(original, trackingParams, sensitiveParams);
    if (cleaned && cleaned !== original) {
      replacements.push({ original, cleaned, sourceType: "bare" });
    }
  }

  if (replacements.length === 0) {
    return { cleanedLinks: [] };
  }

  return {
    cleanedLinks: dedupeLinks(
      replacements.map((r) => ({
        original: r.original,
        cleaned: r.cleaned,
        label: r.label,
        sourceType: r.sourceType,
      }))
    ),
  };
}
