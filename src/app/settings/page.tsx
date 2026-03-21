"use client";

import { useState, useEffect } from "react";

interface ProviderOption {
  id: string;
  name: string;
  model: string;
}

export default function SettingsPage() {
  const [provider, setProvider] = useState("");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setProvider(data.provider);
        setProviders(data.availableProviders);
      });
  }, []);

  const switchProvider = async (id: string) => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: id }),
    });
    setProvider(id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <header className="max-w-3xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-px w-8 bg-primary/30" />
          <span className="text-xs font-mono text-primary uppercase tracking-[0.2em]">
            Configuration
          </span>
        </div>
        <h1 className="text-4xl font-bold font-headline tracking-tighter text-on-surface mb-4">
          Settings
        </h1>
        <p className="text-on-surface-variant leading-relaxed">
          Configure the AI backbone used by the exploration and interview agents.
        </p>
      </header>

      <section className="max-w-3xl mx-auto px-6 space-y-8">
        {/* AI Provider Selection */}
        <div>
          <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
            AI Provider
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => switchProvider(p.id)}
                disabled={saving}
                className={`relative p-6 rounded-xl border text-left transition-all ${
                  provider === p.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container-high"
                }`}
              >
                {/* Active indicator */}
                {provider === p.id && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-[14px]">
                      check
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      p.id === "openai"
                        ? "bg-[#10a37f]/10 text-[#10a37f]"
                        : p.id === "gemini-pro"
                          ? "bg-[#a142f4]/10 text-[#a142f4]"
                          : "bg-[#4285f4]/10 text-[#4285f4]"
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {p.id === "openai" ? "smart_toy" : p.id === "gemini-pro" ? "neurology" : "auto_awesome"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">
                      {p.name}
                    </h3>
                    <p className="text-[10px] font-mono text-on-surface-variant">
                      {p.model}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {p.id === "openai"
                    ? "Fast, reliable tool-use support. Best for complex multi-step agent workflows."
                    : p.id === "gemini-pro"
                      ? "Strongest Gemini model. Optimized for agentic workflows with precise tool usage and multi-step execution."
                      : "Pro-level intelligence at Flash speed. Great balance of quality and cost."}
                </p>
              </button>
            ))}
          </div>

          {saved && (
            <div className="mt-4 flex items-center gap-2 text-tertiary text-xs font-mono">
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
              Provider switched successfully
            </div>
          )}
        </div>

        {/* API Keys Status */}
        <div>
          <label className="block text-xs font-mono text-on-surface-variant/60 uppercase tracking-widest mb-4">
            API Keys
          </label>
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 divide-y divide-outline-variant/10">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">
                  key
                </span>
                <span className="text-sm text-on-surface">OpenAI API Key</span>
              </div>
              <span className="text-xs font-mono text-tertiary">
                ••••••{process.env.NEXT_PUBLIC_OPENAI_CONFIGURED ? "configured" : "set via .env.local"}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">
                  key
                </span>
                <span className="text-sm text-on-surface">Gemini API Key</span>
              </div>
              <span className="text-xs font-mono text-tertiary">
                ••••••set via .env.local
              </span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-on-surface-variant font-mono">
            API keys are configured via environment variables for security. Edit .env.local to change them.
          </p>
        </div>
      </section>
    </>
  );
}
