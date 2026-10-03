import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Box, Menu, ScrollArea, Text, TextInput } from "@mantine/core";
import {
  IconCopy,
  IconLink,
  IconPalette,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { platformModifierLabel } from "@/lib";
import classes from "./block-menu.module.css";

interface BlockActionMenuProps {
  editor: Editor | null;
}

interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

const TEXT_COLORS = [
  { name: "Default", color: "" },
  { name: "Gray", color: "#787774" },
  { name: "Brown", color: "#9F6B53" },
  { name: "Orange", color: "#D9730D" },
  { name: "Yellow", color: "#CB912F" },
  { name: "Green", color: "#448361" },
  { name: "Blue", color: "#337EA9" },
  { name: "Purple", color: "#9065B0" },
  { name: "Pink", color: "#C14C8A" },
  { name: "Red", color: "#D44C47" },
];

const HIGHLIGHT_COLORS = [
  { name: "Default", color: "" },
  { name: "Gray background", color: "#F1F1EF" },
  { name: "Brown background", color: "#F4EEEE" },
  { name: "Orange background", color: "#FBECDD" },
  { name: "Yellow background", color: "#FBF3DB" },
  { name: "Green background", color: "#EDF3EC" },
  { name: "Blue background", color: "#E7F3F8" },
  { name: "Purple background", color: "#F4F0F7" },
  { name: "Pink background", color: "#FAF1F5" },
  { name: "Red background", color: "#FDEBEC" },
];

export const BlockActionMenu: FC<BlockActionMenuProps> = ({ editor }) => {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [menuPos, setMenuPos] = useState<number>(0);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const modKey = platformModifierLabel === "⌘" ? "⌘" : "Ctrl+";

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      setMenuPos(detail.pos);
      setAnchorRect(detail.rect);
      setSearchQuery("");
      setOpened(true);
    };

    window.addEventListener("docmost:open-block-menu", handleOpen);
    return () => {
      window.removeEventListener("docmost:open-block-menu", handleOpen);
    };
  }, []);

  const handleMenuChange = useCallback((nextOpened: boolean) => {
    setOpened(nextOpened);
    if (!nextOpened) {
      window.dispatchEvent(new CustomEvent("docmost:close-block-menu"));
    }
  }, []);

  useEffect(() => {
    if (opened) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.(`.${classes.dropdown}`)) return;
      handleMenuChange(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [opened, handleMenuChange]);

  const ensureNodeSelection = useCallback(() => {
    if (!editor) return;
    const { state, view } = editor;
    if (state.selection instanceof NodeSelection) return;

    try {
      const sel = NodeSelection.create(state.doc, menuPos);
      view.dispatch(state.tr.setSelection(sel));
    } catch {
      const $pos = state.doc.resolve(menuPos);
      const sel = TextSelection.create(
        state.doc,
        $pos.start($pos.depth),
        $pos.end($pos.depth),
      );
      view.dispatch(state.tr.setSelection(sel));
    }
  }, [editor, menuPos]);

  const ensureTextSelection = useCallback(() => {
    if (!editor) return;
    const { state, view } = editor;
    if (state.selection instanceof NodeSelection) {
      const node = state.selection.node;
      if (node.isAtom || !node.isBlock) return;
      try {
        const from = state.selection.from;
        const textSel = TextSelection.create(
          state.doc,
          from + 1,
          Math.min(from + node.nodeSize - 1, state.doc.content.size),
        );
        view.dispatch(state.tr.setSelection(textSel));
      } catch {
        // Fallback: keep existing selection
      }
    }
  }, [editor]);

  const setTextColor = useCallback(
    (color: string) => {
      if (!editor) return;
      ensureTextSelection();
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
      handleMenuChange(false);
    },
    [editor, ensureTextSelection, handleMenuChange],
  );

  const setHighlightColor = useCallback(
    (color: string) => {
      if (!editor) return;
      ensureTextSelection();
      if (color) {
        editor.chain().focus().setHighlight({ color }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
      handleMenuChange(false);
    },
    [editor, ensureTextSelection, handleMenuChange],
  );

  const duplicate = useCallback(() => {
    if (!editor) return;
    const { state, view } = editor;
    ensureNodeSelection();

    let node: any = null;
    let insertPos = 0;

    if (editor.state.selection instanceof NodeSelection) {
      node = editor.state.selection.node;
      insertPos = editor.state.selection.to;
    } else {
      const $pos = state.doc.resolve(menuPos);
      node = state.doc.nodeAt(menuPos) ?? ($pos.depth > 0 ? $pos.node($pos.depth) : null);
      insertPos = $pos.depth > 0 ? $pos.after($pos.depth) : menuPos + (node?.nodeSize ?? 0);
    }

    if (node) {
      const clonedAttrs = { ...node.attrs };
      if (clonedAttrs.id) {
        delete clonedAttrs.id;
      }
      const clonedNode = node.type.create(
        clonedAttrs,
        node.content,
        node.marks,
      );
      const tr = state.tr.insert(insertPos, clonedNode);
      view.dispatch(tr);
      editor.commands.focus();
    }
    handleMenuChange(false);
  }, [editor, ensureNodeSelection, menuPos, handleMenuChange]);

  const deleteBlock = useCallback(() => {
    if (!editor) return;
    const { state, view } = editor;

    if (state.selection instanceof NodeSelection) {
      editor.chain().focus().deleteSelection().run();
    } else {
      const $pos = state.doc.resolve(menuPos);
      const node = state.doc.nodeAt(menuPos);
      if (node) {
        view.dispatch(state.tr.delete(menuPos, menuPos + node.nodeSize));
      } else if ($pos.depth > 0) {
        view.dispatch(
          state.tr.delete($pos.before($pos.depth), $pos.after($pos.depth)),
        );
      }
      editor.commands.focus();
    }
    handleMenuChange(false);
  }, [editor, menuPos, handleMenuChange]);

  const copyLink = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    let blockId: string | null = null;
    if (state.selection instanceof NodeSelection) {
      blockId = state.selection.node.attrs?.id ?? null;
    } else {
      const node = state.doc.nodeAt(menuPos);
      blockId = node?.attrs?.id ?? null;
    }

    const baseUrl = window.location.href.split("#")[0];
    const url = blockId ? `${baseUrl}#${blockId}` : baseUrl;
    navigator.clipboard.writeText(url);
    notifications.show({
      message: t("Link copied to clipboard"),
      color: "blue",
    });
    handleMenuChange(false);
  }, [editor, menuPos, t, handleMenuChange]);

  const filteredTextColors = useMemo(() => {
    if (!searchQuery.trim()) return TEXT_COLORS;
    const q = searchQuery.toLowerCase().trim();
    return TEXT_COLORS.filter((item) =>
      item.name.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredHighlightColors = useMemo(() => {
    if (!searchQuery.trim()) return HIGHLIGHT_COLORS;
    const q = searchQuery.toLowerCase().trim();
    return HIGHLIGHT_COLORS.filter((item) =>
      item.name.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <Menu
      opened={opened}
      onChange={handleMenuChange}
      position="left-start"
      offset={6}
      middlewares={{ flip: false, shift: true }}
      withinPortal
      shadow="md"
      width={240}
    >
      <Menu.Target>
        <div
          style={{
            position: "fixed",
            top: anchorRect ? anchorRect.top : 0,
            left: anchorRect ? anchorRect.left : 0,
            width: anchorRect ? anchorRect.width : 1,
            height: anchorRect ? anchorRect.height : 1,
            pointerEvents: "none",
            visibility: anchorRect ? "visible" : "hidden",
            zIndex: 60,
          }}
        />
      </Menu.Target>

      <Menu.Dropdown className={classes.dropdown}>
        <Box className={classes.searchInput}>
          <TextInput
            ref={inputRef}
            placeholder={t("Search actions...")}
            size="xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={14} />}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleMenuChange(false);
              }
            }}
          />
        </Box>

        <Menu.Divider />

        {isSearching ? (
          <ScrollArea.Autosize mah={300} type="scroll">
            {filteredTextColors.length > 0 && (
              <>
                <Menu.Label>{t("Color")}</Menu.Label>
                {filteredTextColors.map((c) => (
                  <Menu.Item
                    key={c.name}
                    leftSection={
                      <div
                        className={classes.colorPreview}
                        style={{ color: c.color || "inherit" }}
                      >
                        A
                      </div>
                    }
                    onClick={() => setTextColor(c.color)}
                    className={classes.item}
                  >
                    {t(c.name)}
                  </Menu.Item>
                ))}
                <Menu.Divider />
              </>
            )}

            {filteredHighlightColors.length > 0 && (
              <>
                <Menu.Label>{t("Background")}</Menu.Label>
                {filteredHighlightColors.map((c) => (
                  <Menu.Item
                    key={c.name}
                    leftSection={
                      <div
                        className={classes.colorPreview}
                        style={{ backgroundColor: c.color || "transparent" }}
                      >
                        A
                      </div>
                    }
                    onClick={() => setHighlightColor(c.color)}
                    className={classes.item}
                  >
                    {t(c.name)}
                  </Menu.Item>
                ))}
                <Menu.Divider />
              </>
            )}

            <Menu.Item
              leftSection={<IconCopy size={16} />}
              onClick={duplicate}
              className={classes.item}
            >
              {t("Duplicate")}
            </Menu.Item>

            <Menu.Item
              leftSection={<IconLink size={16} />}
              onClick={copyLink}
              className={classes.item}
            >
              {t("Copy link to block")}
            </Menu.Item>

            <Menu.Item
              leftSection={<IconTrash size={16} />}
              color="red"
              onClick={deleteBlock}
              className={classes.item}
            >
              {t("Delete")}
            </Menu.Item>
          </ScrollArea.Autosize>
        ) : (
          <>
            {/* Color submenu */}
            <Menu.Sub position="right-start">
              <Menu.Sub.Target>
                <Menu.Sub.Item
                  leftSection={<IconPalette size={16} />}
                  className={classes.item}
                >
                  {t("Color")}
                </Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown className={classes.colorSection}>
                <ScrollArea.Autosize mah={280} type="scroll">
                  <Menu.Label>{t("Text color")}</Menu.Label>
                  {TEXT_COLORS.map((c) => (
                    <Menu.Item
                      key={c.name}
                      leftSection={
                        <div
                          className={classes.colorPreview}
                          style={{ color: c.color || "inherit" }}
                        >
                          A
                        </div>
                      }
                      onClick={() => setTextColor(c.color)}
                      className={classes.item}
                    >
                      {t(c.name)}
                    </Menu.Item>
                  ))}

                  <Menu.Divider />

                  <Menu.Label>{t("Background color")}</Menu.Label>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <Menu.Item
                      key={c.name}
                      leftSection={
                        <div
                          className={classes.colorPreview}
                          style={{
                            backgroundColor: c.color || "transparent",
                          }}
                        >
                          A
                        </div>
                      }
                      onClick={() => setHighlightColor(c.color)}
                      className={classes.item}
                    >
                      {t(c.name)}
                    </Menu.Item>
                  ))}
                </ScrollArea.Autosize>
              </Menu.Sub.Dropdown>
            </Menu.Sub>

            {/* Duplicate */}
            <Menu.Item
              leftSection={<IconCopy size={16} />}
              rightSection={<Text className={classes.shortcut}>{modKey}D</Text>}
              onClick={duplicate}
              className={classes.item}
            >
              {t("Duplicate")}
            </Menu.Item>

            {/* Copy link */}
            <Menu.Item
              leftSection={<IconLink size={16} />}
              onClick={copyLink}
              className={classes.item}
            >
              {t("Copy link to block")}
            </Menu.Item>

            <Menu.Divider />

            {/* Delete */}
            <Menu.Item
              leftSection={<IconTrash size={16} />}
              color="red"
              rightSection={<Text className={classes.shortcut}>Del</Text>}
              onClick={deleteBlock}
              className={classes.item}
            >
              {t("Delete")}
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

export default BlockActionMenu;
