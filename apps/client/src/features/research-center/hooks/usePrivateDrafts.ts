import { useState, useEffect, useRef, useCallback } from "react";
import DOMPurify from "dompurify";

export interface DraftData {
  title: string;
  bodyHtml: string;
  tags: string[];
  paperId?: string;
  isPublished: boolean;
  updatedAt: string;
}

export function usePrivateDrafts(noteId: string | null) {
  const storageKey = `rc_draft_${noteId || "new"}`;
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Failed to load draft from localStorage", e);
    }
    return null;
  }, [storageKey]);

  const saveDraft = useCallback(
    (data: Omit<DraftData, "updatedAt">) => {
      setSaveStatus("saving");
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        try {
          const sanitizedHtml = DOMPurify.sanitize(data.bodyHtml);
          const payload: DraftData = {
            ...data,
            bodyHtml: sanitizedHtml,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(payload));
          setLastSavedAt(new Date());
          setSaveStatus("saved");
        } catch (e) {
          console.error("Failed to save draft to localStorage", e);
          setSaveStatus("unsaved");
        }
      }, 800);
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setSaveStatus("idle");
      setLastSavedAt(null);
    } catch (e) {
      console.error("Failed to clear draft", e);
    }
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSavedAt,
    loadDraft,
    saveDraft,
    clearDraft,
  };
}
