"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";

interface UrlInputFormProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading?: boolean;
}

export function UrlInputForm({ onSubmit, isLoading = false }: UrlInputFormProps) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(targetUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 relative z-10">
      <div className="relative flex-1 group">
        <div className="absolute inset-0 bg-blue-500/5 rounded-xl blur-md group-focus-within:bg-blue-500/10 transition-colors pointer-events-none"></div>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <span className="text-slate-500 font-mono text-sm">https://</span>
        </div>
        <Input
          type="text"
          placeholder="example.com"
          value={url.replace(/^https?:\/\//, '')}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled}
          className="pl-20 h-14 text-base font-mono rounded-xl bg-[#030712] border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 shadow-inner relative z-10 transition-all"
          required
        />
      </div>
      <Button 
        type="submit" 
        disabled={disabled || !url} 
        className="h-14 px-8 text-sm font-semibold tracking-wide uppercase rounded-xl bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] text-white border border-blue-500/50 transition-all relative z-10"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            Audit Website
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
