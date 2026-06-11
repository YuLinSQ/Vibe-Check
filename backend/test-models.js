const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // The SDK doesn't have a direct listModels in the main export easily accessible sometimes
    // But we can test a specific one or use the model service
    console.log("Testing model 'gemini-2.0-flash'...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("test");
    console.log("Success! 'gemini-2.0-flash' is available.");
  } catch (e) {
    console.error("Error with 'gemini-2.0-flash':", e.message);
    console.log("\nTrying 'gemini-pro'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        await model.generateContent("test");
        console.log("Success! 'gemini-pro' is available.");
    } catch (e2) {
        console.error("Error with 'gemini-pro':", e2.message);
    }
  }
}

listModels();
