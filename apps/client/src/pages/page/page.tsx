import { useParams } from "react-router-dom";
import { usePageQuery } from "@/features/page/queries/page-query";
import { FullEditor } from "@/features/editor/full-editor";
import { TitleEditor } from "@/features/editor/title-editor";
import HistoryModal from "@/features/page-history/components/history-modal";
import PageHeader from "@/features/page/components/header/page-header.tsx";
import { extractPageSlugId } from "@/lib";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";
import { useTranslation } from "react-i18next";
import React from "react";
import { EmptyState } from "@/components/ui/empty-state.tsx";
import { IconAlertTriangle, IconFileOff } from "@tabler/icons-react";
import { Button } from "@mantine/core";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { BaseView } from "@/ee/base/components/base-view";
import { useHasFeature } from "@/ee/hooks/use-feature";
import { Feature } from "@/ee/features";
import { getPageTitle } from "@/features/page/page.utils";
import { DocumentTitle } from "@/components/ui/document-title.tsx";
import { useAtom } from "jotai";
import {
  isSplitViewOpenAtom,
  splitPdfNameAtom,
  splitPdfUrlAtom,
} from "@/features/page/atoms/research-split-atoms";
import { ResearchSplitContainer } from "@/features/page/components/research-split/research-split-container";
import { getBackendUrl } from "@/lib/config";

function resolveStoredPdfUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("blob:")) return url;

  // Fix previously-saved wrong URLs: http://host/api/{workspaceUUID}/files/{attachmentId}/...
  // Detect pattern: /api/ followed by a UUID, then /files/
  const wrongApiPattern = /\/api\/[0-9a-f-]{36}\/files\//;
  if (wrongApiPattern.test(url)) {
    const filesIdx = url.indexOf("/files/", url.indexOf("/api/") + 5);
    if (filesIdx !== -1) {
      const host = url.match(/^https?:\/\/[^/]+/)?.[0] || "";
      const filesPart = url.substring(filesIdx + 1); // "files/{attachmentId}/{filename}"
      return `${host}/api/${filesPart}`;
    }
  }

  if (url.startsWith("http") || url.startsWith("/api/") || url.startsWith("/files/")) return url;

  // Legacy bare UUID path: "{workspaceId}/files/{attachmentId}/{filename}"
  const filesIdx = url.indexOf("/files/");
  if (filesIdx !== -1) {
    const filesPart = url.substring(filesIdx + 1); // "files/{attachmentId}/{filename}"
    return `${getBackendUrl()}/${filesPart}`;
  }
  return `${getBackendUrl()}/${url}`;
}

const MemoizedFullEditor = React.memo(FullEditor);
const MemoizedTitleEditor = React.memo(TitleEditor);
const MemoizedPageHeader = React.memo(PageHeader);
const MemoizedHistoryModal = React.memo(HistoryModal);

export default function Page() {
  const { t } = useTranslation();
  const { pageSlug } = useParams();

  return (
    <ErrorBoundary
      resetKeys={[pageSlug]}
      fallbackRender={({ error, resetErrorBoundary }) => {
        console.error("Page error boundary caught:", error);
        return (
          <EmptyState
            icon={IconAlertTriangle}
            title={t("Failed to load page. An error occurred.")}
            action={
              <Button variant="default" size="sm" mt="xs" onClick={resetErrorBoundary}>
                {t("Try again")}
              </Button>
            }
          />
        );
      }}
    >
      <PageContent pageSlug={pageSlug} />
    </ErrorBoundary>
  );
}

function PageContent({ pageSlug }: { pageSlug: string | undefined }) {
  const { t } = useTranslation();

  const {
    data: page,
    isLoading,
    isError,
    error,
  } = usePageQuery({ pageId: extractPageSlugId(pageSlug) });
  const { data: space } = useGetSpaceBySlugQuery(page?.space?.slug);

  const hasBases = useHasFeature(Feature.BASES);
  const canEdit = !page?.deletedAt && (page?.permissions?.canEdit ?? false);
  const canComment =
    canEdit ||
    (space?.settings?.comments?.allowViewerComments === true);

  const [isSplitViewOpen] = useAtom(isSplitViewOpenAtom);
  const [pdfUrl, setPdfUrl] = useAtom(splitPdfUrlAtom);
  const [, setPdfName] = useAtom(splitPdfNameAtom);

  // Restore saved PDF for this page if available and not yet set
  React.useEffect(() => {
    if (!page?.id) return;
    try {
      const saved = localStorage.getItem(`0x7_research_pdf_${page.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && !pdfUrl) {
          const resolvedUrl = resolveStoredPdfUrl(parsed.url);
          setPdfUrl(resolvedUrl);
          setPdfName(parsed.name || "Document.pdf");
        }
      }
    } catch {
      // ignore
    }
  }, [page?.id]);


  if (isLoading) {
    return <></>;
  }

  if (isError || !page) {
    if ([401, 403, 404].includes(error?.["status"])) {
      return (
        <EmptyState
          icon={IconFileOff}
          title={t("Page not found")}
          description={t(
            "This page may have been deleted, moved, or you may not have access.",
          )}
          action={
            <Button component={Link} to="/dashboard" variant="default" size="sm" mt="xs">
              {t("Go to dashboard")}
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={IconFileOff}
        title={t("Error fetching page data.")}
      />
    );
  }

  if (!space) {
    return <></>;
  }

  if (page?.isBase) {
    return (
      <div
        className="base-page-root"
        style={{
          display: "flex",
          flexDirection: "column",
          // Height: see `.base-page-root` in core.css.
          // Clear the fixed PageHeader (breadcrumb) plus a little extra so the
          // pinned column-header row isn't tucked half under it.
          paddingTop: "calc(var(--page-header-height) + 6px)",
        }}
      >
        <DocumentTitle
          title={`${page?.icon || ""}  ${getPageTitle(page?.title, page?.isBase, t)}`}
          withAppName={false}
        />
        <MemoizedPageHeader readOnly={!canEdit} />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            paddingInline: 24,
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <BaseView
              pageId={page.id}
              editable={hasBases && canEdit}
              titleSlot={
                <div
                  className="base-page-title"
                  style={{ paddingTop: 2, paddingBottom: 6 }}
                >
                  <MemoizedTitleEditor
                    pageId={page.id}
                    slugId={page.slugId}
                    title={page.title}
                    spaceSlug={page.space?.slug ?? ""}
                    editable={hasBases && canEdit}
                    isBase
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    page && (
      <div>
        <DocumentTitle
          title={`${page?.icon || ""}  ${getPageTitle(page?.title, page?.isBase, t)}`}
          withAppName={false}
        />

        <MemoizedPageHeader readOnly={!canEdit} />

        <ResearchSplitContainer pageId={page.id} pageTitle={page.title}>
          <MemoizedFullEditor
            key={page.id}
            pageId={page.id}
            title={page.title}
            content={page.content}
            slugId={page.slugId}
            spaceSlug={page?.space?.slug}
            editable={canEdit}
            creator={page.creator}
            contributors={page.contributors}
            canComment={canComment}
          />
        </ResearchSplitContainer>
        <MemoizedHistoryModal pageId={page.id} />
      </div>
    )
  );
}
