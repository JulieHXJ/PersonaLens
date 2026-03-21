const segments = [
  {
    icon: "apartment",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    name: "Global Enterprise",
    participants: 12,
    tags: ["SLA Focused", "Security-First"],
  },
  {
    icon: "rocket_launch",
    iconColor: "text-tertiary",
    iconBg: "bg-tertiary/10",
    name: "Scale-up Series B",
    participants: 24,
    tags: ["Speed to Market", "Cost Conscious"],
  },
  {
    icon: "terminal",
    iconColor: "text-secondary",
    iconBg: "bg-secondary/10",
    name: "Dev Agency",
    participants: 14,
    tags: ["Multi-tenant", "API First"],
  },
];

export default function SegmentDeepDive() {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant">
        Segment Deep Dive
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments.map((seg) => (
          <div
            key={seg.name}
            className="group bg-surface-container hover:bg-surface-container-high p-6 rounded-xl border border-outline-variant/10 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <div
                className={`w-10 h-10 rounded-full ${seg.iconBg} flex items-center justify-center ${seg.iconColor}`}
              >
                <span className="material-symbols-outlined">{seg.icon}</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </div>
            <h4 className="text-lg font-bold mb-1">{seg.name}</h4>
            <p className="text-[10px] font-mono text-on-surface-variant uppercase mb-4">
              {seg.participants} Active Participants
            </p>
            <div className="flex flex-wrap gap-2">
              {seg.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-surface-container-highest text-[10px] font-mono rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
