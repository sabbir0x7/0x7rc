/**
 * Freeform graph model for Miro-style visual mind mapping.
 * Supports arbitrary 2D node coordinates, multiple shapes, custom colors,
 * interactive edge routing, and auto-layout.
 */

export type NodeShape = "rectangle" | "circle" | "pill" | "sticky" | "diamond";

export type NodeColor =
  | "blue"
  | "yellow"
  | "green"
  | "purple"
  | "red"
  | "orange"
  | "gray";

export interface GraphNode {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: NodeShape;
  color: NodeColor;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  color?: string;
}

export interface GraphData {
  version: 2;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

let idCounter = 1;
export function generateGraphId(prefix: string = "node"): string {
  return `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;
}

export const SHAPE_CONFIG: Record<
  NodeShape,
  { label: string; defaultWidth: number; defaultHeight: number }
> = {
  rectangle: { label: "Rectangle", defaultWidth: 150, defaultHeight: 60 },
  pill: { label: "Pill", defaultWidth: 140, defaultHeight: 50 },
  circle: { label: "Circle", defaultWidth: 100, defaultHeight: 100 },
  sticky: { label: "Sticky Note", defaultWidth: 140, defaultHeight: 120 },
  diamond: { label: "Diamond", defaultWidth: 120, defaultHeight: 100 },
};

export const COLOR_PALETTE: Record<
  NodeColor,
  { bg: string; border: string; text: string }
> = {
  blue: { bg: "#e7f5ff", border: "#339af0", text: "#1864ab" },
  yellow: { bg: "#fff9db", border: "#fcc419", text: "#e67700" },
  green: { bg: "#ebfbee", border: "#40c057", text: "#2b8a3e" },
  purple: { bg: "#f3f0ff", border: "#845ef7", text: "#5f3dc4" },
  red: { bg: "#fff5f5", border: "#ff6b6b", text: "#c92a2a" },
  orange: { bg: "#fff4e6", border: "#ff922b", text: "#d9480f" },
  gray: { bg: "#f8f9fa", border: "#adb5bd", text: "#495057" },
};

/**
 * Parses markdown into GraphData with hierarchical positions.
 */
export function markdownToGraph(markdown: string): GraphData {
  const lines = markdown.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return {
      version: 2,
      nodes: [
        {
          id: generateGraphId("root"),
          text: "Central Topic",
          x: 250,
          y: 200,
          width: 160,
          height: 64,
          shape: "rectangle",
          color: "blue",
        },
      ],
      edges: [],
    };
  }

  interface StackItem {
    depth: number;
    node: GraphNode;
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const stack: StackItem[] = [];

  const startX = 100;
  const startY = 150;
  let levelCounts: Record<number, number> = {};

  for (const line of lines) {
    let depth = 1;
    let text = "";

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      depth = headingMatch[1].length;
      text = headingMatch[2].trim();
    } else {
      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const indent = listMatch[1].length;
        depth = 3 + Math.floor(indent / 2);
        text = listMatch[3].trim();
      } else {
        depth = stack.length > 0 ? stack[stack.length - 1].depth + 1 : 1;
        text = line.trim();
      }
    }

    const row = levelCounts[depth] || 0;
    levelCounts[depth] = row + 1;

    // Pick shape and color based on depth
    let shape: NodeShape = "rectangle";
    let color: NodeColor = "blue";
    if (depth === 1) {
      shape = "pill";
      color = "blue";
    } else if (depth === 2) {
      shape = "rectangle";
      color = "purple";
    } else if (depth === 3) {
      shape = "sticky";
      color = "yellow";
    } else {
      shape = "pill";
      color = "green";
    }

    const dim = SHAPE_CONFIG[shape];
    const x = startX + (depth - 1) * 220;
    const y = startY + row * 110;

    const newNode: GraphNode = {
      id: generateGraphId("node"),
      text: text || "Untitled",
      x,
      y,
      width: dim.defaultWidth,
      height: dim.defaultHeight,
      shape,
      color,
    };

    nodes.push(newNode);

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1].node;
      edges.push({
        id: generateGraphId("edge"),
        from: parent.id,
        to: newNode.id,
      });
    }

    stack.push({ depth, node: newNode });
  }

  return { version: 2, nodes, edges };
}

/**
 * Parses content string (JSON or Markdown) into GraphData.
 */
export function parseContentToGraph(content: string): GraphData {
  if (!content || !content.trim()) {
    return markdownToGraph("");
  }

  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"nodes"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return {
          version: 2,
          nodes: parsed.nodes.map((n: any) => ({
            id: n.id || generateGraphId(),
            text: n.text || "Untitled",
            x: typeof n.x === "number" ? n.x : 200,
            y: typeof n.y === "number" ? n.y : 200,
            width: n.width || 140,
            height: n.height || 60,
            shape: n.shape || "rectangle",
            color: n.color || "blue",
          })),
          edges: parsed.edges.map((e: any) => ({
            id: e.id || generateGraphId("edge"),
            from: e.from,
            to: e.to,
            color: e.color,
          })),
        };
      }
    } catch {
      // Fallback to markdown parser
    }
  }

  return markdownToGraph(content);
}

/**
 * Serializes GraphData to JSON string for saving in document.
 */
export function serializeGraph(graph: GraphData): string {
  return JSON.stringify(graph, null, 2);
}

/**
 * Converts GraphData back to clean indented Markdown outline.
 */
export function graphToMarkdown(graph: GraphData): string {
  if (graph.nodes.length === 0) return "# Mind Map";

  // Find root nodes (nodes with no incoming edges)
  const incoming = new Set(graph.edges.map((e) => e.to));
  const roots = graph.nodes.filter((n) => !incoming.has(n.id));
  const effectiveRoots = roots.length > 0 ? roots : [graph.nodes[0]];

  const visited = new Set<string>();
  const lines: string[] = [];

  function walk(node: GraphNode, depth: number) {
    if (visited.has(node.id)) return;
    visited.add(node.id);

    const cleanText = (node.text || "Untitled").replace(/\r?\n/g, " ");

    if (depth === 1) {
      lines.push(`# ${cleanText}`);
    } else if (depth === 2) {
      lines.push(`## ${cleanText}`);
    } else {
      const indent = "  ".repeat(depth - 3);
      lines.push(`${indent}- ${cleanText}`);
    }

    const children = graph.edges
      .filter((e) => e.from === node.id)
      .map((e) => graph.nodes.find((n) => n.id === e.to))
      .filter((n): n is GraphNode => Boolean(n));

    for (const child of children) {
      walk(child, depth + 1);
    }
  }

  for (const root of effectiveRoots) {
    walk(root, 1);
  }

  // Handle any orphan nodes
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      lines.push(`- ${(node.text || "Untitled").replace(/\r?\n/g, " ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Converts GraphData to Freeplane .mm XML format.
 */
export function graphToFreeplaneXml(graph: GraphData): string {
  const md = graphToMarkdown(graph);
  // Reuse our robust markdownToFreeplaneMm
  const lines = md.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let id = 1;

  function escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<map version="freeplane 1.9.0">\n';
  xml += '<!-- Exported from 0x7 Research Center Visual Mind Map -->\n';

  for (const node of graph.nodes) {
    xml += `  <node TEXT="${escapeXml(node.text)}" ID="ID_${id++}" POSITION="${node.x > 300 ? "right" : "left"}"/>\n`;
  }

  xml += "</map>";
  return xml;
}

/**
 * Calculates smooth cubic bezier curve path between two nodes.
 */
export function calculateEdgePath(
  fromNode: GraphNode,
  toNode: GraphNode,
): { path: string; arrowAngle: number; endX: number; endY: number } {
  const fromCenter = {
    x: fromNode.x + fromNode.width / 2,
    y: fromNode.y + fromNode.height / 2,
  };
  const toCenter = {
    x: toNode.x + toNode.width / 2,
    y: toNode.y + toNode.height / 2,
  };

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  let startX: number;
  let startY: number;
  let endX: number;
  let endY: number;

  // Horizontal primary
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) {
      // From right of source to left of target
      startX = fromNode.x + fromNode.width;
      startY = fromCenter.y;
      endX = toNode.x;
      endY = toCenter.y;
    } else {
      // From left of source to right of target
      startX = fromNode.x;
      startY = fromCenter.y;
      endX = toNode.x + toNode.width;
      endY = toCenter.y;
    }

    const dist = Math.abs(endX - startX);
    const cpOffset = Math.max(40, dist * 0.45);
    const cx1 = dx > 0 ? startX + cpOffset : startX - cpOffset;
    const cy1 = startY;
    const cx2 = dx > 0 ? endX - cpOffset : endX + cpOffset;
    const cy2 = endY;

    const path = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
    const arrowAngle = Math.atan2(endY - cy2, endX - cx2);
    return { path, arrowAngle, endX, endY };
  } else {
    // Vertical primary
    if (dy > 0) {
      startX = fromCenter.x;
      startY = fromNode.y + fromNode.height;
      endX = toCenter.x;
      endY = toNode.y;
    } else {
      startX = fromCenter.x;
      startY = fromNode.y;
      endX = toCenter.x;
      endY = toNode.y + toNode.height;
    }

    const dist = Math.abs(endY - startY);
    const cpOffset = Math.max(40, dist * 0.45);
    const cx1 = startX;
    const cy1 = dy > 0 ? startY + cpOffset : startY - cpOffset;
    const cx2 = endX;
    const cy2 = dy > 0 ? endY - cpOffset : endY + cpOffset;

    const path = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
    const arrowAngle = Math.atan2(endY - cy2, endX - cx2);
    return { path, arrowAngle, endX, endY };
  }
}

/**
 * Automatically lays out nodes cleanly in an organic mind-map tree structure.
 */
export function autoLayoutGraph(graph: GraphData): GraphData {
  if (graph.nodes.length === 0) return graph;

  const cloned: GraphData = JSON.parse(JSON.stringify(graph));
  const incoming = new Set(cloned.edges.map((e) => e.to));
  const rootNode =
    cloned.nodes.find((n) => !incoming.has(n.id)) || cloned.nodes[0];

  const visited = new Set<string>();
  const childrenMap = new Map<string, string[]>();

  for (const edge of cloned.edges) {
    const list = childrenMap.get(edge.from) || [];
    list.push(edge.to);
    childrenMap.set(edge.from, list);
  }

  let yCursor = 120;

  function layoutNode(nodeId: string, level: number): number {
    visited.add(nodeId);
    const node = cloned.nodes.find((n) => n.id === nodeId);
    if (!node) return yCursor;

    const children = (childrenMap.get(nodeId) || []).filter(
      (id) => !visited.has(id),
    );

    node.x = 80 + level * 230;

    if (children.length === 0) {
      node.y = yCursor;
      yCursor += node.height + 40;
      return node.y;
    }

    const childYPositions = children.map((cid) => layoutNode(cid, level + 1));
    const firstY = childYPositions[0];
    const lastY = childYPositions[childYPositions.length - 1];
    node.y = (firstY + lastY) / 2;

    return node.y;
  }

  layoutNode(rootNode.id, 0);

  // Position any remaining unlinked nodes
  for (const node of cloned.nodes) {
    if (!visited.has(node.id)) {
      node.x = 80;
      node.y = yCursor;
      yCursor += node.height + 40;
    }
  }

  return cloned;
}
