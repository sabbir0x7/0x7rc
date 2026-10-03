/**
 * Tree data structure and operations for Miro-style interactive mind mapping.
 */

export interface MindmapItem {
  id: string;
  text: string;
  children: MindmapItem[];
}

let counter = 1;
export function generateNodeId(): string {
  return `node_${Date.now().toString(36)}_${(counter++).toString(36)}`;
}

/**
 * Parses hierarchical Markdown (headings & list items) into a MindmapItem tree.
 */
export function markdownToTree(markdown: string): MindmapItem {
  const lines = markdown.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return {
      id: generateNodeId(),
      text: "Central Topic",
      children: [],
    };
  }

  interface StackEntry {
    depth: number;
    node: MindmapItem;
  }

  let rootNode: MindmapItem | null = null;
  const stack: StackEntry[] = [];

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

    const newNode: MindmapItem = {
      id: generateNodeId(),
      text: text || "Untitled",
      children: [],
    };

    if (!rootNode) {
      rootNode = newNode;
      stack.push({ depth, node: newNode });
      continue;
    }

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(newNode);
    } else {
      rootNode.children.push(newNode);
    }

    stack.push({ depth, node: newNode });
  }

  return rootNode || { id: generateNodeId(), text: "Central Topic", children: [] };
}

/**
 * Converts a MindmapItem tree back into clean, indented Markdown.
 */
export function treeToMarkdown(root: MindmapItem): string {
  const lines: string[] = [];

  function walk(node: MindmapItem, depth: number) {
    const cleanText = (node.text || "Untitled").replace(/\r?\n/g, " ");

    if (depth === 1) {
      lines.push(`# ${cleanText}`);
    } else if (depth === 2) {
      lines.push(`## ${cleanText}`);
    } else {
      const indent = "  ".repeat(depth - 3);
      lines.push(`${indent}- ${cleanText}`);
    }

    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  walk(root, 1);
  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Transforms MindmapItem tree into Markmap's internal root representation.
 * Injects data-node-id so DOM elements can be mapped back to tree nodes on the canvas.
 */
export function treeToMarkmapRoot(
  root: MindmapItem,
  selectedId: string | null = null,
): any {
  function transform(node: MindmapItem, depth: number): any {
    const isSelected = selectedId === node.id;
    const safeText = escapeHtml(node.text || "Untitled");

    // Wrap node content in an identifiable span for click handling and styling
    const content = `<span class="mm-node-item${isSelected ? " mm-selected" : ""}" data-node-id="${node.id}">${safeText}</span>`;

    return {
      content,
      children: node.children.map((c) => transform(c, depth + 1)),
      payload: {
        nodeId: node.id,
        tag: depth === 1 ? "h1" : depth === 2 ? "h2" : "li",
      },
    };
  }

  return transform(root, 1);
}

/**
 * Adds a new child node connected by a new edge to the target parent node.
 */
export function addChildNode(
  root: MindmapItem,
  parentId: string,
  newText: string = "New Idea",
): { root: MindmapItem; newId: string } {
  const newId = generateNodeId();
  const newNode: MindmapItem = {
    id: newId,
    text: newText,
    children: [],
  };

  function walk(node: MindmapItem): boolean {
    if (node.id === parentId) {
      node.children.push(newNode);
      return true;
    }
    for (const child of node.children) {
      if (walk(child)) return true;
    }
    return false;
  }

  const cloned = JSON.parse(JSON.stringify(root));
  walk(cloned);
  return { root: cloned, newId };
}

/**
 * Adds a new sibling node connected to the same parent as targetId.
 */
export function addSiblingNode(
  root: MindmapItem,
  targetId: string,
  newText: string = "New Topic",
): { root: MindmapItem; newId: string } {
  const newId = generateNodeId();
  const newNode: MindmapItem = {
    id: newId,
    text: newText,
    children: [],
  };

  const cloned: MindmapItem = JSON.parse(JSON.stringify(root));

  // If target is root itself, add as child
  if (cloned.id === targetId) {
    cloned.children.push(newNode);
    return { root: cloned, newId };
  }

  function walk(parent: MindmapItem): boolean {
    const index = parent.children.findIndex((c) => c.id === targetId);
    if (index !== -1) {
      parent.children.splice(index + 1, 0, newNode);
      return true;
    }
    for (const child of parent.children) {
      if (walk(child)) return true;
    }
    return false;
  }

  walk(cloned);
  return { root: cloned, newId };
}

/**
 * Updates the text content of a specific node by ID.
 */
export function updateNodeText(
  root: MindmapItem,
  targetId: string,
  newText: string,
): MindmapItem {
  const cloned: MindmapItem = JSON.parse(JSON.stringify(root));

  function walk(node: MindmapItem): boolean {
    if (node.id === targetId) {
      node.text = newText;
      return true;
    }
    for (const child of node.children) {
      if (walk(child)) return true;
    }
    return false;
  }

  walk(cloned);
  return cloned;
}

/**
 * Deletes a node and its entire subtree (edges and children) by ID.
 * Root cannot be deleted (resets text instead).
 */
export function deleteNode(
  root: MindmapItem,
  targetId: string,
): { root: MindmapItem; deleted: boolean } {
  const cloned: MindmapItem = JSON.parse(JSON.stringify(root));

  if (cloned.id === targetId) {
    cloned.text = "Central Topic";
    cloned.children = [];
    return { root: cloned, deleted: true };
  }

  function walk(parent: MindmapItem): boolean {
    const index = parent.children.findIndex((c) => c.id === targetId);
    if (index !== -1) {
      parent.children.splice(index, 1);
      return true;
    }
    for (const child of parent.children) {
      if (walk(child)) return true;
    }
    return false;
  }

  const deleted = walk(cloned);
  return { root: cloned, deleted };
}

/**
 * Finds a node by ID in the tree.
 */
export function findNode(root: MindmapItem, targetId: string): MindmapItem | null {
  if (root.id === targetId) return root;
  for (const child of root.children) {
    const found = findNode(child, targetId);
    if (found) return found;
  }
  return null;
}
