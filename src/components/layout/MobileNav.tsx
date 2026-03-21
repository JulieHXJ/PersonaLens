"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "tune", label: "Configure" },
  { href: "/progress", icon: "memory", label: "Progress" },
  { href: "/report", icon: "insights", label: "Reports" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex lg:hidden justify-around items-center px-4 py-3 bg-[#131316]/80 backdrop-blur-xl border-t border-[#404753]/20">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center px-4 py-1 ${
              isActive
                ? "bg-[#A4C9FF]/10 text-[#A4C9FF] rounded-xl"
                : "text-[#C0C7D5] opacity-60"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-[10px] font-body uppercase tracking-widest mt-1">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
