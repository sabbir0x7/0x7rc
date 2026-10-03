import { describe, expect, it } from "vitest";
import {
  addChildNode,
  addSiblingNode,
  deleteNode,
  markdownToTree,
  treeToMarkdown,
  treeToMarkmapRoot,
  updateNodeText,
} from "./tree-model";

describe("tree-model", () => {
  it("converts markdown to tree and back", () => {
    const md = `# Root
## Topic A
- Sub 1
- Sub 2
## Topic B`;

    const tree = markdownToTree(md);
    expect(tree.text).toBe("Root");
    expect(tree.children.length).toBe(2);
    expect(tree.children[0].text).toBe("Topic A");
    expect(tree.children[0].children.length).toBe(2);
    expect(tree.children[0].children[0].text).toBe("Sub 1");

    const backToMd = treeToMarkdown(tree);
    expect(backToMd).toContain("# Root");
    expect(backToMd).toContain("## Topic A");
    expect(backToMd).toContain("- Sub 1");
    expect(backToMd).toContain("## Topic B");
  });

  it("adds child node with new edge", () => {
    const tree = markdownToTree("# Root\n## Topic A");
    const parentId = tree.children[0].id;

    const { root: updated, newId } = addChildNode(tree, parentId, "Child of A");
    expect(updated.children[0].children.length).toBe(1);
    expect(updated.children[0].children[0].id).toBe(newId);
    expect(updated.children[0].children[0].text).toBe("Child of A");
  });

  it("adds sibling node with new edge", () => {
    const tree = markdownToTree("# Root\n## Topic A");
    const targetId = tree.children[0].id;

    const { root: updated, newId } = addSiblingNode(tree, targetId, "Topic B");
    expect(updated.children.length).toBe(2);
    expect(updated.children[1].id).toBe(newId);
    expect(updated.children[1].text).toBe("Topic B");
  });

  it("updates node text", () => {
    const tree = markdownToTree("# Root\n## Topic A");
    const targetId = tree.children[0].id;

    const updated = updateNodeText(tree, targetId, "Renamed Topic");
    expect(updated.children[0].text).toBe("Renamed Topic");
  });

  it("deletes node and its connecting edges", () => {
    const tree = markdownToTree("# Root\n## Topic A\n- Sub A\n## Topic B");
    const targetId = tree.children[0].id;

    const { root: updated, deleted } = deleteNode(tree, targetId);
    expect(deleted).toBe(true);
    expect(updated.children.length).toBe(1);
    expect(updated.children[0].text).toBe("Topic B");
  });

  it("generates Markmap root with data-node-id", () => {
    const tree = markdownToTree("# Root\n## Topic A");
    const targetId = tree.children[0].id;

    const mmRoot = treeToMarkmapRoot(tree, targetId);
    expect(mmRoot.content).toContain(`data-node-id="${tree.id}"`);
    expect(mmRoot.children[0].content).toContain(`data-node-id="${targetId}"`);
    expect(mmRoot.children[0].content).toContain("mm-selected");
  });
});
