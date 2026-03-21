"use client";

export default function MobileHeader() {
  return (
    <header className="flex lg:hidden justify-between items-center w-full px-6 py-4 sticky top-0 z-50 bg-[#131316] border-b border-[#404753]/15">
      <div className="text-xl font-bold tracking-tighter text-[#A4C9FF] font-headline">
        NIGHTSHIFT
      </div>
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-[#C0C7D5]">
          notifications
        </span>
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">
            person
          </span>
        </div>
      </div>
    </header>
  );
}
