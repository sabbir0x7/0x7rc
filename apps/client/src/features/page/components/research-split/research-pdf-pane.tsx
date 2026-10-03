import React, { FC, useCallback, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowsHorizontal,
  IconArrowsMaximize,
  IconColumns,
  IconExternalLink,
  IconFileTypePdf,
  IconFileUpload,
  IconPaperclip,
  IconRefresh,
  IconSwitchHorizontal,
  IconX,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import {
  isDraggingSplitterAtom,
  isSplitViewOpenAtom,
  paneOrderAtom,
  splitPdfNameAtom,
  splitPdfUrlAtom,
  splitViewModeAtom,
} from "@/features/page/atoms/research-split-atoms";
import { usePageAttachmentsQuery } from "@/features/attachments/queries/attachment-query";
import { uploadFile } from "@/features/page/services/page-service";
import { getBackendUrl, getFileUrl } from "@/lib/config";
import classes from "./research-split.module.css";

/**
 * Normalize a PDF path returned from the Docmost API.
 *
 * The server's `filePath` field has the format:
 *   "{workspaceId}/files/{attachmentId}/{filename}"
 *
 * The correct API endpoint for serving files is:
 *   /api/files/{attachmentId}/{filename}
 *
 * getFileUrl() only handles paths starting with http, /api/, or /files/.
 * For bare UUID paths we must extract the "files/..." portion and prepend /api/.
 */
function resolveAttachmentUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  if (path.startsWith("/api/") || path.startsWith("/files/")) return getFileUrl(path);

  // Bare UUID path from server: "{workspaceId}/files/{attachmentId}/{filename}"
  // Extract the "files/..." portion and use the /api/files/... endpoint
  const filesIdx = path.indexOf("/files/");
  if (filesIdx !== -1) {
    const filesPart = path.substring(filesIdx + 1); // "files/{attachmentId}/{filename}"
    return `${getBackendUrl()}/${filesPart}`;
  }

  // Fallback: prepend backend URL directly
  return `${getBackendUrl()}/${path}`;
}


interface ResearchPdfPaneProps {
  pageId: string;
}

export const ResearchPdfPane: FC<ResearchPdfPaneProps> = ({ pageId }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useAtom(isSplitViewOpenAtom);
  const [mode, setMode] = useAtom(splitViewModeAtom);
  const [paneOrder, setPaneOrder] = useAtom(paneOrderAtom);
  const [pdfUrl, setPdfUrl] = useAtom(splitPdfUrlAtom);
  const [pdfName, setPdfName] = useAtom(splitPdfNameAtom);
  const [isDraggingSplitter] = useAtom(isDraggingSplitterAtom);

  const [isUploading, setIsUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Zoom state: default 100%, persisted per page
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`0x7_research_pdf_zoom_${pageId}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 50 && val <= 250) return val;
      }
    } catch {
      // ignore
    }
    return 100;
  });

  const handleZoomChange = useCallback(
    (newZoom: number) => {
      const clamped = Math.max(50, Math.min(250, newZoom));
      setZoomLevel(clamped);
      try {
        localStorage.setItem(`0x7_research_pdf_zoom_${pageId}`, clamped.toString());
      } catch {
        // ignore
      }
    },
    [pageId],
  );

  const ZOOM_STEPS = [50, 75, 90, 100, 125, 150, 175, 200, 250];

  const handleZoomIn = useCallback(() => {
    const next = ZOOM_STEPS.find((s) => s > zoomLevel);
    handleZoomChange(next ?? Math.min(250, zoomLevel + 25));
  }, [zoomLevel, handleZoomChange]);

  const handleZoomOut = useCallback(() => {
    const prev = [...ZOOM_STEPS].reverse().find((s) => s < zoomLevel);
    handleZoomChange(prev ?? Math.max(50, zoomLevel - 25));
  }, [zoomLevel, handleZoomChange]);

  const handleResetZoom = useCallback(() => {
    handleZoomChange(100);
  }, [handleZoomChange]);

  // Fetch page attachments to let user pick any existing PDF
  const { data: attachmentsData, isLoading: isLoadingAttachments } =
    usePageAttachmentsQuery(pageId);

  const pdfAttachments = useMemo(() => {
    if (!attachmentsData) return [];
    const list: Array<{ id: string; name: string; url: string }> = [];
    for (const page of attachmentsData.pages) {
      for (const att of page.items) {
        if (
          att.mimeType === "application/pdf" ||
          att.fileName?.toLowerCase().endsWith(".pdf")
        ) {
          list.push({
            id: att.id,
            name: att.fileName,
            url: resolveAttachmentUrl(att.url || att.filePath),
          });
        }
      }
    }
    return list;
  }, [attachmentsData]);

  // Handle local PDF upload
  const handleUploadPdf = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setIsUploading(true);
      try {
        const uploaded = await uploadFile(file, pageId);
        const path = uploaded?.filePath || (uploaded as any)?.url || "";
        const resolvedUrl = path ? resolveAttachmentUrl(path) : "";
        setPdfUrl(resolvedUrl);
        setPdfName(file.name);
        setIsPickerOpen(false);

        // Save preference in localStorage
        try {
          localStorage.setItem(
            `0x7_research_pdf_${pageId}`,
            JSON.stringify({ url: resolvedUrl, name: file.name }),
          );
        } catch {
          // ignore storage error
        }

        notifications.show({
          title: t("PDF Uploaded"),
          message: t("Loaded {{name}} into research viewer", {
            name: file.name,
          }),
          color: "green",
        });
      } catch (err: any) {
        // Fallback to local Object URL if upload fails (e.g. offline)
        const blobUrl = URL.createObjectURL(file);
        setPdfUrl(blobUrl);
        setPdfName(file.name);
        setIsPickerOpen(false);
        notifications.show({
          title: t("Local PDF Loaded"),
          message: t("Loaded {{name}} for this session", { name: file.name }),
          color: "blue",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [pageId, setPdfUrl, setPdfName, t],
  );

  // Handle manual URL load (e.g. arXiv paper)
  const handleLoadUrl = useCallback(() => {
    if (!manualUrl.trim()) return;
    const url = manualUrl.trim();
    const name = url.split("/").pop()?.split("?")[0] || "Research Document";
    setPdfUrl(url);
    setPdfName(name);
    setIsPickerOpen(false);

    try {
      localStorage.setItem(
        `0x7_research_pdf_${pageId}`,
        JSON.stringify({ url, name }),
      );
    } catch {
      // ignore
    }

    notifications.show({
      message: t("Loaded PDF from URL"),
      color: "green",
    });
  }, [manualUrl, pageId, setPdfUrl, setPdfName, t]);

  // Handle picking from existing attachments
  const handleSelectAttachment = useCallback(
    (att: { name: string; url: string }) => {
      setPdfUrl(att.url);
      setPdfName(att.name);
      setIsPickerOpen(false);

      try {
        localStorage.setItem(
          `0x7_research_pdf_${pageId}`,
          JSON.stringify({ url: att.url, name: att.name }),
        );
      } catch {
        // ignore
      }
    },
    [pageId, setPdfUrl, setPdfName],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setMode("split");
  }, [setIsOpen, setMode]);

  return (
    <div className={classes.pdfPane}>
      {/* Pane Top Header */}
      <div className={classes.pdfHeader}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
          <IconFileTypePdf size={18} color="#e03131" style={{ flexShrink: 0 }} />
          <Text size="sm" fw={600} lineClamp={1} style={{ minWidth: 0 }} title={pdfName || t("Research PDF")}>
            {pdfName || t("Research PDF Viewer")}
          </Text>
          {pdfUrl && (
            <Badge size="xs" variant="light" color="red" style={{ flexShrink: 0 }}>
              PDF
            </Badge>
          )}
        </Group>

        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {/* Zoom In / Zoom Out Controls */}
          {pdfUrl && !isPickerOpen && (
            <div className={classes.zoomControlGroup}>
              <Tooltip label={t("Zoom Out (-)")} withArrow position="bottom">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="gray"
                  disabled={zoomLevel <= 50}
                  onClick={handleZoomOut}
                  aria-label={t("Zoom Out")}
                >
                  <IconZoomOut size={14} />
                </ActionIcon>
              </Tooltip>

              <Menu shadow="md" width={120} position="bottom" withinPortal>
                <Menu.Target>
                  <Tooltip label={t("Zoom Presets")} withArrow position="bottom">
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="gray"
                      className={classes.zoomButton}
                    >
                      {zoomLevel}%
                    </Button>
                  </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                  {ZOOM_STEPS.map((preset) => (
                    <Menu.Item
                      key={preset}
                      onClick={() => handleZoomChange(preset)}
                      fw={zoomLevel === preset ? 700 : 400}
                      c={zoomLevel === preset ? "blue" : undefined}
                    >
                      {preset}% {preset === 100 && `(${t("Default")})`}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconZoomReset size={14} />}
                    onClick={handleResetZoom}
                  >
                    {t("Reset (100%)")}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <Tooltip label={t("Zoom In (+)")} withArrow position="bottom">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="gray"
                  disabled={zoomLevel >= 250}
                  onClick={handleZoomIn}
                  aria-label={t("Zoom In")}
                >
                  <IconZoomIn size={14} />
                </ActionIcon>
              </Tooltip>
            </div>
          )}

          {/* Switch / Change PDF Button */}
          {pdfUrl && (
            <Tooltip label={t("Switch or Upload PDF")} withArrow position="bottom">
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                onClick={() => setIsPickerOpen((prev) => !prev)}
                aria-label={t("Switch or Upload PDF")}
              >
                <IconSwitchHorizontal size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Swap Panes Left ⇄ Right */}
          {mode === "split" && (
            <Tooltip
              label={
                paneOrder === "pdf-left"
                  ? t("Swap: Move PDF to Right (⇄)")
                  : t("Swap: Move PDF to Left (⇄)")
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

          {/* Mode: PDF Only */}
          {mode !== "pdf-only" && (
            <Tooltip
              label={t("Full Screen PDF (Hide Notes)")}
              withArrow
              position="bottom"
            >
              <ActionIcon
                variant="subtle"
                size="sm"
                color="blue"
                onClick={() => setMode("pdf-only")}
                aria-label={t("Full Screen PDF")}
              >
                <IconArrowsMaximize size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Mode: Split View */}
          {mode === "pdf-only" && (
            <Tooltip label={t("Split View (Show Notes)")} withArrow position="bottom">
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
          <Tooltip label={t("Close Research Split View")} withArrow position="bottom">
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              onClick={handleClose}
              aria-label={t("Close Research Split View")}
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>

      {/* Pane Content Body */}
      <div className={classes.pdfViewerBody}>
        {pdfUrl && !isPickerOpen ? (
          <div
            className={
              mode === "pdf-only"
                ? classes.pdfCenteredWrapper
                : classes.pdfFullWrapper
            }
            style={
              mode === "pdf-only"
                ? {
                    width: `${Math.round(960 * (zoomLevel / 100))}px`,
                    maxWidth: zoomLevel <= 100 ? `${Math.round(960 * (zoomLevel / 100))}px` : "none",
                    height: zoomLevel <= 100 ? "100%" : `${zoomLevel}%`,
                    minHeight: "100%",
                    margin: "0 auto",
                    transition: "width 0.2s cubic-bezier(0.2, 0, 0, 1)",
                  }
                : zoomLevel === 100
                ? { width: "100%", height: "100%" }
                : zoomLevel < 100
                ? {
                    width: `${zoomLevel}%`,
                    height: "100%",
                    margin: "0 auto",
                    transition: "width 0.2s cubic-bezier(0.2, 0, 0, 1)",
                  }
                : {
                    width: `${zoomLevel}%`,
                    height: `${zoomLevel}%`,
                    minWidth: "100%",
                    minHeight: "100%",
                    transition: "width 0.2s cubic-bezier(0.2, 0, 0, 1), height 0.2s cubic-bezier(0.2, 0, 0, 1)",
                  }
            }
          >
            <iframe
              src={pdfUrl}
              className={classes.pdfIframe}
              style={{
                pointerEvents: isDraggingSplitter ? "none" : "auto",
              }}
              title={pdfName || "PDF Viewer"}
            />
          </div>
        ) : (
          <div className={classes.emptyContainer}>
            <div className={classes.emptyCard}>
              <Stack gap="md" align="center">
                <IconFileTypePdf size={48} stroke={1.4} color="#e03131" />
                <div>
                  <Text fw={600} size="md">
                    {t("Research Paper & PDF Reader")}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {t(
                      "Upload a research paper, book, or document to read side-by-side with your notes.",
                    )}
                  </Text>
                </div>

                {/* Upload File Input */}
                <FileInput
                  placeholder={
                    isUploading ? t("Uploading...") : t("Choose a PDF file (*.pdf)")
                  }
                  accept="application/pdf,.pdf"
                  leftSection={
                    isUploading ? (
                      <Loader size={16} />
                    ) : (
                      <IconFileUpload size={16} />
                    )
                  }
                  disabled={isUploading}
                  onChange={handleUploadPdf}
                  w="100%"
                />

                {/* Pick from existing attachments */}
                {pdfAttachments.length > 0 && (
                  <div style={{ width: "100%", textAlign: "left" }}>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                      {t("Attached to this page:")}
                    </Text>
                    <Stack gap={4}>
                      {pdfAttachments.map((att) => (
                        <Button
                          key={att.id}
                          variant="subtle"
                          size="compact-xs"
                          justify="flex-start"
                          leftSection={<IconPaperclip size={14} />}
                          onClick={() => handleSelectAttachment(att)}
                          styles={{
                            inner: { justifyContent: "flex-start" },
                            label: {
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            },
                          }}
                        >
                          {att.name}
                        </Button>
                      ))}
                    </Stack>
                  </div>
                )}

                <Text size="xs" c="dimmed">
                  {t("— OR paste web / arXiv PDF link —")}
                </Text>

                {/* Manual Link Input */}
                <Group gap={6} w="100%">
                  <TextInput
                    placeholder="https://arxiv.org/pdf/...pdf"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.currentTarget.value)}
                    style={{ flex: 1 }}
                    size="xs"
                    onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
                  />
                  <Button
                    size="xs"
                    disabled={!manualUrl.trim()}
                    onClick={handleLoadUrl}
                  >
                    {t("Load")}
                  </Button>
                </Group>

                {pdfUrl && (
                  <Button
                    variant="default"
                    size="xs"
                    onClick={() => setIsPickerOpen(false)}
                    mt="xs"
                  >
                    {t("Back to current PDF")}
                  </Button>
                )}
              </Stack>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
