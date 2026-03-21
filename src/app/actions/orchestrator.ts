"use server";

import { runVisualSensor } from "./audit";
import { runAgentsAnalysis } from "./analyze";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function startAudit(url: string) {
  // 1. Create audit record
  const auditId = await convex.mutation(api.audits.createAudit, { url });

  // Run everything asynchronously so we don't block the caller
  (async () => {
    try {
      await convex.mutation(api.audits.updateAuditStatus, { id: auditId, status: "crawling" });
      const { screenshotBase64, simplifiedHtml } = await runVisualSensor(url);
      
      // Upload screenshot to Convex Storage
      const uploadUrl = await convex.mutation(api.files.generateUploadUrl);
      const buffer = Buffer.from(screenshotBase64, "base64");
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: buffer,
      });
      const { storageId } = await uploadResult.json();
      console.log(`Screenshot uploaded successfully: ${storageId}`);
      
        // Update with screenshot ID and HTML
        await convex.mutation(api.audits.updateAuditStatus, { 
          id: auditId, 
          status: "analyzing",
          screenshotId: storageId,
          simplifiedHtml: simplifiedHtml 
        });

      // 3. Gemini multi-persona analysis
      await runAgentsAnalysis(auditId, screenshotBase64, simplifiedHtml);
      console.log(`Gemini analysis completed for ${url}`);

    } catch (error) {
      console.error("Audit failed:", error);
      // Update audit status to failed if an error occurs
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`Updating audit ${auditId} to failed with message: ${errorMsg}`);
      await convex.mutation(api.audits.updateAuditStatus, { 
        id: auditId, 
        status: "failed",
        error_message: errorMsg
      }).catch(e => console.error("Failed to update status", e));
    }
  })();

  return auditId;
}
