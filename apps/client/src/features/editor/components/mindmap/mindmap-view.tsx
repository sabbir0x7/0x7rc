import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionIcon,
  Badge,
  Button,
  FileInput,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
  useComputedColorScheme,
} from "@mantine/core";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBrain,
  IconCircle,
  IconDeviceFloppy,
  IconDiamond,
  IconDownload,
  IconEdit,
  IconFileCode,
  IconFileUpload,
  IconFocusCentered,
  IconLayoutCollage,
  IconNote,
  IconPhoto,
  IconPill,
  IconPlus,
  IconSquare,
  IconTrash,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  COLOR_PALETTE,
  GraphData,
  GraphEdge,
  GraphNode,
  NodeColor,
  NodeShape,
  SHAPE_CONFIG,
  autoLayoutGraph,
  calculateEdgePath,
  generateGraphId,
  graphToFreeplaneXml,
  graphToMarkdown,
  parseContentToGraph,
  serializeGraph,
} from "./graph-model";
import { freeplaneMmToMarkdown } from "./freeplane-parser";
import classes from "./mindmap.module.css";

const DEFAULT_MINDMAP = `# Central Topic
## Ideas
- Brainstorming
- Concept validation
## Planning
- Architecture
- Roadmap & Milestones
## Execution
- Frontend implementation
- Backend integration`;

export const MindmapView: FC<NodeViewProps> = ({
  node,
  updateAttributes,
  editor,
  selected,
  deleteNode: tiptapDeleteNode,
}) => {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme();
  const rawContent = node.attrs.content || DEFAULT_MINDMAP;
  const currentHeight = node.attrs.height || 480;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Core Graph State
  const [graph, setGraph] = useState<GraphData>(() =>
    parseContentToGraph(rawContent),
  );

  // Edit Mode state (Miro Canvas Mode)
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Fullscreen and Modals
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [importOpened, { open: openImport, close: closeImport }] =
    useDisclosure(false);
  const [xmlInput, setXmlInput] = useState("");

  // Dragging Node state
  const draggingNodeRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Canvas Panning state
  const isPanningRef = useRef(false);
  const startPanMouseRef = useRef({ x: 0, y: 0 });
  const startPanPosRef = useRef({ x: 0, y: 0 });

  // Connecting Edge state (dragging from port handle to target node)
  const [connectingEdge, setConnectingEdge] = useState<{
    fromNodeId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Height resizing state
  const isResizingRef = useRef(false);
  const startResizeYRef = useRef(0);
  const startHeightRef = useRef(currentHeight);

  // Sync graph with prop if changed externally while not editing
  useEffect(() => {
    if (!isEditMode) {
      setGraph(parseContentToGraph(rawContent));
    }
  }, [rawContent, isEditMode]);

  // Initial fit to center nodes on load
  const fitToView = useCallback(() => {
    if (!containerRef.current || graph.nodes.length === 0) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const cWidth = cRect.width || 800;
    const cHeight = cRect.height || currentHeight;

    const xs = graph.nodes.map((n) => n.x);
    const ys = graph.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...graph.nodes.map((n) => n.x + n.width));
    const minY = Math.min(...ys);
    const maxY = Math.max(...graph.nodes.map((n) => n.y + n.height));

    const contentWidth = Math.max(100, maxX - minX + 160);
    const contentHeight = Math.max(100, maxY - minY + 160);

    const scale = Math.min(
      1.5,
      Math.max(0.4, Math.min(cWidth / contentWidth, cHeight / contentHeight)),
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(scale);
    setPan({
      x: cWidth / 2 - centerX * scale,
      y: cHeight / 2 - centerY * scale,
    });
  }, [graph.nodes, currentHeight]);

  useEffect(() => {
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  // Handle Wheel Scrolling (Only zoom in Edit Mode, pass-through in View Mode)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!isEditMode) {
        // Let page scroll naturally
        return;
      }

      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(2.5, Math.max(0.3, prevZoom * zoomFactor));
        // Zoom relative to mouse position
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom),
          y: mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom),
        }));
        return nextZoom;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [isEditMode]);

  // Mouse Handlers for Node Dragging & Canvas Panning & Connecting Edges
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle Port click (creating new connecting edge)
      const portEl = target.closest("[data-port-node]") as HTMLElement | null;
      if (portEl && isEditMode) {
        const fromNodeId = portEl.getAttribute("data-port-node")!;
        const fromNode = graph.nodes.find((n) => n.id === fromNodeId);
        if (fromNode) {
          const cRect = containerRef.current?.getBoundingClientRect() || {
            left: 0,
            top: 0,
          };
          const pRect = portEl.getBoundingClientRect();
          const startX = (pRect.left + pRect.width / 2 - cRect.left - pan.x) / zoom;
          const startY = (pRect.top + pRect.height / 2 - cRect.top - pan.y) / zoom;
          setConnectingEdge({
            fromNodeId,
            startX,
            startY,
            currentX: startX,
            currentY: startY,
          });
          return;
        }
      }

      // Handle Node click / drag start
      const nodeEl = target.closest("[data-node-id]") as HTMLElement | null;
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute("data-node-id")!;
        setSelectedNodeId(nodeId);
        setSelectedEdgeId(null);

        if (isEditMode) {
          const currNode = graph.nodes.find((n) => n.id === nodeId);
          if (currNode) {
            draggingNodeRef.current = {
              nodeId,
              startX: e.clientX,
              startY: e.clientY,
              initialX: currNode.x,
              initialY: currNode.y,
            };
          }
        }
        return;
      }

      // Handle Edge click
      const edgeEl = target.closest("[data-edge-id]") as SVGElement | null;
      if (edgeEl) {
        const edgeId = edgeEl.getAttribute("data-edge-id")!;
        setSelectedEdgeId(edgeId);
        setSelectedNodeId(null);
        return;
      }

      // Clicked on empty canvas background -> Pan canvas
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      if (editingNodeId) {
        commitInlineEdit();
      }

      isPanningRef.current = true;
      startPanMouseRef.current = { x: e.clientX, y: e.clientY };
      startPanPosRef.current = { ...pan };
    },
    [isEditMode, graph.nodes, pan, zoom, editingNodeId],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 1. Moving Connecting Edge
      if (connectingEdge && containerRef.current) {
        const cRect = containerRef.current.getBoundingClientRect();
        const curX = (e.clientX - cRect.left - pan.x) / zoom;
        const curY = (e.clientY - cRect.top - pan.y) / zoom;
        setConnectingEdge((prev) =>
          prev ? { ...prev, currentX: curX, currentY: curY } : null,
        );
        return;
      }

      // 2. Dragging Node
      if (draggingNodeRef.current) {
        const { nodeId, startX, startY, initialX, initialY } =
          draggingNodeRef.current;
        const deltaX = (e.clientX - startX) / zoom;
        const deltaY = (e.clientY - startY) / zoom;

        setGraph((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, x: Math.round(initialX + deltaX), y: Math.round(initialY + deltaY) }
              : n,
          ),
        }));
        return;
      }

      // 3. Panning Canvas
      if (isPanningRef.current) {
        const deltaX = e.clientX - startPanMouseRef.current.x;
        const deltaY = e.clientY - startPanMouseRef.current.y;
        setPan({
          x: startPanPosRef.current.x + deltaX,
          y: startPanPosRef.current.y + deltaY,
        });
      }
    },
    [connectingEdge, pan, zoom],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Complete Connecting Edge if released over a target node
      if (connectingEdge) {
        const target = e.target as HTMLElement;
        const targetNodeEl = target.closest("[data-node-id]") as HTMLElement | null;
        if (targetNodeEl) {
          const toNodeId = targetNodeEl.getAttribute("data-node-id");
          if (toNodeId && toNodeId !== connectingEdge.fromNodeId) {
            // Check if edge already exists
            const exists = graph.edges.some(
              (ed) =>
                (ed.from === connectingEdge.fromNodeId && ed.to === toNodeId) ||
                (ed.from === toNodeId && ed.to === connectingEdge.fromNodeId),
            );
            if (!exists) {
              setGraph((prev) => ({
                ...prev,
                edges: [
                  ...prev.edges,
                  {
                    id: generateGraphId("edge"),
                    from: connectingEdge.fromNodeId,
                    to: toNodeId,
                  },
                ],
              }));
              notifications.show({
                message: t("Edge connected!"),
                color: "green",
              });
            }
          }
        }
        setConnectingEdge(null);
      }

      draggingNodeRef.current = null;
      isPanningRef.current = false;
    },
    [connectingEdge, graph.edges, t],
  );

  // Inline Text Editing
  const startInlineEdit = useCallback(
    (nodeId: string, initialText: string) => {
      if (!isEditMode) return;
      setEditingNodeId(nodeId);
      setEditingText(initialText);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    },
    [isEditMode],
  );

  const commitInlineEdit = useCallback(() => {
    if (!editingNodeId) return;
    const finalVal = editingText.trim() || "Untitled";
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === editingNodeId ? { ...n, text: finalVal } : n,
      ),
    }));
    setEditingNodeId(null);
  }, [editingNodeId, editingText]);

  // Miro Node Actions: Add Shape into Viewport
  const handleAddShape = useCallback(
    (shape: NodeShape, color: NodeColor = "yellow") => {
      if (!isEditMode || !containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const dim = SHAPE_CONFIG[shape];

      // Spawn in center of viewport
      const spawnX = Math.round((cRect.width / 2 - pan.x) / zoom - dim.defaultWidth / 2);
      const spawnY = Math.round((cRect.height / 2 - pan.y) / zoom - dim.defaultHeight / 2);

      const newNode: GraphNode = {
        id: generateGraphId("node"),
        text: shape === "sticky" ? "Sticky Note" : "New Node",
        x: spawnX,
        y: spawnY,
        width: dim.defaultWidth,
        height: dim.defaultHeight,
        shape,
        color,
      };

      setGraph((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));
      setSelectedNodeId(newNode.id);
      startInlineEdit(newNode.id, newNode.text);
    },
    [isEditMode, pan, zoom, startInlineEdit],
  );

  // Add Connected Child Node
  const handleAddChildNode = useCallback(
    (parentId: string) => {
      const parent = graph.nodes.find((n) => n.id === parentId);
      if (!parent) return;

      const dim = SHAPE_CONFIG[parent.shape] || SHAPE_CONFIG.rectangle;
      const newX = parent.x + parent.width + 120;
      const newY = parent.y;

      const newNode: GraphNode = {
        id: generateGraphId("node"),
        text: "New Idea",
        x: newX,
        y: newY,
        width: dim.defaultWidth,
        height: dim.defaultHeight,
        shape: parent.shape,
        color: parent.color,
      };

      const newEdge: GraphEdge = {
        id: generateGraphId("edge"),
        from: parent.id,
        to: newNode.id,
      };

      setGraph((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));
      setGraph((prev) => ({
        ...prev,
        edges: [...prev.edges, newEdge],
      }));

      setSelectedNodeId(newNode.id);
      startInlineEdit(newNode.id, "New Idea");
    },
    [graph.nodes, startInlineEdit],
  );

  // Delete Selected Node or Edge
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeId) {
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== selectedNodeId),
        edges: prev.edges.filter(
          (e) => e.from !== selectedNodeId && e.to !== selectedNodeId,
        ),
      }));
      setSelectedNodeId(null);
      setEditingNodeId(null);
      notifications.show({ message: t("Node removed"), color: "blue" });
    } else if (selectedEdgeId) {
      setGraph((prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => e.id !== selectedEdgeId),
      }));
      setSelectedEdgeId(null);
      notifications.show({ message: t("Edge removed"), color: "blue" });
    }
  }, [selectedNodeId, selectedEdgeId, t]);

  // Change Shape of Selected Node
  const handleChangeShape = useCallback(
    (shape: NodeShape) => {
      if (!selectedNodeId) return;
      const dim = SHAPE_CONFIG[shape];
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === selectedNodeId
            ? { ...n, shape, width: dim.defaultWidth, height: dim.defaultHeight }
            : n,
        ),
      }));
    },
    [selectedNodeId],
  );

  // Change Color of Selected Node
  const handleChangeColor = useCallback(
    (color: NodeColor) => {
      if (!selectedNodeId) return;
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === selectedNodeId ? { ...n, color } : n,
        ),
      }));
    },
    [selectedNodeId],
  );

  // Keyboard Shortcuts in Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId) {
        if (e.key === "Escape") {
          setEditingNodeId(null);
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId || selectedEdgeId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === "Tab" && selectedNodeId) {
        e.preventDefault();
        handleAddChildNode(selectedNodeId);
      } else if (e.key === "F2" && selectedNodeId) {
        e.preventDefault();
        const nodeItem = graph.nodes.find((n) => n.id === selectedNodeId);
        if (nodeItem) startInlineEdit(selectedNodeId, nodeItem.text);
      } else if (e.key === "Escape") {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isEditMode,
    editingNodeId,
    selectedNodeId,
    selectedEdgeId,
    graph.nodes,
    handleDeleteSelected,
    handleAddChildNode,
    startInlineEdit,
  ]);

  // Mode Toggles: Enter Edit Mode
  const handleEnterEditMode = useCallback(() => {
    if (!editor.isEditable) return;
    setIsEditMode(true);
    notifications.show({
      title: t("Miro Canvas Mode Active"),
      message: t(
        "Drag nodes anywhere. Drag handles to connect edges. Double-click to edit text.",
      ),
      color: "blue",
    });
  }, [editor.isEditable, t]);

  // Mode Toggles: Save & Commit
  const handleSave = useCallback(() => {
    if (editingNodeId) {
      commitInlineEdit();
    }
    const serialized = serializeGraph(graph);
    updateAttributes({ content: serialized });
    setIsEditMode(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    notifications.show({
      title: t("Mind Map Saved"),
      message: t("All canvas changes have been successfully saved."),
      color: "green",
    });
  }, [editingNodeId, commitInlineEdit, graph, updateAttributes, t]);

  // Mode Toggles: Cancel Edits
  const handleCancel = useCallback(() => {
    setGraph(parseContentToGraph(rawContent));
    setIsEditMode(false);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    notifications.show({
      message: t("Edits discarded"),
      color: "gray",
    });
  }, [rawContent, t]);

  // Auto-Arrange Layout
  const handleAutoArrange = useCallback(() => {
    const arranged = autoLayoutGraph(graph);
    setGraph(arranged);
    notifications.show({
      message: t("Mind map auto-arranged neatly!"),
      color: "blue",
    });
    setTimeout(() => fitToView(), 50);
  }, [graph, fitToView, t]);

  // Zoom Button Controls
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.5, z * 1.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.35, z * 0.8));
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => fitToView(), 150);
  }, [fitToView]);

  // Exports
  const handleExportSvg = useCallback(() => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap.svg";
    a.click();
    URL.revokeObjectURL(url);
    notifications.show({ message: t("Exported as SVG"), color: "green" });
  }, [t]);

  const handleExportPng = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(scale, scale);
      ctx.fillStyle = computedColorScheme === "dark" ? "#1a1b26" : "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Render edges
      for (const edge of graph.edges) {
        const fromNode = graph.nodes.find((n) => n.id === edge.from);
        const toNode = graph.nodes.find((n) => n.id === edge.to);
        if (fromNode && toNode) {
          const { path } = calculateEdgePath(fromNode, toNode);
          const p = new Path2D(path);
          ctx.save();
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);
          ctx.strokeStyle = "#868e96";
          ctx.lineWidth = 2.5;
          ctx.stroke(p);
          ctx.restore();
        }
      }

      // Render nodes
      for (const node of graph.nodes) {
        const palette = COLOR_PALETTE[node.color] || COLOR_PALETTE.blue;
        const x = pan.x + node.x * zoom;
        const y = pan.y + node.y * zoom;
        const w = node.width * zoom;
        const h = node.height * zoom;

        ctx.fillStyle = palette.bg;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 2;

        if (node.shape === "circle") {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (node.shape === "pill") {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 999);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 8);
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle = palette.text;
        ctx.font = `600 ${Math.max(10, 13 * zoom)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.text, x + w / 2, y + h / 2);
      }

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "mindmap.png";
      a.click();
      notifications.show({ message: t("Exported as PNG"), color: "green" });
    }
  }, [computedColorScheme, graph.edges, graph.nodes, pan, zoom, t]);

  const handleExportFreeplane = useCallback(() => {
    try {
      const xml = graphToFreeplaneXml(graph);
      const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mindmap.mm";
      a.click();
      URL.revokeObjectURL(url);
      notifications.show({
        title: t("Exported to Freeplane"),
        message: t("Saved as Freeplane .mm file"),
        color: "green",
      });
    } catch (err: any) {
      notifications.show({
        title: t("Export Failed"),
        message: err.message,
        color: "red",
      });
    }
  }, [graph, t]);

  const handleExportMarkdown = useCallback(() => {
    const md = graphToMarkdown(graph);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap.md";
    a.click();
    URL.revokeObjectURL(url);
    notifications.show({ message: t("Exported as Markdown"), color: "green" });
  }, [graph, t]);

  // Freeplane file import
  const handleFileUpload = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        try {
          const md = freeplaneMmToMarkdown(text);
          const newGraph = parseContentToGraph(md);
          setGraph(newGraph);
          closeImport();
          setTimeout(() => fitToView(), 50);
          notifications.show({
            title: t("Import Successful"),
            message: t("Freeplane .mm converted into mind map!"),
            color: "green",
          });
        } catch (err: any) {
          notifications.show({
            title: t("Import Failed"),
            message: err.message || t("Could not parse Freeplane file"),
            color: "red",
          });
        }
      };
      reader.readAsText(file);
    },
    [closeImport, fitToView, t],
  );

  const handlePasteImport = useCallback(() => {
    if (!xmlInput.trim()) return;
    try {
      const md = freeplaneMmToMarkdown(xmlInput);
      const newGraph = parseContentToGraph(md);
      setGraph(newGraph);
      setXmlInput("");
      closeImport();
      setTimeout(() => fitToView(), 50);
      notifications.show({
        title: t("Import Successful"),
        message: t("Freeplane XML converted into mind map!"),
        color: "green",
      });
    } catch (err: any) {
      notifications.show({
        title: t("Import Failed"),
        message: err.message || t("Could not parse Freeplane XML"),
        color: "red",
      });
    }
  }, [xmlInput, closeImport, fitToView, t]);

  // Height resize handling via mouse drag
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isResizingRef.current = true;
      startResizeYRef.current = e.clientY;
      startHeightRef.current = currentHeight;

      const handleMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const delta = moveEvent.clientY - startResizeYRef.current;
        const newHeight = Math.max(
          300,
          Math.min(1300, startHeightRef.current + delta),
        );
        updateAttributes({ height: newHeight });
      };

      const handleUp = () => {
        isResizingRef.current = false;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [currentHeight, updateAttributes],
  );

  const selectedNode = useMemo(
    () => graph.nodes.find((n) => n.id === selectedNodeId),
    [graph.nodes, selectedNodeId],
  );

  return (
    <NodeViewWrapper data-drag-handle>
      <div
        className={clsx(classes.wrapper, {
          [classes.selected]: selected,
          [classes.editModeWrapper]: isEditMode,
          [classes.fullscreenWrapper]: isFullscreen,
        })}
      >
        {/* Header Bar */}
        <div className={classes.header}>
          <div className={classes.titleGroup}>
            <IconBrain
              size={18}
              color="var(--mantine-primary-color-filled, #228be6)"
            />
            <Text className={classes.title}>{t("Mind Map")}</Text>

            {isEditMode ? (
              <Badge size="xs" variant="filled" color="blue">
                {t("Miro Freeform Canvas")}
              </Badge>
            ) : (
              <Badge size="xs" variant="light" color="gray">
                {t("View Mode")}
              </Badge>
            )}
          </div>

          <div className={classes.toolbar}>
            {/* Miro Shape Adders in Edit Mode */}
            {isEditMode && (
              <Group gap={4} mr={4}>
                <Tooltip label={t("Add Rectangle")} withArrow position="top">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="blue"
                    onClick={() => handleAddShape("rectangle", "blue")}
                  >
                    <IconSquare size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={t("Add Sticky Note")} withArrow position="top">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="yellow"
                    onClick={() => handleAddShape("sticky", "yellow")}
                  >
                    <IconNote size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={t("Add Circle")} withArrow position="top">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="green"
                    onClick={() => handleAddShape("circle", "green")}
                  >
                    <IconCircle size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={t("Add Pill")} withArrow position="top">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="purple"
                    onClick={() => handleAddShape("pill", "purple")}
                  >
                    <IconPill size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={t("Add Diamond")} withArrow position="top">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="orange"
                    onClick={() => handleAddShape("diamond", "orange")}
                  >
                    <IconDiamond size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={t("Auto-Arrange Layout")} withArrow position="top">
                  <ActionIcon
                    variant="light"
                    size="sm"
                    color="indigo"
                    onClick={handleAutoArrange}
                  >
                    <IconLayoutCollage size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}

            {/* Zoom Controls */}
            <Tooltip label={t("Zoom to fit")} withArrow position="top">
              <ActionIcon variant="subtle" size="sm" onClick={fitToView}>
                <IconFocusCentered size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t("Zoom in")} withArrow position="top">
              <ActionIcon variant="subtle" size="sm" onClick={handleZoomIn}>
                <IconZoomIn size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t("Zoom out")} withArrow position="top">
              <ActionIcon variant="subtle" size="sm" onClick={handleZoomOut}>
                <IconZoomOut size={16} />
              </ActionIcon>
            </Tooltip>

            {/* Export Menu */}
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <Tooltip label={t("Export")} withArrow position="top">
                  <ActionIcon variant="subtle" size="sm" color="gray">
                    <IconDownload size={16} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t("Export Mind Map")}</Menu.Label>
                <Menu.Item
                  leftSection={<IconPhoto size={15} color="#228be6" />}
                  onClick={handleExportPng}
                >
                  {t("PNG Image")}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileCode size={15} color="#12b886" />}
                  onClick={handleExportFreeplane}
                >
                  {t("Freeplane (.mm XML)")}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPhoto size={15} color="#7950f2" />}
                  onClick={handleExportSvg}
                >
                  {t("Vector SVG")}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileCode size={15} color="#fd7e14" />}
                  onClick={handleExportMarkdown}
                >
                  {t("Markdown Outline (.md)")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            {/* Fullscreen Toggle */}
            <Tooltip
              label={
                isFullscreen ? t("Exit full screen (Esc)") : t("Full screen")
              }
              withArrow
              position="top"
            >
              <ActionIcon
                variant={isFullscreen ? "filled" : "subtle"}
                size="sm"
                color={isFullscreen ? "blue" : "gray"}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <IconArrowsMinimize size={16} />
                ) : (
                  <IconArrowsMaximize size={16} />
                )}
              </ActionIcon>
            </Tooltip>

            {editor.isEditable && (
              <>
                <Tooltip label={t("Import Freeplane")} withArrow position="top">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="teal"
                    onClick={openImport}
                  >
                    <IconFileUpload size={16} />
                  </ActionIcon>
                </Tooltip>

                {/* Edit & Save Mode Toggle Buttons */}
                {!isEditMode ? (
                  <Button
                    variant="light"
                    size="compact-xs"
                    color="blue"
                    leftSection={<IconEdit size={14} />}
                    onClick={handleEnterEditMode}
                  >
                    {t("Edit")}
                  </Button>
                ) : (
                  <Group gap={6}>
                    <Button
                      variant="filled"
                      size="compact-xs"
                      color="green"
                      leftSection={<IconDeviceFloppy size={14} />}
                      onClick={handleSave}
                    >
                      {t("Save")}
                    </Button>
                    <Button
                      variant="default"
                      size="compact-xs"
                      onClick={handleCancel}
                    >
                      {t("Cancel")}
                    </Button>
                  </Group>
                )}

                <Tooltip label={t("Delete mind map")} withArrow position="top">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="red"
                    onClick={tiptapDeleteNode}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Freeform Interactive Canvas Container */}
        <div
          ref={containerRef}
          className={clsx(classes.canvasContainer, {
            [classes.fullscreenCanvas]: isFullscreen,
            [classes.editGridBackground]: isEditMode,
          })}
          style={isFullscreen ? undefined : { height: currentHeight }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* SVG Layer for Edges, Curves & Connectors */}
          <svg
            ref={svgRef}
            className={classes.svgSurface}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="6"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#868e96" />
              </marker>
              <marker
                id="arrowhead-selected"
                markerWidth="8"
                markerHeight="6"
                refX="6"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#228be6" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Connected Edges */}
              {graph.edges.map((edge) => {
                const fromNode = graph.nodes.find((n) => n.id === edge.from);
                const toNode = graph.nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const { path } = calculateEdgePath(fromNode, toNode);
                const isEdgeSelected = selectedEdgeId === edge.id;

                return (
                  <path
                    key={edge.id}
                    data-edge-id={edge.id}
                    d={path}
                    className={clsx(classes.edgePath, {
                      [classes.edgeSelected]: isEdgeSelected,
                    })}
                    markerEnd={
                      isEdgeSelected
                        ? "url(#arrowhead-selected)"
                        : "url(#arrowhead)"
                    }
                  />
                );
              })}

              {/* Connecting Edge Preview while dragging handle */}
              {connectingEdge && (
                <path
                  d={`M ${connectingEdge.startX} ${connectingEdge.startY} Q ${(connectingEdge.startX + connectingEdge.currentX) / 2} ${(connectingEdge.startY + connectingEdge.currentY) / 2 - 20}, ${connectingEdge.currentX} ${connectingEdge.currentY}`}
                  className={classes.edgeConnecting}
                />
              )}
            </g>
          </svg>

          {/* HTML Nodes Layer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              pointerEvents: "none",
            }}
          >
            {graph.nodes.map((n) => {
              const isNodeSelected = selectedNodeId === n.id;
              const isEditing = editingNodeId === n.id;
              const palette = COLOR_PALETTE[n.color] || COLOR_PALETTE.blue;

              let shapeClass = classes.shapeRectangle;
              if (n.shape === "circle") shapeClass = classes.shapeCircle;
              else if (n.shape === "pill") shapeClass = classes.shapePill;
              else if (n.shape === "sticky") shapeClass = classes.shapeSticky;
              else if (n.shape === "diamond") shapeClass = classes.shapeDiamond;

              return (
                <div
                  key={n.id}
                  data-node-id={n.id}
                  className={clsx(classes.nodeWrapper, shapeClass, {
                    [classes.nodeSelected]: isNodeSelected,
                    [classes.nodeSelectedRing]: isNodeSelected && isEditMode,
                  })}
                  style={{
                    left: n.x,
                    top: n.y,
                    width: n.width,
                    height: n.height,
                    backgroundColor: palette.bg,
                    borderColor: palette.border,
                    color: palette.text,
                    pointerEvents: "auto",
                  }}
                  onDoubleClick={() => startInlineEdit(n.id, n.text)}
                >
                  {/* Connection Port Dots (in Edit Mode) */}
                  {isEditMode && (
                    <>
                      <div
                        data-port-node={n.id}
                        className={clsx(classes.portHandle, classes.portRight)}
                        title={t("Drag to connect edge")}
                      />
                      <div
                        data-port-node={n.id}
                        className={clsx(classes.portHandle, classes.portLeft)}
                        title={t("Drag to connect edge")}
                      />
                      <div
                        data-port-node={n.id}
                        className={clsx(classes.portHandle, classes.portTop)}
                        title={t("Drag to connect edge")}
                      />
                      <div
                        data-port-node={n.id}
                        className={clsx(classes.portHandle, classes.portBottom)}
                        title={t("Drag to connect edge")}
                      />
                    </>
                  )}

                  {/* Node Content / Inline Editor */}
                  {isEditing ? (
                    <textarea
                      ref={inputRef}
                      className={classes.nodeInput}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          commitInlineEdit();
                        } else if (e.key === "Escape") {
                          setEditingNodeId(null);
                        }
                      }}
                      onBlur={commitInlineEdit}
                      autoFocus
                    />
                  ) : (
                    <div className={classes.nodeText}>{n.text}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Miro Floating Action Toolbar above selected node */}
          {isEditMode && selectedNode && (
            <div
              className={classes.floatingToolbar}
              style={{
                left: pan.x + (selectedNode.x + selectedNode.width / 2) * zoom,
                top: Math.max(12, pan.y + selectedNode.y * zoom - 44),
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Shape Switcher */}
              <Menu shadow="md" width={140}>
                <Menu.Target>
                  <Button variant="subtle" size="compact-xs" color="gray">
                    {SHAPE_CONFIG[selectedNode.shape]?.label || "Shape"}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconSquare size={14} />}
                    onClick={() => handleChangeShape("rectangle")}
                  >
                    Rectangle
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconNote size={14} />}
                    onClick={() => handleChangeShape("sticky")}
                  >
                    Sticky Note
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconCircle size={14} />}
                    onClick={() => handleChangeShape("circle")}
                  >
                    Circle
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconPill size={14} />}
                    onClick={() => handleChangeShape("pill")}
                  >
                    Pill
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDiamond size={14} />}
                    onClick={() => handleChangeShape("diamond")}
                  >
                    Diamond
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              {/* Color Palette */}
              <Group gap={4} px={4}>
                {(
                  [
                    "blue",
                    "yellow",
                    "green",
                    "purple",
                    "red",
                    "orange",
                    "gray",
                  ] as NodeColor[]
                ).map((c) => (
                  <div
                    key={c}
                    className={classes.colorDot}
                    style={{ backgroundColor: COLOR_PALETTE[c].bg, borderColor: COLOR_PALETTE[c].border }}
                    onClick={() => handleChangeColor(c)}
                    title={c}
                  />
                ))}
              </Group>

              {/* Add Child Button */}
              <Tooltip label={t("Add connected child (Tab)")} withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="blue"
                  onClick={() => handleAddChildNode(selectedNode.id)}
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Tooltip>

              {/* Delete Node */}
              <Tooltip label={t("Delete node (Backspace)")} withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="red"
                  onClick={handleDeleteSelected}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </div>
          )}

          {/* Delete Edge Action Bar when an edge is clicked */}
          {isEditMode && selectedEdgeId && (
            <div
              className={classes.floatingToolbar}
              style={{
                left: "50%",
                top: 20,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Text size="xs" fw={500} c="dimmed" mr={4}>
                {t("Edge Selected")}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                color="red"
                leftSection={<IconTrash size={13} />}
                onClick={handleDeleteSelected}
              >
                {t("Delete Edge")}
              </Button>
            </div>
          )}
        </div>

        {/* Resizer Handle */}
        {!isFullscreen && editor.isEditable && (
          <div
            className={classes.resizeBar}
            onMouseDown={handleResizeMouseDown}
            title={t("Drag to resize height")}
          >
            <div className={classes.resizeGrip} />
          </div>
        )}
      </div>

      {/* Freeplane Import Modal */}
      <Modal
        opened={importOpened}
        onClose={closeImport}
        title={
          <Group gap="xs">
            <IconFileUpload
              size={22}
              color="var(--mantine-color-teal-filled, #12b886)"
            />
            <Text fw={600}>{t("Import Freeplane Mind Map (.mm)")}</Text>
          </Group>
        }
        centered
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            {t(
              "Select or drop any Freeplane or FreeMind (.mm XML) mind map file to convert and import it seamlessly into your visual canvas.",
            )}
          </Text>

          <FileInput
            label={t("Choose a Freeplane .mm file")}
            placeholder={t("Click to select file (*.mm)")}
            accept=".mm,text/xml,application/xml"
            leftSection={<IconFileUpload size={16} />}
            onChange={handleFileUpload}
          />

          <Text size="xs" c="dimmed" ta="center">
            {t("— OR paste Freeplane XML below —")}
          </Text>

          <Textarea
            label={t("Paste Freeplane XML")}
            placeholder='<map version="freeplane 1.9.0"><node TEXT="My Map">...</node></map>'
            value={xmlInput}
            onChange={(e) => setXmlInput(e.currentTarget.value)}
            minRows={5}
            styles={{
              input: {
                fontFamily: "monospace",
                fontSize: "12px",
              },
            }}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={closeImport}>
              {t("Cancel")}
            </Button>
            <Button
              color="teal"
              disabled={!xmlInput.trim()}
              onClick={handlePasteImport}
            >
              {t("Convert & Import")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </NodeViewWrapper>
  );
};

export default MindmapView;
