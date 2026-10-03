/**
 * Freeplane / FreeMind .mm XML to Markdown converter and vice versa.
 * Provides bi-directional compatibility between Freeplane and web Markdown mind maps.
 */

const FREEPLANE_ICONS: Record<string, string> = {
  button_ok: "✅",
  button_cancel: "❌",
  idea: "💡",
  help: "❓",
  messagebox_warning: "⚠️",
  flag: "🚩",
  bookmark: "🔖",
  yes: "👍",
  no: "👎",
  priority_1: "🔴",
  priority_2: "🟠",
  priority_3: "🟡",
  priority_4: "🟢",
  priority_5: "🔵",
  pencil: "✏️",
  folder: "📁",
  attach: "📎",
  calendar: "📅",
  clock: "⏰",
  star: "⭐",
  stop: "🛑",
  info: "ℹ️",
  mail: "✉️",
  user: "👤",
  group: "👥",
  key: "🔑",
  lock: "🔒",
};

/**
 * Converts Freeplane/FreeMind .mm XML to hierarchical Markdown.
 */
export function freeplaneMmToMarkdown(xmlText: string): string {
  if (!xmlText || !xmlText.trim()) {
    throw new Error("Empty Freeplane XML content");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error(
      "Invalid Freeplane XML: " + (parserError.textContent || "Parse error"),
    );
  }

  const map = doc.querySelector("map");
  if (!map) {
    throw new Error("Invalid Freeplane file: <map> tag not found");
  }

  const rootNodes = Array.from(map.children).filter(
    (el) => el.tagName.toLowerCase() === "node",
  );

  if (rootNodes.length === 0) {
    throw new Error("No root node found in Freeplane file");
  }

  const lines: string[] = [];

  function getNodeText(node: Element): string {
    let text = "";

    // 1. Text attribute
    const textAttr = node.getAttribute("TEXT");
    if (textAttr) {
      text = textAttr.trim();
    } else {
      // 2. Rich content node (HTML)
      const richContent = node.querySelector(":scope > richcontent[TYPE='NODE']");
      if (richContent) {
        text = (richContent.textContent || "").trim();
      }
    }

    if (!text) {
      text = "Untitled";
    }

    // 3. Icons (e.g. <icon BUILTIN="idea"/>)
    const iconEls = Array.from(node.querySelectorAll(":scope > icon"));
    const emojis = iconEls
      .map((el) => {
        const builtin = el.getAttribute("BUILTIN") || "";
        return FREEPLANE_ICONS[builtin] || "";
      })
      .filter(Boolean)
      .join(" ");

    if (emojis) {
      text = `${emojis} ${text}`;
    }

    // 4. Link attribute
    const linkAttr = node.getAttribute("LINK");
    if (linkAttr) {
      text = `[${text}](${linkAttr})`;
    }

    return text.replace(/\r?\n/g, " ");
  }

  function processNode(node: Element, depth: number) {
    const rawText = getNodeText(node);

    if (depth === 1) {
      lines.push(`# ${rawText}`);
    } else if (depth === 2) {
      lines.push(`## ${rawText}`);
    } else {
      const indent = "  ".repeat(depth - 3);
      lines.push(`${indent}- ${rawText}`);
    }

    const children = Array.from(node.children).filter(
      (el) => el.tagName.toLowerCase() === "node",
    );
    for (const child of children) {
      processNode(child, depth + 1);
    }
  }

  for (const rootNode of rootNodes) {
    processNode(rootNode, 1);
  }

  return lines.join("\n");
}

interface TreeNode {
  text: string;
  children: TreeNode[];
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converts a Markdown hierarchy (headings & bullet lists) into a standard Freeplane .mm XML document.
 */
export function markdownToFreeplaneMm(markdown: string): string {
  const lines = markdown.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return `<map version="freeplane 1.9.0">\n  <node TEXT="Mind Map" ID="ID_1"/>\n</map>`;
  }

  // Parse lines into a nested tree structure
  const rootNodes: TreeNode[] = [];
  const stack: { depth: number; node: TreeNode }[] = [];

  for (const line of lines) {
    let depth = 0;
    let text = "";

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      depth = headingMatch[1].length;
      text = headingMatch[2].trim();
    } else {
      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const indentLength = listMatch[1].length;
        // Assume 2 spaces per level, offset by base depth 3
        depth = 3 + Math.floor(indentLength / 2);
        text = listMatch[3].trim();
      } else {
        // Plain text line
        depth = stack.length > 0 ? stack[stack.length - 1].depth + 1 : 1;
        text = line.trim();
      }
    }

    const newNode: TreeNode = { text, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootNodes.push(newNode);
    } else {
      stack[stack.length - 1].node.children.push(newNode);
    }

    stack.push({ depth, node: newNode });
  }

  let nextId = 1;

  function renderNodeXml(node: TreeNode, indent: string): string {
    const id = `ID_${nextId++}`;
    const safeText = escapeXml(node.text);

    if (node.children.length === 0) {
      return `${indent}<node TEXT="${safeText}" ID="${id}"/>`;
    }

    const childXml = node.children
      .map((c) => renderNodeXml(c, indent + "  "))
      .join("\n");

    return `${indent}<node TEXT="${safeText}" ID="${id}">\n${childXml}\n${indent}</node>`;
  }

  const nodesXml = rootNodes
    .map((r) => renderNodeXml(r, "  "))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<map version="freeplane 1.9.0">\n<!-- To view this file, open it in Freeplane (https://www.freeplane.org) -->\n${nodesXml}\n</map>`;
}
