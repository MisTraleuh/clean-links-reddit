import { describe, it, expect } from "vitest";
import { buildCommentBody } from "../src/comments.js";
import type { CleanedLink } from "../src/url-cleaning.js";

const one: CleanedLink[] = [
  { original: "https://x.com/a?utm_source=r", cleaned: "https://x.com/a", sourceType: "bare" },
];
const many: CleanedLink[] = [
  { original: "https://x.com/a?utm_source=r", cleaned: "https://x.com/a", sourceType: "bare" },
  { original: "https://y.com/b?fbclid=z", cleaned: "https://y.com/b", sourceType: "markdown", label: "Read" },
];
const DEFAULT_FOOTER = "Tracking parameters were removed";

describe("buildCommentBody", () => {
  it("renders a single bare link", () => {
    const out = buildCommentBody(one, false);
    expect(out).toContain("Cleaned link:");
    expect(out).toContain("https://x.com/a");
  });

  it("renders multiple links as a list", () => {
    const out = buildCommentBody(many, false);
    expect(out).toContain("Cleaned links:");
    expect(out).toContain("- Read → https://y.com/b");
  });

  it("uses compact format above the threshold", () => {
    const out = buildCommentBody(many, false, 1);
    expect(out).toContain("2 tracked URLs were cleaned:");
  });

  it("adds the default footer when enabled with no custom message", () => {
    const out = buildCommentBody(one, true);
    expect(out).toContain(DEFAULT_FOOTER);
  });

  it("includes the footer when enabled and omits it when disabled", () => {
    const withFooter = buildCommentBody(one, true, 0, "");
    const noFooter = buildCommentBody(one, false, 0, "");
    expect(withFooter).toContain(DEFAULT_FOOTER);
    expect(noFooter).not.toContain("---");
  });

  it("replaces the default footer with a custom message", () => {
    const out = buildCommentBody(one, true, 0, "Please copy from the address bar");
    expect(out).toContain("Please copy from the address bar");
    expect(out).not.toContain(DEFAULT_FOOTER);
  });

  it("falls back to default footer for a whitespace-only custom message", () => {
    const out = buildCommentBody(one, true, 0, "   ");
    expect(out).toContain(DEFAULT_FOOTER);
  });

  it("expands placeholders in the custom message", () => {
    const out = buildCommentBody(many, true, 0, "Hi {author}, {count} link(s) in {subreddit}", {
      author: "alice",
      subreddit: "pics",
    });
    expect(out).toContain("Hi u/alice, 2 link(s) in r/pics");
  });

  it("does not render a footer when includeFooter is false even with a custom message", () => {
    const out = buildCommentBody(one, false, 0, "should not appear");
    expect(out).not.toContain("should not appear");
    expect(out).not.toContain("---");
  });
});
