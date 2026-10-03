import { useState, useEffect } from "react";

export function useGateScroll() {
  const [scrollY, setScrollY] = useState(0);
  const [isCleared, setIsCleared] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setScrollY(current);
      if (current > 120) {
        setIsCleared(true);
      } else {
        setIsCleared(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate blur and dimness based on scroll position
  const videoOpacity = Math.max(0.18, 0.45 - scrollY * 0.001);
  const textBlur = Math.max(0, Math.min(8, scrollY * 0.03));

  return {
    scrollY,
    isCleared,
    videoOpacity,
    textBlur,
  };
}
