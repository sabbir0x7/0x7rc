import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { ActionIcon, Box, Menu, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BaseView } from "@/ee/base/components/base-view";
import { BaseTableSkeleton } from "@/ee/base/components/base-table-skeleton";
import { useBaseQuery } from "@/ee/base/queries/base-query";
import { pinOffsetWatcher } from "@docmost/editor-ext";
import { useHasFeature } from "@/ee/hooks/use-feature";
import { Feature } from "@/ee/features";
import { IconDots, IconTable, IconX } from "@tabler/icons-react";
import { usePageQuery } from "@/features/page/queries/page-query";
import classes from "./base-embed.module.css";

const SIDE_GUTTER = 8;

// Confine the base embed strictly within the document note bounds.
function applyExtension(wrapper: HTMLDivElement) {
  wrapper.style.setProperty("--embed-extend-l", "0px");
  wrapper.style.setProperty("--embed-extend-r", "0px");
  wrapper.style.setProperty("--embed-grid-pad-left", "0px");
  wrapper.style.setProperty("--embed-grid-pad-right", "0px");
  // Inline sticky band clears whatever fixed surface sits above the editor —
  // the page header AND the fixed formatting toolbar. `--editor-pin-offset`
  // is the same offset the default ProseMirror table header-pin uses
  // (published by pinOffsetWatcher); fall back to the page-header height.
  wrapper.style.setProperty(
    "--sticky-band-top",
    "var(--editor-pin-offset, var(--page-header-height))",
  );
}

export function BaseEmbedView({ node, editor, deleteNode }: NodeViewProps) {
  const { t } = useTranslation();
  const pageId = node.attrs.pageId as string | null;
  const pendingKey = node.attrs.pendingKey as string | null;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hasBases = useHasFeature(Feature.BASES);
  const [menuOpen, setMenuOpen] = useState(false);
  // Suppress the query while the slash command awaits the server-assigned
  // pageId; useBaseQuery would otherwise fire with an empty key.
  const { data: base, isLoading, isError } = useBaseQuery(
    pendingKey ? "" : pageId ?? "",
  );
  const { data: page } = usePageQuery({ pageId: pageId ?? undefined });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const update = () => applyExtension(wrapper);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    // Sidebar collapse changes <main>'s left/width without resizing
    // the wrapper itself, so observe <main> too.
    const main = wrapper.closest("main");
    if (main) ro.observe(main);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isLoading, isError, pageId]);

  // Keep --editor-pin-offset published while the embed is mounted, so the
  // sticky column header clears the fixed toolbar even when this document
  // has no default ProseMirror table holding the watcher open.
  useEffect(() => {
    pinOffsetWatcher.acquire();
    return () => pinOffsetWatcher.release();
  }, []);

  // Error/invalid states render a compact message, not a tall reserved box.
  // The 200px min-height (which avoids a layout jump when the real table
  // mounts) is reserved only for the skeleton/loading/table states.
  const isCompact = !pendingKey && (!pageId || isError);

  const showControls = editor.isEditable && !pendingKey;

  let content: React.ReactNode;
  if (pendingKey) {
    // Slash command inserted the embed and is awaiting the server's
    // assigned pageId. Match the shape the create endpoint will
    // return for an inline-embed (Title + Text 1 + Text 2, one
    // empty row — see BaseService.create's `defaults`) so the swap
    // to the real table doesn't visibly collapse a large fake table
    // down to a small empty one.
    content = <BaseTableSkeleton rows={1} columns={3} />;
  } else if (!pageId) {
    content = (
      <Box p="md">
        <Text c="red">Invalid base embed (missing page id)</Text>
      </Box>
    );
  } else if (isLoading) {
    content = (
      <Box p="md">
        <Text c="dimmed">Loading...</Text>
      </Box>
    );
  } else if (isError) {
    content = (
      <Box p="md" bg="gray.0" style={{ borderRadius: 8 }}>
        <Text c="dimmed">You don't have access to this base.</Text>
      </Box>
    );
  } else {
    content = (
      <BaseView
        pageId={pageId}
        embedded
        editable={hasBases && editor.isEditable && (base?.permissions?.canEdit ?? false)}
      />
    );
  }

  return (
    <NodeViewWrapper
      className={classes.handleGutter}
      data-menu-open={menuOpen ? "true" : "false"}
    >
      {showControls && (
        <div
          className={classes.controls}
          contentEditable={false}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Menu position="bottom-end" withinPortal onChange={setMenuOpen}>
            <Menu.Target>
              <ActionIcon
                variant="default"
                size="sm"
                aria-label={t("Base options")}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconX size={14} />}
                onClick={() => deleteNode()}
              >
                {t("Remove from page")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      )}
      <div data-drag-preview hidden className={classes.dragPreview}>
        <IconTable size={16} />
        <span>{page?.title?.trim() || "Untitled base"}</span>
      </div>
      <div
        ref={wrapperRef}
        style={{
          minHeight: isCompact ? undefined : 200,
          maxWidth: "100%",
        }}
      >
        {content}
      </div>
    </NodeViewWrapper>
  );
}
