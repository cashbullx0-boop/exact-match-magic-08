import { useEffect } from "react";

/**
 * Prevents users from saving images/files from the site, while keeping
 * normal text selection and copy/paste fully working:
 * - blocks right-click / long-press only on images, canvas, video
 * - blocks drag-and-drop of images
 * - blocks Ctrl/Cmd+S (save page)
 */
export function ImageProtection() {
  useEffect(() => {
    const isMedia = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || !el.tagName) return false;
      return el.tagName === "IMG" || el.tagName === "CANVAS" || el.tagName === "VIDEO";
    };
    const onContextMenu = (e: MouseEvent) => {
      if (isMedia(e.target)) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      if (isMedia(e.target)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "s") {
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
