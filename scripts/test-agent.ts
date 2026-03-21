import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { runBrowserAgent, AgentEvent } from "../src/lib/browser-agent";

const TARGET_URL =
  process.argv[2] || "https://www.kmw-technology.de/hebammen";

console.log(`\n🔭 Testing browser agent against: ${TARGET_URL}\n`);

const emit = (event: AgentEvent) => {
  const time = new Date(event.timestamp).toLocaleTimeString();
  const prefix =
    event.type === "action"
      ? "→"
      : event.type === "screenshot"
        ? "📸"
        : event.type === "thinking"
          ? "💭"
          : event.type === "observation"
            ? "👁"
            : event.type === "error"
              ? "⚠"
              : event.type === "done"
                ? "✅"
                : "•";

  console.log(`[${time}] ${prefix} ${event.message}`);

  if (event.type === "done" && event.data) {
    console.log("\n📊 Analysis result:");
    console.log(JSON.stringify(event.data, null, 2));
  }
};

runBrowserAgent(TARGET_URL, emit)
  .then((result) => {
    console.log("\n✅ Agent finished successfully!");
    console.log("\n--- Website Analysis ---");
    console.log(JSON.stringify(result.analysis, null, 2));
    console.log(`\n--- Generated ${result.personas.length} Personas ---`);
    result.personas.forEach((p, i) => {
      console.log(
        `  ${i + 1}. ${p.name} (${p.age}) - ${p.role} [${p.segment}]`
      );
    });
  })
  .catch((err) => {
    console.error("\n❌ Agent failed:", err.message);
    process.exit(1);
  });
