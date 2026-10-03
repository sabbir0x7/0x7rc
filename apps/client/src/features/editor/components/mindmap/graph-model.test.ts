import { describe, expect, it } from "vitest";
import {
  autoLayoutGraph,
  calculateEdgePath,
  graphToMarkdown,
  markdownToGraph,
  parseContentToGraph,
  serializeGraph,
} from "./graph-model";

describe("graph-model", () => {
  it("converts markdown to freeform graph data", () => {
    const md = `# Central Topic\n## Branch 1\n- Leaf 1\n## Branch 2`;
    const graph = markdownToGraph(md);

    expect(graph.version).toBe(2);
    expect(graph.nodes.length).toBe(4);
    expect(graph.edges.length).toBe(3);

    const root = graph.nodes.find((n) => n.text === "Central Topic");
    expect(root).toBeDefined();
    expect(root?.x).toBeTypeOf("number");
    expect(root?.y).toBeTypeOf("number");
  });

  it("roundtrips graph data via serialization and parsing", () => {
    const original = markdownToGraph("# Root\n## Topic 1");
    original.nodes[0].shape = "sticky";
    original.nodes[0].color = "yellow";

    const serialized = serializeGraph(original);
    const parsed = parseContentToGraph(serialized);

    expect(parsed.nodes.length).toBe(2);
    expect(parsed.nodes[0].shape).toBe("sticky");
    expect(parsed.nodes[0].color).toBe("yellow");
  });

  it("calculates smooth bezier curve path between nodes", () => {
    const fromNode = {
      id: "a",
      text: "A",
      x: 100,
      y: 100,
      width: 140,
      height: 60,
      shape: "rectangle" as const,
      color: "blue" as const,
    };
    const toNode = {
      id: "b",
      text: "B",
      x: 400,
      y: 200,
      width: 140,
      height: 60,
      shape: "circle" as const,
      color: "green" as const,
    };

    const edge = calculateEdgePath(fromNode, toNode);
    expect(edge.path).toContain("M 240");
    expect(edge.path).toContain("C");
    expect(edge.arrowAngle).toBeTypeOf("number");
  });

  it("auto-layouts graph nodes hierarchically", () => {
    const graph = markdownToGraph("# Root\n## Child 1\n## Child 2");
    const laidOut = autoLayoutGraph(graph);

    expect(laidOut.nodes.length).toBe(3);
    const root = laidOut.nodes.find((n) => n.text === "Root");
    const child1 = laidOut.nodes.find((n) => n.text === "Child 1");
    const child2 = laidOut.nodes.find((n) => n.text === "Child 2");

    expect(child1!.x).toBeGreaterThan(root!.x);
    expect(child2!.x).toBeGreaterThan(root!.x);
    expect(child1!.y).not.toBe(child2!.y);
  });

  it("converts graph to markdown outline", () => {
    const graph = markdownToGraph("# Strategy\n## Execution\n- Milestone 1");
    const md = graphToMarkdown(graph);

    expect(md).toContain("# Strategy");
    expect(md).toContain("## Execution");
    expect(md).toContain("- Milestone 1");
  });
});
