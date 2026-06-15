import { describe, it, expect } from "vitest";
import { notifyAuthorByDm } from "../src/notify.js";
import type { CleanedLink } from "../src/url-cleaning.js";

const links: CleanedLink[] = [
  { original: "https://x.com/a?utm_source=r", cleaned: "https://x.com/a", sourceType: "bare" },
  { original: "https://y.com/b?fbclid=z", cleaned: "https://y.com/b", sourceType: "bare" },
];

function makeContext() {
  const calls: Array<Record<string, string>> = [];
  const context = {
    reddit: {
      async sendPrivateMessageAsSubreddit(opts: Record<string, string>) {
        calls.push(opts);
      },
    },
  };
  // The real type is TriggerContext; the function only touches reddit.* here.
  return { context: context as never, calls };
}

describe("notifyAuthorByDm", () => {
  it("no-ops (and does not send) when the author is unknown", async () => {
    const { context, calls } = makeContext();
    const sent = await notifyAuthorByDm(context, {
      subreddit: "pics",
      cleanedLinks: links,
      customMessage: "",
    });
    expect(sent).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("no-ops when the subreddit is unknown", async () => {
    const { context, calls } = makeContext();
    const sent = await notifyAuthorByDm(context, {
      author: "alice",
      cleanedLinks: links,
      customMessage: "",
    });
    expect(sent).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("no-ops when there are no cleaned links", async () => {
    const { context, calls } = makeContext();
    const sent = await notifyAuthorByDm(context, {
      author: "alice",
      subreddit: "pics",
      cleanedLinks: [],
      customMessage: "",
    });
    expect(sent).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("sends from the subreddit with a default explanation and the link list", async () => {
    const { context, calls } = makeContext();
    const sent = await notifyAuthorByDm(context, {
      author: "alice",
      subreddit: "pics",
      cleanedLinks: links,
      customMessage: "",
    });
    expect(sent).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].fromSubredditName).toBe("pics");
    expect(calls[0].to).toBe("alice");
    expect(calls[0].subject).toContain("r/pics");
    expect(calls[0].text).toContain("tracking");
    expect(calls[0].text).toContain("- https://x.com/a");
    expect(calls[0].text).toContain("- https://y.com/b");
  });

  it("expands placeholders in a custom message", async () => {
    const { context, calls } = makeContext();
    await notifyAuthorByDm(context, {
      author: "alice",
      subreddit: "pics",
      cleanedLinks: links,
      customMessage: "Hi {author}, {count} link(s) in {subreddit}",
    });
    expect(calls[0].text).toContain("Hi u/alice, 2 link(s) in r/pics");
  });
});
