"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "settings_input_component", label: "Configure Run" },
  { href: "/progress", icon: "terminal", label: "Live Progress" },
  { href: "/report", icon: "analytics", label: "Morning Report" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 border-r border-[#404753]/10 bg-[#1B1B1E] w-64 z-50 shadow-[40px_0_40px_-20px_rgba(164,201,255,0.06)]">
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
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 font-mono text-sm ${
                isActive
                  ? "bg-[#2A2A2D] text-[#A4C9FF] border-r-2 border-[#A4C9FF] translate-x-1"
                  : "text-[#C0C7D5] hover:bg-[#1F1F22]"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-6 border-t border-outline-variant/10">
        <button className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold py-3 rounded-xl mb-6 shadow-lg shadow-primary/10 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">add</span>
          New Analysis
        </button>
        <div className="space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2 text-[#C0C7D5] hover:bg-[#1F1F22] text-xs font-mono"
          >
            <span className="material-symbols-outlined text-sm">
              description
            </span>
            <span>Documentation</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-2 text-[#C0C7D5] hover:bg-[#1F1F22] text-xs font-mono"
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
