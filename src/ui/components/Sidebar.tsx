import { useState, type ReactNode } from "react";

/**
 * Control-panel container. On desktop it's the usual sticky left column. On
 * mobile it becomes a slide-up drawer toggled by a floating button, so the charts
 * are the default view and controls are one tap away. The toggle and the drawer
 * are both `position: fixed` on mobile (see theme.css), so they leave the
 * single-column grid to the content.
 */
export function Sidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close controls" : "Open controls"}
      >
        {open ? "✕ Done" : "☰ Controls"}
      </button>
      <aside className={open ? "sidebar open" : "sidebar"}>{children}</aside>
    </>
  );
}
