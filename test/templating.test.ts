import { describe, it, expect } from "vitest";
import { applyTemplate } from "../src/templating.js";

describe("applyTemplate", () => {
  const base = { count: 2, cleanedLinks: ["https://a.com", "https://b.com"] };

  it("substitutes author and subreddit with prefixes", () => {
    const out = applyTemplate("Hi {author} in {subreddit}", {
      ...base,
      author: "alice",
      subreddit: "pics",
    });
    expect(out).toBe("Hi u/alice in r/pics");
  });

  it("falls back when author/subreddit are unknown", () => {
    const out = applyTemplate("Hi {author} in {subreddit}", base);
    expect(out).toBe("Hi the author in this community");
  });

  it("substitutes count and cleaned_links", () => {
    const out = applyTemplate("{count} cleaned:\n{cleaned_links}", base);
    expect(out).toBe("2 cleaned:\nhttps://a.com\nhttps://b.com");
  });

  it("replaces every occurrence of a placeholder", () => {
    const out = applyTemplate("{author} {author}", { ...base, author: "bob" });
    expect(out).toBe("u/bob u/bob");
  });

  it("leaves unknown placeholders untouched", () => {
    const out = applyTemplate("keep {unknown} here", base);
    expect(out).toBe("keep {unknown} here");
  });
});
