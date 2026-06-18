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

  it("substitutes the singular cleaned_link/dirty_link with the first link", () => {
    const out = applyTemplate(
      "Use {cleaned_link} instead of {dirty_link}",
      {
        count: 2,
        originalLinks: ["https://youtu.be/AIhR_Hyd0GI?si=xxx", "https://b.com?utm_source=x"],
        cleanedLinks: ["https://www.youtube.com/watch?v=AIhR_Hyd0GI", "https://b.com"],
      }
    );
    expect(out).toBe(
      "Use https://www.youtube.com/watch?v=AIhR_Hyd0GI instead of https://youtu.be/AIhR_Hyd0GI?si=xxx"
    );
  });

  it("substitutes the plural dirty_links list", () => {
    const out = applyTemplate("{dirty_links}", {
      count: 2,
      originalLinks: ["https://a.com?utm_source=x", "https://b.com?si=y"],
      cleanedLinks: ["https://a.com", "https://b.com"],
    });
    expect(out).toBe("https://a.com?utm_source=x\nhttps://b.com?si=y");
  });

  it("does not let the singular form shadow the plural cleaned_links", () => {
    const out = applyTemplate("{cleaned_links}", base);
    expect(out).toBe("https://a.com\nhttps://b.com");
  });

  it("renders dirty placeholders empty when originalLinks is absent", () => {
    const out = applyTemplate("[{dirty_link}][{dirty_links}]", base);
    expect(out).toBe("[][]");
  });
});
