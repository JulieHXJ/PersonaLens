interface TabNavigationProps {
  tabs: string[];
  activeTab: number;
  onTabClick: (index: number) => void;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabClick,
}: TabNavigationProps) {
  return (
    <nav className="sticky top-0 lg:top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10 px-6 overflow-x-auto scrollbar-hide">
      <div className="max-w-6xl mx-auto flex gap-8">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => onTabClick(i)}
            className={`py-4 text-xs font-mono uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${
              activeTab === i
                ? "text-primary border-primary"
                : "text-on-surface-variant hover:text-on-surface border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}
