import React, { FC, ReactNode, useCallback, useRef } from "react";
import { ActionIcon, Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import {
  IconArrowsHorizontal,
  IconArrowsMaximize,
  IconChevronDown,
  IconColumns,
  IconNotes,
  IconX,
} from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  isDraggingSplitterAtom,
  isSplitViewOpenAtom,
  paneOrderAtom,
  splitHeaderVisibleAtom,
  splitRatioAtom,
  splitViewModeAtom,
} from "@/features/page/atoms/research-split-atoms";
import { ResearchPdfPane } from "./research-pdf-pane";
import classes from "./research-split.module.css";


interface ResearchSplitContainerProps {
  pageId: string;
  pageTitle?: string;
  children: ReactNode;
}

export const ResearchSplitContainer: FC<ResearchSplitContainerProps> = ({
  pageId,
  pageTitle,
  children,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useAtom(isSplitViewOpenAtom);
  const [mode, setMode] = useAtom(splitViewModeAtom);
  const [paneOrder, setPaneOrder] = useAtom(paneOrderAtom);
  const [splitRatio, setSplitRatio] = useAtom(splitRatioAtom);
  const [isDraggingSplitter, setIsDraggingSplitter] = useAtom(isDraggingSplitterAtom);
  const [headerVisible, setHeaderVisible] = useAtom(splitHeaderVisibleAtom);


  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // W3C Pointer Events with setPointerCapture for 100% reliable dragging across iframes
  const handleSplitterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Only primary button
      e.preventDefault();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      isDraggingRef.current = true;
      setIsDraggingSplitter(true);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [setIsDraggingSplitter],
  );

  const handleSplitterPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      e.preventDefault();

      const clientX = e.clientX;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;

        let pdfWidthPx: number;
        if (paneOrder === "pdf-left") {
          pdfWidthPx = clientX - rect.left;
        } else {
          pdfWidthPx = rect.right - clientX;
        }

        // Clamp PDF pane between 240px and (total - 360px) to prevent crushing either pane
        const minPdfPx = 240;
        const maxPdfPx = Math.max(minPdfPx, rect.width - 360);
        const clampedPdfPx = Math.max(minPdfPx, Math.min(maxPdfPx, pdfWidthPx));
        const newRatio = (clampedPdfPx / rect.width) * 100;
        setSplitRatio(newRatio);
      });
    },
    [paneOrder, setSplitRatio],
  );

  const handleSplitterPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingSplitter(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
      }
    },
    [setIsDraggingSplitter],
  );

  // Keyboard navigation for accessibility
  const handleSplitterKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? -2 : 2;
        const direction = paneOrder === "pdf-left" ? 1 : -1;
        setSplitRatio((prev) => Math.max(20, Math.min(80, prev + delta * direction)));
      }
    },
    [paneOrder, setSplitRatio],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setMode("split");
    setHeaderVisible(false);
  }, [setIsOpen, setMode, setHeaderVisible]);


  return (
    <div
      ref={containerRef}
      className={clsx({
        [classes.splitContainer]: isOpen,
        [classes.normalContainer]: !isOpen,
      })}
      style={
        isOpen
          ? {
              flexDirection: paneOrder === "pdf-right" ? "row-reverse" : "row",
              userSelect: isDraggingSplitter ? "none" : undefined,
              marginTop: headerVisible ? "var(--page-header-height, 45px)" : "0px",
              height: headerVisible
                ? "calc(100dvh - var(--app-shell-header-height, 45px) - var(--page-header-height, 45px))"
                : "calc(100dvh - var(--app-shell-header-height, 45px))",
              transition: "margin-top 0.2s cubic-bezier(0.4, 0, 0.2, 1), height 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }
          : undefined
      }
    >
      {/* Left/Right Pane: PDF Viewer (Rendered only when split view is active) */}
      {isOpen && (
        <div
          style={{
            width:
              mode === "pdf-only"
                ? "100%"
                : mode === "notes-only"
                ? "0%"
                : `calc(${splitRatio}% - 5px)`,
            flex: mode !== "split" ? undefined : `0 0 calc(${splitRatio}% - 5px)`,
            minWidth: mode === "split" ? 240 : undefined,
            maxWidth: mode === "split" ? "calc(100% - 360px)" : undefined,
            display: mode === "notes-only" ? "none" : "flex",
            height: "100%",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
            pointerEvents: isDraggingSplitter ? "none" : undefined,
          }}
        >
          <ResearchPdfPane pageId={pageId} />
        </div>
      )}

      {/* Middle Vertical Splitter Bar (Visible only in Split mode) */}
      {isOpen && mode === "split" && (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-valuenow={Math.round(splitRatio)}
          aria-label={t("Resize panes")}
          className={clsx(classes.splitter, {
            [classes.splitterActive]: isDraggingSplitter,
          })}
          onPointerDown={handleSplitterPointerDown}
          onPointerMove={handleSplitterPointerMove}
          onPointerUp={handleSplitterPointerUp}
          onPointerCancel={handleSplitterPointerUp}
          onKeyDown={handleSplitterKeyDown}
          title={t("Drag left/right to resize PDF and Notes panes")}
        >
          <div className={classes.splitterGrip} />
        </div>
      )}

      {/* Opposite Pane: Note-Taking Editor */}
      <div
        className={clsx({
          [classes.notesPane]: isOpen,
          [classes.normalNotesPane]: !isOpen,
        })}
        data-mode={isOpen ? mode : undefined}
        style={
          isOpen
            ? {
                width:
                  mode === "notes-only"
                    ? "100%"
                    : mode === "pdf-only"
                    ? "0%"
                    : undefined,
                flex: mode === "split" ? "1 1 0" : undefined,
                minWidth: mode === "split" ? 360 : undefined,
                display: mode === "pdf-only" ? "none" : "flex",
                flexShrink: 0,
                pointerEvents: isDraggingSplitter ? "none" : undefined,
              }
            : {
                display: "block",
                width: "100%",
              }
        }
      >
        {/* Notes Pane Top Bar (Visible only in split view) */}
        {isOpen && (
          <div className={classes.notesHeader}>
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
              <IconNotes size={18} color="#228be6" style={{ flexShrink: 0 }} />
              <Text size="sm" fw={600} lineClamp={1} style={{ minWidth: 0 }}>
                {pageTitle ? t("Notes: {{title}}", { title: pageTitle }) : t("Research Notes")}
              </Text>
              <Badge size="xs" variant="light" color="blue" style={{ flexShrink: 0 }}>
                {mode === "notes-only" ? t("Focus Mode") : t("Realtime Notes")}
              </Badge>
            </Group>

            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              {/* Toggle Page Header visibility */}
              <Tooltip
                label={headerVisible ? t("Hide page header") : t("Show page header")}
                withArrow
                position="bottom"
              >
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color={headerVisible ? "blue" : "gray"}
                  onClick={() => setHeaderVisible((v) => !v)}
                  aria-label={headerVisible ? t("Hide page header") : t("Show page header")}
                >
                  <IconChevronDown
                    size={16}
                    style={{
                      transform: headerVisible ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </ActionIcon>
              </Tooltip>

              {/* Swap Left/Right Panes */}
              {mode === "split" && (
                <Tooltip
                  label={
                    paneOrder === "pdf-left"
                      ? t("Swap: Move Notes to Left (⇄)")
                      : t("Swap: Move Notes to Right (⇄)")
                  }
                  withArrow
                  position="bottom"
                >
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="gray"
                    onClick={() =>
                      setPaneOrder((prev) =>
                        prev === "pdf-left" ? "pdf-right" : "pdf-left",
                      )
                    }
                    aria-label={t("Swap Left/Right")}
                  >
                    <IconArrowsHorizontal size={16} />
                  </ActionIcon>
                </Tooltip>
              )}


              {/* Mode: Notes Only */}
              {mode === "split" && (
                <Tooltip
                  label={t("Focus Notes (Hide PDF)")}
                  withArrow
                  position="bottom"
                >
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="blue"
                    onClick={() => setMode("notes-only")}
                    aria-label={t("Focus Notes (Hide PDF)")}
                  >
                    <IconArrowsMaximize size={16} />
                  </ActionIcon>
                </Tooltip>
              )}

              {/* Mode: Return to Split View */}
              {mode === "notes-only" && (
                <Tooltip label={t("Split View (Show PDF)")} withArrow position="bottom">
                  <Button
                    variant="light"
                    size="compact-xs"
                    color="blue"
                    leftSection={<IconColumns size={13} />}
                    onClick={() => setMode("split")}
                  >
                    {t("Split View")}
                  </Button>
                </Tooltip>
              )}

              {/* Close Split View */}
              <Tooltip label={t("Close Split View")} withArrow position="bottom">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={handleClose}
                  aria-label={t("Close Split View")}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </div>
        )}

        {/* Note-Taking Content */}
        <div
          style={
            isOpen
              ? { flex: 1, minHeight: 0, overflowY: "auto" }
              : { display: "block", width: "100%" }
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
};
