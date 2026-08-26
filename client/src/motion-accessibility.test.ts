import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./index.css", import.meta.url), "utf8");

describe("3D motion accessibility", () => {
  it("provides a reduced-motion fallback for all signature animated elements", () => {
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
    [
      ".path-constellation",
      ".orbit",
      ".orbital-core",
      ".path-node",
      ".three-d-bar",
      ".progress-orb",
      ".energy-button",
    ].forEach(selector => expect(stylesheet).toContain(selector));
  });
});
