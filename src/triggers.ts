// PostCreate and CommentCreate trigger handlers.

import type { TriggerContext } from "@devvit/public-api";
import type { PostCreate, CommentCreate } from "@devvit/protos";
import { loadSettings, type CleanSettings } from "./settings.js";
import {
  cleanUrl,
  dedupeLinks,
  isDomainAllowed,
  type CleanedLink,
} from "./url-cleaning.js";
import { cleanTextLinks } from "./text-cleaning.js";
import { shouldIgnoreAuthor, isSelfComment } from "./guards.js";
import { submitModComment } from "./comments.js";
import { reportPost, reportComment } from "./reporting.js";
import { claimForProcessing } from "./storage.js";

// --- Shared helpers ---

/** Collect dirty links from post fields based on settings. */
function collectPostLinks(
  post: { selftext?: string; url?: string },
  settings: CleanSettings
): CleanedLink[] {
  let bodyLinks: CleanedLink[] = [];

  if (settings.scanSelftext && post.selftext) {
    const result = cleanTextLinks(
      post.selftext,
      settings.trackingParams,
      settings.sensitiveParams,
      settings.allowlistDomains,
      settings.denylistDomains
    );
    bodyLinks = result.cleanedLinks;
  }

  let postUrlLink: CleanedLink | null = null;
  if (settings.scanLinkPosts && post.url) {
    let domainOk = true;
    try {
      domainOk = isDomainAllowed(
        new URL(post.url),
        settings.allowlistDomains,
        settings.denylistDomains
      );
    } catch {
      domainOk = true;
    }

    if (domainOk) {
      const cleanedPostUrl = cleanUrl(
        post.url,
        settings.trackingParams,
        settings.sensitiveParams
      );
      if (cleanedPostUrl && cleanedPostUrl !== post.url) {
        postUrlLink = {
          original: post.url,
          cleaned: cleanedPostUrl,
          sourceType: "bare",
        };
      }
    }
  }

  return dedupeLinks([...bodyLinks, ...(postUrlLink ? [postUrlLink] : [])]);
}

/** Truncate link list to max and return the truncated list. */
function applyMaxLinks(
  links: CleanedLink[],
  max: number
): CleanedLink[] {
  return links.length > max ? links.slice(0, max) : links;
}

// --- PostCreate ---

export async function onPostCreate(
  event: PostCreate,
  context: TriggerContext
): Promise<void> {
  const post = event.post;
  if (!post) return;

  try {
    const settings = await loadSettings(context);

    // Atomic idempotency: claim or bail
    if (!(await claimForProcessing(context, "post", post.id))) return;

    // Author guards
    if (shouldIgnoreAuthor({ name: event.author?.name }, settings)) {
      return;
    }

    const allLinks = collectPostLinks(post, settings);
    if (allLinks.length === 0) return;

    const links = applyMaxLinks(allLinks, settings.maxLinksPerItem);

    // --- dry_run ---
    if (settings.mode === "dry_run") {
      console.log("clean-links: [dry_run] dirty URLs in post", {
        postId: post.id,
        count: links.length,
        links: links.map((l) => ({ from: l.original, to: l.cleaned })),
      });
      return;
    }

    // --- report_to_mods ---
    if (settings.mode === "report_to_mods") {
      try {
        await reportPost(context, post.id, links, settings.reportReason);
        console.log("clean-links: reported post to mod queue", {
          postId: post.id,
          count: links.length,
        });
      } catch (err) {
        console.error("clean-links: failed to report post", {
          postId: post.id,
          error: err,
        });
      }
      return;
    }

    // --- remove_posts ---
    if (settings.mode === "remove_posts") {
      try {
        const postModel = await context.reddit.getPostById(post.id);
        await postModel.remove();
      } catch (err) {
        console.error("clean-links: failed to remove post", {
          postId: post.id,
          error: err,
        });
        // Still try to comment even if removal failed
      }
      await submitModComment(
        context,
        post.id,
        links,
        settings.includeFooter,
        settings.compactAbove,
        settings.customMessage
      );
      console.log("clean-links: removed post and commented", {
        postId: post.id,
        count: links.length,
      });
      return;
    }

    // --- comment (default) ---
    await submitModComment(
      context,
      post.id,
      links,
      settings.includeFooter,
      settings.compactAbove,
      settings.customMessage
    );
    console.log("clean-links: commented on post", {
      postId: post.id,
      count: links.length,
    });
  } catch (err) {
    console.error("clean-links: error processing post", {
      postId: post.id,
      error: err,
    });
  }
}

// --- CommentCreate ---

export async function onCommentCreate(
  event: CommentCreate,
  context: TriggerContext
): Promise<void> {
  const comment = event.comment;
  if (!comment) return;

  try {
    const settings = await loadSettings(context);

    if (!settings.scanComments) return;

    // Self-comment guard: don't process the bot's own comments
    if (isSelfComment(event.author?.name, context.appName)) {
      return;
    }

    // Atomic idempotency
    if (!(await claimForProcessing(context, "comment", comment.id))) return;

    // Author guards
    if (shouldIgnoreAuthor({ name: event.author?.name }, settings)) {
      return;
    }

    const bodyText = comment.body ?? "";
    if (!bodyText) return;

    const { cleanedLinks } = cleanTextLinks(
      bodyText,
      settings.trackingParams,
      settings.sensitiveParams,
      settings.allowlistDomains,
      settings.denylistDomains
    );
    if (cleanedLinks.length === 0) return;

    const links = applyMaxLinks(cleanedLinks, settings.maxLinksPerItem);

    // --- dry_run ---
    if (settings.mode === "dry_run") {
      console.log("clean-links: [dry_run] dirty URLs in comment", {
        commentId: comment.id,
        count: links.length,
        links: links.map((l) => ({ from: l.original, to: l.cleaned })),
      });
      return;
    }

    // --- report_to_mods ---
    if (settings.mode === "report_to_mods") {
      try {
        await reportComment(context, comment.id, links, settings.reportReason);
        console.log("clean-links: reported comment to mod queue", {
          commentId: comment.id,
          count: links.length,
        });
      } catch (err) {
        console.error("clean-links: failed to report comment", {
          commentId: comment.id,
          error: err,
        });
      }
      return;
    }

    // --- comment / remove_posts modes ---
    // commentOnPostsOnly gates both: if set, skip replying to comments
    if (settings.commentOnPostsOnly) {
      console.log(
        "clean-links: [comment_on_posts_only] skipped comment reply",
        { commentId: comment.id, count: links.length }
      );
      return;
    }

    // Comments are never removed — only reply
    await submitModComment(
      context,
      comment.id,
      links,
      settings.includeFooter,
      settings.compactAbove,
      settings.customMessage
    );
    console.log("clean-links: commented on comment", {
      commentId: comment.id,
      count: links.length,
    });
  } catch (err) {
    console.error("clean-links: error processing comment", {
      commentId: comment.id,
      error: err,
    });
  }
}
