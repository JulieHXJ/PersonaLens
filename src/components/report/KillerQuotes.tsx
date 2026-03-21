const quotes = [
  {
    category: "Buy Signals",
    icon: "recommend",
    color: "text-tertiary",
    borderColor: "border-tertiary",
    quote:
      '"If you could launch this tomorrow, I\'d move our entire observability budget here."',
    persona: "CTO @ FinTech Unicorn",
  },
  {
    category: "Objections",
    icon: "block",
    color: "text-error",
    borderColor: "border-error",
    quote:
      '"The UI looks great but I don\'t see how we handle custom log ingestion without a CLI."',
    persona: "Lead DevOps @ StreamCorp",
  },
  {
    category: "Surprises",
    icon: "explore",
    color: "text-primary",
    borderColor: "border-primary",
    quote:
      '"I actually want to use the heatmaps for our marketing team to see load spikes."',
    persona: "Product Head @ RetailChain",
  },
];

export default function KillerQuotes() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {quotes.map((q) => (
        <div key={q.category} className="space-y-4">
          <div className={`flex items-center gap-2 ${q.color}`}>
            <span className="material-symbols-filled text-sm">{q.icon}</span>
            <h4 className="text-xs font-mono uppercase tracking-widest">
              {q.category}
            </h4>
          </div>
          <div
            className={`bg-surface-container p-6 rounded-xl border-l-4 ${q.borderColor}`}
          >
            <p className="text-sm italic text-on-surface leading-relaxed mb-4">
              {q.quote}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[10px]">
                  person
                </span>
              </div>
              <span className="text-[10px] font-mono text-on-surface-variant">
                {q.persona}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
