import { runVisualSensor } from './src/app/actions/audit';

async function test() {
  console.log("Testing visual sensor...");
  try {
    const { screenshotBase64, simplifiedHtml } = await runVisualSensor("https://example.com");
    console.log("Success! screenshot length:", screenshotBase64.length, "html length:", simplifiedHtml.length);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
