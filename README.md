# Clean Links

A Reddit Devvit moderation app that detects URLs containing tracking parameters and helps moderators deal with them — quietly, reliably, and without pretending it can do things it can't.

## What it does

- Detects tracking parameters in URLs across posts and comments
- Provides cleaned versions of dirty links
- Supports 4 moderation modes from public reply to fully silent
- Tracks processed items in Redis to never act twice on the same content

### What it does NOT do

- **It does not edit user content.** Reddit Devvit apps cannot reliably modify other users' posts or comments. This app will never pretend to fix content in place.
- **It does not remove comments.** Removing comments collapses the entire thread and hides the bot's replacement. Only posts can be removed.

### Why these limitations?

These are Reddit Devvit platform constraints, not design choices. The app is built to be honest about what is and isn't possible, so moderators can trust its behavior.

## Example

Original link:
```
https://example.com/article?id=123&utm_source=reddit&utm_medium=social&fbclid=abc123
```

Bot reply:
```
Cleaned link:
https://example.com/article?id=123
```

## Moderation Modes

### 1. Comment with cleaned links (default)

The bot replies publicly with cleaned versions of tracked URLs. Original content is untouched.

**Best for:** Communities that want visible transparency about link hygiene.

### 2. Report to mods

The bot reports the post or comment to the mod queue with a configurable reason. No public comment is posted. This is the quietest mode — users never see any bot activity.

**Best for:** Large communities, communities that want zero bot noise, or moderators who want to review tracked URLs before taking action.

### 3. Remove posts and comment cleaned links

The bot removes the post and replies with the cleaned link. Only applies to posts — comments are never removed.

**Best for:** Communities with strict link policies where tracked URLs should not stay visible.

### 4. Dry run / logs only

The bot detects tracked URLs and logs what it would do, but takes no action. No comments, no reports, no removals.

**Best for:** Testing the app after installation, or auditing link hygiene before choosing a mode.

### How to choose

| Priority | Recommended mode |
|----------|-----------------|
| Zero noise, mod-only workflow | `report_to_mods` |
| Transparent, visible cleaning | `comment` |
| Strict enforcement | `remove_posts` |
| Testing / evaluation | `dry_run` |

## Tracked Parameters

Removed by default:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id`
- `fbclid` (Facebook), `gclid` (Google), `msclkid` (Microsoft)
- `igsh` (Instagram)
- `ref_src`, `tracking_id`, `mc_cid`, `mc_eid`, `s_id`

Domain-scoped (only stripped on matching sites):

- `si` — YouTube, Spotify only
- `ref` — Amazon only
- Session/sensitive: `session`, `sessionid`, `session_id`, `sid`, `phpsessid`, `jsessionid`, `referrer`, `click_id`, `clickid`

Custom parameters can be added via settings.

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| mode | select | comment | Moderation mode |
| scan_selftext | boolean | true | Scan post body text for URLs |
| scan_link_posts | boolean | true | Scan link post URLs |
| scan_comments | boolean | true | Scan comment bodies for URLs |
| comment_on_posts_only | boolean | false | In comment mode, only reply to posts (not comments) |
| ignore_bots | boolean | true | Skip bot accounts (name-based heuristic) |
| ignore_automoderator | boolean | true | Skip AutoModerator |
| max_links_per_item | number | 10 | Max cleaned links per action |
| compact_above | number | 5 | Use compact summary when link count exceeds this |
| custom_tracking_params | string | "" | Additional params to strip (comma separated) |
| allowlist_domains | string | "" | Only process these domains |
| denylist_domains | string | "" | Ignore these domains |
| include_footer | boolean | true | Add explanation footer to bot comments |
| report_reason | string | (default) | Reason string for report_to_mods mode |

## Anti-spam / Idempotency

Every processed item is recorded in Redis (`processed:post:{id}`, `processed:comment:{id}`) with a 7-day TTL. The bot will never act on the same item twice, regardless of mode.

## Migration from v2

If upgrading from the previous 3-mode version:

- **New `report_to_mods` mode** — sends tracked URL detections to the mod queue with no public comment. This is the recommended mode for large or noise-sensitive communities.
- **New `comment_on_posts_only` setting** — in comment mode, the bot can skip replying to comments while still replying to posts.
- **New `compact_above` setting** — when many links are cleaned, the bot uses a shorter summary instead of listing every URL.
- **New `report_reason` setting** — customize the reason string sent to the mod queue.
- **Improved comment formatting** — single vs. multiple link templates, optional compact mode.
- No change to the principle that **user content is never edited**.
- No change to the principle that **comments are never removed**.
- All existing settings remain compatible.
