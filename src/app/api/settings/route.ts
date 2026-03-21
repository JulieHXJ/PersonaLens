import { NextRequest, NextResponse } from "next/server";
import { getProvider, setProvider, LLMProvider } from "@/lib/llm";

export async function GET() {
  return NextResponse.json({
    provider: getProvider(),
    availableProviders: [
      { id: "openai", name: "OpenAI", model: "GPT-4.1 Mini" },
      { id: "gemini", name: "Google Gemini Flash", model: "Gemini 2.5 Flash" },
      { id: "gemini-pro", name: "Google Gemini Pro", model: "Gemini 2.5 Pro" },
    ],
  });
}

export async function POST(req: NextRequest) {
  const { provider } = await req.json();

  if (!["openai", "gemini", "gemini-pro"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  setProvider(provider as LLMProvider);
  return NextResponse.json({ provider, success: true });
}
