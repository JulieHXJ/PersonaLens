"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
  { href: "/", icon: "settings_input_component", label: "Configure Run" },
  { href: "/progress", icon: "terminal", label: "Live Progress" },
  { href: "/report", icon: "analytics", label: "Morning Report" },
  { href: "/settings", icon: "tune", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (pathname === href) {
      e.preventDefault();
      // Force full reload when clicking the already-active nav item
      window.location.href = href;
    }
  };

  return (
    <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 border-r border-outline-variant/10 bg-[var(--sidebar-bg)] w-64 z-50 shadow-[40px_0_40px_-20px_rgba(164,201,255,0.06)]">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-xl">
              visibility
            </span>
          </div>
          <div>
            <h1 className="text-lg font-black text-[#A4C9FF] font-headline uppercase tracking-tighter">
              Nightshift
            </h1>
            <p className="text-[10px] text-[var(--on-surface-variant)] font-mono uppercase tracking-widest">
              The Kinetic Observer
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 font-mono text-sm ${
                isActive
                  ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] border-r-2 border-[var(--sidebar-active-text)] translate-x-1"
                  : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-active-bg)]"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-6 border-t border-outline-variant/10">
        <button
          onClick={() => window.location.href = "/"}
          className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold py-3 rounded-xl mb-6 shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Analysis
        </button>
        <div className="space-y-1">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-4 py-2 text-[var(--sidebar-text)] hover:bg-[var(--sidebar-active-bg)] text-xs font-mono w-full rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2 text-[var(--sidebar-text)] hover:bg-[var(--sidebar-active-bg)] text-xs font-mono"
          >
            <span className="material-symbols-outlined text-sm">
              description
            </span>
            <span>Documentation</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2 text-[var(--sidebar-text)] hover:bg-[var(--sidebar-active-bg)] text-xs font-mono"
          >
            <span className="material-symbols-outlined text-sm">
              help_outline
            </span>
            <span>Support</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
