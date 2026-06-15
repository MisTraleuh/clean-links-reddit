import { defineConfig } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

const root = import.meta.dirname;

// The source uses NodeNext-style imports with explicit ".js" extensions that
// actually point at ".ts" files. Vite does not rewrite those by default, so a
// tiny pre-resolver maps "./foo.js" -> "./foo.ts" when the .ts file exists.
const resolveJsToTs = {
  name: "resolve-js-to-ts",
  enforce: "pre" as const,
  resolveId(source: string, importer: string | undefined) {
    if (importer && source.startsWith(".") && source.endsWith(".js")) {
      const candidate = path.resolve(
        path.dirname(importer),
        `${source.slice(0, -3)}.ts`
      );
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [resolveJsToTs],
  resolve: {
    alias: {
      // Stub the Devvit runtime; the pure modules never call into it in tests.
      "@devvit/public-api": path.resolve(root, "test/devvit-stub.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
