const tiers = [
  {
    label: "Tier 0: Must-Have",
    labelColor: "text-tertiary",
    feature: "Real-time Anomaly Detection",
    score: "94%",
  },
  {
    label: "Tier 1: Should-Have",
    labelColor: "text-primary",
    feature: "Custom Slack Integrations",
    score: "68%",
  },
  {
    label: "Tier 2: Nice-to-Have",
    labelColor: "text-on-surface-variant",
    feature: "Theme Customization (White-label)",
    score: "12%",
  },
];

export default function FeaturePriorities() {
  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
      <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
        Feature Priority Tiered List
      </h3>
      <div className="space-y-4">
        {tiers.map((tier) => (
          <div key={tier.label} className="flex flex-col gap-2">
            <span
              className={`text-[10px] font-mono ${tier.labelColor} uppercase font-bold`}
            >
              {tier.label}
            </span>
            <div className="flex items-center gap-4 bg-surface-container p-3 rounded-lg border border-outline-variant/5">
              <span className="flex-1 text-xs">{tier.feature}</span>
              <span className="text-[10px] font-mono text-primary">
                {tier.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
