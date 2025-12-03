// Pure functions for URL cleaning. No Devvit dependencies.

export type CleanedLink = {
  original: string;
  cleaned: string;
  /** Visible label text from a markdown link, e.g. "Interesting read". */
  label?: string;
  /** How this URL was found in the source text. */
  sourceType: "markdown" | "bare";
};

// --- Domain-scoped params ---

import { DOMAIN_SCOPED_PARAMS } from "./settings.js";

/** Get extra tracking params that apply to a specific hostname. */
function getDomainScopedParams(hostname: string): string[] {
  const extra: string[] = [];
  for (const entry of DOMAIN_SCOPED_PARAMS) {
    if (entry.domains.test(hostname)) {
      extra.push(...entry.params);
    }
  }
  return extra;
}

// --- Constants ---

const MAX_NESTED_URL_DEPTH = 2;

const REDIRECT_PARAM_KEYS = [
  "url",
  "u",
  "target",
  "dest",
  "destination",
  "redirect",
  "redir",
  "next",
  "out",
  "to",
];

const REDIRECT_HOSTS = [
  /(^|\.)google\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)reddit\.com$/i,
  /(^|\.)t\.co$/i,
  /(^|\.)lnkd\.in$/i,
];

const REDIRECT_PATHS = [/^\/url\b/i, /^\/redirect\b/i, /^\/out\b/i];

// --- Helpers ---

/** Extract entries from URLSearchParams (ES2020 WebWorker compat). */
function searchParamsEntries(params: URLSearchParams): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  params.forEach((value, key) => entries.push([key, value]));
  return entries;
}

function normalizeUrlForParsing(urlString: string): string {
  return urlString.replace(/\\_/g, "_");
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isTrackingParam(key: string, trackingParams: Set<string>): boolean {
  const normalized = key.toLowerCase();
  return trackingParams.has(normalized) || normalized.startsWith("utm_");
}

function isSensitiveParam(key: string, sensitiveParams: Set<string>): boolean {
  return sensitiveParams.has(key.toLowerCase());
}

function isUnwantedParam(
  key: string,
  trackingParams: Set<string>,
  sensitiveParams: Set<string>
): boolean {
  return (
    isTrackingParam(key, trackingParams) ||
    isSensitiveParam(key, sensitiveParams)
  );
}

function decodeUrlParam(value: string): string | null {
  let decoded = value;
  for (let depth = 0; depth <= MAX_NESTED_URL_DEPTH; depth += 1) {
    if (isHttpUrl(decoded)) return decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

// --- Domain filtering ---

/** Returns true if the URL's domain passes allowlist/denylist checks. */
export function isDomainAllowed(
  url: URL,
  allowlist: string[],
  denylist: string[]
): boolean {
  const hostname = url.hostname.toLowerCase();

  if (denylist.length > 0) {
    if (denylist.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
      return false;
    }
  }

  if (allowlist.length > 0) {
    return allowlist.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  }

  return true;
}

// --- Redirect extraction ---

function shouldExtractRedirect(
  url: URL,
  redirectKey: string,
  trackingParams: Set<string>,
  sensitiveParams: Set<string>
): boolean {
  const hostMatch = REDIRECT_HOSTS.some((p) => p.test(url.hostname));
  const pathMatch = REDIRECT_PATHS.some((p) => p.test(url.pathname));
  if (hostMatch || pathMatch) return true;

  const otherKeys: string[] = [];
  url.searchParams.forEach((_value, key) => {
    if (key.toLowerCase() !== redirectKey.toLowerCase()) {
      otherKeys.push(key);
    }
  });
  if (otherKeys.length === 0) return true;

  return otherKeys.every((key) =>
    isUnwantedParam(key, trackingParams, sensitiveParams)
  );
}

function maybeExtractRedirect(
  url: URL,
  trackingParams: Set<string>,
  sensitiveParams: Set<string>,
  depth: number
): URL | null {
  if (depth >= MAX_NESTED_URL_DEPTH) return null;

  let extracted: URL | null = null;

  url.searchParams.forEach((value, key) => {
    if (extracted) return;
    if (!REDIRECT_PARAM_KEYS.includes(key.toLowerCase())) return;

    const normalizedValue = normalizeUrlForParsing(value);
    const nestedUrl = decodeUrlParam(normalizedValue);
    if (!nestedUrl) return;

    if (!shouldExtractRedirect(url, key, trackingParams, sensitiveParams))
      return;

    const nestedResult = cleanUrlDeep(
      nestedUrl,
      trackingParams,
      sensitiveParams,
      depth + 1
    );

    const cleanedNested = nestedResult?.cleaned ?? nestedUrl;
    try {
      extracted = new URL(cleanedNested);
    } catch {
      extracted = null;
    }
  });

  return extracted;
}

// --- Deduplication ---

function dedupeParamEntries(
  entries: Array<[string, string]>
): { entries: Array<[string, string]>; removed: boolean } {
  const seen = new Map<string, Set<string>>();
  const deduped: Array<[string, string]> = [];
  let removed = false;

  for (const [key, value] of entries) {
    const keyValues = seen.get(key) ?? new Set<string>();
    if (keyValues.has(value)) {
      removed = true;
      continue;
    }
    keyValues.add(value);
    seen.set(key, keyValues);
    deduped.push([key, value]);
  }

  return { entries: deduped, removed };
}

// --- Hash fragment cleaning ---

function cleanHashFragment(
  hash: string,
  trackingParams: Set<string>,
  sensitiveParams: Set<string>
): { hash: string; dirty: boolean } {
  if (!hash) return { hash, dirty: false };
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return { hash: "", dirty: false };

  const questionIndex = raw.indexOf("?");
  const prefix = questionIndex === -1 ? "" : raw.slice(0, questionIndex);
  const query = questionIndex === -1 ? raw : raw.slice(questionIndex + 1);
  if (!query.includes("=")) return { hash, dirty: false };

  const params = new URLSearchParams(query);
  const newParams = new URLSearchParams();
  let dirty = false;

  params.forEach((value, key) => {
    if (isUnwantedParam(key, trackingParams, sensitiveParams)) {
      dirty = true;
      return;
    }
    newParams.append(key, value);
  });

  if (!dirty) return { hash, dirty: false };

  const newQuery = newParams.toString();
  if (!newQuery) return { hash: "", dirty: true };

  const newHash = prefix ? `${prefix}?${newQuery}` : newQuery;
  return { hash: `#${newHash}`, dirty: true };
}

// --- Core cleaning engine ---

function cleanUrlDeep(
  urlString: string,
  trackingParams: Set<string>,
  sensitiveParams: Set<string>,
  depth: number
): { cleaned: string; dirty: boolean } | null {
  try {
    const normalized = normalizeUrlForParsing(urlString);
    if (!isHttpUrl(normalized)) return null;

    let url = new URL(normalized);

    // Merge domain-scoped tracking params for this hostname
    const domainExtra = getDomainScopedParams(url.hostname);
    // Always create a copy so we can safely add params after redirect extraction
    const effectiveTrackingParams = new Set(trackingParams);
    for (const p of domainExtra) effectiveTrackingParams.add(p.toLowerCase());

    const originalEntries = searchParamsEntries(url.searchParams);
    const newEntries: Array<[string, string]> = [];
    let dirty = false;

    const extracted = maybeExtractRedirect(
      url,
      effectiveTrackingParams,
      sensitiveParams,
      depth
    );
    if (extracted) {
      url = extracted;
      dirty = true;
      // Recompute domain-scoped params if redirect changed the host
      const newExtra = getDomainScopedParams(url.hostname);
      if (newExtra.length > 0) {
        for (const p of newExtra) effectiveTrackingParams.add(p.toLowerCase());
      }
    }

    const effectiveEntries = extracted
      ? searchParamsEntries(url.searchParams)
      : originalEntries;

    for (const [key, value] of effectiveEntries) {
      if (isUnwantedParam(key, effectiveTrackingParams, sensitiveParams)) {
        dirty = true;
        continue;
      }

      let nextValue = value;
      if (depth < MAX_NESTED_URL_DEPTH) {
        const normalizedValue = normalizeUrlForParsing(value);
        const nested = decodeUrlParam(normalizedValue);
        if (nested) {
          const nestedResult = cleanUrlDeep(
            nested,
            trackingParams,
            sensitiveParams,
            depth + 1
          );
          if (nestedResult?.dirty) {
            nextValue = nestedResult.cleaned;
            if (nextValue !== value) dirty = true;
          }
        }
      }

      newEntries.push([key, nextValue]);
    }

    const deduped = dedupeParamEntries(newEntries);
    if (deduped.removed) dirty = true;

    const hashResult = cleanHashFragment(
      url.hash,
      effectiveTrackingParams,
      sensitiveParams
    );
    if (hashResult.dirty) {
      dirty = true;
      url.hash = hashResult.hash;
    }

    if (!dirty) return null;

    url.search = new URLSearchParams(deduped.entries).toString();
    return { cleaned: url.toString(), dirty: true };
  } catch {
    return null;
  }
}

// --- Public API ---

/** Clean a single URL, returning the cleaned version or null if unchanged. */
export function cleanUrl(
  urlString: string,
  trackingParams: string[],
  sensitiveParams: string[]
): string | null {
  const tpSet = new Set(trackingParams.map((p) => p.toLowerCase()));
  const spSet = new Set(sensitiveParams.map((p) => p.toLowerCase()));
  const result = cleanUrlDeep(urlString, tpSet, spSet, 0);
  return result?.cleaned ?? null;
}

/**
 * Remove duplicate cleaned links by cleaned URL.
 * When two entries share the same cleaned URL, prefer the one with a label
 * (more informative for comment rendering).
 */
export function dedupeLinks(links: CleanedLink[]): CleanedLink[] {
  const unique = new Map<string, CleanedLink>();
  for (const link of links) {
    const existing = unique.get(link.cleaned);
    if (!existing) {
      unique.set(link.cleaned, link);
    } else if (!existing.label && link.label) {
      // Upgrade: replace a bare entry with a labeled one
      unique.set(link.cleaned, link);
    }
  }
  return Array.from(unique.values());
}
