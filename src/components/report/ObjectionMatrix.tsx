const objections = [
  {
    label: "Pricing Complexity",
    width: "w-[85%]",
    barColor: "bg-error",
    severity: "HIGH SEVERITY",
    severityClass: "bg-error-container text-on-error-container",
  },
  {
    label: "On-prem Support",
    width: "w-[45%]",
    barColor: "bg-tertiary-container",
    severity: "MEDIUM",
    severityClass: "bg-surface-container-high text-on-surface-variant",
  },
  {
    label: "Data Retention",
    width: "w-[20%]",
    barColor: "bg-tertiary-container",
    severity: "LOW",
    severityClass: "bg-surface-container-high text-on-surface-variant",
  },
];

export default function ObjectionMatrix() {
  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
      <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant mb-6">
        Objection Matrix
      </h3>
      <div className="space-y-6">
        {objections.map((obj) => (
          <div key={obj.label} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-bold text-on-surface mb-1">
                {obj.label}
              </div>
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className={`h-full ${obj.barColor} ${obj.width}`} />
              </div>
            </div>
            <div
              className={`ml-6 px-3 py-1 ${obj.severityClass} text-[10px] font-bold rounded`}
            >
              {obj.severity}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
