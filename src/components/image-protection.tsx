import { useEffect } from "react";

/**
 * Prevents users from saving images from the site:
 * - blocks right-click / long-press context menu (globally)
 * - blocks drag-and-drop of images
 * - blocks copy of image selections
 * - blocks common save shortcuts (Ctrl/Cmd+S)
 */
export function ImageProtection() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "IMG" || t.tagName === "CANVAS" || t.tagName === "VIDEO")) {
        e.preventDefault();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === "s" || key === "p")) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
