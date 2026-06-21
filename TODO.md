# TODO

Roadmap items, mostly driven by r/HomeNetworking mod feedback.

## Edit handling (bad-actor bypass)

Currently the app only reacts on creation (`PostCreate` / `CommentCreate`).
A user can submit a clean post/comment, then **edit** it afterwards to add
tracking links and bypass the bot.

- [ ] Add `PostUpdate` trigger (re-check + clean/handle on edit)
- [ ] Add `CommentUpdate` trigger (re-check + clean/handle on edit)
- [ ] Make sure idempotency / claim logic plays well with re-processing on edit

## Skip already-removed items (AutoModerator coexistence)

When `ignoreAutoModerator = false`, AutoMod runs first. If it removes a
post/comment for a rule violation, the app should **not** act on it.

- [ ] Before acting, check if the post/comment is already removed/spammed
      (by AutoMod or a mod) → if removed, do nothing.

## Per-domain cleaning strategy (configurable)

Today per-domain handling exists but is **hardcoded** (`DOMAIN_SCOPED_PARAMS`
in `src/settings.ts`) and still **tag-based** (e.g. Amazon `ref`, YouTube `si`).

Mod request: a configurable, per-domain filter that can **strip the entire
query string** for a domain instead of maintaining a long tag list.
Example: `amazon.com/.../dp/<id>?...` → keep only `amazon.com/.../dp/<id>`.

- [ ] Add a configurable `custom_cleaning_filter` setting (per-domain rules)
- [ ] Support a "strip entire query string" strategy per domain
- [ ] Optionally: keep-only-specific-params strategy per domain
- [ ] Keep the global tag list as the default fallback for domains without a rule

## Release process reminder

Each new version must go through Devvit's automated/security review, then
Reddit's approval, before it's publicly installable. Ping r/HomeNetworking
mods once the new version is approved and live.
