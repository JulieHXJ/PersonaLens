export default function WillingnessToPay() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono uppercase tracking-widest text-on-surface-variant">
          Willingness to Pay Curve
        </h3>
        <div className="flex gap-4 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" /> Conv. %
          </span>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 h-80 relative">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
        >
          {/* Grid Lines */}
          <line
            x1="0" y1="250" x2="1000" y2="250"
            stroke="#404753" strokeWidth="0.5" strokeDasharray="4"
          />
          <line
            x1="0" y1="150" x2="1000" y2="150"
            stroke="#404753" strokeWidth="0.5" strokeDasharray="4"
          />
          <line
            x1="0" y1="50" x2="1000" y2="50"
            stroke="#404753" strokeWidth="0.5" strokeDasharray="4"
          />

          {/* Gradient fill */}
          <defs>
            <linearGradient id="wtp-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A4C9FF" stopOpacity={1} />
              <stop offset="100%" stopColor="#A4C9FF" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d="M 0 20 Q 200 20, 400 120 T 800 280 L 1000 290 L 1000 300 L 0 300 Z"
            fill="url(#wtp-grad)"
            opacity="0.1"
          />

          {/* Curve */}
          <path
            d="M 0 20 Q 200 20, 400 120 T 800 280 L 1000 290"
            fill="none"
            stroke="#A4C9FF"
            strokeWidth="3"
          />

          {/* Sweet spot */}
          <circle cx="450" cy="145" r="8" fill="#A7D641" className="animate-pulse" />
          <line
            x1="450" y1="145" x2="450" y2="20"
            stroke="#A7D641" strokeWidth="1" strokeDasharray="2"
          />
        </svg>

        <div className="absolute top-10 left-[43%] bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
          Sweet Spot: $249 - $299
        </div>

        <div className="absolute bottom-4 w-full left-0 px-8 flex justify-between text-[10px] font-mono text-on-surface-variant">
          <span>$0</span>
          <span>$100</span>
          <span>$200</span>
          <span>$300</span>
          <span>$400</span>
          <span>$500+</span>
        </div>
      </div>
    </div>
  );
}
