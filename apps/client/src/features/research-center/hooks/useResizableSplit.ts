import { useState, useCallback, useRef, useEffect, KeyboardEvent } from "react";

interface UseResizableSplitOptions {
  initialPercent?: number;
  minPercent?: number;
  maxPercent?: number;
  storageKey?: string;
}

export function useResizableSplit({
  initialPercent = 50,
  minPercent = 20,
  maxPercent = 80,
  storageKey = "rc_notice_split_percent",
}: UseResizableSplitOptions = {}) {
  const [splitPercent, setSplitPercent] = useState<number>(() => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= minPercent && parsed <= maxPercent) {
          return parsed;
        }
      }
    }
    return initialPercent;
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clamp = useCallback(
    (val: number) => Math.min(Math.max(val, minPercent), maxPercent),
    [minPercent, maxPercent]
  );

  const updateSplit = useCallback(
    (newPercent: number) => {
      const clamped = clamp(newPercent);
      setSplitPercent(clamped);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, clamped.toString());
        } catch {}
      }
    },
    [clamp, storageKey]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const newPercent = (relativeX / rect.width) * 100;
      updateSplit(newPercent);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, updateSplit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      let handled = true;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        updateSplit(splitPercent - 2);
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        updateSplit(splitPercent + 2);
      } else if (e.key === "Home") {
        updateSplit(minPercent);
      } else if (e.key === "End") {
        updateSplit(maxPercent);
      } else if (e.key === "Enter" || e.key === " ") {
        updateSplit(50);
      } else {
        handled = false;
      }

      if (handled) {
        e.preventDefault();
      }
    },
    [splitPercent, updateSplit, minPercent, maxPercent]
  );

  return {
    containerRef,
    splitPercent,
    isDragging,
    handlePointerDown,
    handleKeyDown,
    resetToHalf: () => updateSplit(50),
    separatorProps: {
      role: "separator",
      tabIndex: 0,
      "aria-valuenow": Math.round(splitPercent),
      "aria-valuemin": minPercent,
      "aria-valuemax": maxPercent,
      "aria-label": "Resize Notice Board and Project Grid",
      onKeyDown: handleKeyDown,
      onPointerDown: handlePointerDown,
    },
  };
}
