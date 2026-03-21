"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function MobileHeader() {
  const { theme, toggle } = useTheme();

  return (
    <header className="flex lg:hidden justify-between items-center w-full px-6 py-4 sticky top-0 z-50 bg-background border-b border-outline-variant/15">
      <div className="text-xl font-bold tracking-tighter text-[#A4C9FF] font-headline">
        NIGHTSHIFT
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-sm">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">
            person
          </span>
        </div>
      </div>
    </header>
  );
}
