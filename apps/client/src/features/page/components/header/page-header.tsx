import classes from "./page-header.module.css";
import PageHeaderMenu from "@/features/page/components/header/page-header-menu.tsx";
import { ActionIcon, Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import {
  IconArrowLeft,
  IconChevronUp,
  IconColumns,
  IconExternalLink,
  IconLock,
  IconShare,
  IconTrash,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import Breadcrumb from "@/features/page/components/breadcrumbs/breadcrumb.tsx";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetSpaceBySlugQuery } from "@/features/space/queries/space-query.ts";
import {
  usePageQuery,
  useTogglePublishMutation,
  useDeletePageMutation,
} from "@/features/page/queries/page-query.ts";
import { extractPageSlugId } from "@/lib";
import { buildPublicSpaceUrl } from "@/features/page/page.utils.ts";
import { isBetaPublicSpaces } from "@/lib/config.ts";
import { useAtom } from "jotai";
import {
  isSplitViewOpenAtom,
  splitHeaderVisibleAtom,
} from "@/features/page/atoms/research-split-atoms";
import { modals } from "@mantine/modals";

interface Props {
  readOnly?: boolean;
}

export default function PageHeader({ readOnly }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { spaceSlug, pageSlug } = useParams();
  const { data: space } = useGetSpaceBySlugQuery(spaceSlug);
  const { data: page } = usePageQuery({
    pageId: extractPageSlugId(pageSlug),
  });
  const [isSplitOpen, setIsSplitOpen] = useAtom(isSplitViewOpenAtom);
  const [headerVisible, setHeaderVisible] = useAtom(splitHeaderVisibleAtom);

  const togglePublishMutation = useTogglePublishMutation();
  const deletePageMutation = useDeletePageMutation();

  const [localPublished, setLocalPublished] = useState<boolean | null>(null);
  const isPublished =
    localPublished !== null ? localPublished : page?.isPublished === true;

  const handleTogglePublish = () => {
    if (!page?.id) return;
    const nextState = !isPublished;
    setLocalPublished(nextState);
    togglePublishMutation.mutate(
      {
        pageId: page.id,
        isPublished: nextState,
      },
      {
        onError: () => {
          setLocalPublished(!nextState);
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!page?.id) return;
    modals.openConfirmModal({
      title: t("Delete research note?"),
      centered: true,
      children: (
        <Text size="sm">
          {t(
            "Are you sure you want to delete this note? It will be removed from your research workspace and deleted from the database in real time.",
          )}
        </Text>
      ),
      labels: { confirm: t("Delete Note"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deletePageMutation.mutateAsync(page.id);
          navigate("/dashboard");
        } catch {
          // handled by mutation
        }
      },
    });
  };

  const showPublicBadge =
    isBetaPublicSpaces() &&
    space?.isPublished &&
    page &&
    page.permissions?.hasRestriction !== true;

  const headerControls = (
    <Group gap="xs" wrap="nowrap" align="center">
      {page && (
        <>
          {isPublished ? (
            <Tooltip
              label={t("Visible to all 4 research team members")}
              withArrow
              openDelay={200}
            >
              <Badge
                color="teal"
                variant="light"
                size="sm"
                leftSection={<IconUsers size={12} />}
              >
                {t("Published to Team")}
              </Badge>
            </Tooltip>
          ) : (
            <Tooltip
              label={t("Private draft — only visible to you")}
              withArrow
              openDelay={200}
            >
              <Badge
                color="gray"
                variant="light"
                size="sm"
                leftSection={<IconLock size={12} />}
              >
                {t("Personal Draft")}
              </Badge>
            </Tooltip>
          )}

          {!readOnly && (
            <Button
              size="xs"
              variant={isPublished ? "default" : "filled"}
              color={isPublished ? undefined : "indigo"}
              loading={togglePublishMutation.isPending}
              onClick={handleTogglePublish}
              leftSection={
                isPublished ? undefined : <IconShare size={13} stroke={2} />
              }
              style={{ fontWeight: 600, fontSize: 12 }}
            >
              {isPublished ? t("Revert to Private") : t("Publish to Team")}
            </Button>
          )}

          {!readOnly && (
            <Tooltip label={t("Delete Note from Database")} withArrow>
              <ActionIcon
                color="red"
                variant="subtle"
                size="sm"
                onClick={handleDeleteConfirm}
                aria-label={t("Delete Note")}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip
            label={isSplitOpen ? t("Close PDF Split View") : t("Open PDF Split View")}
            withArrow
          >
            <ActionIcon
              variant={isSplitOpen ? "filled" : "default"}
              color="teal"
              size="sm"
              onClick={() => setIsSplitOpen((prev) => !prev)}
              aria-label={t("Toggle PDF Split View")}
            >
              <IconColumns size={16} />
            </ActionIcon>
          </Tooltip>
        </>
      )}

      <PageHeaderMenu readOnly={readOnly} />
    </Group>
  );

  // Normal mode — render full header always
  if (!isSplitOpen) {
    return (
      <div className={classes.header} data-page-header="true">
        <Group
          justify="space-between"
          h="100%"
          px="md"
          wrap="nowrap"
          className={classes.group}
        >
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <Button
              component={Link}
              to="/dashboard"
              variant="subtle"
              color="indigo"
              size="xs"
              leftSection={<IconArrowLeft size={14} />}
              style={{ fontWeight: 600 }}
            >
              {t("Dashboard")}
            </Button>
            <Breadcrumb />
            {showPublicBadge && (
              <Tooltip label={t("Open public page")} openDelay={250} withArrow>
                <Badge
                  component="a"
                  href={buildPublicSpaceUrl({
                    spaceSlug: space.slug,
                    pageSlugId: page.slugId,
                    pageTitle: page.title,
                  })}
                  target="_blank"
                  rel="noopener"
                  size="sm"
                  variant="light"
                  leftSection={<IconWorld size={12} />}
                  rightSection={<IconExternalLink size={11} />}
                  style={{ flexShrink: 0, cursor: "pointer" }}
                >
                  {t("Public")}
                </Badge>
              </Tooltip>
            )}
          </Group>
          <Group
            justify="flex-end"
            h="100%"
            px="md"
            wrap="nowrap"
            gap="var(--mantine-spacing-xs)"
          >
            {headerControls}
          </Group>
        </Group>
      </div>
    );
  }

  // Split mode — header is collapsible
  return (
    <div
      className={classes.header}
      data-page-header="true"
      data-split-header={headerVisible ? "visible" : "hidden"}
      style={{
        height: headerVisible ? "45px" : "0px",
        overflow: "hidden",
        transition: "height 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        borderBottom: headerVisible
          ? "1px solid light-dark(#e9ecef, #2a2b3d)"
          : "none",
      }}
    >
      <Group
        justify="space-between"
        h="45px"
        px="md"
        wrap="nowrap"
        className={classes.group}
      >
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Button
            component={Link}
            to="/dashboard"
            variant="subtle"
            color="indigo"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
            style={{ fontWeight: 600 }}
          >
            {t("Dashboard")}
          </Button>
          <Breadcrumb />
          {showPublicBadge && (
            <Tooltip label={t("Open public page")} openDelay={250} withArrow>
              <Badge
                component="a"
                href={buildPublicSpaceUrl({
                  spaceSlug: space.slug,
                  pageSlugId: page.slugId,
                  pageTitle: page.title,
                })}
                target="_blank"
                rel="noopener"
                size="sm"
                variant="light"
                leftSection={<IconWorld size={12} />}
                rightSection={<IconExternalLink size={11} />}
                style={{ flexShrink: 0, cursor: "pointer" }}
              >
                {t("Public")}
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Group
          justify="flex-end"
          h="100%"
          px="md"
          wrap="nowrap"
          gap="var(--mantine-spacing-xs)"
        >
          <Tooltip label={t("Hide page header")} withArrow position="bottom">
            <ActionIcon
              variant="subtle"
              size="xs"
              color="gray"
              onClick={() => setHeaderVisible(false)}
              aria-label={t("Hide page header")}
            >
              <IconChevronUp size={13} />
            </ActionIcon>
          </Tooltip>
          {headerControls}
        </Group>
      </Group>
    </div>
  );
}
