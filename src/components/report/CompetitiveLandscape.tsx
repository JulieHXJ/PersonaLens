const competitors = [
  {
    name: "NIGHTSHIFT",
    score: 8.9,
    barClass: "bg-primary",
    isUs: true,
  },
  {
    name: "LEGACY_TOOL_A",
    score: 5.2,
    width: "65%",
    isUs: false,
  },
  {
    name: "OPEN_SOURCE_X",
    score: 3.8,
    width: "45%",
    isUs: false,
  },
];

export default function CompetitiveLandscape() {
  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
      <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-8">
        Competitive Landscape (Preference Score)
      </h3>
      <div className="space-y-8">
        {competitors.map((c) => (
          <div key={c.name} className="flex items-center gap-6">
            <span className="w-32 text-xs font-mono text-on-surface-variant">
              {c.name}
            </span>
            {c.isUs ? (
              <div className="flex-1 h-8 bg-primary rounded-r shadow-[0_0_20px_rgba(164,201,255,0.15)] relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-primary font-bold text-sm">
                  {c.score}
                </span>
              </div>
            ) : (
              <div className="flex-1 h-8 bg-surface-container-high rounded-r relative">
                <div
                  className="h-full bg-outline-variant rounded-r"
                  style={{ width: c.width }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm"
                  style={{ left: `calc(${c.width} + 12px)` }}
                >
                  {c.score}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
