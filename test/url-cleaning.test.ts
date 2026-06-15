import { describe, it, expect } from "vitest";
import { cleanUrl, dedupeLinks } from "../src/url-cleaning.js";
import { TRACKING_PARAMS, SENSITIVE_PARAMS } from "../src/settings.js";

const clean = (url: string) => cleanUrl(url, TRACKING_PARAMS, SENSITIVE_PARAMS);

describe("cleanUrl", () => {
  it("strips utm_* params and keeps legitimate ones", () => {
    expect(clean("https://x.com/a?utm_source=r&id=1")).toBe(
      "https://x.com/a?id=1"
    );
  });

  it("strips fbclid", () => {
    expect(clean("https://x.com/a?fbclid=abc")).toBe("https://x.com/a");
  });

  it("returns null when nothing to clean", () => {
    expect(clean("https://x.com/a?id=1")).toBeNull();
  });

  it("strips domain-scoped si on youtube", () => {
    expect(clean("https://www.youtube.com/watch?v=abc&si=track")).toBe(
      "https://www.youtube.com/watch?v=abc"
    );
  });

  it("does NOT strip si on unrelated domains", () => {
    expect(clean("https://example.com/p?si=keep")).toBeNull();
  });

  it("unwraps a redirect URL and cleans the destination", () => {
    const inner = "https://dest.com/p?utm_source=x";
    const wrapped = `https://example.com/redirect?url=${encodeURIComponent(inner)}`;
    expect(clean(wrapped)).toBe("https://dest.com/p");
  });

  it("strips sensitive session params", () => {
    expect(clean("https://x.com/a?phpsessid=deadbeef&id=1")).toBe(
      "https://x.com/a?id=1"
    );
  });
});

describe("dedupeLinks", () => {
  it("prefers the labeled entry when cleaned URLs collide", () => {
    const out = dedupeLinks([
      { original: "https://a.com?x", cleaned: "https://a.com", sourceType: "bare" },
      {
        original: "https://a.com?y",
        cleaned: "https://a.com",
        sourceType: "markdown",
        label: "Link",
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe("Link");
  });
});
