import { describe, expect, it } from "vitest";
import {
  freeplaneMmToMarkdown,
  markdownToFreeplaneMm,
} from "./freeplane-parser";

describe("freeplane-parser", () => {
  it("converts Freeplane XML to Markdown with icons and links", () => {
    const xml = `
      <map version="freeplane 1.9.0">
        <node TEXT="Central Idea" ID="ID_1">
          <icon BUILTIN="idea"/>
          <node TEXT="Child 1" ID="ID_2" LINK="https://example.com"/>
          <node TEXT="Child 2" ID="ID_3">
            <node TEXT="Grandchild" ID="ID_4"/>
          </node>
        </node>
      </map>
    `;

    const md = freeplaneMmToMarkdown(xml);
    expect(md).toContain("# 💡 Central Idea");
    expect(md).toContain("## [Child 1](https://example.com)");
    expect(md).toContain("## Child 2");
    expect(md).toContain("- Grandchild");
  });

  it("converts Markdown tree back to valid Freeplane XML", () => {
    const md = `# Root
## Topic A
- Sub 1
- Sub 2
## Topic B`;

    const xml = markdownToFreeplaneMm(md);
    expect(xml).toContain('<map version="freeplane 1.9.0">');
    expect(xml).toContain('<node TEXT="Root"');
    expect(xml).toContain('<node TEXT="Topic A"');
    expect(xml).toContain('<node TEXT="Sub 1"');
    expect(xml).toContain('<node TEXT="Sub 2"');
    expect(xml).toContain('<node TEXT="Topic B"');
  });

  it("handles empty or invalid XML safely", () => {
    expect(() => freeplaneMmToMarkdown("")).toThrow();
    expect(() => freeplaneMmToMarkdown("invalid xml")).toThrow();
  });
});
