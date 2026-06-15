import { Devvit, SettingScope } from "@devvit/public-api";

// --- Types ---

export type Mode = "comment" | "report_to_mods" | "remove_posts" | "dry_run";

export interface CleanSettings {
  mode: Mode;
  scanSelftext: boolean;
  scanLinkPosts: boolean;
  scanComments: boolean;
  commentOnPostsOnly: boolean;
  ignoreBots: boolean;
  ignoreAutoModerator: boolean;
  maxLinksPerItem: number;
  compactAbove: number;
  trackingParams: string[];
  sensitiveParams: string[];
  allowlistDomains: string[];
  denylistDomains: string[];
  includeFooter: boolean;
  customMessage: string;
  notifyAuthor: boolean;
  reportReason: string;
}

// --- Defaults ---

// Tracking params that are safe to strip universally.
// `si` and `ref` are NOT included here because they are legitimate params
// on many sites (pagination, Amazon product refs, etc.). They are available
// as domain-scoped params instead — see DOMAIN_SCOPED_PARAMS.
export const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "igsh",
  "s_id",
  "ref_src",
  "tracking_id",
  "msclkid",
  "mc_cid",
  "mc_eid",
];

/**
 * Params that are only tracking on specific domains.
 * The URL cleaner checks these only when the hostname matches.
 */
export const DOMAIN_SCOPED_PARAMS: Array<{ domains: RegExp; params: string[] }> = [
  {
    // YouTube / Spotify sharing tracker
    domains: /(^|\.)(youtube\.com|youtu\.be|spotify\.com|open\.spotify\.com)$/i,
    params: ["si"],
  },
  {
    // Amazon ref tracking
    domains: /(^|\.)amazon\.(com|co\.\w{2}|de|fr|it|es|ca|com\.au|co\.jp|in|com\.br)$/i,
    params: ["ref"],
  },
];

export const SENSITIVE_PARAMS = [
  "session",
  "sessionid",
  "session_id",
  "sid",
  "phpsessid",
  "jsessionid",
  "referrer",
  "click_id",
  "clickid",
];

export const DEFAULT_REPORT_REASON =
  "Tracked URL detected — clean version available in mod log";

// --- Settings Schema ---

export function registerSettings(): void {
  Devvit.addSettings([
    // --- Mode ---
    {
      name: "mode",
      label: "Moderation mode",
      type: "select",
      scope: SettingScope.Installation,
      defaultValue: ["comment"],
      options: [
        {
          label: "Comment with cleaned links (public reply, does not modify original)",
          value: "comment",
        },
        {
          label: "Report to mods (sends to mod queue, no public reply)",
          value: "report_to_mods",
        },
        {
          label: "Remove posts and comment cleaned links (posts only)",
          value: "remove_posts",
        },
        {
          label: "Dry run / logs only (no action taken)",
          value: "dry_run",
        },
      ],
      helpText:
        "How the app responds when tracking URLs are detected. " +
        "'Report to mods' is the quietest option — no public comment, just a mod queue entry. " +
        "Note: this app never edits user content (Devvit platform limitation).",
    },

    // --- Scanning scope ---
    {
      name: "scan_selftext",
      label: "Scan post body text for URLs",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: true,
    },
    {
      name: "scan_link_posts",
      label: "Scan link post URLs",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: true,
    },
    {
      name: "scan_comments",
      label: "Scan comment bodies for URLs",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: true,
      helpText: "If disabled, comments are completely ignored regardless of mode.",
    },
    {
      name: "comment_on_posts_only",
      label: "Only reply to posts (skip comments in comment/remove_posts modes)",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: false,
      helpText:
        "When enabled, the bot will still scan comments but only log detections " +
        "instead of replying publicly. Reduces noise in active threads. " +
        "Does not affect 'report_to_mods' mode — comments are always reported if scanned.",
    },

    // --- Author filtering ---
    {
      name: "ignore_bots",
      label: "Ignore posts/comments from bot accounts",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: true,
      helpText:
        "Skips users whose name ends with 'bot' (case-insensitive). " +
        "This is a name-based heuristic — it may miss some bots or match non-bot names like 'robot'.",
    },
    {
      name: "ignore_automoderator",
      label: "Ignore AutoModerator",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: true,
    },

    // --- Output limits ---
    {
      name: "max_links_per_item",
      label: "Max cleaned links per action",
      type: "number",
      scope: SettingScope.Installation,
      defaultValue: 10,
      helpText:
        "Maximum number of cleaned links included in a reply or report. " +
        "Additional dirty links are still logged but not surfaced.",
    },
    {
      name: "compact_above",
      label: "Use compact format above N links",
      type: "number",
      scope: SettingScope.Installation,
      defaultValue: 5,
      helpText:
        "When a post/comment has more cleaned links than this number, " +
        "the bot uses a shorter summary comment instead of listing every URL. " +
        "Set to 0 to always use full format.",
    },

    // --- Tracking params ---
    {
      name: "custom_tracking_params",
      label: "Custom tracking parameters (comma separated)",
      type: "string",
      scope: SettingScope.Installation,
      defaultValue: "",
      helpText:
        "Additional URL parameter names to strip, on top of the built-in list. " +
        "Example: vero_id,ef_id,si,ref",
    },

    // --- Domain filtering ---
    {
      name: "allowlist_domains",
      label: "Allowlist domains (comma separated, optional)",
      type: "string",
      scope: SettingScope.Installation,
      defaultValue: "",
      helpText:
        "If set, only URLs from these domains will be processed. " +
        "Leave empty to process all domains. Example: example.com,news.site.org",
    },
    {
      name: "denylist_domains",
      label: "Denylist domains (comma separated, optional)",
      type: "string",
      scope: SettingScope.Installation,
      defaultValue: "",
      helpText:
        "URLs from these domains will always be ignored. " +
        "Example: reddit.com,imgur.com",
    },

    // --- Comment formatting ---
    {
      name: "include_footer",
      label: "Add explanation footer to bot comments",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: true,
      helpText:
        "Appends a note at the bottom of bot comments. By default this is a " +
        "short 'tracking parameters were removed' explanation, but it can be " +
        "replaced with your own text via the custom footer message below. " +
        "Only applies to comment and remove_posts modes.",
    },
    {
      name: "custom_footer_message",
      label: "Custom footer message (replaces the default explanation)",
      type: "paragraph",
      scope: SettingScope.Installation,
      defaultValue: "",
      helpText:
        "Optional. When set, this text replaces the default footer note on bot " +
        "comments. Use it to explain, in your own words, why the link was " +
        "cleaned and how users can avoid it next time (for example: copy the " +
        "URL from the address bar instead of using the platform's share button). " +
        "Supports Markdown. Requires the footer toggle above to be enabled, and " +
        "only applies to comment and remove_posts modes. You can personalize it " +
        "with {author}, {subreddit}, {count} and {cleaned_links} placeholders.",
    },

    // --- Notify author ---
    {
      name: "notify_author",
      label: "Also send the explanation to the author by private message",
      type: "boolean",
      scope: SettingScope.Installation,
      defaultValue: false,
      helpText:
        "When enabled, the author is sent a subreddit private message with the " +
        "cleaned links and your custom message (or a default explanation). " +
        "Useful because most users never see the public bot comment. Applies to " +
        "comment, remove_posts and report_to_mods modes (not dry run). Use " +
        "responsibly to avoid messaging fatigue.",
    },

    // --- Report reason ---
    {
      name: "report_reason",
      label: "Report reason (report_to_mods mode)",
      type: "string",
      scope: SettingScope.Installation,
      defaultValue: DEFAULT_REPORT_REASON,
      helpText:
        "The reason string sent to the mod queue when using report_to_mods mode. " +
        "Keep it short — Reddit truncates long report reasons.",
    },
  ]);
}

// --- Parse Settings ---

function parseCommaSeparated(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.length > 0);
}

/**
 * Unwrap a Devvit select value which may arrive as string[] or string.
 */
function unwrapSelect<T extends string>(
  raw: unknown,
  fallback: T
): T {
  if (Array.isArray(raw)) return (raw[0] as T) ?? fallback;
  if (typeof raw === "string" && raw.length > 0) return raw as T;
  return fallback;
}

export async function loadSettings(
  context: { settings: { get: (key: string) => Promise<unknown> } }
): Promise<CleanSettings> {
  const [
    rawMode,
    scanSelftext,
    scanLinkPosts,
    scanComments,
    commentOnPostsOnly,
    ignoreBots,
    ignoreAutoModerator,
    maxLinksPerItem,
    compactAbove,
    customTrackingParams,
    allowlistDomains,
    denylistDomains,
    includeFooter,
    customFooterMessage,
    notifyAuthor,
    reportReason,
  ] = await Promise.all([
    context.settings.get("mode"),
    context.settings.get("scan_selftext") as Promise<boolean | undefined>,
    context.settings.get("scan_link_posts") as Promise<boolean | undefined>,
    context.settings.get("scan_comments") as Promise<boolean | undefined>,
    context.settings.get("comment_on_posts_only") as Promise<boolean | undefined>,
    context.settings.get("ignore_bots") as Promise<boolean | undefined>,
    context.settings.get("ignore_automoderator") as Promise<boolean | undefined>,
    context.settings.get("max_links_per_item") as Promise<number | undefined>,
    context.settings.get("compact_above") as Promise<number | undefined>,
    context.settings.get("custom_tracking_params") as Promise<string | undefined>,
    context.settings.get("allowlist_domains") as Promise<string | undefined>,
    context.settings.get("denylist_domains") as Promise<string | undefined>,
    context.settings.get("include_footer") as Promise<boolean | undefined>,
    context.settings.get("custom_footer_message") as Promise<string | undefined>,
    context.settings.get("notify_author") as Promise<boolean | undefined>,
    context.settings.get("report_reason") as Promise<string | undefined>,
  ]);

  const mode = unwrapSelect<Mode>(rawMode, "comment");
  const extraParams = parseCommaSeparated(customTrackingParams as string);

  return {
    mode,
    scanSelftext: scanSelftext ?? true,
    scanLinkPosts: scanLinkPosts ?? true,
    scanComments: scanComments ?? true,
    commentOnPostsOnly: commentOnPostsOnly ?? false,
    ignoreBots: ignoreBots ?? true,
    ignoreAutoModerator: ignoreAutoModerator ?? true,
    maxLinksPerItem: maxLinksPerItem ?? 10,
    compactAbove: compactAbove ?? 5,
    trackingParams: [...TRACKING_PARAMS, ...extraParams],
    sensitiveParams: [...SENSITIVE_PARAMS],
    allowlistDomains: parseCommaSeparated(allowlistDomains as string),
    denylistDomains: parseCommaSeparated(denylistDomains as string),
    includeFooter: includeFooter ?? true,
    customMessage: (customFooterMessage as string) ?? "",
    notifyAuthor: notifyAuthor ?? false,
    reportReason: (reportReason as string) || DEFAULT_REPORT_REASON,
  };
}
