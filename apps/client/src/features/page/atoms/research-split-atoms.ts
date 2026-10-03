import { atom } from "jotai";

export type SplitViewMode = "split" | "pdf-only" | "notes-only";

export const isSplitViewOpenAtom = atom<boolean>(false);

export const splitViewModeAtom = atom<SplitViewMode>("split");

export type PaneOrder = "pdf-left" | "pdf-right";
export const paneOrderAtom = atom<PaneOrder>("pdf-left");

export const splitPdfUrlAtom = atom<string>("");

export const splitPdfNameAtom = atom<string>("");

export const splitRatioAtom = atom<number>(50);

export const isDraggingSplitterAtom = atom<boolean>(false);

/** Controls whether the page header is visible while split view is open. Default: hidden. */
export const splitHeaderVisibleAtom = atom<boolean>(false);
