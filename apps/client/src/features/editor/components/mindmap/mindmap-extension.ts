import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import MindmapView from "./mindmap-view";

export interface MindmapAttributes {
  content?: string;
  height?: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mindmap: {
      setMindmap: (attributes?: MindmapAttributes) => ReturnType;
    };
  }
}

export const Mindmap = Node.create({
  name: "mindmap",
  group: "block",
  atom: true,
  draggable: true,
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      content: {
        default: `# Central Topic\n## Ideas\n- Brainstorming\n- Concept validation\n## Planning\n- Architecture\n- Roadmap & Milestones\n## Execution\n- Frontend implementation\n- Backend integration\n- Testing & QA`,
        parseHTML: (element) => element.getAttribute("data-content") || undefined,
        renderHTML: (attributes) => ({
          "data-content": attributes.content,
        }),
      },
      height: {
        default: 420,
        parseHTML: (element) => {
          const val = element.getAttribute("data-height");
          return val ? parseInt(val, 10) : 420;
        },
        renderHTML: (attributes) => ({
          "data-height": attributes.height,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": this.name }, HTMLAttributes),
    ];
  },

  addCommands() {
    return {
      setMindmap:
        (attrs?: MindmapAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attrs || {},
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MindmapView);
  },
});

export default Mindmap;
