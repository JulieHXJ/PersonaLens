export default function DemandGauge() {
  return (
    <section className="p-6 lg:p-10 bg-surface-container-low border-b border-outline-variant/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_#a7d641]" />
              <span className="text-xs font-mono text-tertiary tracking-widest uppercase">
                Live Pulse Analysis
              </span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tighter text-on-surface mb-4">
              Morning Report
            </h2>
            <div className="flex gap-4">
              <div className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-mono text-on-surface-variant border border-outline-variant/20 uppercase">
                Observer: KINETIC_01
              </div>
              <div className="px-3 py-1 bg-surface-container-high rounded text-[10px] font-mono text-on-surface-variant border border-outline-variant/20 uppercase">
                Last Sync: 04:30 AM
              </div>
            </div>
          </div>

          {/* Gauge */}
          <div className="relative w-64 h-40 flex items-end justify-center overflow-hidden">
            <div className="absolute inset-0 rounded-t-full border-[16px] border-surface-container-highest" />
            <div
              className="absolute inset-0 rounded-t-full border-[16px] border-primary shadow-[0_0_40px_rgba(164,201,255,0.2)]"
              style={{ clipPath: "polygon(0 100%, 0 0, 76% 0, 76% 100%)" }}
            />
            <div className="z-10 text-center pb-2">
              <div className="text-5xl font-black text-on-surface tracking-tighter">
                76%
              </div>
              <div className="text-[10px] font-mono text-primary font-bold tracking-[0.2em] uppercase">
                Strong Signal
              </div>
            </div>
            <div className="absolute bottom-0 w-full flex justify-between px-2 text-[10px] font-mono text-on-surface-variant">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Intent Card */}
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/10 w-full md:w-72">
            <div className="text-[10px] font-mono text-on-surface-variant uppercase mb-2">
              Expressed Intent
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-on-surface tracking-tighter">
                38
              </span>
              <span className="text-lg text-on-surface-variant">/ 50</span>
            </div>
            <div className="mt-4 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[76%]" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-tertiary">
              <span className="material-symbols-outlined text-sm">
                trending_up
              </span>
              <span className="text-xs font-mono">+12% vs Yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
