import { describe, it, expect } from "vitest";
import { cleanTextLinks } from "../src/text-cleaning.js";
import { TRACKING_PARAMS, SENSITIVE_PARAMS } from "../src/settings.js";

const run = (text: string, allow: string[] = [], deny: string[] = []) =>
  cleanTextLinks(text, TRACKING_PARAMS, SENSITIVE_PARAMS, allow, deny);

describe("cleanTextLinks", () => {
  it("cleans a markdown link and preserves its label", () => {
    const { cleanedLinks } = run("see [Read](https://x.com/a?utm_source=r)");
    expect(cleanedLinks).toHaveLength(1);
    expect(cleanedLinks[0].cleaned).toBe("https://x.com/a");
    expect(cleanedLinks[0].label).toBe("Read");
  });

  it("cleans bare URLs", () => {
    const { cleanedLinks } = run("go to https://y.com/b?fbclid=z now");
    expect(cleanedLinks).toHaveLength(1);
    expect(cleanedLinks[0].cleaned).toBe("https://y.com/b");
  });

  it("handles both markdown and bare links in one body", () => {
    const { cleanedLinks } = run(
      "[A](https://x.com/a?utm_source=r) and https://y.com/b?gclid=z"
    );
    const cleaned = cleanedLinks.map((l) => l.cleaned).sort();
    expect(cleaned).toEqual(["https://x.com/a", "https://y.com/b"]);
  });

  it("ignores clean links", () => {
    const { cleanedLinks } = run("nothing dirty here https://x.com/a?id=1");
    expect(cleanedLinks).toHaveLength(0);
  });

  it("respects the denylist", () => {
    const { cleanedLinks } = run(
      "https://skip.com/a?utm_source=r",
      [],
      ["skip.com"]
    );
    expect(cleanedLinks).toHaveLength(0);
  });
});
