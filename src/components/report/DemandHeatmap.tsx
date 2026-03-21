const features = ["API Access", "Visual Edits", "SSO Auth", "Audit Logs"];

const rows = [
  { segment: "Enterprise", values: [92, 34, 88, 96] },
  { segment: "Mid-Market", values: [76, 62, 21, 33] },
  { segment: "Startup", values: [84, 91, 4, 8] },
];

function getOpacity(value: number): string {
  if (value >= 85) return "opacity-100";
  if (value >= 70) return "opacity-80";
  if (value >= 55) return "opacity-70";
  if (value >= 35) return "opacity-40";
  if (value >= 15) return "opacity-30";
  return "opacity-10";
}

export default function DemandHeatmap() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant">
            Demand Heatmap: Segments vs Features
          </h3>
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-primary-container opacity-20 rounded-sm" />
            <div className="w-3 h-3 bg-primary-container opacity-60 rounded-sm" />
            <div className="w-3 h-3 bg-primary-container rounded-sm" />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {/* Header */}
          <div />
          {features.map((f) => (
            <div
              key={f}
              className="text-[10px] font-mono text-center text-on-surface-variant uppercase"
            >
              {f}
            </div>
          ))}

          {/* Rows */}
          {rows.map((row) => (
            <>
              <div
                key={row.segment}
                className="text-[10px] font-mono text-on-surface-variant py-4"
              >
                {row.segment}
              </div>
              {row.values.map((val, i) => (
                <div
                  key={`${row.segment}-${i}`}
                  className={`aspect-square bg-primary-container ${getOpacity(val)} rounded-sm flex items-center justify-center text-[10px] font-bold`}
                >
                  {val.toString().padStart(2, "0")}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>

      {/* Insight Card */}
      <div className="bg-primary-container p-8 rounded-xl flex flex-col justify-between text-on-primary-container">
        <div>
          <span className="material-symbols-outlined text-4xl mb-4">
            lightbulb
          </span>
          <h4 className="text-xl font-bold tracking-tight mb-2 leading-tight">
            Infrastructure dominance is the play.
          </h4>
          <p className="text-sm opacity-90 leading-relaxed">
            Enterprise segments show critical intent for API Access and Audit
            Logs. 12/15 interviewees mentioned &quot;governance&quot; as the primary
            barrier to entry.
          </p>
        </div>
        <button className="mt-8 py-2 px-4 border border-on-primary-container/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
          Generate Strategy
        </button>
      </div>
    </div>
  );
}
