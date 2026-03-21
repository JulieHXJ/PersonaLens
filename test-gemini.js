async function run() {
  const apiKey = "AIzaSyCYeHcv_gacJM_8eBzzhACRRuO9BX-Nd6k";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  
  if (data.models) {
    console.log("Old API Key is valid. Let's test quota for 1.5-flash...");
    
    // Now let's do a quick test to see if we actually have quota for flash
    try {
        const chatResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const chatData = await chatResponse.json();
        if (chatResponse.status === 200) {
            console.log("SUCCESS! Quota is available for 1.5-flash.");
        } else {
            console.log("FAILED for 1.5-flash. Status:", chatResponse.status, "Error:", JSON.stringify(chatData));
        }
    } catch (e) {
        console.log("Network error during quota test:", e.message);
    }
    
    try {
        console.log("\nTesting generateContent quota on gemini-2.5-flash...");
        const chatResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const chatData = await chatResponse.json();
        if (chatResponse.status === 200) {
            console.log("SUCCESS! Quota is available for 2.5-flash.");
        } else {
            console.log("FAILED for 2.5-flash. Status:", chatResponse.status, "Error:", JSON.stringify(chatData));
        }
    } catch (e) {
        console.log("Network error during quota test:", e.message);
    }

  }
}
run();
